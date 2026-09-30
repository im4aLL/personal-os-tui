// Turso stub (M0). Throws until the Setup wiring milestone lands.
import type { Profile, SettingsRepo } from "../types";

function notWired(what: string): Error {
  return new Error(`turso ${what} is not wired yet`);
}

export const tursoSettingsRepo: SettingsRepo = {
  getSetting(_key: string): Promise<string | null> {
    throw notWired("settings.getSetting");
  },
  setSetting(_key: string, _value: string): Promise<void> {
    throw notWired("settings.setSetting");
  },
  getProfile(): Promise<Profile | null> {
    throw notWired("settings.getProfile");
  },
  saveProfile(_profile: Profile): Promise<void> {
    throw notWired("settings.saveProfile");
  },
};
