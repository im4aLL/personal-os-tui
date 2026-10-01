// Pure local-date helpers shared by todo badges and the mock fixtures.
// Dates are stored and compared as local `YYYY-MM-DD` strings: `toISOString()`
// is UTC and can shift the day, so these functions build and compare local
// calendar dates instead. Runtime only; no exported types live here.

const DAY_MS = 24 * 60 * 60 * 1000;

/** Format a Date as a local `YYYY-MM-DD` string. */
function toLocalISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Parse a `YYYY-MM-DD` string into a local-midnight Date (or null). */
function parseLocalISO(iso: string): Date | null {
  const parts = iso.split("-");
  if (parts.length !== 3) {
    return null;
  }
  const [year, month, day] = parts.map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}

/** Local start of today (midnight). */
function startOfToday(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

/** Today as a local `YYYY-MM-DD` string. */
export function todayISO(): string {
  return toLocalISO(new Date());
}

/** Local `YYYY-MM-DD` offset from today by `days` (negative is past). */
export function isoDateOffset(days: number): string {
  const date = startOfToday();
  date.setDate(date.getDate() + days);
  return toLocalISO(date);
}

/** True when `iso` is a real calendar date in `YYYY-MM-DD` form. */
export function isValidISODate(iso: string): boolean {
  return parseLocalISO(iso) !== null;
}

/** Short month + day, e.g. `Aug 12`. Falls back to the raw value when invalid. */
export function formatShortDate(iso: string): string {
  const date = parseLocalISO(iso);
  if (date === null) {
    return iso;
  }
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

/** Whole local-calendar days from `iso` to today (positive means past). */
function daysSince(iso: string): number {
  const date = parseLocalISO(iso);
  if (date === null) {
    return 0;
  }
  return Math.round((startOfToday().getTime() - date.getTime()) / DAY_MS);
}

/** A due date is overdue only while the todo is still open and its day has passed. */
export function isOverdue(iso: string, completed: boolean): boolean {
  if (completed) {
    return false;
  }
  const date = parseLocalISO(iso);
  if (date === null) {
    return false;
  }
  return date.getTime() < startOfToday().getTime();
}

/** Due-date badge label: `today`, `3d overdue`, or `Aug 12`. */
export function formatDueLabel(iso: string, completed: boolean): string {
  if (completed) {
    return formatShortDate(iso);
  }
  if (isOverdue(iso, completed)) {
    return `${daysSince(iso)}d overdue`;
  }
  if (daysSince(iso) === 0) {
    return "today";
  }
  return formatShortDate(iso);
}
