import type { SettingsRepo, SetupRepo } from "../repos/types";

export interface SetupScreenProps {
  setup: SetupRepo;
  settings: SettingsRepo;
  quit: () => void;
  /** Edit an existing config instead of first-run onboarding: prefill the
   * current credentials, go to the profile step even when a profile already
   * exists, and cancel back to the app on Esc. */
  editing?: boolean;
}

export type SetupStep = "connect" | "connecting" | "failure" | "profile";

export type ConnectStageState = "pending" | "active" | "done";

export interface ConnectStage {
  label: string;
  state: ConnectStageState;
  /** Extra detail shown once the stage resolves (e.g. "N applied, M ensured"). */
  detail?: string;
}
