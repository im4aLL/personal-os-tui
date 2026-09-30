// Truecolor degradation for limited terminals.
//
// The renderer reports `capabilities.rgb` / `capabilities.ansi256` after
// creation (and they can flip during the startup window). `resolveColor`
// maps a theme hex to whatever the terminal can render:
// - rgb: pass the hex through untouched.
// - ansi256: nearest palette index, returned as an indexed RGBA.
// - otherwise: nearest of the 16 named ANSI colors, returned by name.

import type { ColorInput } from "@opentui/core";
import { RGBA } from "@opentui/core";
import type { Ansi16Color, ColorCaps } from "./degrade.types";

function hexToTriple(hex: string): [number, number, number] {
  const digits = hex.replace("#", "");
  const full =
    digits.length === 3
      ? digits
          .split("")
          .map((c) => c + c)
          .join("")
      : digits;
  return [
    Number.parseInt(full.slice(0, 2), 16),
    Number.parseInt(full.slice(2, 4), 16),
    Number.parseInt(full.slice(4, 6), 16),
  ];
}

function distanceSq(a: [number, number, number], b: [number, number, number]): number {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
}

const ANSI_256_CACHE = new Map<string, number>();

function nearestAnsi256(hex: string): number {
  const cached = ANSI_256_CACHE.get(hex);
  if (cached !== undefined) {
    return cached;
  }
  const target = hexToTriple(hex);
  let best = 16;
  let bestScore = Number.POSITIVE_INFINITY;
  for (let index = 16; index < 256; index++) {
    const [r, g, b] = RGBA.fromIndex(index).toInts();
    const score = distanceSq(target, [r, g, b]);
    if (score < bestScore) {
      bestScore = score;
      best = index;
    }
  }
  ANSI_256_CACHE.set(hex, best);
  return best;
}

const NAMED_16: Ansi16Color[] = [
  { name: "black", hex: "#000000" },
  { name: "red", hex: "#cd0000" },
  { name: "green", hex: "#00cd00" },
  { name: "yellow", hex: "#cdcd00" },
  { name: "blue", hex: "#0000ee" },
  { name: "magenta", hex: "#cd00cd" },
  { name: "cyan", hex: "#00cdcd" },
  { name: "white", hex: "#e5e5e5" },
  { name: "brightBlack", hex: "#7f7f7f" },
  { name: "brightRed", hex: "#ff0000" },
  { name: "brightGreen", hex: "#00ff00" },
  { name: "brightYellow", hex: "#ffff00" },
  { name: "brightBlue", hex: "#5c5cff" },
  { name: "brightMagenta", hex: "#ff00ff" },
  { name: "brightCyan", hex: "#00ffff" },
  { name: "brightWhite", hex: "#ffffff" },
];

function nearestNamed16(hex: string): string {
  const target = hexToTriple(hex);
  let best = "white";
  let bestScore = Number.POSITIVE_INFINITY;
  for (const entry of NAMED_16) {
    const score = distanceSq(target, hexToTriple(entry.hex));
    if (score < bestScore) {
      bestScore = score;
      best = entry.name;
    }
  }
  return best;
}

export function resolveColor(hex: string, caps: ColorCaps): ColorInput {
  if (caps.rgb) {
    return hex;
  }
  if (caps.ansi256) {
    return RGBA.fromIndex(nearestAnsi256(hex));
  }
  return nearestNamed16(hex);
}

/** Blend a hex color toward a base hex (text background alpha is not blended reliably). */
export function mixWithBase(colorHex: string, baseHex: string, ratio: number): string {
  const clamped = Math.min(1, Math.max(0, ratio));
  const [r1, g1, b1] = hexToTriple(colorHex);
  const [r2, g2, b2] = hexToTriple(baseHex);
  const mix = (a: number, b: number): number => Math.round(a * clamped + b * (1 - clamped));
  const toHex = (n: number): string => n.toString(16).padStart(2, "0");
  return `#${toHex(mix(r1, r2))}${toHex(mix(g1, g2))}${toHex(mix(b1, b2))}`;
}
