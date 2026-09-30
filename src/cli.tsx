// Entry: subcommands, config load, repo resolve, renderer lifecycle.
//
// Subcommands are parsed before the renderer exists so they work without a
// terminal: pos, pos --help, pos --version, pos doctor, pos reset.
//
// Terminal-restoration guarantees: exitSignals [] + exitOnCtrlC false so the
// app owns shutdown, error handlers route through the same shutdown path,
// and renderer.destroy() runs in `finally` (it is idempotent and restores
// raw mode, mouse, alternate screen, cursor, and title). No process.exit()
// before destroy().
import { readFileSync } from "node:fs";
import { type CliRenderer, createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { App } from "./app/App";
import { runDoctor } from "./cli/doctor";
import { configPath } from "./lib/config";
import { getRepos } from "./repos/index";
import type { RepoBundle } from "./repos/index.types";
import { initSession } from "./store/session";
import { getTheme } from "./theme/registry";

function readVersion(): string {
  try {
    const url = new URL("../package.json", import.meta.url);
    const raw = readFileSync(url, "utf8");
    const parsed = JSON.parse(raw) as { version?: unknown };
    if (typeof parsed.version === "string") {
      return parsed.version;
    }
  } catch {
    // Fall through to the baked-in fallback below.
  }
  return "0.1.0";
}

function printHelp(): void {
  // Latency/scenario env vars are dev-build-only; only those lines sit behind
  // the guard so production help drops them. --mock and POS_MOCK=1 print
  // unconditionally because production handles them with a loud "mock mode is
  // not enabled in this build" error. The guard stays inline (not a shared
  // const) so the bundler folds it and drops the lines.
  const lines = [
    "pos - keyboard-first terminal UI for Personal OS",
    "",
    "Usage:",
    "  pos [options]            Launch the app",
    "  pos doctor               Diagnose Node, FFI, config, and repo mode",
    "  pos reset                Move the config aside so the next run shows Setup",
    "",
    "Options:",
    "  --mock                   Use in-memory mock data (dev builds only)",
    "  --turso                  Force Turso even without config detection",
    "  -h, --help               Show this help",
    "  -V, --version            Show the version",
    "",
    "Environment:",
    "  POS_MOCK=1               Same as --mock",
  ];
  if (typeof POS_MOCK_ENABLED === "undefined" ? true : POS_MOCK_ENABLED) {
    lines.push(
      "  POS_MOCK_LATENCY=ms      Mock delay per call (default 150-400)",
      "  POS_MOCK_SCENARIO=name   default|empty|loading|error|large",
    );
  }
  lines.push(
    "  POS_CONFIG_DIR=dir       Override the config directory",
    "  POS_TURSO_URL / POS_TURSO_TOKEN",
    "                           Credential overrides (never persisted)",
  );
  console.log(lines.join("\n"));
}

async function runReset(): Promise<number> {
  const path = configPath();
  const { existsSync, renameSync } = await import("node:fs");
  if (!existsSync(path)) {
    console.log(`pos reset: no config at ${path}; nothing to do.`);
    return 0;
  }
  let backup = `${path}.bak`;
  let suffix = 1;
  while (existsSync(backup)) {
    suffix += 1;
    backup = `${path}.bak-${suffix}`;
  }
  renameSync(path, backup);
  console.log(`pos reset: moved ${path} aside to ${backup}. Next run shows Setup.`);
  return 0;
}

async function runApp(args: string[]): Promise<number> {
  const mockFlag = args.includes("--mock");
  const tursoFlag = args.includes("--turso");

  let bundle: RepoBundle;
  try {
    bundle = await getRepos({ mockFlag, tursoFlag });
  } catch (error) {
    console.error(`pos: ${(error as Error).message}`);
    return 1;
  }

  const themeId = bundle.loaded.config?.ui.theme ?? "mocha";
  initSession({
    themeId,
    repoMode: bundle.mode,
    repoReason: bundle.reason,
    configComplete: bundle.loaded.complete,
    fromEnv: bundle.loaded.fromEnv,
    loosePermissions: bundle.loaded.loosePermissions,
    resetMockData: bundle.resetMockData,
    mockUi: bundle.mockUi,
  });

  const theme = getTheme(themeId);
  let renderer: CliRenderer | null = null;
  let exitCode = 0;
  let fatal: unknown = null;
  let requestShutdown: () => void = () => {};
  const shutdown = new Promise<void>((resolve) => {
    requestShutdown = () => resolve();
  });

  const onFatal = (error: unknown): void => {
    fatal = error;
    exitCode = 1;
    requestShutdown();
  };
  process.on("uncaughtException", onFatal);
  process.on("unhandledRejection", onFatal);

  try {
    renderer = await createCliRenderer({
      exitOnCtrlC: false,
      exitSignals: [],
      backgroundColor: theme.tokens.bg,
    });
    const root = createRoot(renderer);
    root.render(<App onRequestQuit={() => requestShutdown()} />);
    await shutdown;
    root.unmount();
  } catch (error) {
    fatal = error;
    exitCode = 1;
  } finally {
    process.off("uncaughtException", onFatal);
    process.off("unhandledRejection", onFatal);
    if (renderer !== null) {
      renderer.destroy();
    }
  }

  if (fatal !== null) {
    console.error(
      `pos: ${fatal instanceof Error ? (fatal.stack ?? fatal.message) : String(fatal)}`,
    );
  }
  return exitCode;
}

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  if (args.includes("-h") || args.includes("--help")) {
    printHelp();
    return 0;
  }
  if (args.includes("-V") || args.includes("--version")) {
    console.log(readVersion());
    return 0;
  }
  if (args[0] === "doctor") {
    return runDoctor();
  }
  if (args[0] === "reset") {
    return runReset();
  }
  if (args[0] !== undefined && !args[0].startsWith("-")) {
    console.error(`pos: unknown command "${args[0]}". Run \`pos --help\`.`);
    return 2;
  }
  return runApp(args);
}

const code = await main();
process.exitCode = code;
