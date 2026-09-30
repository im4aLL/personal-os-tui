#!/usr/bin/env node
// pos launcher: version gate, --experimental-ffi re-exec, then run dist/cli.js.
// Imports only node: builtins so the gate runs before any native dependency loads.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const REQUIRED = [26, 4, 0];

function parseVersion(version) {
  return version
    .replace(/^v/, "")
    .split(".")
    .map((part) => Number.parseInt(part, 10));
}

function meetsRequired(actual, required) {
  for (let i = 0; i < required.length; i++) {
    const a = actual[i] ?? 0;
    const r = required[i] ?? 0;
    if (a > r) {
      return true;
    }
    if (a < r) {
      return false;
    }
  }
  return true;
}

function isAlpine() {
  try {
    return existsSync("/etc/alpine-release");
  } catch {
    return false;
  }
}

const detected = parseVersion(process.versions.node);
if (!meetsRequired(detected, REQUIRED)) {
  const requiredText = REQUIRED.join(".");
  console.error(
    `pos requires Node.js >= ${requiredText} (detected v${process.versions.node}). ` +
      `Install a current Node release from https://nodejs.org/en/download and try again.`,
  );
  process.exit(1);
}

const entry = fileURLToPath(new URL("../dist/cli.js", import.meta.url));
if (!existsSync(entry)) {
  console.error("pos could not find dist/cli.js. Run `npm run build` first, then retry.");
  process.exit(1);
}

// Set on the process so both the direct-import branch and the spawned child see
// the same environment. An already-set OPENTUI_LIBC is respected, and musl is
// only forced on Alpine.
if (process.env.OPENTUI_LIBC == null && isAlpine()) {
  // musl systems (Alpine) need the musl native build; glibc is the default otherwise.
  process.env.OPENTUI_LIBC = "musl";
}

const execArgv = process.execArgv ?? [];
const hasFfiFlag = execArgv.includes("--experimental-ffi") || execArgv.includes("--allow-ffi");

if (hasFfiFlag) {
  await import(entry);
} else {
  const child = spawn(process.execPath, ["--experimental-ffi", entry, ...process.argv.slice(2)], {
    stdio: "inherit",
    env: process.env,
  });

  const forward = (signal) => {
    if (child.exitCode == null && !child.killed) {
      child.kill(signal);
    }
  };
  process.on("SIGINT", () => forward("SIGINT"));
  process.on("SIGTERM", () => forward("SIGTERM"));

  child.on("error", (error) => {
    console.error(`pos failed to start: ${error.message}`);
    process.exit(1);
  });
  child.on("exit", (code, signal) => {
    if (signal != null) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 1);
  });
}
