// Shared bar glyphs and ratio helpers for every bar in the app: the percentage
// progress bars and the planner's timeline bars. Kept in one module so the
// fill/empty characters stay consistent everywhere; changing a bar style is a
// one-line edit here.

/** Glyph for a filled bar cell. */
export const BAR_FILL_GLYPH = "|"; // # | █ | ▓ | =

/** Glyph for a bar cell that is not filled (empty remainder, planner done). */
export const BAR_EMPTY_GLYPH = "-"; // - | ░ | ·

/** Clamp a ratio into the 0..1 range. */
export function clampRatio(ratio: number): number {
  return Math.max(0, Math.min(1, ratio));
}

/** Filled and empty cell counts for a bar of `width` cells at `ratio`. */
export function progressBarSegments(
  ratio: number,
  width: number,
): { filled: number; empty: number } {
  const cells = Math.max(1, Math.floor(width));
  const filled = Math.round(clampRatio(ratio) * cells);
  return { filled, empty: cells - filled };
}

/** Filled run of a bar; empty when the ratio is 0. */
export function progressBarFill(ratio: number, width: number): string {
  return BAR_FILL_GLYPH.repeat(progressBarSegments(ratio, width).filled);
}

/** Empty run of a bar; empty when the ratio is 1. */
export function progressBarEmpty(ratio: number, width: number): string {
  return BAR_EMPTY_GLYPH.repeat(progressBarSegments(ratio, width).empty);
}
