// Project timeline helpers for the planner grid, ported from the desktop
// `personal-os/src/lib/week-utils.ts` with this repo's camelCase `Project`
// fields and local `YYYY-MM-DD` dates. A project week starts on its
// `startDate` and runs seven days; week 1 is the week containing `startDate`.
// Runtime only; the `WeekHeader` shape lives in `week-utils.types.ts`.
import { addDaysISO } from "../utils/date";
import type { WeekHeader } from "./week-utils.types";

const DAY_MS = 86_400_000;

/** Parse a local `YYYY-MM-DD` string into a local-midnight Date. */
function parseLocalDate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

/** Today at local midnight (matches the local date strings above). */
function startOfToday(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

/** Whole local calendar days from `from` to `to`. Rounds the millisecond span
 * so a DST shift (a 23 or 25 hour day) cannot skew the week boundary. */
function wholeDaysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / DAY_MS);
}

/** The week number (1-based) containing today, or null when today falls
 * before the project starts or after its last week. */
export function getCurrentWeek(startDate: string, weekCount: number): number | null {
  const start = parseLocalDate(startDate);
  if (Number.isNaN(start.getTime())) {
    return null;
  }
  const week = Math.floor(wholeDaysBetween(start, startOfToday()) / 7) + 1;
  return week >= 1 && week <= weekCount ? week : null;
}

/** Whole-project time progress as a 0-100 percentage, clamped at both ends. */
export function getProjectTimeProgress(startDate: string, weekCount: number): number {
  if (weekCount <= 0) {
    return 0;
  }
  const start = parseLocalDate(startDate);
  if (Number.isNaN(start.getTime())) {
    return 0;
  }
  const week = Math.floor(wholeDaysBetween(start, startOfToday()) / 7) + 1;
  return Math.max(0, Math.min(100, Math.round((week / weekCount) * 100)));
}

/** Compact, locale-independent month/day label, e.g. `9/1`. Kept numeric (not
 * `Intl`) so week columns and project rows share a stable width. Falls back to
 * the raw value when the date is invalid. */
export function formatMonthDay(iso: string): string {
  const date = parseLocalDate(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

/** One header entry per project week, in order, with the current week flagged. */
export function getWeekHeaders(startDate: string, weekCount: number): WeekHeader[] {
  const current = getCurrentWeek(startDate, weekCount);
  return Array.from({ length: Math.max(0, weekCount) }, (_, index) => ({
    weekNum: index + 1,
    date: formatMonthDay(addDaysISO(startDate, index * 7)),
    isCurrent: current === index + 1,
  }));
}

/** Human range label for a project, e.g. `Sep 1 - Nov 24, 2026`. Uses a plain
 * hyphen; the end year is always shown and the start year only when it differs
 * from the current year. Falls back to the raw start date when invalid. */
export function getProjectDateRange(startDate: string, weekCount: number): string {
  const start = parseLocalDate(startDate);
  if (Number.isNaN(start.getTime())) {
    return startDate;
  }
  const end = parseLocalDate(addDaysISO(startDate, weekCount * 7 - 1));
  const thisYear = new Date().getFullYear();
  const base: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const withYear: Intl.DateTimeFormatOptions = { ...base, year: "numeric" };
  const startLabel = start.toLocaleDateString(
    undefined,
    start.getFullYear() !== thisYear ? withYear : base,
  );
  const endLabel = end.toLocaleDateString(undefined, withYear);
  return `${startLabel} - ${endLabel}`;
}
