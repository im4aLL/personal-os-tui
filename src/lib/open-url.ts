// Cross-platform system-browser opener. Node's `spawn` keeps this dependency
// free and lets the screen distinguish a launched opener from a missing one
// (e.g. `xdg-open` absent on a headless box) instead of throwing into the key
// handler. Runtime only; the result shape lives in `open-url.types.ts`.
import { spawn } from "node:child_process";
import { messageOf } from "../utils/error";
import type { OpenUrlResult } from "./open-url.types";

function commandFor(url: string): { command: string; args: string[] } {
  if (process.platform === "darwin") {
    return { command: "open", args: [url] };
  }
  if (process.platform === "win32") {
    // Do not use `cmd /c start`: cmd.exe re-parses the assembled command line,
    // so a URL containing `&`, `|`, `^`, or `%VAR%` could terminate `start` and
    // splice in a second command. `explorer.exe` receives the URL as a single
    // argv entry and opens the default browser without any shell parsing.
    return { command: "explorer.exe", args: [url] };
  }
  return { command: "xdg-open", args: [url] };
}

/** Launch `url` in the system browser. Never rejects: a missing opener or a
 * spawn failure resolves `{ ok: false }` so the caller can fall back. */
export function openUrl(url: string): Promise<OpenUrlResult> {
  return new Promise((resolve) => {
    const { command, args } = commandFor(url);
    let settled = false;
    const finish = (result: OpenUrlResult): void => {
      if (!settled) {
        settled = true;
        resolve(result);
      }
    };
    try {
      const child = spawn(command, args, { stdio: "ignore", detached: true });
      child.on("error", (error) => finish({ ok: false, error: messageOf(error) }));
      child.on("spawn", () => {
        child.unref();
        finish({ ok: true });
      });
    } catch (error) {
      finish({ ok: false, error: messageOf(error) });
    }
  });
}
