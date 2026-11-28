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
  "Material-style tones (CIELAB L* 40 / 80, not HCT)": (h, toDark) => { const c = lch(parse(h)!)!; return hex({ mode: "lch", l: toDark ? 80 : 40, c: c.c, h: c.h }); },
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
  console.log("method".padEnd(52), "light→dark", "dark→light");
  for (const [name, m] of Object.entries(METHODS)) {
    console.log(name.padEnd(52), meanDistance(m, true).toFixed(3).padStart(10), meanDistance(m, false).toFixed(3).padStart(10));
  }
  console.log(`\nleave-one-out (fit on six themes, score the seventh, both directions): ${leaveOneOut().toFixed(3)}`);
  const accentsFor = process.argv.indexOf("--accents");
  if (accentsFor > 0) {
    // One theme's accents, light to dark: the source, the official dark color, theme-book's move, and the miss.
    const name = process.argv[accentsFor + 1]!;
    const t = FAMOUS_THEMES.find((x) => x.name === name)!;
    const ours = METHODS["theme-book corporate (s 0.12, b 0.6, k 0.85)"]!;
    const src = accentsOf(t.light), dst = accentsOf(t.dark);
    console.log(`\n| Accent | ${t.lightName} (×) | ${t.darkName} (□) | theme-book (○) | Miss (OKLab) |`);
    console.log("| --- | --- | --- | --- | --- |");
    src.forEach((h, i) => {
      const o = ours(h, true);
      console.log(`| ${i === 0 ? "primary" : `accent ${i}`} | \`${h}\` | \`${dst[i]}\` | \`${o}\` | ${dE(o, dst[i]!).toFixed(3)} |`);
    });
    console.log(`| **mean** | | | | **${meanDistance(ours, true, [name]).toFixed(3)}** |`);
  }
  if (process.argv.includes("--per-theme")) {
    // Light to dark, per theme, as a Markdown table: theme-book, the Material-style tones, and lightness inversion.
    const ours = METHODS["theme-book corporate (s 0.12, b 0.6, k 0.85)"]!;
    const material = METHODS["Material-style tones (CIELAB L* 40 / 80, not HCT)"]!;
    const flip = METHODS["OKLCH lightness inversion"]!;
    console.log("\n| Theme | theme-book | Material-style tones | Flipping OKLCH lightness |");
    console.log("| --- | --- | --- | --- |");
    for (const t of FAMOUS_THEMES) {
      const [a, b, c] = [ours, material, flip].map((m) => meanDistance(m, true, [t.name]));
      const best = Math.min(a!, b!, c!);
      const cell = (v: number) => (v === best ? `**${v.toFixed(3)}**` : v.toFixed(3));
      console.log(`| ${t.name} | ${cell(a!)} | ${cell(b!)} | ${cell(c!)} |`);
    }
  }
}
