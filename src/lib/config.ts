// Config file read and write path.
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
  KeymapBinding,
  KeymapSkip,
  LoadedConfig,
  LoadedKeymap,
  TursoCredentials,
  UiPreferences,
} from "./config.types";

export const CONFIG_DIR_NAME = "personal-os-tui";
export const CONFIG_FILE_NAME = "config.json";
export const KEYMAP_FILE_NAME = "keymap.json";
/** `keymap.json` schema version. A rename of a command id cannot silently
 * re-point a stale file as long as the version is bumped with the rename. */
export const KEYMAP_VERSION = 1;

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

/** Sibling of `config.json` in the same config directory. A keymap is not
 * secret and is rebuilt from this file only, so it never inherits the config
 * file's credential handling. */
export function keymapPath(): string {
  return join(configDir(), KEYMAP_FILE_NAME);
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

/** Invisible code points: Cc (controls), Cf (format, incl. zero-width and the
 * bidi overrides), and Cn (unassigned). */
const INVISIBLE_KEY_NAME = /[\p{Cc}\p{Cf}\p{Cn}]/u;

/** Replace invisible code points with a visible `\u{...}` form so a rejected
 * name cannot emit terminal escape sequences into doctor output. Ordinary
 * names pass through unchanged. Exported for the doctor boundary, which must
 * sanitize command ids and bindings it prints but does not own. */
export function sanitizeKeyName(name: string): string {
  let out = "";
  for (const char of name) {
    const code = char.codePointAt(0) ?? 0;
    out += INVISIBLE_KEY_NAME.test(char) ? `\\u{${code.toString(16)}}` : char;
  }
  return out;
}

/** Human-readable form of a raw binding for skip messages. Intentionally local
 * so the config layer never depends on the command registry. The name is
 * sanitized because a rejected control/format name would otherwise print raw. */
function describeKeymapBinding(raw: unknown): string {
  if (raw === null || typeof raw !== "object") {
    return sanitizeKeyName(String(raw));
  }
  const record = raw as Record<string, unknown>;
  const modifiers: string[] = [];
  if (record.ctrl === true) {
    modifiers.push("ctrl");
  }
  if (record.meta === true) {
    modifiers.push("alt");
  }
  if (record.shift === true) {
    modifiers.push("shift");
  }
  const name = typeof record.name === "string" ? sanitizeKeyName(record.name) : "";
  const label = [...modifiers, name].filter((part) => part !== "").join("+");
  // JSON.stringify escapes C0 but leaves C1/Cf/Cn raw, so sanitize the fallback.
  return label === "" ? sanitizeKeyName(JSON.stringify(raw)) : label;
}

/** Named keys the renderer's parser can emit, lower case. Mirrors the union
 * the vendored `@opentui/core` parser builds from its kitty key map and
 * terminal key table (`terminalNamedSingleStrokeKeys`), so a name this set
 * accepts actually reaches the matcher. Single printable characters are
 * accepted separately. */
const NAMED_KEY_NAMES: ReadonlySet<string> = new Set([
  "escape",
  "return",
  "linefeed",
  "tab",
  "space",
  "backspace",
  "insert",
  "delete",
  "left",
  "right",
  "up",
  "down",
  "pageup",
  "pagedown",
  "home",
  "end",
  "clear",
  "capslock",
  "scrolllock",
  "numlock",
  "printscreen",
  "pause",
  "menu",
  ...Array.from({ length: 35 }, (_, index) => `f${index + 1}`),
  ...Array.from({ length: 10 }, (_, index) => `kp${index}`),
  "kpdecimal",
  "kpdivide",
  "kpmultiply",
  "kpminus",
  "kpplus",
  "kpenter",
  "kpequal",
  "kpseparator",
  "kpleft",
  "kpright",
  "kpup",
  "kpdown",
  "kppageup",
  "kppagedown",
  "kphome",
  "kpend",
  "kpinsert",
  "kpdelete",
  "mediaplay",
  "mediapause",
  "mediaplaypause",
  "mediareverse",
  "mediastop",
  "mediafastforward",
  "mediarewind",
  "medianext",
  "mediaprev",
  "mediarecord",
  "volumedown",
  "volumeup",
  "mute",
  "leftshift",
  "leftctrl",
  "leftalt",
  "leftsuper",
  "lefthyper",
  "leftmeta",
  "rightshift",
  "rightctrl",
  "rightalt",
  "rightsuper",
  "righthyper",
  "rightmeta",
  "iso_level3_shift",
  "iso_level5_shift",
]);

/** Display aliases the help screen shows, mapped back to the canonical parser
 * name. `?` renders `esc`/`enter`; `matchesKey` compares the raw names, so a
 * file copied from help must be normalized here or the key is silently dead. */
const KEY_NAME_ALIASES: Record<string, string> = {
  esc: "escape",
  enter: "return",
};

/** Canonical binding name, or null when the renderer cannot emit it. A single
 * printable code point is a valid key; its case is display-only because
 * `matchesKey` and the collision signatures both lower-case the name. C0/C1
 * controls and DEL are rejected so they cannot be accepted-and-dead or inject
 * raw control bytes into help/status/doctor output. */
function normalizeKeyName(raw: string): string | null {
  const trimmed = raw.trim();
  // Cc controls, Cf format characters (zero-width and bidi overrides), and Cn
  // unassigned code points are invisible: accepted-and-dead at the matcher and
  // rendered raw by `formatKey` in help/status/palette. Reject them before the
  // printable single-code-point path.
  if (INVISIBLE_KEY_NAME.test(trimmed)) {
    return null;
  }
  const lower = trimmed.toLowerCase();
  const alias = KEY_NAME_ALIASES[lower];
  if (alias !== undefined) {
    return alias;
  }
  if (NAMED_KEY_NAMES.has(lower)) {
    return lower;
  }
  if ([...trimmed].length === 1) {
    return trimmed;
  }
  return null;
}

/** Validate one raw binding. Extra fields are ignored. Returns the normalized
 * binding or an error message. A binding's name is trimmed and normalized so a
 * stray space or a help alias cannot create a key that never matches. */
function parseKeymapBinding(raw: unknown): { binding: KeymapBinding } | { reason: string } {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return { reason: "binding must be an object" };
  }
  const record = raw as Record<string, unknown>;
  if (typeof record.name !== "string" || record.name.trim() === "") {
    return { reason: "binding name must be a non-empty string" };
  }
  const name = normalizeKeyName(record.name);
  if (name === null) {
    // JSON.stringify escapes C0 controls but leaves Cf/Cn (zero-width, bidi
    // overrides) raw, so sanitize the escaped echo as well to keep doctor
    // output free of invisible spoofing code points.
    return { reason: `unknown key name ${sanitizeKeyName(JSON.stringify(record.name.trim()))}` };
  }
  for (const modifier of ["ctrl", "meta", "shift"] as const) {
    const value = record[modifier];
    if (value !== undefined && typeof value !== "boolean") {
      return { reason: `binding ${modifier} must be a boolean` };
    }
  }
  return {
    binding: {
      name,
      ctrl: record.ctrl === true ? true : undefined,
      meta: record.meta === true ? true : undefined,
      // Preserve an explicit `false`: it means shift must be off, while an
      // absent shift is shift-agnostic. Collapsing false to undefined would
      // make the binding overlap a same-name `shift:true` binding.
      shift: record.shift === false ? false : record.shift === true ? true : undefined,
    },
  };
}

/** Read `keymap.json`. Never throws and never crashes the app: a missing file
 * is a no-op, and every malformed entry is reported in `skipped` while the
 * affected command keeps its registry default. */
export async function loadKeymap(): Promise<LoadedKeymap> {
  const path = keymapPath();
  const empty: LoadedKeymap = { path, exists: false, version: null, overrides: {}, skipped: [] };

  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return empty;
    }
    return {
      ...empty,
      skipped: [{ reason: `could not read keymap: ${(error as Error).message}` }],
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (error) {
    return {
      ...empty,
      exists: true,
      skipped: [{ reason: `invalid JSON: ${(error as Error).message}` }],
    };
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {
      ...empty,
      exists: true,
      skipped: [{ reason: "keymap root must be a JSON object" }],
    };
  }

  const record = parsed as Record<string, unknown>;
  const version = typeof record.version === "number" ? record.version : null;
  if (record.version !== KEYMAP_VERSION) {
    return {
      ...empty,
      exists: true,
      version,
      skipped: [
        {
          reason: `unsupported keymap version ${JSON.stringify(record.version)} (expected ${KEYMAP_VERSION}); no overrides applied`,
        },
      ],
    };
  }

  const keys = record.keys;
  // A file with a version and no keys is a valid, empty keymap.
  if (keys === undefined) {
    return { path, exists: true, version, overrides: {}, skipped: [] };
  }
  if (keys === null || typeof keys !== "object" || Array.isArray(keys)) {
    return {
      path,
      exists: true,
      version,
      overrides: {},
      skipped: [{ reason: "keys must be an object mapping command id to bindings" }],
    };
  }

  // Null prototype so a literal `"__proto__"` command id becomes an own key
  // and is reported as an unknown command id instead of being silently dropped.
  const overrides = Object.create(null) as Record<string, KeymapBinding[]>;
  const skipped: KeymapSkip[] = [];
  for (const [commandId, value] of Object.entries(keys as Record<string, unknown>)) {
    if (!Array.isArray(value)) {
      skipped.push({ commandId, reason: "bindings must be an array" });
      continue;
    }
    const bindings: KeymapBinding[] = [];
    let failure: { binding: string; reason: string } | null = null;
    for (const entry of value) {
      const result = parseKeymapBinding(entry);
      if ("reason" in result) {
        failure = { binding: describeKeymapBinding(entry), reason: result.reason };
        break;
      }
      bindings.push(result.binding);
    }
    if (failure !== null) {
      // One malformed binding rejects the whole command entry; the command
      // keeps its default rather than taking a partial override.
      skipped.push({ commandId, binding: failure.binding, reason: failure.reason });
      continue;
    }
    overrides[commandId] = bindings;
  }

  return { path, exists: true, version, overrides, skipped };
}

/** Write config with the given credentials and onboarding completed. Writes a
 * temporary file next to the target, then renames it atomically, and sets
 * owner-only permissions (0o600 file, 0o700 directory). */
export async function saveConfig(credentials: TursoCredentials): Promise<void> {
  const existing = await loadConfig();
  const base = existing.config ?? defaultConfig();
  const next: AppConfig = {
    ...base,
    turso: { url: credentials.url, token: credentials.token },
    onboarding: { completed: true, completedAt: new Date().toISOString() },
  };
  await writeConfigFile(next);
}

/** Serialized chain of UI-preference writes. Keeping it fulfilled after a
 * failure lets later writes still run. */
let uiWriteChain: Promise<void> = Promise.resolve();

/** Merge a partial UI-preferences patch into the stored config and write it
 * atomically. Preserves Turso credentials and onboarding state, so this never
 * marks onboarding complete.
 *
 * Writes are serialized through a module-level promise chain: two quick patches
 * must not both read the same pre-race config and then overwrite each other.
 * Each queued write re-reads the config at write time, so it sees the previous
 * queued write's result. */
export function saveUiPreferences(patch: Partial<UiPreferences>): Promise<void> {
  const run = async (): Promise<void> => {
    const existing = await loadConfig();
    const base = existing.config ?? defaultConfig();
    const config: AppConfig = {
      ...base,
      ui: { ...base.ui, ...patch },
    };
    await writeConfigFile(config);
  };
  // Run on either settlement so a rejected predecessor cannot break the chain;
  // callers receive `next` and handle the rejection themselves.
  const next = uiWriteChain.then(run, run);
  uiWriteChain = next.catch(() => {});
  return next;
}

/** Atomic config write: tmp file next to the target, then rename. */
async function writeConfigFile(config: AppConfig): Promise<void> {
  const path = configPath();
  let tmp: string | null = null;
  try {
    await mkdir(dirname(path), { recursive: true, mode: 0o700 });
    tmp = `${path}.tmp-${process.pid}-${Date.now()}`;
    await writeFile(tmp, JSON.stringify(config, null, 2), { mode: 0o600 });
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
