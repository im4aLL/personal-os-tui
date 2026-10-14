// Keyboard ownership for text controls. A screen marks the control that owns
// the keyboard with an id in `ui.focusedField`; App's single global key handler
// reads it through `getState` and defers plain keys to the focused control
// (instead of running a browsing binding). The state sync must keep up with the
// keys it guards: the effect below lands after React commits, so a key that
// arrives in the same input chunk as the one that opened a field - fast typing,
// a coalesced terminal read, a busy render - would still reach the global
// bindings and fire them. `claimFocusedField` closes that window by letting the
// key handler claim ownership synchronously, in the same tick, so the next key
// in the chunk already sees it. That covers App's global deferral only: App
// runs the screen scope before that check, and the scope runs the handler
// captured on the last committed render, so a screen whose own branch decides
// whether the field owns typing must read its own synchronous flag for that
// branch instead of the committed state. Runtime only; no exported types.
import { useEffect } from "react";
import { useUi } from "../store/ui";

/** Claim (a field id) or release (null) keyboard ownership synchronously, so a
 * key handled right after the one that made the change already defers. */
export function claimFocusedField(fieldId: string | null): void {
  useUi.getState().setFocusedField(fieldId);
}

/** Keep `ui.focusedField` in sync with a screen's field ownership for the
 * component's lifetime, covering ownership that changes without a keypress
 * (mouse, async load, a dialog opening). Key handlers that open a field also
 * call `claimFocusedField` so App's same-tick deferral race is closed; that
 * does not cover the screen's own scope, which runs the last committed handler,
 * so a screen branch that defers typed keys keeps its own ref for it. */
export function useFocusedField(owned: boolean, fieldId: string): void {
  useEffect(() => {
    claimFocusedField(owned ? fieldId : null);
    return () => {
      claimFocusedField(null);
    };
  }, [owned, fieldId]);
}
