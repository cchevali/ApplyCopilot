import { describe, expect, it } from "vitest";
import { extractJobsFromJsonLd } from "@/lib/ats/jsonld";

describe("extractJobsFromJsonLd", () => {
  it("parses JobPosting blocks", () => {
    const html = `
      <html>
        <head>
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "JobPosting",
              "title": "Help Desk Technician",
              "description": "Provide support",
              "datePosted": "2026-01-31",
              "hiringOrganization": { "name": "Acme" },
              "jobLocation": { "address": { "addressLocality": "Reston", "addressRegion": "VA" } },
              "url": "https://example.com/jobs/1"
            }
          </script>
        </head>
      </html>
    `;

    const jobs = extractJobsFromJsonLd(html);
    expect(jobs.length).toBe(1);
    expect(jobs[0].title).toBe("Help Desk Technician");
    expect(jobs[0].company).toBe("Acme");
    expect(jobs[0].location).toContain("Reston");
  });
});
