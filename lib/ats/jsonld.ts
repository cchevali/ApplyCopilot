export type JsonLdJob = {
  title: string;
  description: string;
  location: string | null;
  postedAt: string | null;
  url: string | null;
  company: string | null;
  remote: boolean;
};

export function extractJobsFromJsonLd(html: string): JsonLdJob[] {
  const scripts = Array.from(
    html.matchAll(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    )
  );

  const jobs: JsonLdJob[] = [];

  for (const match of scripts) {
    const raw = match[1];
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw.trim());
      collectJobs(parsed, jobs);
    } catch {
      // ignore invalid JSON-LD blocks
    }
  }

  return jobs;
}

function collectJobs(payload: any, jobs: JsonLdJob[]) {
  if (!payload) return;
  if (Array.isArray(payload)) {
    payload.forEach((item) => collectJobs(item, jobs));
    return;
  }
  if (payload["@graph"] && Array.isArray(payload["@graph"])) {
    payload["@graph"].forEach((item: any) => collectJobs(item, jobs));
    return;
  }

  const type = payload["@type"];
  const typeList = Array.isArray(type) ? type : [type];
  if (typeList.includes("JobPosting")) {
    jobs.push(mapJob(payload));
  }
}

function mapJob(node: any): JsonLdJob {
  const title = String(node.title || node.name || "Untitled");
  const description = String(node.description || "");
  const postedAt = node.datePosted ? String(node.datePosted) : null;
  const url = node.url ? String(node.url) : null;
  const company = node.hiringOrganization?.name
    ? String(node.hiringOrganization.name)
    : null;
  const location = formatLocation(node.jobLocation);
  const remote =
    String(node.jobLocationType || "")
      .toLowerCase()
      .includes("telecommute") ||
    String(node.jobLocationType || "")
      .toLowerCase()
      .includes("remote") ||
    String(location || "").toLowerCase().includes("remote");

  return { title, description, location, postedAt, url, company, remote };
}

function formatLocation(value: any): string | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    const parts = value.map((item) => formatLocation(item)).filter(Boolean);
    return parts.length ? parts.join(" / ") : null;
  }
  if (typeof value === "string") {
    return value;
  }
  const address = value.address || value;
  if (typeof address === "string") {
    return address;
  }
  const locality = address.addressLocality || address.addressRegion || "";
  const region = address.addressRegion || "";
  const country = address.addressCountry || "";
  const pieces = [locality, region, country].filter(Boolean);
  return pieces.length ? pieces.join(", ") : null;
}
