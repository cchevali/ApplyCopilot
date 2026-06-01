type RetryOptions = {
  retries?: number;
  backoffMs?: number;
  retryOn?: number[];
  timeoutMs?: number;
};

export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  options: RetryOptions = {}
) {
  const retries = options.retries ?? 3;
  const backoffMs = options.backoffMs ?? 800;
  const retryOn = options.retryOn ?? [429, 503];
  const timeoutMs = options.timeoutMs ?? 15000;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!retryOn.includes(response.status) || attempt === retries) {
        return response;
      }
      const wait = backoffMs * Math.pow(2, attempt);
      await sleep(wait);
    } catch (error) {
      clearTimeout(timeout);
      if (attempt === retries) {
        throw error;
      }
      const wait = backoffMs * Math.pow(2, attempt);
      await sleep(wait);
    }
  }
  throw new Error("Failed to fetch after retries.");
}

export async function sleep(ms: number) {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}
