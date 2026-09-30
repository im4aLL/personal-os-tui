// Build-time flag inlined by tsdown `define` (see tsdown.config.ts).
//
// This declaration MUST stay ambient (a bare `declare const` in a `.d.ts`
// with no imports or exports). A module-local declaration makes rolldown
// treat the identifier as a local binding and silently skip the replacement,
// which would keep the mock branch in production output.
//
// Only the bare `POS_MOCK_ENABLED` identifier is valid. `--env.*` also
// defines `process.env.POS_MOCK_ENABLED` as the truthy string `"false"`,
// so reading the flag through `process.env` would defeat mock elimination.
//
// Consumers must read it through a `typeof` guard
// (`typeof POS_MOCK_ENABLED === "undefined" ? true : POS_MOCK_ENABLED`):
// tsx has no `define` step, so the bare identifier alone throws
// ReferenceError under `npm run dev`, while `typeof` on an undeclared
// identifier is legal.
//
// The guard must stay INLINE in the branch condition. Assigning it to a
// shared `const` first is runtime-correct but defeats production
// dead-branch elimination: rolldown folds the inline ternary to a literal
// (dropping the mock chunk and mock-only strings) but does not propagate a
// const alias into branch conditions. Verified against `build:prod` output.
declare const POS_MOCK_ENABLED: boolean;
