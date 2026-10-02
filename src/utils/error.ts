// Shared error-message extraction for stores and screens. Runtime only; no
// exported types.

/** Human-readable message for an unknown thrown value. */
export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Prefix a failure with the operation that failed, so a surfaced error names
 * what the user tried to do instead of only repeating the transport message. */
export function operationError(operation: string, error: unknown): string {
  return `${operation}: ${messageOf(error)}`;
}

/** Standard retry affordance appended to a retryable failure, so the key hint
 * reads the same everywhere and the render-time banner does not have to add it. */
export const RETRY_SUFFIX = "  (r to retry)";

/** `operationError` with the retry hint inline, for a failure the same `r` key
 * can repeat. */
export function retryableError(operation: string, error: unknown): string {
  return `${operationError(operation, error)}${RETRY_SUFFIX}`;
}
