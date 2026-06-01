export type GreenhouseJob = {
  title: string;
  location: string | null;
  url: string | null;
  description: string;
  postedAt?: string;
};

export function extractGreenhouseCompany(boardUrl: string) {
  try {
    const url = new URL(boardUrl);
    if (!url.hostname.includes("greenhouse.io")) {
      return null;
    }
    const queryCompany = url.searchParams.get("for");
    if (queryCompany) {
      return queryCompany;
    }
    const parts = url.pathname.split("/").filter(Boolean);
    return parts[0] || null;
  } catch {
    return null;
  }
}

export async function fetchGreenhouseJobs(boardUrl: string) {
  const slug = extractGreenhouseCompany(boardUrl);
  if (!slug) {
    throw new Error("Could not infer Greenhouse company slug.");
  }
  const response = await fetchWithBackoff(
    `https://boards.greenhouse.io/${slug}.json`,
    {
      headers: {
        "User-Agent": "ApplyCopilot/0.1 (+local job tracker)",
      },
    }
  );
  if (!response.ok) {
    throw new Error("Greenhouse fetch failed.");
  }
  const payload = await response.json();
  const jobs = Array.isArray(payload.jobs) ? payload.jobs : [];
  return jobs.map((job: any) => ({
    title: job.title || "Untitled",
    location: job.location?.name || null,
    url: job.absolute_url || null,
    description: job.content || "",
    postedAt: job.updated_at || job.created_at || null,
  })) as GreenhouseJob[];
}

async function fetchWithBackoff(url: string, init: RequestInit, retries = 1) {
  const response = await fetch(url, init);
  if ((response.status === 429 || response.status === 503) && retries > 0) {
    const retryAfter = response.headers.get("retry-after");
    const waitSeconds = retryAfter ? Number(retryAfter) : NaN;
    const waitMs = Number.isFinite(waitSeconds) ? waitSeconds * 1000 : 2000;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    return fetchWithBackoff(url, init, retries - 1);
  }
  return response;
}
