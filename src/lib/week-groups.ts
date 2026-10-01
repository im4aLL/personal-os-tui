// Client-side ISO-week grouping for the Work Log list. The ISO week-key logic
// is ported verbatim from the desktop `personal-os/src/lib/week-groups.ts` with
// this repo's `WorkLog[]` input, which already carries tags. The "this week"
// / "last week" comparison key is computed from the local calendar date on
// purpose: the desktop compares against a UTC date, but every filter and
// fixture here uses the local `YYYY-MM-DD` calendar date (see the warning at
// the top of `utils/date.ts`), so a UTC key would mislabel around midnight.
// Runtime only; the `WeekGroup` shape lives in `week-groups.types.ts`.
import type { WorkLog } from "../repos/types";
import { mondayOfWeekISO, todayISO } from "../utils/date";
import type { WeekGroup } from "./week-groups.types";

// Returns the ISO week key "YYYY-Www" for a given YYYY-MM-DD string.
// Week starts on Monday (ISO 8601).
function getWeekKey(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);

  // ISO week: Thursday of the week determines the year
  const day = date.getDay() === 0 ? 7 : date.getDay(); // Mon=1 ... Sun=7
  const thursday = new Date(date);
  thursday.setDate(date.getDate() + (4 - day));

  const yearStart = new Date(thursday.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((thursday.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);

  return `${thursday.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

// Returns the Monday of the week containing dateStr.
function getMondayOf(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const day = date.getDay() === 0 ? 6 : date.getDay() - 1; // Mon=0 ... Sun=6
  const mon = new Date(date);
  mon.setDate(date.getDate() - day);
  return mon;
}

function getWeekLabel(dateStr: string): string {
  const thisWeekKey = getWeekKey(todayISO());
  const weekKey = getWeekKey(dateStr);

  if (weekKey === thisWeekKey) {
    return "This week";
  }

  // Last week
  if (weekKey === getWeekKey(mondayOfWeekISO(-1))) {
    return "Last week";
  }

  // Older: "Week of Jul 7"
  const monday = getMondayOf(dateStr);
  const thisYear = new Date().getFullYear();
  const formatted = monday.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(monday.getFullYear() !== thisYear ? { year: "numeric" } : {}),
  });
  return `Week of ${formatted}`;
}

/** Bucket logs by ISO week, newest group first. Within a group the entries
 * keep the order they arrived in (the repository sorts newest first). */
export function groupByWeek(logs: WorkLog[]): WeekGroup[] {
  const map = new Map<string, WeekGroup>();

  for (const log of logs) {
    const key = getWeekKey(log.startDate);
    const existing = map.get(key);
    if (existing !== undefined) {
      existing.logs.push(log);
    } else {
      map.set(key, {
        label: getWeekLabel(log.startDate),
        weekKey: key,
        logs: [log],
      });
    }
  }

  // Groups already ordered newest-first because logs come in startDate DESC order
  return Array.from(map.values());
}
