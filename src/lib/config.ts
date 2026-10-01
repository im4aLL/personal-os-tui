// Config file read path (M0). Write path arrives with Setup wiring (W1).
//
// Location precedence: POS_CONFIG_DIR > XDG_CONFIG_HOME > platform default
// (~/.config, or %APPDATA% on Windows), joined with personal-os-tui/config.json.
//
// POS_TURSO_URL / POS_TURSO_TOKEN override the file and are never persisted.
// The token is redacted in every error message and log line.
import { mkdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type {
  AppConfig,
  EffectiveCredentials,
  LoadedConfig,
  TursoCredentials,
} from "./config.types";

export const CONFIG_DIR_NAME = "personal-os-tui";
export const CONFIG_FILE_NAME = "config.json";

export function configDir(): string {
  const override = process.env.POS_CONFIG_DIR;
  if (override !== undefined && override !== "") {
    return join(override, CONFIG_DIR_NAME);
  }
  const xdg = process.env.XDG_CONFIG_HOME;
  if (xdg !== undefined && xdg !== "") {
    return join(xdg, CONFIG_DIR_NAME);
  }
  if (process.platform === "win32" && process.env.APPDATA !== undefined) {
    return join(process.env.APPDATA, CONFIG_DIR_NAME);
  }
  return join(homedir(), ".config", CONFIG_DIR_NAME);
}

export function configPath(): string {
  return join(configDir(), CONFIG_FILE_NAME);
}

export function defaultConfig(): AppConfig {
  return {
    version: 1,
    turso: {},
    ui: {
      theme: "mocha",
      notesFontSize: 14,
      notesPrivacyMode: false,
      sidebarCollapsed: false,
    },
    onboarding: { completed: false },
  };
}

/** Safe log form of a token: a short leading prefix for long tokens, a fixed
 * mask otherwise. The tail is never revealed. */
export function redactToken(token: string): string {
  // Below this length even a three-character prefix reveals too much.
  if (token.length < 12) {
    return "****";
  }
  return `${token.slice(0, 3)}...`;
}

function hasLoosePermissions(mode: number): boolean {
  // Windows has no POSIX permission bits: stat().mode is effectively 0o666 for
  // every file, so the group/other test would always report loose. Report
  // not-loose and rely on the platform ACL model instead.
  if (process.platform === "win32") {
    return false;
  }
  // Any group/other read/write/execute bit set means the file is not owner-only.
  return (mode & 0o077) !== 0;
}

export async function loadConfig(): Promise<LoadedConfig> {
  const path = configPath();
  const envUrl = process.env.POS_TURSO_URL ?? "";
  const envToken = process.env.POS_TURSO_TOKEN ?? "";
  const fromEnv = envUrl !== "" || envToken !== "";

  let config: AppConfig | null = null;
  let loosePermissions = false;

  try {
    const raw = await readFile(path, "utf8");
    const parsed = JSON.parse(raw) as Partial<AppConfig>;
    const base = defaultConfig();
    config = {
      version: 1,
      turso: {
        url: typeof parsed.turso?.url === "string" ? parsed.turso.url : undefined,
        token: typeof parsed.turso?.token === "string" ? parsed.turso.token : undefined,
      },
      ui: {
        theme: typeof parsed.ui?.theme === "string" ? parsed.ui.theme : base.ui.theme,
        notesFontSize:
          typeof parsed.ui?.notesFontSize === "number"
            ? parsed.ui.notesFontSize
            : base.ui.notesFontSize,
        notesPrivacyMode: parsed.ui?.notesPrivacyMode === true,
        sidebarCollapsed: parsed.ui?.sidebarCollapsed === true,
      },
      onboarding: {
        completed: parsed.onboarding?.completed === true,
        completedAt:
          typeof parsed.onboarding?.completedAt === "string"
            ? parsed.onboarding.completedAt
            : undefined,
      },
    };
    try {
      const info = await stat(path);
      loosePermissions = hasLoosePermissions(info.mode);
    } catch {
      // Permission metadata is advisory; a missing file stat must not fail load.
      loosePermissions = false;
    }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      throw new Error(`pos could not read config at ${path}: ${(error as Error).message}`);
    }
    config = null;
  }

  const url = envUrl !== "" ? envUrl : (config?.turso.url ?? "");
  const token = envToken !== "" ? envToken : (config?.turso.token ?? "");
  // Complete means credentials AND a finished onboarding flow; a config with
  // credentials but onboarding.completed === false still opens Setup.
  const complete = url !== "" && token !== "" && config?.onboarding.completed === true;

  return { config, path, complete, loosePermissions, fromEnv };
}

/** Write config with the given credentials and onboarding completed. Writes a
 * temporary file next to the target, then renames it atomically, and sets
 * owner-only permissions (0o600 file, 0o700 directory). */
export async function saveConfig(credentials: TursoCredentials): Promise<void> {
  const path = configPath();
  const existing = await loadConfig();
  const base = existing.config ?? defaultConfig();
  const next: AppConfig = {
    ...base,
    turso: { url: credentials.url, token: credentials.token },
    onboarding: { completed: true, completedAt: new Date().toISOString() },
  };

  let tmp: string | null = null;
  try {
    await mkdir(dirname(path), { recursive: true, mode: 0o700 });
    tmp = `${path}.tmp-${process.pid}-${Date.now()}`;
    await writeFile(tmp, JSON.stringify(next, null, 2), { mode: 0o600 });
    await rename(tmp, path);
  } catch (error) {
    if (tmp !== null) {
      try {
        await unlink(tmp);
      } catch {
        // Best-effort cleanup; do not mask the original write error.
      }
    }
    throw error;
  }
}

/** Effective credentials with the source recorded; the token must be redacted before logging. */
export function effectiveCredentials(loaded: LoadedConfig): EffectiveCredentials {
  // Empty env strings are treated as unset, matching loadConfig.
  const envUrl = process.env.POS_TURSO_URL ?? "";
  const envToken = process.env.POS_TURSO_TOKEN ?? "";
  const urlFromEnv = envUrl !== "";
  const tokenFromEnv = envToken !== "";
  return {
    url: urlFromEnv ? envUrl : (loaded.config?.turso.url ?? ""),
    token: tokenFromEnv ? envToken : (loaded.config?.turso.token ?? ""),
    urlFromEnv,
    tokenFromEnv,
  };
}
