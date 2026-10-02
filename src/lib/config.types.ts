export interface TursoCredentials {
  url: string;
  token: string;
}

export interface UiPreferences {
  theme: string;
  notesFontSize: number;
  notesPrivacyMode: boolean;
  sidebarCollapsed: boolean;
}

export interface AppConfig {
  version: 1;
  turso: Partial<TursoCredentials>;
  ui: UiPreferences;
  onboarding: { completed: boolean; completedAt?: string };
}

export interface LoadedConfig {
  /** Null when no config file exists yet (first run). */
  config: AppConfig | null;
  /** Resolved config file path, whether or not it exists. */
  path: string;
  /** True when credentials (file or env) are present AND onboarding completed. */
  complete: boolean;
  /** True when the file exists but is readable beyond its owner. */
  loosePermissions: boolean;
  /** True when credentials came from POS_TURSO_* environment overrides. */
  fromEnv: boolean;
}

/** One key binding read from `keymap.json`. Same shape the registry declares
 * (`name`, `ctrl`, `meta`, `shift`); the config layer owns its validation.
 *
 * Keep this structurally compatible with `KeyBinding` in
 * `src/commands/registry.types.ts`: the keymap layer feeds the registry, and
 * the layers stay independent (no shared runtime import) by matching shapes. */
export interface KeymapBinding {
  name: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
}

/** A rejected keymap entry. Advisory only: the app keeps its default and keeps
 * running. `commandId`/`binding` are absent for whole-file problems. */
export interface KeymapSkip {
  commandId?: string;
  binding?: string;
  reason: string;
}

/** Result of reading `keymap.json`. Never secret, never fatal. */
export interface LoadedKeymap {
  /** Resolved keymap file path, whether or not it exists. */
  path: string;
  /** True when the file was read (even if its contents were rejected). */
  exists: boolean;
  /** Schema version when it parsed to a number, else null. */
  version: number | null;
  /** Accepted command id -> replacement bindings. Unlisted commands keep defaults. */
  overrides: Record<string, KeymapBinding[]>;
  /** Malformed or rejected entries, reported and skipped. */
  skipped: KeymapSkip[];
}

/** Effective Turso credentials with the source recorded per field. */
export interface EffectiveCredentials {
  url: string;
  token: string;
  urlFromEnv: boolean;
  tokenFromEnv: boolean;
}
