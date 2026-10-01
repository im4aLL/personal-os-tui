// Screen-owned key scope. `App` owns the single global `useKeyboard` handler
// and consults this module before its own bindings, so a screen can preempt
// globals (e.g. Todo's Ctrl+D pages instead of opening the mock panel) without
// depending on React listener-ordering.
//
// Scopes are a per-mount LIFO stack: each mounted hook pushes one wrapper and
// removes exactly that wrapper on unmount, and `resolveKeyScope` runs the top
// of the stack. With a single scoped screen the behavior is unchanged; if
// scoped components ever overlap, the most recently mounted one wins and the
// one beneath it resumes when the top unmounts, so a lost scope cannot mute an
// active screen's keys. Runtime only; the handler type lives in
// `useKeyboardScope.types.ts`.
import { useEffect, useRef } from "react";
import type { KeyScopeHandler } from "./useKeyboardScope.types";

const scopes: KeyScopeHandler[] = [];

/** Run the active screen scope, if any. True means the key was consumed. */
export function resolveKeyScope(key: Parameters<KeyScopeHandler>[0]): boolean {
  return scopes[scopes.length - 1]?.(key) ?? false;
}

/** Register `handler` as the active screen scope for this component's lifetime.
 * The latest handler is kept in a ref so the registered wrapper stays stable
 * across renders (and always closes over current state). Mounts push onto the
 * scope stack; unmount removes only this mount's wrapper. */
export function useKeyboardScope(handler: KeyScopeHandler): void {
  const ref = useRef(handler);
  ref.current = handler;

  useEffect(() => {
    const wrapper: KeyScopeHandler = (key) => ref.current(key);
    scopes.push(wrapper);
    return () => {
      const index = scopes.lastIndexOf(wrapper);
      if (index !== -1) {
        scopes.splice(index, 1);
      }
    };
  }, []);
}
