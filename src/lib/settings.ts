// Remote app_settings access: low-level key/value helpers and the profile
// projection used by Setup and the shell header.
import type { UserProfile } from "./settings.types";
import { tursoExecute, tursoSelect } from "./turso";

interface SettingRow {
  value: string;
}

export async function getSetting(key: string): Promise<string | null> {
  const rows = await tursoSelect<SettingRow>("SELECT value FROM app_settings WHERE key = ?", [key]);
  return rows[0]?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const now = new Date().toISOString();
  await tursoExecute(
    `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, value, now],
  );
}

export async function getProfile(): Promise<UserProfile | null> {
  const [name, email] = await Promise.all([
    getSetting("profile_name"),
    getSetting("profile_email"),
  ]);
  if (name === null || email === null) {
    return null;
  }
  return { name, email };
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await Promise.all([
    setSetting("profile_name", profile.name),
    setSetting("profile_email", profile.email),
  ]);
}
