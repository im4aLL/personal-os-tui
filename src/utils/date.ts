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

/** Add `days` to a `YYYY-MM-DD` string, returning a local `YYYY-MM-DD`.
 * Returns the input unchanged when it is not a valid calendar date. */
export function addDaysISO(iso: string, days: number): string {
  const date = parseLocalISO(iso);
  if (date === null) {
    return iso;
  }
  date.setDate(date.getDate() + days);
  return toLocalISO(date);
}

/** Monday of the ISO week `weeksOffset` weeks from the current week, as a
 * local `YYYY-MM-DD` string (0 = this week, -1 = last week). Monday is
 * `date.getDay() === 1`, Sunday is `0`, so Sunday maps back six days. */
export function mondayOfWeekISO(weeksOffset: number): string {
  const date = startOfToday();
  const dayFromMonday = date.getDay() === 0 ? 6 : date.getDay() - 1;
  date.setDate(date.getDate() - dayFromMonday + weeksOffset * 7);
  return toLocalISO(date);
}

/** First day of the current month as a local `YYYY-MM-DD` string. */
export function firstOfMonthISO(): string {
  const date = startOfToday();
  date.setDate(1);
  return toLocalISO(date);
}

/** True when `iso` is a real calendar date in `YYYY-MM-DD` form. */
export function isValidISODate(iso: string): boolean {
  return parseLocalISO(iso) !== null;
}

/** Compact work-log range label: `Sep 29` for one day, `Sep 28 - Sep 29` for
 * a range. Each endpoint gets `, YYYY` appended when its year differs from the
 * current year. Falls back to the raw values when either date is invalid. */
export function formatWorkLogRange(start: string, end: string): string {
  const startDate = parseLocalISO(start);
  const endDate = parseLocalISO(end);
  if (startDate === null || endDate === null) {
    return start === end ? start : `${start} - ${end}`;
  }
  const thisYear = new Date().getFullYear();
  const format = (date: Date): string =>
    date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      ...(date.getFullYear() !== thisYear ? { year: "numeric" } : {}),
    });
  if (start === end) {
    return format(startDate);
  }
  return `${format(startDate)} - ${format(endDate)}`;
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

/** "Now" for the dashboard header. `POS_TIME_OVERRIDE` (an ISO-8601 local
 * datetime such as `2026-10-01T14:30:00`) pins the greeting and the dated
 * header for review; an unset or invalid value falls back to the real clock.
 * This never affects `todayISO()` or fixture generation. */
export function dashboardNow(): Date {
  const override = process.env.POS_TIME_OVERRIDE;
  if (override !== undefined && override !== "") {
    const parsed = new Date(override);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return new Date();
}

/** Time-of-day greeting for `date` (defaults to the dashboard clock):
 * `Working late` before 5, `Good morning` before 12, `Good afternoon` before
 * 18, else `Good evening`. */
export function timeOfDayGreeting(date: Date = dashboardNow()): string {
  const hour = date.getHours();
  if (hour < 5) {
    return "Working late";
  }
  if (hour < 12) {
    return "Good morning";
  }
  if (hour < 18) {
    return "Good afternoon";
  }
  return "Good evening";
}

/** Long localized date line for `date` (defaults to the dashboard clock),
 * e.g. `Thursday, October 1`, in the OS locale. */
export function formatLongDate(date: Date = dashboardNow()): string {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/** Compact relative label for an ISO datetime: `Just now`, `12m ago`,
 * `3h ago`, `Yesterday`, `Aug 12`, or `Aug 12, 2025` for another year.
 * `now` is the reference clock (defaults to the real clock) so the dashboard
 * can pass `dashboardNow()` and stay consistent with the header under
 * `POS_TIME_OVERRIDE`. Falls back to the raw value on an invalid date. */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) {
    return iso;
  }
  const diff = now.getTime() - then.getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  if (minutes < 1) {
    return "Just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const yesterday = new Date(now.getTime());
  yesterday.setDate(yesterday.getDate() - 1);
  if (then.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }
  const sameYear = then.getFullYear() === now.getFullYear();
  return then.toLocaleDateString(
    undefined,
    sameYear
      ? { month: "short", day: "numeric" }
      : { month: "short", day: "numeric", year: "numeric" },
  );
}
