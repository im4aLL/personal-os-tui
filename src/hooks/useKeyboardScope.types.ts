import type { KeyEvent } from "@opentui/core";

/** A screen-owned key handler. Return true when the key is consumed, false to
 * let the global bindings (and focused control) see it. */
export type KeyScopeHandler = (key: KeyEvent) => boolean;
