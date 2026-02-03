export function shouldFetch(lastFetchedAt: Date | null | undefined, minMinutes = 15) {
  if (!lastFetchedAt) {
    return true;
  }
  const now = Date.now();
  const last = new Date(lastFetchedAt).getTime();
  return now - last > minMinutes * 60 * 1000;
}
