import { prisma } from "@/lib/prisma";
import { computeJobHash } from "@/lib/dedupe";
import { fetchGreenhouseJobs } from "@/lib/ats/greenhouse";
import { fetchLeverJobs } from "@/lib/ats/lever";
import { extractJobsFromJsonLd } from "@/lib/ats/jsonld";
import { fetchWithRetry, sleep } from "@/lib/net";
import { scoreJobAgainstTarget } from "@/lib/scoring";
import { JobSourceType } from "@prisma/client";

const USER_AGENT = "ApplyCopilot/0.1 (+local job tracker)";
const MIN_DELAY_MS = 750;

type IngestStats = {
  fetchedCount: number;
  newCount: number;
  updatedCount: number;
  dedupedCount: number;
  errorsCount: number;
};

export async function runJobsRefresh() {
  const sources = await prisma.jobSource.findMany({
    where: { isEnabled: true },
  });

  for (const source of sources) {
    const startedAt = new Date();
    const stats: IngestStats = {
      fetchedCount: 0,
      newCount: 0,
      updatedCount: 0,
      dedupedCount: 0,
      errorsCount: 0,
    };
    let status: "SUCCESS" | "FAIL" = "SUCCESS";
    let errorText: string | null = null;

    try {
      const jobs = await fetchJobsForSource(source.type, source.urlOrHandle);
      stats.fetchedCount = jobs.length;
      const target = await getDefaultTargetProfile();
      for (const job of jobs) {
        const companyName = job.company || source.name || "Unknown";
        const company = await prisma.company.upsert({
          where: { name: companyName },
          update: { atsType: "manual" },
          create: { name: companyName, atsType: "manual" },
        });

        const hash = computeJobHash({
          url: job.url,
          title: job.title,
          company: company.name,
          location: job.location,
        });

        const existing = await prisma.jobPosting.findUnique({ where: { hash } });
        if (existing) {
          const shouldUpdate =
            existing.title !== job.title ||
            existing.description !== job.description ||
            existing.location !== job.location ||
            existing.remote !== job.remote ||
            (existing.postedAt?.toISOString() ?? null) !==
              (job.postedAt ? new Date(job.postedAt).toISOString() : null);

          if (shouldUpdate) {
            const updated = await prisma.jobPosting.update({
              where: { id: existing.id },
              data: {
                title: job.title,
                description: job.description,
                location: job.location,
                remote: job.remote,
                postedAt: job.postedAt ? new Date(job.postedAt) : null,
                ingestedAt: new Date(),
              },
            });
            stats.updatedCount += 1;
            if (target) {
              await upsertScore(updated.id, target.id, target, source.userId);
            }
          } else {
            stats.dedupedCount += 1;
          }
          continue;
        }

        const created = await prisma.jobPosting.create({
          data: {
            source: source.type.toLowerCase(),
            url: job.url,
            title: job.title,
            location: job.location,
            remote: job.remote,
            description: job.description,
            postedAt: job.postedAt ? new Date(job.postedAt) : null,
            ingestedAt: new Date(),
            companyId: company.id,
            hash,
          },
        });
        stats.newCount += 1;
        if (target) {
          await upsertScore(created.id, target.id, target, source.userId);
        }
      }
    } catch (error: any) {
      status = "FAIL";
      stats.errorsCount += 1;
      errorText = error?.message ? String(error.message) : String(error);
    }

    await prisma.ingestRun.create({
      data: {
        jobSourceId: source.id,
        startedAt,
        finishedAt: new Date(),
        status,
        statsJson: stats,
        errorText,
      },
    });
    await prisma.jobSource.update({
      where: { id: source.id },
      data: { lastRunAt: new Date() },
    });
    await sleep(MIN_DELAY_MS);
  }
}

async function fetchJobsForSource(type: JobSourceType, urlOrHandle: string) {
  if (type === "GREENHOUSE") {
    const jobs = await fetchGreenhouseJobs(urlOrHandle);
    return jobs.map((job) => ({
      title: job.title,
      description: job.description || "",
      location: job.location,
      url: job.url,
      postedAt: job.postedAt || null,
      company: null,
      remote: job.location?.toLowerCase().includes("remote") ?? false,
    }));
  }
  if (type === "LEVER") {
    const jobs = await fetchLeverJobs(urlOrHandle);
    return jobs.map((job) => ({
      title: job.title,
      description: job.description || "",
      location: job.location,
      url: job.url,
      postedAt: job.postedAt || null,
      company: null,
      remote: job.location?.toLowerCase().includes("remote") ?? false,
    }));
  }
  const response = await fetchWithRetry(urlOrHandle, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!response.ok) {
    throw new Error(`JSON-LD fetch failed (${response.status})`);
  }
  const html = await response.text();
  return extractJobsFromJsonLd(html);
}

async function getDefaultTargetProfile() {
  const target = await prisma.targetProfile.findFirst({
    where: { name: "Northern Virginia" },
  });
  return target;
}

async function upsertScore(
  jobId: string,
  targetId: string,
  target: any,
  userId: string
) {
  const experiences = await prisma.experienceItem.findMany({
    where: { verified: true, userId },
  });
  const job = await prisma.jobPosting.findUnique({ where: { id: jobId } });
  if (!job) return;

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
        targetProfileId: targetId,
      },
    },
    update: {
      scoreNumeric: score.scoreNumeric,
      reasonsJson: score.reasons,
    },
    create: {
      jobId: job.id,
      targetProfileId: targetId,
      scoreNumeric: score.scoreNumeric,
      reasonsJson: score.reasons,
    },
  });
}
