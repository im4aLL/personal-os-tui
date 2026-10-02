export interface ProgressBarProps {
  /** Completion ratio, clamped to 0..1. */
  ratio: number;
  /** Filled-bar width in columns, excluding the label. */
  width: number;
  /** Trailing label; defaults to the rounded percentage. */
  label?: string;
}
