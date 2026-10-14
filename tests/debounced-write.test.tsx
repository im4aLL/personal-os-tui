// Debounced-write hook: rapid updates coalesce into one trailing call, and an
// explicit flush writes immediately. Renders through the OpenTUI test renderer
// with real timers and a short delay so the assertions stay fast. Run with
// `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { testRender } from "@opentui/react/test-utils";
import type { ReactNode } from "react";
import { useDebouncedWrite } from "../src/hooks/useDebouncedWrite";
import type { DebouncedWrite } from "../src/hooks/useDebouncedWrite.types";

const DELAY_MS = 30;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test("useDebouncedWrite coalesces rapid schedules into one trailing write", async () => {
  const writes: string[][] = [];
  const holder: { handle: DebouncedWrite<string[]> | null } = { handle: null };

  function Probe(): ReactNode {
    holder.handle = useDebouncedWrite<string[]>((payload) => {
      writes.push(payload);
    }, DELAY_MS);
    return <text>probe</text>;
  }

  const setup = await testRender(<Probe />, { width: 20, height: 4 });
  try {
    await setup.renderOnce();
    if (holder.handle === null) {
      throw new Error("hook handle was not exposed");
    }
    holder.handle.schedule(["a"]);
    holder.handle.schedule(["a", "b"]);
    holder.handle.schedule(["b", "a"]);
    assert.equal(writes.length, 0, "nothing written before the quiet period");
    await sleep(3 * DELAY_MS);
    assert.deepEqual(writes, [["b", "a"]], "only the last payload is written once");
  } finally {
    setup.renderer.destroy();
  }
});

test("useDebouncedWrite flush writes the pending payload immediately", async () => {
  const writes: string[] = [];
  const holder: { handle: DebouncedWrite<string> | null } = { handle: null };

  function Probe(): ReactNode {
    holder.handle = useDebouncedWrite<string>((payload) => {
      writes.push(payload);
    }, 10_000);
    return <text>probe</text>;
  }

  const setup = await testRender(<Probe />, { width: 20, height: 4 });
  try {
    await setup.renderOnce();
    if (holder.handle === null) {
      throw new Error("hook handle was not exposed");
    }
    holder.handle.schedule("hello");
    assert.equal(writes.length, 0, "not written before flush");
    await holder.handle.flush();
    assert.deepEqual(writes, ["hello"], "flush wrote the pending payload");
  } finally {
    setup.renderer.destroy();
  }
});
