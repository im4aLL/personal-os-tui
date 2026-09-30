import { defineConfig, type UserConfig } from "tsdown";

// `POS_MOCK_ENABLED` is inlined as a literal at build time, so the mock branch in
// `src/repos/index.ts` becomes statically dead and rolldown drops its chunk.
//
// tsdown has no `--define` CLI flag; `--env.POS_MOCK_ENABLED=false` is the supported,
// shell-portable equivalent and is what `npm run build:prod` passes.
//
// The identifier must be declared ambiently (a `*.d.ts`, not a module-local
// `declare const`), otherwise rolldown treats it as a local binding and the
// replacement silently does not happen.
//
// Code splitting is not configured: tsdown 0.10 has no `splitting` option because
// rolldown already emits a separate chunk per dynamic `import()`. That default is
// what turns `src/mock/**` into a droppable chunk in production builds.
export default defineConfig((cliOptions): UserConfig => {
  const isMockEnabled = cliOptions.env?.POS_MOCK_ENABLED !== "false";

  return {
    entry: ["src/cli.tsx"],
    format: ["esm"],
    platform: "node",
    target: "node26",
    outDir: "dist",
    clean: true,
    sourcemap: true,
    external: [
      "@opentui/core",
      "@opentui/react",
      "react",
      "react-reconciler",
      "ws",
      /^@opentui\/core-/,
    ],
    define: { POS_MOCK_ENABLED: String(isMockEnabled) },
    dts: false,
  };
});
