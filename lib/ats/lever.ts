export type LeverJob = {
  title: string;
  location: string | null;
  url: string | null;
  description: string;
  postedAt?: string;
};

export function extractLeverCompany(handleOrUrl: string) {
  try {
    const url = new URL(handleOrUrl);
    if (!url.hostname.includes("lever.co")) {
      return null;
    }
    const parts = url.pathname.split("/").filter(Boolean);
    return parts[0] || null;
  } catch {
    return handleOrUrl;
  }
}

export async function fetchLeverJobs(handleOrUrl: string) {
  const handle = extractLeverCompany(handleOrUrl);
  if (!handle) {
    throw new Error("Could not infer Lever company handle.");
  }
  const response = await fetchWithBackoff(
    `https://api.lever.co/v0/postings/${handle}?mode=json`,
    {
      headers: {
        "User-Agent": "ApplyCopilot/1.0 (local)",
      },
    }
  );
  if (!response.ok) {
    throw new Error("Lever fetch failed.");
  }
  const payload = await response.json();
  const jobs = Array.isArray(payload) ? payload : [];
  return jobs.map((job: any) => ({
    title: job.text || "Untitled",
    location: job.categories?.location || null,
    url: job.hostedUrl || job.applyUrl || null,
    description: job.descriptionPlain || job.description || "",
    postedAt: job.createdAt ? new Date(job.createdAt).toISOString() : null,
  })) as LeverJob[];
}

async function fetchWithBackoff(url: string, init: RequestInit, retries = 1) {
  const response = await fetch(url, init);
  if (response.status === 429 && retries > 0) {
    const retryAfter = response.headers.get("retry-after");
    const waitSeconds = retryAfter ? Number(retryAfter) : NaN;
    const waitMs = Number.isFinite(waitSeconds) ? waitSeconds * 1000 : 2000;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    return fetchWithBackoff(url, init, retries - 1);
  }
  return response;
}
