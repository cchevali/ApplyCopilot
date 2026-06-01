import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import http from "http";
import crypto from "crypto";
import { runJobsRefresh } from "@/lib/jobs/refresh";

const prisma = new PrismaClient();

describe("jobs_refresh integration", () => {
  let server: http.Server;
  let baseUrl = "";
  const email = `test-${crypto.randomUUID()}@example.com`;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      const html = `
        <html><head>
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "JobPosting",
              "title": "Service Desk Analyst",
              "description": "Support Windows and O365 users.",
              "datePosted": "2026-02-01",
              "hiringOrganization": { "name": "Acme Support" },
              "jobLocation": { "address": { "addressLocality": "Reston", "addressRegion": "VA" } },
              "url": "http://localhost/job/1"
            }
          </script>
        </head></html>
      `;
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(html);
    });
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const address = server.address();
        if (typeof address === "object" && address) {
          baseUrl = `http://127.0.0.1:${address.port}`;
        }
        resolve();
      });
    });

    const user = await prisma.user.create({
      data: {
        email,
        name: "Test User",
        passwordHash: "hash",
      },
    });
    await prisma.targetProfile.create({
      data: {
        name: "Northern Virginia",
        locations: ["Reston"],
        remoteAllowed: true,
        roleTitles: ["Service Desk Analyst"],
        includeKeywords: ["Windows", "O365"],
        excludeKeywords: [],
      },
    });
    await prisma.experienceItem.create({
      data: {
        userId: user.id,
        company: "ExampleCo",
        title: "Support Tech",
        bullets: ["Resolved Windows issues for end users"],
        skillsTags: ["Windows", "O365"],
        verified: true,
      },
    });
    await prisma.jobSource.create({
      data: {
        userId: user.id,
        name: "Acme Careers",
        type: "CAREERS_PAGE_JSONLD",
        urlOrHandle: baseUrl,
        isEnabled: true,
      },
    });
  });

  afterAll(async () => {
    await prisma.dailyQueueItem.deleteMany();
    await prisma.dailyQueue.deleteMany();
    await prisma.ingestRun.deleteMany();
    await prisma.jobSource.deleteMany();
    await prisma.jobScore.deleteMany();
    await prisma.jobPosting.deleteMany();
    await prisma.company.deleteMany();
    await prisma.experienceItem.deleteMany();
    await prisma.targetProfile.deleteMany({ where: { name: "Northern Virginia" } });
    await prisma.user.deleteMany({ where: { email } });
    await prisma.$disconnect();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("ingests jobs and computes score", async () => {
    await runJobsRefresh();
    const job = await prisma.jobPosting.findFirst({
      where: { title: "Service Desk Analyst" },
    });
    expect(job).not.toBeNull();
    const score = await prisma.jobScore.findFirst({
      where: { jobId: job?.id },
    });
    expect(score).not.toBeNull();
  });
});
