#!/usr/bin/env node
// Reproducible FFI smoke check for the OpenTUI native core.
// Run with `npm run check:ffi` (node --experimental-ffi scripts/check-ffi.mjs).
import { RGBA } from "@opentui/core";

const HEX = "#cba6f7"; // Catppuccin Mocha mauve
const EXPECTED = [203, 166, 247, 255];

let actual;
try {
  actual = RGBA.fromHex(HEX).toInts();
} catch (error) {
  console.error(
    `check:ffi failed to load @opentui/core native bindings: ${error instanceof Error ? error.message : error}`,
  );
  console.error(
    "Run under `node --experimental-ffi` and confirm the platform native package (for example @opentui/core-darwin-arm64) is installed.",
  );
  process.exit(1);
}

const matches =
  actual.length === EXPECTED.length && EXPECTED.every((value, index) => value === actual[index]);
if (!matches) {
  console.error(
    `check:ffi: RGBA.fromHex("${HEX}").toInts() = [${actual}] but expected [${EXPECTED}]`,
  );
  process.exit(1);
}

console.log(`check:ffi OK: RGBA.fromHex("${HEX}").toInts() = [${actual}]`);
