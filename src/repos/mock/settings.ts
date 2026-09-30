// In-memory SettingsRepo plus the mock profile.
import type { Profile, SettingsRepo } from "../types";
import { mockCall } from "./guard";

let settings = new Map<string, string>();
let profile: Profile | null = null;

export function resetSettingsFixtures(): void {
  settings = new Map<string, string>();
  profile = null;
}

export const mockSettingsRepo: SettingsRepo = {
  getSetting(key: string): Promise<string | null> {
    return mockCall(() => settings.get(key) ?? null);
  },

  setSetting(key: string, value: string): Promise<void> {
    return mockCall(() => {
      settings.set(key, value);
    });
  },

  getProfile(): Promise<Profile | null> {
    return mockCall(() => profile);
  },

  saveProfile(next: Profile): Promise<void> {
    return mockCall(() => {
      profile = { ...next };
    });
  },
};
