// Pure mode resolver: flag > env > auto > turso. Evaluated once at bootstrap.
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
    return "mock";
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
    return "mock (no config yet)";
  }
  return "turso (config credentials)";
}
