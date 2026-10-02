// Deferred-write registry. Screens whose edits are debounced (the Notes
// autosave is the only one today) register a flush callback while they are
// mounted; the entrypoint drains every registered flush before it destroys the
// renderer, so a quit during the debounce window does not lose a typed edit.
//
// Runtime only; the callback signature is a plain `() => Promise<void>`.
const flushCallbacks = new Set<() => Promise<void>>();

/** Register a flush callback. Returns an unregister function for the effect
 * cleanup, so an unmounted screen is never drained. */
export function registerPendingWrite(flush: () => Promise<void>): () => void {
  flushCallbacks.add(flush);
  return () => {
    flushCallbacks.delete(flush);
  };
}

/** Await every registered flush, swallowing individual failures: shutdown must
 * proceed even when one write rejects (the store already surfaces the error). */
export async function runPendingWrites(): Promise<void> {
  await Promise.all(
    [...flushCallbacks].map(async (flush) => {
      try {
        await flush();
      } catch {
        // Best-effort at shutdown; a failed write is already reported in-app.
      }
    }),
  );
}
