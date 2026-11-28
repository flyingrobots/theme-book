/**
 * Derived moods: a light and a dark theme that read as one, from a palette.
 *
 * The rules are fitted to famous light/dark pairs (Solarized, Gruvbox, Tokyo Night, One, Catppuccin,
 * Rosé Pine, GitHub; see docs/topics/derived-moods). In OKLCH:
 *
 * - The base is one ramp. The light page is the palette's pale end; the dark page takes the light
 *   theme's ink hue (within 1.4-16.4 degrees in six of the seven) at L about 0.24, never black; each
 *   mode's text comes from the other end.
 * - Accents keep their hue and move together. Dark L = (1 - b)(L + s) + b * 0.76 and dark C = k * C:
 *   s lifts every accent by the same amount (Gruvbox, Catppuccin: s = 0.23), b pulls them into one
 *   band (Tokyo, GitHub), k sets the character (pastel below 1, vivid above). One global setting
 *   (s 0.12, b 0.6, k 0.85) lands within OKLab 0.08 of the official accents on average, against 0.124
 *   for a Material-style tone table in CIELAB (not HCT) and 0.32 for flipping OKLCH lightness.
 * - Contrast is a floor in each mode, never an equality across modes.
 *
 * Moods are settings of (s, b, k) plus how soft roles are filled:
 * - `corporate`: the fitted average; secondary and accent are soft tints.
 * - `freak`: s = 0, b = 0, k = 1 (Solarized's move: accents unchanged); the palette's own colors are
 *   flat fills, the same in both modes.
 *
 * Fixed by convention, never derived: red is error and destroy (destructive), and secondary and
 * accent take the next palette colors outside the red, yellow and green ranges, so a button does not
 * read as an error, a caution or a success; a role left without one is a tint of the primary, which
 * carries the primary's hue even when that is a status hue. The first colored seed (OKLCH chroma 0.04 or more) is primary,
 * whatever its lightness, a red brand included; grey seeds before it are base material.
 *
 * Chart bars clear 3:1 on every page in both modes, except a palette with no hue, which keeps stock
 * shadcn's greys, one set for both modes, and audits them as advisory, as stock shadcn would.
 *
 * Most colors record an origin: a palette color is `relativeTo` a seed (text on a fill, and the base
 * ramp, name the base seed), each dark accent `relativeTo` its light version, and destructive names
 * none. The computed values are stored fixed, so the recorded seed -> light origins are origins,
 * not live dependencies; a flow view pairs light and dark by role.
 */
import { type DesignBook, color, ref, relativeTo } from "design-book";
import { converter, differenceEuclidean, formatHex, parse } from "culori";
import { wcagRatioExactCss as wcagRatio } from "./audit";
import { gamutSafeOklch, normalizeHue, parseToOklch, toSafeHex } from "./palette";

type Scope = ReturnType<DesignBook["addScope"]>;
type Oklch = { l: number; c: number; h: number };

const deltaE = differenceEuclidean("oklab");
const gap = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);

function ok(hex: string): Oklch {
  const c = parseToOklch(hex);
  return { l: c.l, c: c.c, h: normalizeHue(c.h) };
}
function mk(l: number, c: number, h: number): string {
  return toSafeHex(gamutSafeOklch(Math.min(0.995, Math.max(0.005, l)), Math.max(0, c), h));
}

export type DerivedMood = "freak" | "corporate";

/** A mood: the accent move (s, b, k), and how secondary and accent are filled. */
export interface DerivedSetting {
  /** Lift every accent by this much in dark (OKLCH L). */
  s: number;
  /** Pull accents this far (0-1) into one band at BAND_L. */
  b: number;
  /** Scale chroma in dark. */
  k: number;
  fills: "tint" | "flat";
}

export const DERIVED_SETTINGS: Record<DerivedMood, DerivedSetting> = {
  corporate: { s: 0.12, b: 0.6, k: 0.85, fills: "tint" },
  freak: { s: 0, b: 0, k: 1, fills: "flat" },
};
/** For books.ts: the moods this module builds. */
export const DERIVED_VARIANT = DERIVED_SETTINGS;

/** Where the band law puts dark accents (OKLCH L), fitted. */
export const BAND_L = 0.76;
/** Base, fitted: the dark page and the dark ink. */
const DARK_PAGE_L = 0.24;
const DARK_INK_L = 0.87;
const LIGHT_INK_L = 0.3;

/** The status hues (OKLCH), and the fixed red. */
export const STATUS = {
  red: { l: 0.58, c: 0.22, h: 25 },
  ranges: { red: [10, 50], yellow: [70, 110], green: [120, 165] } as Record<string, [number, number]>,
};
export function statusHue(hex: string): string | undefined {
  const c = ok(hex);
  if (c.c < 0.06) return undefined;
  return Object.entries(STATUS.ranges).find(([, [lo, hi]]) => c.h >= lo && c.h <= hi)?.[0];
}

const isAccent = (hex: string) => {
  const c = ok(hex);
  return c.c >= 0.04 && c.l > 0.25 && c.l < 0.93;
};

/**
 * The floors, with a margin: they are measured here on hex, but the default output is OKLCH rounded to
 * 4 decimals, which can move a ratio by about 0.001 (a pair at 3.000 on hex audited at 2.9996).
 */
const MARGIN = 0.01;
const TEXT = 4.5 + MARGIN;
const MARK = 3 + MARGIN;

const holdsText = (fill: string) => Math.max(wcagRatio("#000000", fill), wcagRatio("#ffffff", fill)) >= TEXT;

/** A color at the lightness nearest its own that passes a test, keeping its hue and chroma. */
function nearestPassing(hex: string, pass: (h: string) => boolean): string {
  if (pass(hex)) return hex;
  const c = ok(hex);
  for (let d = 0.01; d <= 1; d += 0.01) {
    for (const l of [c.l - d, c.l + d]) {
      if (l <= 0.02 || l >= 0.99) continue;
      const cand = mk(l, c.c, c.h);
      if (pass(cand)) return cand;
    }
  }
  return hex;
}

/** Where the band law puts light accents when the move runs from dark to light (OKLCH L), fitted. */
export const BAND_L_LIGHT = 0.58;

/**
 * The accent move alone, without any contrast floor: light to dark, L' = (1 - b)(L + s) + b * BAND_L
 * and C' = k * C, hue kept; dark to light runs it backwards. The benchmark (scripts/benchmark) scores
 * this against famous themes.
 */
export function accentMove(hex: string, set: Pick<DerivedSetting, "s" | "b" | "k">, toDark = true): string {
  const c = ok(hex);
  const l = toDark ? (1 - set.b) * (c.l + set.s) + set.b * BAND_L : (1 - set.b) * (c.l - set.s) + set.b * BAND_L_LIGHT;
  return mk(l, toDark ? c.c * set.k : c.c / set.k, c.h);
}

/** The dark version of a light accent: one move for the whole palette, then the dark page's floor. */
function darkOf(lightHex: string, set: DerivedSetting, pass: (h: string) => boolean): string {
  const c = ok(lightHex);
  const l = (1 - set.b) * (c.l + set.s) + set.b * BAND_L;
  const moved = mk(l, c.c * set.k, c.h);
  if (pass(moved)) return moved;
  // Only ever lifted further, never pushed the other way, so the move keeps its direction.
  // As far as the top of the lightness range: a near-black accent needs most of it (CodeRabbit, round 7).
  for (let d = 0.01; l + d <= 0.995; d += 0.01) {
    const cand = mk(l + d, c.c * set.k, c.h);
    if (pass(cand)) return cand;
  }
  return moved;
}

/** The token that, drawn at 60% over a page (shadcn's dark destructive), lands on a target color. */
function underSixty(target: string, page: string): string {
  const rgb = converter("rgb");
  const t = rgb(parse(target)!)!;
  const p = rgb(parse(page)!)!;
  const solve = (tc: number, pc: number) => Math.min(1, Math.max(0, (tc - 0.4 * pc) / 0.6));
  return formatHex({ mode: "rgb", r: solve(t.r, p.r), g: solve(t.g, p.g), b: solve(t.b, p.b) })!;
}

/** The palette, read by role. */
export interface Reading {
  accents: string[];
  pale?: string;
  deep?: string;
  hueless: boolean;
}

export function readPalette(input: string[]): Reading {
  // Each distinct color once, in its first spelling: three copies of one blue are one accent.
  const seeds = input.filter((s, i) => input.findIndex((x) => x.toLowerCase() === s.toLowerCase()) === i);
  // The first colored seed is primary whatever its lightness: a navy or a yellow brand is the brand,
  // not the dark page or the light page. Grey seeds before it stay base material.
  const first = seeds.find((s) => ok(s).c >= 0.04);
  const accents = [...(first ? [first] : []), ...seeds.filter((s) => s !== first && isAccent(s))];
  const base = seeds.filter((s) => s !== first && !isAccent(s));
  const byL = (xs: string[]) => [...xs].sort((a, b) => ok(a).l - ok(b).l);
  const pale = byL(base.filter((s) => ok(s).l >= 0.85)).at(-1);
  // The deep end: the darkest base color (an ink, a dark page); else the palette's darkest color.
  const deep = byL(base.filter((s) => ok(s).l <= 0.6))[0] ?? byL(seeds)[0];
  const hueless = accents.length === 0 && seeds.every((s) => ok(s).c < 0.005);
  return { accents, pale, deep, hueless };
}

/**
 * Set a derived mood's roles: palette colors as rules on their seeds, light's roles as references
 * to them, dark's accents as rules on light's.
 */
export function derivedShadcnRules(
  book: DesignBook,
  light: Scope,
  dark: Scope,
  seeds: string[],
  mood: DerivedMood,
): void {
  const set = DERIVED_SETTINGS[mood];
  const r = readPalette(seeds);
  const seedScope = book.addScope("seeds");
  seeds.forEach((s, i) => seedScope.set(`seed-${i}`, color(s)));
  const seedKey = (hex: string) => `seeds.seed-${Math.max(0, seeds.indexOf(hex))}`;

  // A palette color: a rule on its source (a seed, or a light color for a dark one), resolving to hex.
  const palette = book.addScope("palette");
  const put = (key: string, hex: string, from?: string) => {
    if (!palette.has(key)) {
      const c = ok(hex);
      palette.set(
        key,
        from ? relativeTo(ref(from), "oklch", [Number(c.l.toFixed(4)), Number(c.c.toFixed(4)), Number(c.h.toFixed(2))]) : color(hex),
      );
    }
    return ref(`palette.${key}`);
  };

  // --- Base: one ramp. ---
  const inkHue = r.deep && ok(r.deep).c >= 0.005 ? ok(r.deep).h : r.pale && ok(r.pale).c >= 0.005 ? ok(r.pale).h : r.accents[0] ? ok(r.accents[0]).h : 265;
  const paleHue = r.pale && ok(r.pale).c >= 0.005 ? ok(r.pale).h : inkHue;
  const tint = r.hueless ? 0 : 1;
  const paleC = r.pale ? Math.min(0.03, ok(r.pale).c) : 0.008 * tint;
  const deepC = r.deep ? Math.min(0.045, Math.max(0.012, ok(r.deep).c * 0.6)) * tint : 0.016 * tint;

  const lightPage = r.pale && ok(r.pale).l >= 0.9 ? r.pale : mk(0.975, paleC, paleHue);
  const lp = ok(lightPage);
  const lightCard = lp.l >= 0.985 ? lightPage : mk(Math.min(0.995, lp.l + 0.025), lp.c * 0.4, paleHue);
  const lightSidebar = mk(lp.l - 0.015, lp.c, paleHue);
  const deepL = r.deep ? ok(r.deep).l : 0;
  // The dark page is the deep seed itself only when it is base material, never the primary brand.
  const darkPage = r.deep && r.deep !== r.accents[0] && deepL >= 0.16 && deepL <= 0.32 ? r.deep : mk(r.hueless ? 0.16 : DARK_PAGE_L, deepC, inkHue);
  const dp = ok(darkPage);
  const darkCard = mk(dp.l + 0.05, dp.c, dp.h);
  const darkSidebar = mk(dp.l + 0.025, dp.c, dp.h);
  const inkC = Math.min(0.03, deepC);
  const lightInk = mk(LIGHT_INK_L, inkC, inkHue);
  const darkInk = mk(DARK_INK_L, Math.min(0.03, paleC || inkC), paleHue);

  const base = r.pale ?? r.deep;
  const from = base ? seedKey(base) : undefined;
  const modes = {
    light: { page: lightPage, card: lightCard, sidebar: lightSidebar, ink: lightInk, muted: mk(lp.l - 0.045, lp.c, paleHue), mutedInk: mk(0.48, inkC, inkHue), border: mk(lp.l - 0.1, lp.c * 1.2, paleHue) },
    dark: { page: darkPage, card: darkCard, sidebar: darkSidebar, ink: darkInk, muted: mk(dp.l + 0.08, dp.c, dp.h), mutedInk: mk(0.72, Math.min(0.03, paleC || inkC), paleHue), border: mk(dp.l + 0.13, dp.c * 1.2, dp.h) },
  };
  // Muted text is a floor (4.5:1) on every surface it sits on: the page, the card and muted itself.
  for (const m of ["light", "dark"] as const) {
    const b = modes[m];
    b.mutedInk = nearestPassing(b.mutedInk, (h) => [b.page, b.card, b.muted].every((bg) => wcagRatio(h, bg) >= TEXT));
  }
  const pagesOf = (m: "light" | "dark") => [modes[m].page, modes[m].card, modes[m].sidebar];

  for (const [m, scope] of [["light", light], ["dark", dark]] as const) {
    const b = modes[m];
    scope.set("background", put(`${m}-page`, b.page, from));
    scope.set("card", put(`${m}-card`, b.card, from));
    scope.set("popover", ref(`${m}.card`));
    scope.set("sidebar", put(`${m}-sidebar`, b.sidebar, from));
    const ink = put(`${m}-ink`, b.ink, from);
    for (const k of ["foreground", "card-foreground", "popover-foreground", "sidebar-foreground"]) scope.set(k, ink);
    scope.set("muted", put(`${m}-muted`, b.muted, from));
    scope.set("muted-foreground", put(`${m}-muted-ink`, b.mutedInk, from));
    scope.set("border", put(`${m}-border`, b.border, from));
    scope.set("input", ref(`${m}.border`));
    scope.set("sidebar-border", ref(`${m}.border`));
  }

  // --- Accents: light's are the seeds where they work; dark's are light's, moved together. ---
  const inkFor = (fill: string, m: "light" | "dark") => {
    const [d, l] = [modes.light.ink, modes.dark.ink];
    const best = wcagRatio(d, fill) >= wcagRatio(l, fill) ? d : l;
    return wcagRatio(best, fill) >= TEXT ? best : wcagRatio("#000000", fill) >= wcagRatio("#ffffff", fill) ? "#000000" : "#ffffff";
  };
  const markOn = (m: "light" | "dark") => (h: string) => pagesOf(m).every((p) => wcagRatio(h, p) >= MARK);
  const fillOn = (m: "light" | "dark") => (h: string) => markOn(m)(h) && holdsText(h);

  const pair = (key: string, seed: string, pass: (m: "light" | "dark") => (h: string) => boolean) => {
    const lightHex = nearestPassing(seed, pass("light"));
    const darkHex = darkOf(lightHex, set, pass("dark"));
    light.set(key, put(`${key}-light`, lightHex, seedKey(seed)));
    dark.set(key, put(`${key}-dark`, darkHex, `palette.${key}-light`));
    return { lightHex, darkHex };
  };

  // Primary: the first colored seed. A palette with no hue takes its ink, as stock shadcn does.
  if (r.accents[0]) {
    const p = pair("primary", r.accents[0], fillOn);
    light.set("primary-foreground", put("light-on-primary", inkFor(p.lightHex, "light"), from));
    dark.set("primary-foreground", put("dark-on-primary", inkFor(p.darkHex, "dark"), from));
  } else {
    light.set("primary", ref("light.foreground"));
    dark.set("primary", ref("dark.foreground"));
    light.set("primary-foreground", ref("light.background"));
    dark.set("primary-foreground", ref("dark.background"));
  }
  for (const m of ["light", "dark"] as const) {
    const scope = m === "light" ? light : dark;
    scope.set("ring", ref(`${m}.primary`));
    scope.set("sidebar-primary", ref(`${m}.primary`));
    scope.set("sidebar-primary-foreground", ref(`${m}.primary-foreground`));
    scope.set("sidebar-ring", ref(`${m}.primary`));
  }

  // Secondary and accent: the palette's other non-status accents. Flat (the seed itself, the same in
  // both modes) or a soft tint; an accent too close to secondary takes a stronger tint.
  const actions = r.accents.slice(1).filter((a) => !statusHue(a));
  const hueSource = (i: number) => actions[i] ?? r.accents[0];
  const tintOf = (hex: string | undefined, m: "light" | "dark", strong: boolean) => {
    const c = hex ? ok(hex) : { l: 0, c: 0, h: inkHue };
    return m === "light"
      ? mk(strong ? 0.87 : 0.93, Math.min(strong ? 0.08 : 0.05, c.c * 0.4), c.h)
      : mk(strong ? 0.42 : 0.34, Math.min(strong ? 0.08 : 0.06, c.c * 0.45), c.h);
  };
  const close = deltaE(tintOf(hueSource(0), "light", false), tintOf(hueSource(1), "light", false)) < 0.08;
  for (const [key, i] of [["secondary", 0], ["accent", 1]] as const) {
    const seed = actions[i];
    if (set.fills === "flat" && seed && holdsText(seed)) {
      light.set(key, put(`${key}-light`, seed, seedKey(seed)));
      dark.set(key, put(`${key}-dark`, seed, `palette.${key}-light`));
      light.set(`${key}-foreground`, put(`light-on-${key}`, inkFor(seed, "light"), from));
      dark.set(`${key}-foreground`, put(`dark-on-${key}`, inkFor(seed, "dark"), from));
    } else {
      const strong = key === "accent" && close;
      const src = hueSource(i);
      light.set(key, put(`${key}-light`, tintOf(src, "light", strong), src ? seedKey(src) : from));
      dark.set(key, put(`${key}-dark`, tintOf(src, "dark", strong), `palette.${key}-light`));
      light.set(`${key}-foreground`, ref("light.foreground"));
      dark.set(`${key}-foreground`, ref("dark.foreground"));
    }
  }
  for (const m of ["light", "dark"] as const) {
    const scope = m === "light" ? light : dark;
    scope.set("sidebar-accent", ref(`${m}.accent`));
    scope.set("sidebar-accent-foreground", ref(`${m}.accent-foreground`));
  }

  // Destructive: the fixed red, seen the same in both modes. Light's holds white text (shadcn draws
  // white on it) and stands apart from a red-brand primary; dark's lands on light's red after
  // shadcn's 60% over the page, as near as sRGB allows.
  const primaryLight = r.accents[0] ? ok(String(book.resolve("light.primary"))) : undefined;
  let red = mk(STATUS.red.l, STATUS.red.c, STATUS.red.h);
  for (let l = STATUS.red.l; l >= 0.35; l -= 0.01) {
    const cand = mk(l, STATUS.red.c, STATUS.red.h);
    if (wcagRatio("#ffffff", cand) < TEXT) continue;
    red = cand;
    if (!primaryLight || deltaE(cand, mk(primaryLight.l, primaryLight.c, primaryLight.h)) >= 0.12) break;
  }
  light.set("destructive", put("destructive-light", red));
  dark.set("destructive", put("destructive-dark", underSixty(red, darkPage), "palette.destructive-light"));

  // Charts: three or more accents are the accents themselves, light to dark; fewer, steps of the
  // primary's hue; none, stock shadcn's greys, the same in both modes (audited as advisory). Every
  // hued bar clears 3:1 on the pages of its mode. Dark's are light's, moved, and lifted to the floor.
  if (r.hueless) {
    [0.87, 0.556, 0.439, 0.371, 0.269].forEach((l, n) => {
      const hex = mk(l, 0, 0);
      light.set(`chart-${n + 1}`, put(`chart-${n + 1}-light`, hex));
      dark.set(`chart-${n + 1}`, ref(`palette.chart-${n + 1}-light`));
    });
  } else {
    const sources = r.accents.length >= 3 ? r.accents.slice(0, 5) : [];
    const p0 = ok(r.accents[0] ?? seeds[0]!);
    // Steps span the lightnesses that clear 3:1 on the light pages: from the lightest that does, down.
    let lMax = 0.95;
    while (lMax > 0.35 && !markOn("light")(mk(lMax, p0.c, p0.h))) lMax -= 0.01;
    const lMin = Math.max(0.25, lMax - 0.4);
    const steps = [0, 1, 2, 3, 4].map((i) => mk(lMax - ((lMax - lMin) * i) / 4, p0.c, p0.h));
    const lights = [...sources.map((s) => nearestPassing(s, markOn("light"))), ...steps.slice(sources.length)]
      .slice(0, 5)
      .sort((a, b) => ok(b).l - ok(a).l)
      // Bars floored to the same lightness bunch; each steps at least 0.05 below the one before. On a
      // light page darker only gains contrast, so the floor still holds.
      .reduce<string[]>((out, hex) => {
        const c = ok(hex);
        const prev = out.at(-1);
        out.push(prev && c.l > ok(prev).l - 0.05 ? mk(ok(prev).l - 0.05, c.c, c.h) : hex);
        return out;
      }, []);
    // Steps of one hue separate by lightness only, so they lift together without the band's squeeze.
    const chartSet = sources.length >= 3 ? set : { ...set, b: 0, s: set.s || 0.12 };
    // Dark: each bar moved, then lifted to the floor. Lifting alone can bunch bars at the floor, so
    // the bars are spread over the passing range, keeping their order, and only ever lifted.
    const moved = lights.map((hex) => darkOf(hex, chartSet, () => true));
    let dMin = 0.3;
    while (dMin < 0.95 && !moved.every((h) => markOn("dark")(mk(dMin, ok(h).c, ok(h).h)))) dMin += 0.01;
    const top = Math.min(0.93, Math.max(ok(moved[0]!).l, dMin + 0.3));
    const darks = moved.map((h, n) => {
      const c = ok(h);
      const spread = top - ((top - dMin) * n) / Math.max(1, moved.length - 1);
      const l = Math.max(c.l, spread, ok(lights[n]!).l);
      return darkOf(mk(l, c.c, c.h), { s: 0, b: 0, k: 1, fills: set.fills }, markOn("dark"));
    });
    // Bars lifted to the floor can still bunch (five steps of one hue): from the darkest up, each sits at
    // least 0.05 above the one below. Only ever a lift, so each still clears the dark pages.
    for (let n = darks.length - 2; n >= 0; n--) {
      const c = ok(darks[n]!), below = ok(darks[n + 1]!).l;
      if (c.l < below + 0.05) darks[n] = mk(Math.min(0.97, below + 0.05), c.c, c.h);
    }
    lights.forEach((hex, n) => {
      const key = `chart-${n + 1}`;
      // The seed it came from: the nearest hue (moving to a legible lightness can nudge hue slightly).
      const src = sources.length ? sources.reduce((x, y) => (gap(ok(y).h, ok(hex).h) < gap(ok(x).h, ok(hex).h) ? y : x)) : undefined;
      light.set(key, put(`${key}-light`, hex, src ? seedKey(src) : r.accents[0] ? seedKey(r.accents[0]) : from));
      dark.set(key, put(`${key}-dark`, darks[n]!, `palette.${key}-light`));
    });
  }
}
