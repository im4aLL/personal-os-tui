// Shared error-message extraction for stores and screens. Runtime only; no
// exported types.

/** Human-readable message for an unknown thrown value. */
export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
