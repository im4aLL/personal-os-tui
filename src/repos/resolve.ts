// Pure mode resolver: flag > env > auto > turso. Evaluated once at bootstrap.
// The auto fallback is build-aware via `mockAvailable`: development builds
// fall back to mock, while production builds (mock chunk dropped) fall back
// to turso so a missing config still routes to Setup.
import type { RepoMode, RepoResolveInput } from "./resolve.types";

function parseMockEnv(raw: string | undefined): boolean | null {
  if (raw === undefined) {
    return null;
  }
  const value = raw.trim().toLowerCase();
  if (value === "1" || value === "true" || value === "yes") {
    return true;
  }
  if (value === "0" || value === "false" || value === "no") {
    return false;
  }
  return null;
}

export function resolveRepoMode(input: RepoResolveInput): RepoMode {
  if (input.mockFlag) {
    return "mock";
  }
  if (input.tursoFlag) {
    return "turso";
  }
  const fromEnv = parseMockEnv(input.mockEnv);
  if (fromEnv !== null) {
    return fromEnv ? "mock" : "turso";
  }
  if (!input.configComplete) {
    return input.mockAvailable ? "mock" : "turso";
  }
  return "turso";
}

/** Human-readable reason used by `pos doctor` and the status line. */
export function describeResolution(input: RepoResolveInput, mode: RepoMode): string {
  if (input.mockFlag) {
    return "mock (--mock flag)";
  }
  if (input.tursoFlag) {
    return "turso (--turso flag)";
  }
  if (parseMockEnv(input.mockEnv) !== null) {
    return `${mode} (POS_MOCK env)`;
  }
  if (!input.configComplete) {
    return input.mockAvailable ? "mock (no config yet)" : "turso (no config yet)";
  }
  return "turso (config credentials)";
}
