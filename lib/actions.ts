"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { saveUploadedFile } from "@/lib/storage";
import { aiExtractExperience } from "@/lib/ai";
import { extractTextFromFile, suggestExperienceItems } from "@/lib/resume";
import { computeJobHash } from "@/lib/dedupe";
import { scoreJobAgainstTarget } from "@/lib/scoring";
import { extractGreenhouseCompany, fetchGreenhouseJobs } from "@/lib/ats/greenhouse";
import { extractLeverCompany, fetchLeverJobs } from "@/lib/ats/lever";
import { shouldFetch } from "@/lib/rateLimit";
import { buildResumeVariant } from "@/lib/tailoring";
import { addBusinessDays } from "@/lib/date";
import { execFile } from "child_process";
import { promisify } from "util";

const MAX_IMPORT = 50;
const execFileAsync = promisify(execFile);

function parseBullets(value: FormDataEntryValue | null) {
  if (!value) return [];
  return String(value)
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseTags(value: FormDataEntryValue | null) {
  if (!value) return [];
  return String(value)
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function uploadResume(formData: FormData) {
  const session = await requireUser();
  const file = formData.get("resume");
  if (!(file instanceof File)) {
    throw new Error("Missing resume file.");
  }

  const { filePath } = await saveUploadedFile(file);
  const extractedText = await extractTextFromFile(file);

  await prisma.resume.create({
    data: {
      user: { connect: { email: session.user?.email ?? "" } },
      filePath,
      extractedText,
    },
  });

  revalidatePath("/setup");
}

export async function generateExperienceSuggestions() {
  const session = await requireUser();
  const resume = await prisma.resume.findFirst({
    where: { user: { email: session.user?.email ?? "" } },
    orderBy: { createdAt: "desc" },
  });
  if (!resume) {
    return;
  }

  let suggestions = suggestExperienceItems(resume.extractedText);
  const aiJson = await aiExtractExperience(resume.extractedText);
  if (aiJson) {
    try {
      const parsed = JSON.parse(aiJson);
      if (Array.isArray(parsed)) {
        suggestions = parsed;
      }
    } catch {
      // Ignore AI parsing failures.
    }
  }

  for (const suggestion of suggestions) {
    const bullets = Array.isArray(suggestion.bullets)
      ? suggestion.bullets
      : parseBullets(String(suggestion.bullets ?? "")) as string[];
    const skillsTags = Array.isArray(suggestion.skillsTags)
      ? suggestion.skillsTags
      : parseTags(String(suggestion.skillsTags ?? "")) as string[];
    await prisma.experienceItem.create({
      data: {
        user: { connect: { email: session.user?.email ?? "" } },
        company: suggestion.company || "Company",
        title: suggestion.title || "Role",
        startDate: suggestion.startDate,
        endDate: suggestion.endDate,
        bullets,
        skillsTags,
        verified: false,
      },
    });
  }

  revalidatePath("/setup");
}

export async function createExperienceItem(formData: FormData) {
  const session = await requireUser();
  await prisma.experienceItem.create({
    data: {
      user: { connect: { email: session.user?.email ?? "" } },
      company: String(formData.get("company") || ""),
      title: String(formData.get("title") || ""),
      startDate: String(formData.get("startDate") || "") || null,
      endDate: String(formData.get("endDate") || "") || null,
      bullets: parseBullets(formData.get("bullets")),
      skillsTags: parseTags(formData.get("skillsTags")),
      verified: Boolean(formData.get("verified")),
    },
  });
  await recomputeAllScores();
  revalidatePath("/setup");
}

export async function updateExperienceItem(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") || "");
  if (!id) {
    return;
  }
  await prisma.experienceItem.update({
    where: { id },
    data: {
      company: String(formData.get("company") || ""),
      title: String(formData.get("title") || ""),
      startDate: String(formData.get("startDate") || "") || null,
      endDate: String(formData.get("endDate") || "") || null,
      bullets: parseBullets(formData.get("bullets")),
      skillsTags: parseTags(formData.get("skillsTags")),
      verified: Boolean(formData.get("verified")),
    },
  });
  await recomputeAllScores();
  revalidatePath("/setup");
}

export async function deleteExperienceItem(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") || "");
  if (!id) {
    return;
  }
  await prisma.experienceItem.delete({ where: { id } });
  await recomputeAllScores();
  revalidatePath("/setup");
}

export async function updateTargetProfile(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") || "");
  const data = {
    name: String(formData.get("name") || "Northern Virginia"),
    locations: parseTags(formData.get("locations")),
    remoteAllowed: formData.get("remoteAllowed") === "on",
    roleTitles: parseTags(formData.get("roleTitles")),
    includeKeywords: parseTags(formData.get("includeKeywords")),
    excludeKeywords: parseTags(formData.get("excludeKeywords")),
  };

  if (id) {
    await prisma.targetProfile.update({ where: { id }, data });
    await recomputeScoresForTarget(id);
  } else {
    const created = await prisma.targetProfile.create({ data });
    await recomputeScoresForTarget(created.id);
  }
  revalidatePath("/setup");
  revalidatePath("/dashboard");
}

export async function updateProfileLinks(formData: FormData) {
  const session = await requireUser();
  const githubUrl = String(formData.get("githubUrl") || "").trim();

  await prisma.user.update({
    where: { email: session.user?.email ?? "" },
    data: {
      githubUrl: githubUrl || null,
    },
  });

  revalidatePath("/setup");
  revalidatePath("/apply");
}

export async function createManualJob(formData: FormData) {
  await requireUser();
  const companyName =
    String(formData.get("company") || "").trim() || "Unknown";
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const location = String(formData.get("location") || "").trim();
  const url = String(formData.get("url") || "").trim();
  const remote = formData.get("remote") === "on";

  const company = await prisma.company.upsert({
    where: { name: companyName },
    update: { atsType: "manual" },
    create: { name: companyName, atsType: "manual" },
  });

  const hash = computeJobHash({
    url,
    title,
    company: companyName,
    location,
  });

  const existing = await prisma.jobPosting.findUnique({ where: { hash } });
  if (existing) {
    return;
  }

  const job = await prisma.jobPosting.create({
    data: {
      source: "manual",
      url,
      title,
      location,
      remote,
      description,
      companyId: company.id,
      hash,
    },
  });

  await computeScores(job.id);
  revalidatePath("/jobs");
  revalidatePath("/dashboard");
}

export async function saveJobFromForm(formData: FormData) {
  await requireUser();
  const url = String(formData.get("url") || "").trim();
  const companyName =
    String(formData.get("company") || "").trim() || "Unknown";
  const title = String(formData.get("title") || "").trim() || "Untitled";
  const location = String(formData.get("location") || "").trim();
  const description = String(formData.get("description") || "").trim();

  const company = await prisma.company.upsert({
    where: { name: companyName },
    update: { atsType: "manual" },
    create: { name: companyName, atsType: "manual" },
  });

  const hash = computeJobHash({
    url,
    title,
    company: company.name,
    location,
  });

  const existing = await prisma.jobPosting.findUnique({ where: { hash } });
  if (!existing) {
    const job = await prisma.jobPosting.create({
      data: {
        source: "manual",
        url,
        title,
        location,
        remote: location.toLowerCase().includes("remote"),
        description,
        companyId: company.id,
        hash,
      },
    });
    await computeScores(job.id);
  }
  revalidatePath("/dashboard");
  revalidatePath("/save");
}

export async function createJobSource(formData: FormData) {
  const session = await requireUser();
  const name = String(formData.get("name") || "").trim();
  const type = String(formData.get("type") || "GREENHOUSE");
  const urlOrHandle = String(formData.get("urlOrHandle") || "").trim();
  const isEnabled = formData.get("isEnabled") === "on";

  if (!name || !urlOrHandle) {
    return;
  }

  await prisma.jobSource.create({
    data: {
      name,
      type: type as any,
      urlOrHandle,
      isEnabled,
      user: { connect: { email: session.user?.email ?? "" } },
    },
  });
  revalidatePath("/setup");
}

export async function toggleJobSource(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") || "");
  const isEnabled = formData.get("isEnabled") === "on";
  if (!id) return;
  await prisma.jobSource.update({
    where: { id },
    data: { isEnabled },
  });
  revalidatePath("/setup");
}

export async function deleteJobSource(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") || "");
  if (!id) return;
  await prisma.jobSource.delete({ where: { id } });
  revalidatePath("/setup");
}

export async function runRefreshNow() {
  await requireUser();
  if (process.env.NODE_ENV === "production" && process.env.APPLYCOPILOT_ALLOW_RUNNER !== "1") {
    throw new Error("Runner disabled in production without APPLYCOPILOT_ALLOW_RUNNER=1.");
  }

  const isWindows = process.platform === "win32";
  const cmd = isWindows ? "cmd" : "pnpm";
  const refreshArgs = isWindows ? ["/c", "pnpm", "jobs:refresh"] : ["jobs:refresh"];
  const queueArgs = isWindows ? ["/c", "pnpm", "queue:build"] : ["queue:build"];

  await execFileAsync(cmd, refreshArgs, { cwd: process.cwd(), env: process.env });
  await execFileAsync(cmd, queueArgs, { cwd: process.cwd(), env: process.env });

  revalidatePath("/dashboard");
  revalidatePath("/setup");
}

export async function importGreenhouse(boardUrl: string) {
  await requireUser();
  const trimmedUrl = boardUrl.trim();
  const companyName =
    extractGreenhouseCompany(trimmedUrl) ??
    trimmedUrl.replace(/^https?:\/\//, "");
  const company = await prisma.company.upsert({
    where: { name: companyName },
    update: { atsType: "greenhouse", boardUrl: trimmedUrl },
    create: { name: companyName, atsType: "greenhouse", boardUrl: trimmedUrl },
  });

  if (!shouldFetch(company.lastFetchedAt, 15)) {
    return;
  }

  const jobs = await fetchGreenhouseJobs(trimmedUrl);
  const limited = jobs.slice(0, MAX_IMPORT);

  for (const job of limited) {
    const hash = computeJobHash({
      url: job.url,
      title: job.title,
      company: company.name,
      location: job.location,
    });
    const exists = await prisma.jobPosting.findUnique({ where: { hash } });
    if (exists) {
      continue;
    }
    const created = await prisma.jobPosting.create({
      data: {
        source: "greenhouse",
        url: job.url,
        title: job.title,
        location: job.location,
        remote: job.location?.toLowerCase().includes("remote") ?? false,
        description: job.description,
        postedAt: job.postedAt ? new Date(job.postedAt) : null,
        companyId: company.id,
        hash,
      },
    });
    await computeScores(created.id);
  }

  await prisma.company.update({
    where: { id: company.id },
    data: { lastFetchedAt: new Date() },
  });

  revalidatePath("/jobs");
  revalidatePath("/dashboard");
}

export async function importLever(handleOrUrl: string) {
  await requireUser();
  const trimmedHandle = handleOrUrl.trim();
  const companyName =
    extractLeverCompany(trimmedHandle) ??
    trimmedHandle.replace(/^https?:\/\//, "");
  const company = await prisma.company.upsert({
    where: { name: companyName },
    update: { atsType: "lever", boardUrl: trimmedHandle },
    create: { name: companyName, atsType: "lever", boardUrl: trimmedHandle },
  });

  if (!shouldFetch(company.lastFetchedAt, 15)) {
    return;
  }

  const jobs = await fetchLeverJobs(trimmedHandle);
  const limited = jobs.slice(0, MAX_IMPORT);

  for (const job of limited) {
    const hash = computeJobHash({
      url: job.url,
      title: job.title,
      company: company.name,
      location: job.location,
    });
    const exists = await prisma.jobPosting.findUnique({ where: { hash } });
    if (exists) {
      continue;
    }
    const created = await prisma.jobPosting.create({
      data: {
        source: "lever",
        url: job.url,
        title: job.title,
        location: job.location,
        remote: job.location?.toLowerCase().includes("remote") ?? false,
        description: job.description,
        postedAt: job.postedAt ? new Date(job.postedAt) : null,
        companyId: company.id,
        hash,
      },
    });
    await computeScores(created.id);
  }

  await prisma.company.update({
    where: { id: company.id },
    data: { lastFetchedAt: new Date() },
  });

  revalidatePath("/jobs");
  revalidatePath("/dashboard");
}

export async function generatePacket(jobId: string) {
  const session = await requireUser();
  const job = await prisma.jobPosting.findUnique({
    where: { id: jobId },
    include: { company: true },
  });
  if (!job) {
    return;
  }
  const experiences = await prisma.experienceItem.findMany({
    where: { verified: true },
  });
  if (experiences.length === 0) {
    return;
  }
  const variant = await buildResumeVariant({
    job: { title: job.title, description: job.description },
    experiences,
  });
  const user = await prisma.user.findUnique({
    where: { email: session.user?.email ?? "" },
    select: { githubUrl: true },
  });
  const fieldPack = {
    jobTitle: job.title,
    company: job.company.name,
    githubUrl: user?.githubUrl ?? null,
    auditTrail: variant.auditTrail,
  };

  const packet = await prisma.packet.upsert({
    where: { jobId: job.id },
    update: {
      resumeVariantText: variant.resumeVariantText,
      fieldPackJson: fieldPack,
    },
    create: {
      jobId: job.id,
      resumeVariantText: variant.resumeVariantText,
      fieldPackJson: fieldPack,
    },
  });

  const existingApplication = await prisma.application.findFirst({
    where: { jobId: job.id },
  });
  if (!existingApplication) {
    await prisma.application.create({
      data: {
        jobId: job.id,
        status: "queued",
        packetId: packet.id,
      },
    });
  } else if (!existingApplication.packetId) {
    await prisma.application.update({
      where: { id: existingApplication.id },
      data: { packetId: packet.id },
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/applications");
  revalidatePath("/apply");
}

export async function upsertApplicationStatus(jobId: string, status: string) {
  await requireUser();
  const existing = await prisma.application.findFirst({
    where: { jobId },
  });
  const appliedAt =
    status === "applied" ? new Date() : existing?.appliedAt ?? null;
  if (existing) {
    await prisma.application.update({
      where: { id: existing.id },
      data: {
        status: status as any,
        appliedAt,
      },
    });
  } else {
    await prisma.application.create({
      data: {
        jobId,
        status: status as any,
        appliedAt,
      },
    });
  }
  revalidatePath("/applications");
  revalidatePath("/dashboard");
}

export async function skipJob(jobId: string, reason?: string) {
  await requireUser();
  const notes = reason ? `Skipped: ${reason}` : "Skipped";
  const existing = await prisma.application.findFirst({
    where: { jobId },
  });
  if (existing) {
    await prisma.application.update({
      where: { id: existing.id },
      data: { status: "rejected", notes },
    });
  } else {
    await prisma.application.create({
      data: {
        jobId,
        status: "rejected",
        notes,
      },
    });
  }
  revalidatePath("/dashboard");
  revalidatePath("/apply");
}

export async function submitApplication(jobId: string) {
  await requireUser();
  const appliedAt = new Date();
  const followUpAt = addBusinessDays(appliedAt, 3);
  const existing = await prisma.application.findFirst({
    where: { jobId },
  });
  if (existing) {
    await prisma.application.update({
      where: { id: existing.id },
      data: {
        status: "applied",
        appliedAt,
        followUpAt,
      },
    });
  } else {
    await prisma.application.create({
      data: {
        jobId,
        status: "applied",
        appliedAt,
        followUpAt,
      },
    });
  }
  revalidatePath("/dashboard");
  revalidatePath("/applications");
  revalidatePath("/apply");
}

export async function updateApplicationDetails(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") || "");
  if (!id) return;
  const status = String(formData.get("status") || "queued");
  const notes = String(formData.get("notes") || "");
  const followUpAt = String(formData.get("followUpAt") || "");
  const appliedAt = status === "applied" ? new Date() : undefined;
  await prisma.application.update({
    where: { id },
    data: {
      status: status as any,
      notes,
      followUpAt: followUpAt ? new Date(followUpAt) : null,
      ...(appliedAt ? { appliedAt } : {}),
    },
  });
  revalidatePath("/applications");
}

export async function recomputeDefaultTargetScores() {
  await requireUser();
  const target = await prisma.targetProfile.findFirst({
    where: { name: "Northern Virginia" },
  });
  if (!target) {
    return;
  }
  await recomputeScoresForTarget(target.id);
  revalidatePath("/dashboard");
}

async function computeScores(jobId: string) {
  const job = await prisma.jobPosting.findUnique({ where: { id: jobId } });
  if (!job) {
    return;
  }
  const targets = await prisma.targetProfile.findMany();
  const experiences = await prisma.experienceItem.findMany({
    where: { verified: true },
  });

  for (const target of targets) {
    const score = scoreJobAgainstTarget({
      job: {
        title: job.title,
        description: job.description,
        location: job.location,
        remote: job.remote,
      },
      target,
      experiences,
    });
    await prisma.jobScore.upsert({
      where: {
        jobId_targetProfileId: {
          jobId: job.id,
          targetProfileId: target.id,
        },
      },
      update: {
        scoreNumeric: score.scoreNumeric,
        reasonsJson: score.reasons,
      },
      create: {
        jobId: job.id,
        targetProfileId: target.id,
        scoreNumeric: score.scoreNumeric,
        reasonsJson: score.reasons,
      },
    });
  }
}

async function recomputeScoresForTarget(targetId: string) {
  const target = await prisma.targetProfile.findUnique({
    where: { id: targetId },
  });
  if (!target) {
    return;
  }
  const jobs = await prisma.jobPosting.findMany();
  const experiences = await prisma.experienceItem.findMany({
    where: { verified: true },
  });

  for (const job of jobs) {
    const score = scoreJobAgainstTarget({
      job: {
        title: job.title,
        description: job.description,
        location: job.location,
        remote: job.remote,
      },
      target,
      experiences,
    });
    await prisma.jobScore.upsert({
      where: {
        jobId_targetProfileId: {
          jobId: job.id,
          targetProfileId: target.id,
        },
      },
      update: {
        scoreNumeric: score.scoreNumeric,
        reasonsJson: score.reasons,
      },
      create: {
        jobId: job.id,
        targetProfileId: target.id,
        scoreNumeric: score.scoreNumeric,
        reasonsJson: score.reasons,
      },
    });
  }
}

async function recomputeAllScores() {
  const jobs = await prisma.jobPosting.findMany();
  for (const job of jobs) {
    await computeScores(job.id);
  }
}
