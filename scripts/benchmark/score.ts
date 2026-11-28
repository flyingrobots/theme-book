#!/usr/bin/env bun
/**
 * Score light/dark methods against seven famous themes: mean OKLab distance between each method's
 * accents and the official ones (lower is better; under 0.02 is indistinguishable, over 0.1 clearly
 * a different color). `bun scripts/benchmark/score.ts`
 */
import { clampChroma, converter, differenceEuclidean, formatHex, parse } from "culori";
import { DERIVED_SETTINGS, accentMove } from "../../src/derived";
import { FAMOUS_THEMES } from "./famous-themes";

const oklch = converter("oklch"), hsl = converter("hsl"), lch = converter("lch"), dE = differenceEuclidean("oklab");
const hex = (c: any) => formatHex(clampChroma(c, c.mode))!;
type Method = (h: string, toDark: boolean) => string;

const accentsOf = (s: { primary: string; accents: string[] }) => [s.primary, ...s.accents];
export function meanDistance(m: Method, toDark: boolean, names = FAMOUS_THEMES.map((t) => t.name)): number {
  let sum = 0, n = 0;
  for (const t of FAMOUS_THEMES.filter((x) => names.includes(x.name))) {
    const src = accentsOf(toDark ? t.light : t.dark), dst = accentsOf(toDark ? t.dark : t.light);
    src.forEach((h, i) => { sum += dE(m(h, toDark), dst[i]!); n++; });
  }
  return sum / n;
}

export const METHODS: Record<string, Method> = {
  "Identity (share accents)": (h) => h,
  "HSL lightness inversion": (h) => { const c = hsl(parse(h)!)!; return hex({ ...c, l: 1 - c.l }); },
  "OKLCH lightness inversion": (h) => { const c = oklch(parse(h)!)!; return hex({ ...c, l: 1 - c.l }); },
  "Material tone table (40 / 80)": (h, toDark) => { const c = lch(parse(h)!)!; return hex({ mode: "lch", l: toDark ? 80 : 40, c: c.c, h: c.h }); },
  "theme-book corporate (s 0.12, b 0.6, k 0.85)": (h, toDark) => accentMove(h, DERIVED_SETTINGS.corporate, toDark),
};

/**
 * Fit (s, b, k) on all themes but one and score the one left out, for each theme in turn: whether the
 * formula generalises, or only fits the themes it was fitted to.
 */
export function leaveOneOut(): number {
  const grid: [number, number, number][] = [];
  for (let s = 0; s <= 0.3001; s += 0.02) for (let b = 0; b <= 1.0001; b += 0.1) for (let k = 0.6; k <= 1.3001; k += 0.05) grid.push([s, b, k]);
  const m = ([s, b, k]: [number, number, number]): Method => (h, toDark) => accentMove(h, { s, b, k }, toDark);
  const names = FAMOUS_THEMES.map((t) => t.name);
  let total = 0;
  for (const held of names) {
    const rest = names.filter((x) => x !== held);
    const cost = (g: [number, number, number]) => meanDistance(m(g), true, rest) + meanDistance(m(g), false, rest);
    const best = grid.reduce((a, g) => (cost(g) < cost(a) ? g : a));
    total += (meanDistance(m(best), true, [held]) + meanDistance(m(best), false, [held])) / 2;
  }
  return total / names.length;
}

if (import.meta.main) {
  console.log("method".padEnd(46), "light→dark", "dark→light");
  for (const [name, m] of Object.entries(METHODS)) {
    console.log(name.padEnd(46), meanDistance(m, true).toFixed(3).padStart(10), meanDistance(m, false).toFixed(3).padStart(10));
  }
  console.log(`\nleave-one-out (fit on six themes, score the seventh, both directions): ${leaveOneOut().toFixed(3)}`);
}
