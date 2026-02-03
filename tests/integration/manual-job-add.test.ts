import { PrismaClient } from "@prisma/client";
import { describe, expect, it, afterAll } from "vitest";
import crypto from "crypto";
import { computeJobHash } from "@/lib/dedupe";
import { scoreJobAgainstTarget } from "@/lib/scoring";

const prisma = new PrismaClient();

describe("manual job add integration", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates a job score for a manual job", async () => {
    const email = `test-${crypto.randomUUID()}@example.com`;
    const user = await prisma.user.create({
      data: {
        email,
        name: "Test User",
        passwordHash: "hash",
      },
    });

    const target = await prisma.targetProfile.create({
      data: {
        name: `Target ${crypto.randomUUID()}`,
        locations: ["Reston"],
        remoteAllowed: true,
        roleTitles: ["Software Engineer"],
        includeKeywords: ["TypeScript"],
        excludeKeywords: [],
      },
    });

    const experience = await prisma.experienceItem.create({
      data: {
        userId: user.id,
        company: "ExampleCo",
        title: "Engineer",
        bullets: ["Built TypeScript services"],
        skillsTags: ["TypeScript", "Node"],
        verified: true,
      },
    });

    const company = await prisma.company.create({
      data: {
        name: `ExampleCo-${crypto.randomUUID()}`,
        atsType: "manual",
      },
    });

    const hash = computeJobHash({
      title: "Software Engineer",
      company: company.name,
      location: "Reston, VA",
    });

    const job = await prisma.jobPosting.create({
      data: {
        source: "manual",
        title: "Software Engineer",
        location: "Reston, VA",
        remote: false,
        description: "Looking for TypeScript and Node experience.",
        companyId: company.id,
        hash,
      },
    });

    const score = scoreJobAgainstTarget({
      job: {
        title: job.title,
        description: job.description,
        location: job.location,
        remote: job.remote,
      },
      target,
      experiences: [experience],
    });

    await prisma.jobScore.create({
      data: {
        jobId: job.id,
        targetProfileId: target.id,
        scoreNumeric: score.scoreNumeric,
        reasonsJson: score.reasons,
      },
    });

    const stored = await prisma.jobScore.findUnique({
      where: {
        jobId_targetProfileId: {
          jobId: job.id,
          targetProfileId: target.id,
        },
      },
    });

    expect(stored).not.toBeNull();
    expect(stored?.scoreNumeric).toBeGreaterThan(0);

    await prisma.jobScore.deleteMany({ where: { jobId: job.id } });
    await prisma.jobPosting.delete({ where: { id: job.id } });
    await prisma.company.delete({ where: { id: company.id } });
    await prisma.experienceItem.delete({ where: { id: experience.id } });
    await prisma.targetProfile.delete({ where: { id: target.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });
});
