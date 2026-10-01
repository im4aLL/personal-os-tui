// Real SettingsRepo: remote profile read/write through app_settings.
import {
  getProfile,
  getSetting,
  saveProfile as saveRemoteProfile,
  setSetting,
} from "../../lib/settings";
import type { Profile, SettingsRepo } from "../types";

export const tursoSettingsRepo: SettingsRepo = {
  async getSetting(key: string): Promise<string | null> {
    return getSetting(key);
  },

  async setSetting(key: string, value: string): Promise<void> {
    await setSetting(key, value);
  },

  async getProfile(): Promise<Profile | null> {
    return getProfile();
  },

  async saveProfile(profile: Profile): Promise<void> {
    await saveRemoteProfile(profile);
  },
};
