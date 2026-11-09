// Calendar layout helpers (presentation only): Monday-first week grid for a year.
const DAY = 86400000;
export function calendarDays(year) {
  const start = new Date(Date.UTC(year, 0, 1)), end = new Date(Date.UTC(year + 1, 0, 1));
  const result = Array.from({ length: (start.getUTCDay() + 6) % 7 }, () => null);
  for (let date = start; date < end; date = new Date(date.getTime() + DAY)) result.push(date.toISOString().slice(0, 10));
  while (result.length % 7) result.push(null);
  return result;
}
