import { useTerminalDimensions } from "@opentui/react";
import type { ReactNode } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import { ACTIVE_MARKER, rowMarker } from "../../utils/marker";
import { truncate } from "../../utils/text";
import { EmptyState } from "../ui/EmptyState";
import { Modal } from "../ui/Modal";
import { TextField } from "../ui/TextField";
import type { PhaseManagerProps } from "./PhaseManager.types";

/** Preset recolor palette (Catppuccin-style accents). The color-picker widget is
 * deliberately deferred, so `c` cycles this list. */
export const PHASE_COLORS = [
  "#89B4FA",
  "#A6E3A1",
  "#F38BA8",
  "#F9E2AF",
  "#CBA6F7",
  "#94E2D5",
  "#FAB387",
  "#F5C2E7",
];

// Phase manager modal. Presentational: the screen owns the keys and drafts, so
// this renders the phase rows (swatch, name, item count, move/delete
// affordances) plus the add row ("No phases yet" when empty).
export function PhaseManager(props: PhaseManagerProps): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const { width } = useTerminalDimensions();
  const modalWidth = Math.min(66, Math.max(40, width - 4));
  const innerWidth = modalWidth - 4;
  const addFieldWidth = Math.max(12, innerWidth - 8);
  const nameRoom = Math.max(6, innerWidth - 20);

  return (
    <Modal title="Phases" width={modalWidth}>
      <box flexDirection="column" gap={0}>
        {props.phases.length === 0 && props.mode === "list" ? (
          <EmptyState title="No phases yet" hint="n to add your first phase" />
        ) : (
          props.phases.map((phase, index) => {
            const count = props.workItems.filter(
              (item) => !item.isSeparator && item.phaseId === phase.id,
            ).length;
            const isCursor = index === props.cursor && props.mode !== "add";
            const marker = rowMarker(isCursor);
            const deletable = count === 0;
            const countLabel = `${count} ${count === 1 ? "item" : "items"}`;

            if (props.mode === "rename" && index === props.cursor) {
              return (
                <box key={phase.id} flexDirection="row" height={1}>
                  <text fg={color(tokens.accent)}>{marker}</text>
                  <text fg={color(phase.color)}>{"(*) "}</text>
                  <TextField
                    value={props.renameName}
                    onChange={props.onRenameNameChange}
                    focused={true}
                    placeholder="Phase name"
                    width={addFieldWidth}
                    borderless={true}
                  />
                </box>
              );
            }

            return (
              <box key={phase.id} flexDirection="row" height={1}>
                <text fg={color(isCursor ? tokens.accent : tokens.fgSubtle)}>{marker}</text>
                <text fg={color(phase.color)}>{"(*) "}</text>
                <text
                  wrapMode="none"
                  fg={color(isCursor ? tokens.fg : tokens.fgMuted)}
                >{`${truncate(phase.name, nameRoom).padEnd(nameRoom)} `}</text>
                <text wrapMode="none" fg={color(tokens.fgSubtle)}>{`${countLabel}  ^v `}</text>
                <text
                  fg={color(
                    deletable ? (isCursor ? tokens.danger : tokens.fgSubtle) : tokens.fgDisabled,
                  )}
                >
                  {deletable ? "x" : "-"}
                </text>
              </box>
            );
          })
        )}

        {props.mode === "add" ? (
          <box flexDirection="row" height={1}>
            <text fg={color(tokens.accent)}>{ACTIVE_MARKER}</text>
            <text fg={color(props.addColor)}>{"(*) "}</text>
            <TextField
              value={props.addName}
              onChange={props.onAddNameChange}
              focused={true}
              placeholder="New phase name"
              width={addFieldWidth}
              borderless={true}
            />
          </box>
        ) : null}

        <text fg={color(tokens.fgSubtle)}>
          {"j/k select  K/J move  r rename  c recolor  d delete  n add  esc close"}
        </text>
      </box>
    </Modal>
  );
}
