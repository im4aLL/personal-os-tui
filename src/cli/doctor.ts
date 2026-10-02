// `pos doctor`: text diagnostics, printed without touching the terminal UI.
import { registryDefaults, resolveKeymap } from "../commands/registry";
import {
  effectiveCredentials,
  loadConfig,
  loadKeymap,
  redactToken,
  sanitizeKeyName,
} from "../lib/config";
import type { KeymapSkip, LoadedConfig } from "../lib/config.types";
import { clearTursoConfig, setTursoConfig, tursoSelect } from "../lib/turso";
import { describeResolution, resolveRepoMode } from "../repos/resolve";
import type { RepoResolveInput } from "../repos/resolve.types";
import type { FfiProbeResult } from "./doctor.types";

const REQUIRED_NODE: [number, number, number] = [26, 4, 0];

function nodeOk(): boolean {
  const parts = process.versions.node.split(".").map((part) => Number.parseInt(part, 10));
  for (let i = 0; i < REQUIRED_NODE.length; i++) {
    const actual = parts[i] ?? 0;
    if (actual > REQUIRED_NODE[i]) {
      return true;
    }
    if (actual < REQUIRED_NODE[i]) {
      return false;
    }
  }
  return true;
}

/** One repo-resolution input shared by the mode and reason probes. */
function repoInput(loaded: LoadedConfig): RepoResolveInput {
  return {
    mockFlag: process.argv.includes("--mock"),
    tursoFlag: process.argv.includes("--turso"),
    mockEnv: process.env.POS_MOCK,
    configComplete: loaded.complete,
    mockAvailable: typeof POS_MOCK_ENABLED === "undefined" ? true : POS_MOCK_ENABLED,
  };
}

async function ffiOk(): Promise<FfiProbeResult> {
  try {
    const core = await import("@opentui/core");
    const ints = core.RGBA.fromHex("#cba6f7").toInts();
    if (ints[0] === 203 && ints[1] === 166 && ints[2] === 247 && ints[3] === 255) {
      return { ok: true, detail: "native bindings load" };
    }
    return { ok: false, detail: `unexpected RGBA probe result [${ints}]` };
  } catch (error) {
    return { ok: false, detail: (error as Error).message };
  }
}

export async function runDoctor(): Promise<number> {
  const lines: string[] = ["Personal OS TUI doctor", ""];
  let healthy = true;
  const mark = (ok: boolean): string => {
    if (!ok) {
      healthy = false;
    }
    return ok ? "OK  " : "FAIL";
  };

  lines.push(`${mark(nodeOk())} Node ${process.versions.node} (requires >= 26.4.0)`);

  const ffi = await ffiOk();
  lines.push(`${mark(ffi.ok)} FFI: ${ffi.detail}`);

  const loaded = await loadConfig();
  if (loaded.config === null) {
    lines.push(`INFO Config: ${loaded.path} (missing - first run)`);
  } else {
    let perms = "mode 600";
    if (process.platform === "win32") {
      perms = "permissions not enforced on Windows";
    } else if (loaded.loosePermissions) {
      perms = "loose permissions (should be 600)";
    }
    lines.push(`${mark(!loaded.loosePermissions)} Config: ${loaded.path} (${perms})`);
    const creds = effectiveCredentials(loaded);
    const urlNote = creds.urlFromEnv ? " (from environment)" : "";
    const tokenNote = creds.tokenFromEnv ? " (from environment)" : "";
    lines.push(`INFO Turso URL: ${creds.url === "" ? "(not set)" : creds.url}${urlNote}`);
    lines.push(
      `INFO Turso token: ${creds.token === "" ? "(not set)" : redactToken(creds.token)}${tokenNote}`,
    );
  }

  // Keymap diagnostics are advisory: a bad keymap never fails the exit status,
  // unlike loose permissions. Resolving against a clone of the defaults also
  // exercises the same merge path the app uses, without mutating the registry.
  const keymap = await loadKeymap();
  const resolved = resolveKeymap(registryDefaults(), keymap.overrides);
  const keymapSkips: KeymapSkip[] = [...keymap.skipped, ...resolved.skipped];
  const appliedCount = resolved.applied.length;
  const keymapSource = appliedCount > 0 ? `${appliedCount} override(s) applied` : "defaults";
  lines.push(`INFO Keymap: ${keymap.path} (${keymapSource})`);
  for (const skip of keymapSkips) {
    const parts = [skip.commandId, skip.binding].filter(
      (part): part is string => part !== undefined && part !== "",
    );
    const where = parts.length > 0 ? `${parts.join(" ")}: ` : "";
    // Sanitize the whole line at the print boundary: reasons embed untrusted
    // text (version echo, JSON parse message) that JSON.stringify leaves C1/Cf
    // raw, and a command id is a JSON key that can legally contain invisible
    // code points. Stored values stay untouched.
    lines.push(`WARN Keymap skipped: ${sanitizeKeyName(`${where}${skip.reason}`)}`);
  }

  const input = repoInput(loaded);
  const mode = resolveRepoMode(input);
  const reason = describeResolution(input, mode);
  lines.push(`INFO Repo mode: ${reason}`);

  const creds = effectiveCredentials(loaded);
  if (creds.url === "" || creds.token === "") {
    lines.push("INFO Turso SELECT 1: skipped (credentials not set)");
  } else {
    setTursoConfig({ url: creds.url, token: creds.token });
    try {
      await tursoSelect("SELECT 1");
      lines.push("OK   Turso SELECT 1");
    } catch (error) {
      healthy = false;
      const message = error instanceof Error ? error.message : String(error);
      lines.push(`FAIL Turso SELECT 1: ${message}`);
    } finally {
      clearTursoConfig();
    }
  }

  console.log(lines.join("\n"));
  return healthy ? 0 : 1;
}
