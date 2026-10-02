// Shared active-row marker for every list in the app. Kept in one module so the
// glyph and its two-cell width stay consistent everywhere; changing the marker
// is a one-line edit here.

/** Glyph shown on the active/selected row. */
export const ACTIVE_GLYPH = "»"; // ● | ■ | » | → | ▷ | ☆

/** Two-cell leading prefix for an active row (glyph + space). */
export const ACTIVE_MARKER = `${ACTIVE_GLYPH} `;

/** Two-cell blank prefix that aligns inactive rows under ACTIVE_MARKER. */
export const BLANK_MARKER = "  ";

/** Leading marker for a row: ACTIVE_MARKER when active, BLANK_MARKER otherwise. */
export function rowMarker(active: boolean): string {
  return active ? ACTIVE_MARKER : BLANK_MARKER;
}

export function menuRowMarker(active: boolean): string {
  return active ? `● ` : BLANK_MARKER;
}
