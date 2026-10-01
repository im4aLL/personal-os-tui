export interface WeekGroupHeaderProps {
  label: string;
  /** Number of entries in the group; rendered as `N entries` / `1 entry`. */
  count: number;
  /** Content width available for the header line, in columns. */
  width: number;
}
