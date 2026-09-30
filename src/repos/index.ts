// Bundle resolution. This file owns the exactly-one dynamic mock import:
// `POS_MOCK_ENABLED` is a build-time literal (see src/mock-flag.d.ts), so
// `build:prod` makes the branch statically dead and rolldown drops the mock
// chunk. Requesting mock against a production build fails loudly instead of
// silently falling back.
//
// The flag is read through a `typeof` guard: tsx (npm run dev) has no
// `define` step, so evaluating the bare identifier would throw
// ReferenceError. `typeof` on an undeclared identifier is legal, and the
// bare identifier in the false-branch still inlines for prod elimination.
import { loadConfig } from "../lib/config";
import type { GetReposOptions, RepoBundle, SetupBundle } from "./index.types";
import { describeResolution, resolveRepoMode } from "./resolve";
import { createTursoRepos } from "./turso/index";

export async function getRepos(options: GetReposOptions): Promise<RepoBundle> {
  const loaded = await loadConfig();
  const resolution = {
    mockFlag: options.mockFlag,
    tursoFlag: options.tursoFlag,
    mockEnv: process.env.POS_MOCK,
    configComplete: loaded.complete,
  };
  const mode = resolveRepoMode(resolution);
  const reason = describeResolution(resolution, mode);

  if (mode === "mock") {
    // Inline `typeof` guard (not a shared const): tsx has no `define` step,
    // so the bare identifier alone throws ReferenceError under `npm run
    // dev`, while `typeof` on an undeclared identifier is legal. Kept inline
    // so the bundler folds the condition to a literal and drops the mock
    // chunk in production builds.
    if (typeof POS_MOCK_ENABLED === "undefined" ? true : POS_MOCK_ENABLED) {
      const mock = await import("./mock/index");
      return {
        mode,
        reason,
        loaded,
        resetMockData: mock.resetMockData,
        mockUi: mock.createMockUiState(),
        ...mock.createMockRepos(),
      };
    }
    throw new Error(
      "mock mode is not enabled in this build (POS_MOCK=1 or --mock against a production build).",
    );
  }
  const noop = (): void => {};
  return { mode, reason, loaded, resetMockData: noop, mockUi: null, ...createTursoRepos() };
}

export async function getSetupRepo(options: GetReposOptions): Promise<SetupBundle> {
  const bundle = await getRepos(options);
  return { mode: bundle.mode, reason: bundle.reason, loaded: bundle.loaded, setup: bundle.setup };
}
