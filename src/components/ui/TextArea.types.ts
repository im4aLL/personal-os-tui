import type { KeyEvent, TextareaRenderable } from "@opentui/core";
import type { Ref } from "react";

export interface TextAreaProps {
  /** Initial buffer text; the `<textarea>` primitive is uncontrolled, so read
   * the live value through `textareaRef` (`plainText`). */
  initialValue?: string;
  /** True when this field owns the keyboard. Only one field is focused. */
  focused: boolean;
  placeholder?: string;
  /** Visible height in rows (default 4). Ignored when `fill` is true. */
  height?: number;
  /** Fill the parent's remaining space instead of a fixed row count. */
  fill?: boolean;
  /** Draw the focus border (default true). */
  bordered?: boolean;
  /** Ref to the underlying renderable, for `plainText` on submit. */
  textareaRef?: Ref<TextareaRenderable>;
  /** Fires after any content change (typing, paste, delete). */
  onChange?: () => void;
  onKeyDown?: (key: KeyEvent) => void;
}
