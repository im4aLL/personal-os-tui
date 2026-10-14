// Trailing-edge debounce for a write with a single pending payload: rapid
// updates coalesce into one call after the values settle. The latest payload is
// flushed on unmount and on quit (through the pending-write registry), so a
// debounced change is never dropped. The caller owns error handling inside
// `write`; a drain flush swallows rejections so shutdown cannot be blocked.
// Runtime only; the handle type lives in `useDebouncedWrite.types.ts`.
import { useCallback, useEffect, useRef } from "react";
import { registerPendingWrite } from "../lib/pending-writes";
import type { DebouncedWrite } from "./useDebouncedWrite.types";

export function useDebouncedWrite<T>(
  write: (payload: T) => Promise<void> | void,
  delayMs: number,
): DebouncedWrite<T> {
  // The write callback is read at flush time, so a scheduled payload always
  // uses the latest closure (and the caller may recreate it for free).
  const writeRef = useRef(write);
  writeRef.current = write;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<T | null>(null);

  const flush = useCallback(async (): Promise<void> => {
    const payload = pendingRef.current;
    if (payload === null) {
      return;
    }
    pendingRef.current = null;
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    try {
      await writeRef.current(payload);
    } catch {
      // The caller's write surfaces its own failure; a drain must not reject.
    }
  }, []);

  const schedule = useCallback(
    (payload: T): void => {
      pendingRef.current = payload;
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        void flush();
      }, delayMs);
    },
    [flush, delayMs],
  );

  // Leaving the screen (or unmounting a pane) must not drop the last write.
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      void flush();
    };
  }, [flush]);

  // A quit during the debounce window drains the pending write first.
  useEffect(() => registerPendingWrite(flush), [flush]);

  return { schedule, flush };
}
