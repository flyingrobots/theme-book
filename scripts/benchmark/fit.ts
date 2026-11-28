/**
 * The per-theme fit behind docs/topics/derived-moods Table 3: how each famous theme moves its accents
 * from light to dark, in OKLCH. Run: bun scripts/benchmark/fit.ts
 *
 * Accents are the primary and the five listed accents, paired by position (light[i] -> dark[i]).
 * - Fit: ordinary least squares of dark L on light L (slope, offset, R²).
 * - Mean lift: mean of dark L − light L.
 * - Chroma ×: mean dark C / mean light C.
 * - Hue drift: mean absolute hue change, degrees.
 * - Page hue: the dark page's hue against the light ink's, degrees (the base-ramp rule); "no hue" when
 *   either is achromatic (OKLCH C < 0.005, as for a hueless palette).
 */
import { FAMOUS_THEMES } from "./famous-themes";
import { parseToOklch } from "../../src/palette";

const ok = (hex: string) => {
  const c = parseToOklch(hex);
  return { l: c.l, c: c.c, h: c.h ?? 0 };
};
const gap = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

export interface Fit {
  name: string;
  slope: number;
  offset: number;
  r2: number;
  lift: number;
  chroma: number;
  hueDrift: number;
  /** Null when the dark page or the light ink has no hue (OKLCH C < 0.005, as for a hueless palette): there is no hue to compare. */
  pageHueGap: number | null;
}

export function fitTheme(t: (typeof FAMOUS_THEMES)[number]): Fit {
  const light = [t.light.primary, ...t.light.accents].map(ok);
  const dark = [t.dark.primary, ...t.dark.accents].map(ok);
  const x = light.map((c) => c.l);
  const y = dark.map((c) => c.l);
  const mx = mean(x), my = mean(y);
  const sxx = x.reduce((a, v) => a + (v - mx) ** 2, 0);
  const sxy = x.reduce((a, v, i) => a + (v - mx) * (y[i]! - my), 0);
  const slope = sxx > 1e-12 ? sxy / sxx : 1;
  const offset = my - slope * mx;
  const ssTot = y.reduce((a, v) => a + (v - my) ** 2, 0);
  const ssRes = y.reduce((a, v, i) => a + (v - (offset + slope * x[i]!)) ** 2, 0);
  const r2 = ssTot > 1e-12 ? 1 - ssRes / ssTot : 1;
  return {
    name: t.name,
    slope,
    offset,
    r2,
    lift: mean(y.map((v, i) => v - x[i]!)),
    chroma: mean(dark.map((c) => c.c)) / mean(light.map((c) => c.c)),
    hueDrift: mean(light.map((c, i) => gap(c.h, dark[i]!.h))),
    pageHueGap: ok(t.dark.page).c < 0.005 || ok(t.light.ink).c < 0.005 ? null : gap(ok(t.dark.page).h, ok(t.light.ink).h),
  };
}

if (import.meta.main) {
  const f = (n: number, d = 2) => (n < 0 ? "−" : "") + Math.abs(n).toFixed(d);
  const sign = (n: number) => (n >= 0 ? "+" : "−") + Math.abs(n).toFixed(2);
  console.log("| Theme | Slope | Offset | R² | Mean lift | Chroma × | Hue drift | Dark page vs light ink hue |");
  console.log("| --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const t of FAMOUS_THEMES) {
    const r = fitTheme(t);
    console.log(
      `| ${r.name} | ${f(r.slope)} | ${sign(r.offset)} | ${f(r.r2)} | ${sign(r.lift)} | ${f(r.chroma)} | ${r.hueDrift.toFixed(0)}° | ${r.pageHueGap === null ? "no hue" : r.pageHueGap.toFixed(1) + "°"} |`,
    );
  }
}
