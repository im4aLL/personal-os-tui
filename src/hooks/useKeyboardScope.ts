// Screen-owned key scope. `App` owns the single global `useKeyboard` handler
// and consults this module before its own bindings, so a screen can preempt
// globals (e.g. Todo's Ctrl+D pages instead of opening the mock panel) without
// depending on React listener-ordering. Runtime only; the handler type lives in
// `useKeyboardScope.types.ts`.
import { useEffect, useRef } from "react";
import type { KeyScopeHandler } from "./useKeyboardScope.types";

let active: KeyScopeHandler | null = null;

/** Run the active screen scope, if any. True means the key was consumed. */
export function resolveKeyScope(key: Parameters<KeyScopeHandler>[0]): boolean {
  return active?.(key) ?? false;
}

/** Register `handler` as the active screen scope for this component's lifetime.
 * The latest handler is kept in a ref so the registered wrapper stays stable
 * across renders (and always closes over current state). */
export function useKeyboardScope(handler: KeyScopeHandler): void {
  const ref = useRef(handler);
  ref.current = handler;

  useEffect(() => {
    const wrapper: KeyScopeHandler = (key) => ref.current(key);
    active = wrapper;
    return () => {
      if (active === wrapper) {
        active = null;
      }
    };
  }, []);
}
