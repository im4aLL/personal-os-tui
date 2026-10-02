import type { MouseEvent } from "@opentui/core";

// Mouse is an additive layer: every action here also has a keyboard path, and
// when the renderer runs with `POS_NO_MOUSE=1` these handlers simply never fire.
//
// OpenTUI reports raw down/up events with no click count, so a double-click is
// derived by timing two primary-button presses on the same row id.

const DOUBLE_CLICK_MS = 350;

// Pending first press per row id, at module scope. This global is intentional:
// `rowClickHandler` is recreated every render (and the first click triggers a
// selection re-render), so the double-click window cannot live in the handler
// closure, and keying by id keeps simultaneously rendered rows from clobbering
// each other's pending press. Caveat (accepted): ids are assumed unique enough
// across lists rendered at the same time; the `large` clones suffix the base id
// (`<id>-large-<n>`), so cross-domain collisions are unlikely but not
// impossible. Stale entries are swept in `classifyClick`.
const pendingPress = new Map<string, number>();

/** Primary (left) button only; wheel and right clicks never select. */
export function isPrimaryClick(event: MouseEvent): boolean {
  return event.button === 0;
}

/** True for a row whose id was synthesized by the mock `large` scenario. These
 * clones map back to no source row, so opening an edit surface on one can only
 * fail on save; callers skip the activate/edit affordance instead. */
export function isReadOnlyRow(id: string): boolean {
  return id.includes("-large-");
}

/** Classify a press on `id`: the second primary press within the double-click
 * window is "double", the first is "single", and any other button is ignored.
 * A non-primary press clears the id's pending window, and a "double" resets it
 * so a third press starts a fresh window instead of firing twice. */
export function classifyClick(
  id: string,
  event: MouseEvent,
  now: () => number = Date.now,
): "single" | "double" | "ignore" {
  if (!isPrimaryClick(event)) {
    pendingPress.delete(id);
    return "ignore";
  }
  const at = now();
  const previous = pendingPress.get(id);
  if (previous !== undefined && at - previous <= DOUBLE_CLICK_MS) {
    pendingPress.delete(id);
    return "double";
  }
  // Drop stale first presses so a long run of single clicks cannot grow the map
  // without bound. An expired entry classifies as "single" either way.
  for (const [key, pressedAt] of pendingPress) {
    if (at - pressedAt > DOUBLE_CLICK_MS) {
      pendingPress.delete(key);
    }
  }
  pendingPress.set(id, at);
  return "single";
}

/** Wheel direction as a selection delta: -1 up, +1 down, 0 otherwise. A `0`
 * means the event carried no vertical direction and is a no-op; callers should
 * early-return on it rather than feeding it into a selection move. */
export function wheelDelta(event: MouseEvent): number {
  if (event.scroll?.direction === "up") {
    return -1;
  }
  if (event.scroll?.direction === "down") {
    return 1;
  }
  return 0;
}

/** Standard row handler: a primary click selects, a second within the window
 * also activates. Returning a handler keeps the row components to one prop.
 * `now` is injectable so handler-level double-click timing is testable.
 * Activate is skipped for a read-only `large` clone, so double-clicking one
 * selects it without opening an editor that can only fail on save. */
export function rowClickHandler(
  id: string,
  onSelect?: () => void,
  onActivate?: () => void,
  now: () => number = Date.now,
): (event: MouseEvent) => void {
  return (event) => {
    const kind = classifyClick(id, event, now);
    if (kind === "ignore") {
      return;
    }
    onSelect?.();
    if (kind === "double" && !isReadOnlyRow(id)) {
      onActivate?.();
    }
  };
}
