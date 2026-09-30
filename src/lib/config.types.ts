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

/** Effective Turso credentials with the source recorded. */
export interface EffectiveCredentials {
  url: string;
  token: string;
  fromEnv: boolean;
}
