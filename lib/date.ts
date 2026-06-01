export function addBusinessDays(start: Date, days: number) {
  const date = new Date(start);
  let added = 0;
  while (added < days) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) {
      added += 1;
    }
  }
  return date;
}

export function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}
