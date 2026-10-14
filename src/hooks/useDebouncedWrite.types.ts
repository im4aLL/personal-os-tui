/** Handle returned by `useDebouncedWrite`: queue the latest payload and flush
 * it on demand. The payload type is generic so callers keep their own shape. */
export interface DebouncedWrite<T> {
  /** Queue `payload`, replacing any pending one and restarting the timer. */
  schedule: (payload: T) => void;
  /** Write the pending payload now, if any, and cancel the timer. */
  flush: () => Promise<void>;
}
