import type { SettingsRepo, SetupRepo } from "../repos/types";

export interface SetupScreenProps {
  setup: SetupRepo;
  settings: SettingsRepo;
  quit: () => void;
}

export type SetupStep = "connect" | "connecting" | "failure" | "profile";

export type ConnectStageState = "pending" | "active" | "done";

export interface ConnectStage {
  label: string;
  state: ConnectStageState;
  /** Extra detail shown once the stage resolves (e.g. "N applied, M ensured"). */
  detail?: string;
}
