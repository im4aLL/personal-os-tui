// Mouse-path tests for the shared UI primitives. They render real components
// through the OpenTUI test renderer and drive them with synthetic mouse events,
// so a regression in the hit-testing or handler wiring fails here rather than
// only in a live terminal. Run with `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import type { TextareaRenderable } from "@opentui/core";
import type { TestRendererSetup } from "@opentui/core/testing";
import { testRender } from "@opentui/react/test-utils";
import { createRef, type ReactNode } from "react";
import { TodoForm } from "../src/components/todos/TodoForm";
import { Button } from "../src/components/ui/Button";
import { ConfirmDialog } from "../src/components/ui/ConfirmDialog";
import { List } from "../src/components/ui/List";
import { Select } from "../src/components/ui/Select";
import { TagInput } from "../src/components/ui/TagInput";
import { TextField } from "../src/components/ui/TextField";
import { ThemeProvider } from "../src/theme/ThemeProvider";

/** Global cell of the first cell of `needle` in the captured frame, or null. */
function findText(frame: string, needle: string): { x: number; y: number } | null {
  const rows = frame.split("\n");
  for (let y = 0; y < rows.length; y += 1) {
    const x = rows[y].indexOf(needle);
    if (x !== -1) {
      return { x, y };
    }
  }
  return null;
}

/** Render `node`, run `body` with the captured frame, and always tear down. */
async function withFrame(
  node: ReactNode,
  body: (setup: TestRendererSetup, frame: string) => Promise<void>,
): Promise<void> {
  const setup = await testRender(<ThemeProvider themeId="mocha">{node}</ThemeProvider>, {
    width: 70,
    height: 24,
  });
  try {
    await setup.renderOnce();
    await body(setup, setup.captureCharFrame());
  } finally {
    setup.renderer.destroy();
  }
}

/** Click two cells into the label so the press lands on text, never a border. */
async function clickLabel(
  setup: TestRendererSetup,
  frame: string,
  label: string,
): Promise<boolean> {
  const at = findText(frame, label);
  if (at === null) {
    return false;
  }
  await setup.mockMouse.click(at.x + 1, at.y);
  return true;
}

test("Button press runs onPress", async () => {
  let pressed = 0;
  await withFrame(
    <Button label="Create" onPress={() => (pressed += 1)} />,
    async (setup, frame) => {
      assert.equal(await clickLabel(setup, frame, "Create"), true, "label rendered");
    },
  );
  assert.equal(pressed, 1);
});

test("Button press is ignored while disabled", async () => {
  let pressed = 0;
  await withFrame(
    <Button label="Create" disabled={true} onPress={() => (pressed += 1)} />,
    async (setup, frame) => {
      await clickLabel(setup, frame, "Create");
    },
  );
  assert.equal(pressed, 0);
});

test("TextField click requests focus", async () => {
  let focused = 0;
  await withFrame(
    <TextField
      value=""
      focused={false}
      placeholder="url-field"
      onChange={() => {}}
      onFocusRequest={() => (focused += 1)}
    />,
    async (setup, frame) => {
      assert.equal(await clickLabel(setup, frame, "url-field"), true, "placeholder rendered");
    },
  );
  assert.equal(focused, 1);
});

test("Select click focuses and selects the pressed row", async () => {
  const events: string[] = [];
  await withFrame(
    <Select
      options={[
        { value: "a", label: "Alpha" },
        { value: "b", label: "Beta" },
        { value: "c", label: "Gamma" },
      ]}
      selectedIndex={0}
      focused={false}
      onFocusRequest={() => events.push("focus")}
      onChange={(index) => events.push(`change-${index}`)}
    />,
    async (setup, frame) => {
      assert.equal(await clickLabel(setup, frame, "Beta"), true, "option rendered");
    },
  );
  assert.deepEqual(events, ["focus", "change-1"]);
});

test("TagInput click removes a chip and applies a suggestion", async () => {
  const events: string[] = [];
  await withFrame(
    <TagInput
      tags={["keep"]}
      inputValue=""
      focused={true}
      suggestions={["alpha"]}
      suggestionIndex={0}
      width={40}
      onInputChange={() => {}}
      onAcceptSuggestion={(tag) => events.push(`add-${tag}`)}
      onRemoveTag={(tag) => events.push(`remove-${tag}`)}
    />,
    async (setup, frame) => {
      assert.equal(await clickLabel(setup, frame, "[keep]"), true, "chip rendered");
      assert.equal(await clickLabel(setup, frame, "alpha"), true, "suggestion rendered");
    },
  );
  assert.deepEqual(events, ["remove-keep", "add-alpha"]);
});

test("ConfirmDialog buttons run confirm and cancel", async () => {
  const events: string[] = [];
  await withFrame(
    <ConfirmDialog
      title="Delete?"
      body="sure?"
      confirmLabel="Delete"
      destructive={true}
      onConfirm={() => events.push("confirm")}
      onCancel={() => events.push("cancel")}
    />,
    async (setup, frame) => {
      assert.equal(await clickLabel(setup, frame, "Cancel"), true, "cancel rendered");
      // The title also contains "Delete", so find the button label on the
      // button row (shared with Cancel) instead of the first textual match.
      const cancel = findText(frame, "Cancel");
      const row = frame.split("\n")[cancel?.y ?? 0] ?? "";
      const delX = row.indexOf("Delete");
      assert.notEqual(delX, -1, "confirm button rendered");
      await setup.mockMouse.click(delX + 1, cancel?.y ?? 0);
    },
  );
  assert.deepEqual(events, ["cancel", "confirm"]);
});

test("List click activates the pressed row", async () => {
  const activated: string[] = [];
  await withFrame(
    <List
      items={[
        { id: "one", label: "First command", detail: "ctrl+1" },
        { id: "two", label: "Second command", detail: "ctrl+2" },
      ]}
      selected={0}
      onActivate={(_index, item) => {
        if (item !== null) {
          activated.push(item.id);
        }
      }}
    />,
    async (setup, frame) => {
      assert.equal(await clickLabel(setup, frame, "Second command"), true, "row rendered");
    },
  );
  assert.deepEqual(activated, ["two"]);
});

test("TodoForm Create button submits (regression: create was not clickable)", async () => {
  let submits = 0;
  await withFrame(
    <TodoForm
      editing={null}
      focusedField="title"
      values={{ title: "Task", priority: "none", dueDate: "", status: "todo" }}
      error={null}
      saving={false}
      descriptionRef={createRef<TextareaRenderable>()}
      onPatch={() => {}}
      onSubmit={() => (submits += 1)}
    />,
    async (setup, frame) => {
      assert.equal(await clickLabel(setup, frame, "Create"), true, "submit button rendered");
    },
  );
  assert.equal(submits, 1);
});
