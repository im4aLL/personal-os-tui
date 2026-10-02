/** One week column header for the Gantt grid: the 1-based week number, the
 * compact start-date label, and whether it is the current week (emphasized in
 * both header rows). */
export interface WeekHeader {
  weekNum: number;
  date: string;
  isCurrent: boolean;
}
