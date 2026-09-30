// `pos doctor`: text diagnostics, printed without touching the terminal UI.
import { effectiveCredentials, loadConfig, redactToken } from "../lib/config";
import type { LoadedConfig } from "../lib/config.types";
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
    lines.push(`INFO Config: ${loaded.path} (missing - first run, mock mode)`);
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

  const input = repoInput(loaded);
  const mode = resolveRepoMode(input);
  const reason = describeResolution(input, mode);
  lines.push(`INFO Repo mode: ${reason}`);
  lines.push("INFO Turso SELECT 1: skipped (not wired yet in M0)");

  console.log(lines.join("\n"));
  return healthy ? 0 : 1;
}
