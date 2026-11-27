import {
  clampChroma,
  converter,
  formatHex,
  parse,
  type Oklch,
} from "culori";
import { Poline, positionFunctions } from "poline";
import { generateColorRamp } from "rampensau";
import {
  apcaContrastExact,
  parseCssColorExact,
  thresholdsForStandard,
  wcagRatioExact,
  type AuditStandard,
  type ExactRgb,
} from "./audit";

export type Mood = "neutral" | "muted" | "vivid" | "editorial" | "high-contrast" | "freak";
export type GeneratorKind = "oklch" | "poline" | "rampensau";

export interface MoodProfile {
  neutralChroma: number;
  accentChromaMin: number;
  accentChromaMax: number;
  secondaryChroma: number;
  statusChroma: number;
  minTextContrast: number;
  minMutedContrast: number;
  description: string;
}

export const MOOD_PROFILES: Record<Mood, MoodProfile> = {
  neutral: {
    neutralChroma: 0.008,
    accentChromaMin: 0.04,
    accentChromaMax: 0.16,
    secondaryChroma: 0.015,
    statusChroma: 0.17,
    minTextContrast: 14.0,
    minMutedContrast: 4.8,
    description: "Clean, restrained neutrality with subtle seed-tinted surfaces",
  },
  muted: {
    neutralChroma: 0.014,
    accentChromaMin: 0.04,
    accentChromaMax: 0.11,
    secondaryChroma: 0.024,
    statusChroma: 0.14,
    minTextContrast: 12.0,
    minMutedContrast: 4.8,
    description: "Calm, desaturated tones across every hue (Ellen Divers character-first)",
  },
  vivid: {
    neutralChroma: 0.012,
    accentChromaMin: 0.12,
    accentChromaMax: 0.24,
    secondaryChroma: 0.04,
    statusChroma: 0.2,
    minTextContrast: 14.0,
    minMutedContrast: 4.8,
    description: "Expressive high-chroma accents anchored against crisp neutrals",
  },
  editorial: {
    neutralChroma: 0.016,
    accentChromaMin: 0.06,
    accentChromaMax: 0.15,
    secondaryChroma: 0.025,
    statusChroma: 0.16,
    minTextContrast: 14.5,
    minMutedContrast: 5.0,
    description: "Warm paper-and-ink feel with refined, authoritative contrast",
  },
  "high-contrast": {
    neutralChroma: 0.004,
    accentChromaMin: 0.08,
    accentChromaMax: 0.2,
    secondaryChroma: 0.012,
    statusChroma: 0.2,
    minTextContrast: 17.0,
    minMutedContrast: 7.4,
    description: "Maximum legibility targeting AAA (7:1) / APCA 75+ reading comfort",
  },
  freak: {
    neutralChroma: 0.012,
    accentChromaMin: 0.12,
    accentChromaMax: 0.24,
    secondaryChroma: 0.04,
    statusChroma: 0.2,
    minTextContrast: 14.0,
    minMutedContrast: 4.8,
    description: "Spends the whole palette: seed-tinted surfaces in both modes, the seeds as fills and charts",
  },
};

const toOklch = converter("oklch");
const toOklab = converter("oklab");
const toHsl = converter("hsl");
const toRgb = converter("rgb");

export const SRGB_GAMUT_EPSILON = 5e-4;

export function isRgbInSrgbGamut(
  rgb: { r: number; g: number; b: number },
  eps = SRGB_GAMUT_EPSILON,
): boolean {
  return (
    rgb.r >= -eps &&
    rgb.r <= 1 + eps &&
    rgb.g >= -eps &&
    rgb.g <= 1 + eps &&
    rgb.b >= -eps &&
    rgb.b <= 1 + eps
  );
}

export function normalizeHexInput(input: string): string | undefined {
  const m = input.trim().match(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/);
  if (!m) return undefined;
  const raw = m[1]!.toLowerCase();
  if (raw.length === 3) {
    return `#${raw[0]}${raw[0]}${raw[1]}${raw[1]}${raw[2]}${raw[2]}`;
  }
  return `#${raw}`;
}

export function normalizeHue(h: number | undefined): number {
  if (h === undefined || Number.isNaN(h)) return 0;
  return ((h % 360) + 360) % 360;
}

export function parseToOklch(input: string): Oklch {
  const parsed = parse(input.trim());
  if (!parsed) {
    throw new Error(`Invalid CSS color: "${input}"`);
  }
  const c = toOklch(parsed);
  return {
    mode: "oklch",
    l: Math.max(0, Math.min(1, c.l ?? 0)),
    c: Math.max(0, c.c ?? 0),
    h: normalizeHue(c.h),
    alpha: c.alpha,
  };
}

export function gamutSafeOklch(l: number, c: number, h: number): Oklch {
  const raw: Oklch = {
    mode: "oklch",
    l: Math.max(0, Math.min(1, l)),
    c: Math.max(0, c),
    h: normalizeHue(h),
  };
  const clamped = clampChroma(raw, "oklch", "rgb");
  return {
    mode: "oklch",
    l: Math.max(0, Math.min(1, clamped.l ?? raw.l)),
    c: Math.max(0, clamped.c ?? 0),
    h: normalizeHue(clamped.h ?? raw.h),
  };
}

export function toSafeHex(input: string | Oklch): string {
  if (typeof input === "string") {
    const exactHex = normalizeHexInput(input);
    if (exactHex) return exactHex;
    const parsed = parse(input.trim());
    if (parsed) {
      const rgb = toRgb(parsed);
      if (rgb && isRgbInSrgbGamut(rgb)) {
        const hex = formatHex({
          mode: "rgb",
          r: Math.max(0, Math.min(1, rgb.r)),
          g: Math.max(0, Math.min(1, rgb.g)),
          b: Math.max(0, Math.min(1, rgb.b)),
        });
        if (hex) return hex.toLowerCase();
      }
    }
  }
  const c = typeof input === "string" ? parseToOklch(input) : input;
  const rgbDirect = toRgb(c);
  if (rgbDirect && isRgbInSrgbGamut(rgbDirect)) {
    const hex = formatHex({
      mode: "rgb",
      r: Math.max(0, Math.min(1, rgbDirect.r)),
      g: Math.max(0, Math.min(1, rgbDirect.g)),
      b: Math.max(0, Math.min(1, rgbDirect.b)),
    });
    if (hex) return hex.toLowerCase();
  }
  const clamped = clampChroma(c, "oklch", "rgb");
  const hex = formatHex(clamped);
  if (!hex) {
    throw new Error(`Failed to format color to hex: ${JSON.stringify(c)}`);
  }
  return hex.toLowerCase();
}

/**
 * Format an OKLCH color string guaranteed to re-parse strictly inside sRGB gamut.
 * When given an 8-bit hex input, preserves exact 8-bit hex round-trip on re-parse.
 */
export function formatOklchCss(input: string | Oklch): string {
  const exactHex = typeof input === "string" ? normalizeHexInput(input) : undefined;
  const c = typeof input === "string" ? parseToOklch(input) : input;

  const build = (l: number, ch: number, h: number, decimals: number) => {
    const lStr = Number(l.toFixed(decimals));
    const cStr = ch < 0.00005 ? 0 : Number(ch.toFixed(decimals));
    const hStr = cStr === 0 ? 0 : Number(normalizeHue(h).toFixed(decimals >= 5 ? decimals - 1 : 2));
    return `oklch(${lStr} ${cStr} ${hStr})`;
  };

  if (exactHex) {
    for (const dec of [4, 5, 6]) {
      const candidate = build(c.l, c.c, c.h ?? 0, dec);
      const rgb = toRgb(parse(candidate));
      if (rgb && isRgbInSrgbGamut(rgb) && formatHex(rgb)?.toLowerCase() === exactHex) {
        return candidate;
      }
    }
    for (let step = 1; step <= 20; step++) {
      const candidate = build(c.l, Math.max(0, c.c - step * 0.00002), c.h ?? 0, 6);
      const rgb = toRgb(parse(candidate));
      if (rgb && isRgbInSrgbGamut(rgb) && formatHex(rgb)?.toLowerCase() === exactHex) {
        return candidate;
      }
    }
  }

  let ch = Math.floor(c.c * 10000) / 10000;
  for (let step = 0; step < 30; step++) {
    const candidate = build(c.l, Math.max(0, ch), c.h ?? 0, 4);
    const rgb = toRgb(parse(candidate));
    if (rgb && isRgbInSrgbGamut(rgb)) {
      return candidate;
    }
    ch = Math.max(0, ch - 0.0001);
  }
  return build(c.l, 0, 0, 4);
}

const WHITE_RGB: ExactRgb = { r: 1, g: 1, b: 1, alpha: 1 };
const BLACK_RGB: ExactRgb = { r: 0, g: 0, b: 0, alpha: 1 };

/**
 * Verify on the *serialized* OKLCH representation whether the ink that Design Book's
 * `bestContrastWith(fill, inks)` selects (highest WCAG contrast between #000 and #fff)
 * satisfies the active text standard (`wcag-aa`, `wcag-aaa`, or `apca`).
 * Automatically avoids both the WCAG AAA mid-lightness dead band and the APCA polarity
 * crossover zone where WCAG's winner disagrees with APCA.
 */
export function canInkPassStandard(fillHex: string, standard: AuditStandard): boolean {
  const serialized = formatOklchCss(fillHex);
  const parsed = parseCssColorExact(serialized);
  if (!parsed.ok) return false;
  const t = thresholdsForStandard(standard);
  const wBlack = wcagRatioExact(BLACK_RGB, parsed.rgb);
  const wWhite = wcagRatioExact(WHITE_RGB, parsed.rgb);
  const chosenInk = wBlack >= wWhite ? BLACK_RGB : WHITE_RGB;

  if (standard === "apca") {
    return Math.abs(apcaContrastExact(chosenInk, parsed.rgb)) >= t.textApca;
  }
  return Math.max(wBlack, wWhite) >= t.textWcag;
}

/** Check whether a serialized fill also clears UI graphic contrast (ring/focus) on `bgHex`. */
function clearsUiGraphicOnBg(fillHex: string, bgHex: string, standard: AuditStandard): boolean {
  const fillParsed = parseCssColorExact(formatOklchCss(fillHex));
  const bgParsed = parseCssColorExact(formatOklchCss(bgHex));
  if (!fillParsed.ok || !bgParsed.ok) return false;
  const t = thresholdsForStandard(standard);
  if (standard === "apca") {
    return Math.abs(apcaContrastExact(fillParsed.rgb, bgParsed.rgb)) >= t.uiGraphicApca;
  }
  return wcagRatioExact(fillParsed.rgb, bgParsed.rgb) >= t.uiGraphicWcag;
}

export function oklabDistance(colorA: string, colorB: string): number {
  const a = toOklab(parse(colorA));
  const b = toOklab(parse(colorB));
  if (!a || !b) return 0;
  const dl = (a.l ?? 0) - (b.l ?? 0);
  const da = (a.a ?? 0) - (b.a ?? 0);
  const db = (a.b ?? 0) - (b.b ?? 0);
  return Math.sqrt(dl * dl + da * da + db * db);
}

export interface ChartPolarityDiagnostics {
  minOklabDist: number;
  effectiveChroma: number;
  thresholdRatio: number;
  syntheticCount: number;
  syntheticKeys: string[];
}

export interface GeneratedPools {
  rawSeeds: string[];
  seedHexes: string[];
  seedOklch: Oklch[];
  primaryHue: number;
  neutrals: Record<string, string>;
  brand: Record<string, string>;
  brandSolvableLight: Record<string, string>;
  brandSolvableDark: Record<string, string>;
  candidates: Record<string, string>;
  statusTargets: Record<string, string>;
  statusPools: {
    dangerLight: Record<string, string>;
    dangerDark: Record<string, string>;
    successLight: Record<string, string>;
    successDark: Record<string, string>;
    warningLight: Record<string, string>;
    warningDark: Record<string, string>;
  };
  chartsLight: Record<string, string>;
  chartsDark: Record<string, string>;
  chartDiagnostics: {
    light: ChartPolarityDiagnostics;
    dark: ChartPolarityDiagnostics;
  };
}

const NEUTRAL_STOPS: Array<[string, number]> = [
  ["n000", 0.995],
  ["n050", 0.98],
  ["n100", 0.955],
  ["n150", 0.925],
  ["n200", 0.885],
  ["n250", 0.84],
  ["n300", 0.79],
  ["n350", 0.745],
  ["n400", 0.69],
  ["n500", 0.56],
  ["n600", 0.45],
  ["n650", 0.4],
  ["n700", 0.34],
  ["n750", 0.29],
  ["n800", 0.24],
  ["n850", 0.19],
  ["n900", 0.14],
  ["n950", 0.085],
  ["n990", 0.03],
];

const BRAND_STOPS: Array<[string, number, number]> = [
  ["b050", 0.96, 0.22],
  ["b100", 0.92, 0.38],
  ["b200", 0.85, 0.58],
  ["b250", 0.81, 0.68],
  ["b300", 0.76, 0.78],
  ["b350", 0.71, 0.88],
  ["b400", 0.66, 0.95],
  ["b450", 0.61, 0.98],
  ["b500", 0.56, 1.0],
  ["b550", 0.51, 0.98],
  ["b600", 0.46, 0.96],
  ["b650", 0.42, 0.92],
  ["b700", 0.37, 0.88],
  ["b750", 0.32, 0.8],
  ["b800", 0.27, 0.72],
  ["b900", 0.2, 0.55],
  ["b950", 0.14, 0.4],
];

function oklchToHslTriple(c: Oklch): [number, number, number] {
  const hsl = toHsl(c);
  return [
    normalizeHue(hsl?.h ?? c.h),
    Math.max(0.05, Math.min(0.95, hsl?.s ?? 0.5)),
    Math.max(0.1, Math.min(0.9, hsl?.l ?? 0.5)),
  ];
}

function hueDistance(a: number, b: number): number {
  const d = Math.abs(normalizeHue(a) - normalizeHue(b));
  return Math.min(d, 360 - d);
}

function buildGeneratorCandidates(
  rawSeeds: string[],
  seeds: Oklch[],
  mood: Mood,
  generator: GeneratorKind,
): { candidates: Record<string, string>; generatorHues: number[] } {
  const profile = MOOD_PROFILES[mood];
  const primary = seeds[0]!;
  const isAchromaticSeed = primary.c < 0.015;
  const baseHue = isAchromaticSeed ? 255 : normalizeHue(primary.h);
  const targetChroma = isAchromaticSeed
    ? Math.min(0.08, profile.accentChromaMin)
    : Math.max(profile.accentChromaMin, Math.min(profile.accentChromaMax, primary.c));

  const out: Record<string, string> = {};
  const rawHues: number[] = [];

  if (generator === "poline") {
    const anchor1 = oklchToHslTriple(
      gamutSafeOklch(0.32, Math.max(0.08, targetChroma * 0.95), normalizeHue(baseHue - 24)),
    );
    const anchor2 =
      seeds.length > 1
        ? oklchToHslTriple(seeds[1]!)
        : oklchToHslTriple(
            gamutSafeOklch(0.6, Math.max(0.1, targetChroma), normalizeHue(baseHue + 52)),
          );
    const anchor3 =
      seeds.length > 2
        ? oklchToHslTriple(seeds[2]!)
        : oklchToHslTriple(
            gamutSafeOklch(0.8, Math.max(0.08, targetChroma * 0.85), normalizeHue(baseHue + 195)),
          );

    const poline = new Poline({
      anchorColors: [anchor1, anchor2, anchor3],
      numPoints: 6,
      positionFunctionX: positionFunctions.sinusoidalPosition,
      positionFunctionY: positionFunctions.quadraticPosition,
      positionFunctionZ: positionFunctions.linearPosition,
    });

    poline.colorsCSS.forEach((cssHsl, idx) => {
      const ok = parseToOklch(cssHsl);
      if (ok.c >= 0.02) rawHues.push(normalizeHue(ok.h));
      const shaped = gamutSafeOklch(
        ok.l,
        Math.min(profile.accentChromaMax, ok.c),
        ok.h ?? baseHue,
      );
      out[`pol-${String(idx).padStart(2, "0")}`] = toSafeHex(shaped);
    });
  } else if (generator === "rampensau") {
    const ramp = generateColorRamp({
      total: 14,
      hStart: baseHue,
      hCycles: seeds.length > 1 ? 0.65 : 0.35,
      sRange: [
        Math.max(0.25, profile.accentChromaMin * 2.5),
        Math.min(0.92, profile.accentChromaMax * 3.8),
      ],
      lRange: [0.18, 0.86],
    });
    ramp.forEach(([h, s, l], idx) => {
      const ok = parseToOklch(
        `hsl(${h.toFixed(1)} ${(s * 100).toFixed(1)}% ${(l * 100).toFixed(1)}%)`,
      );
      if (ok.c >= 0.02) rawHues.push(normalizeHue(ok.h));
      const shaped = gamutSafeOklch(
        ok.l,
        Math.min(profile.accentChromaMax, ok.c),
        ok.h ?? baseHue,
      );
      out[`rmp-${String(idx).padStart(2, "0")}`] = toSafeHex(shaped);
    });
  } else {
    const offsets = [
      { prefix: "pri", dh: 0, cmul: 1.0 },
      { prefix: "ana", dh: 52, cmul: 0.94 },
      { prefix: "cmp", dh: 175, cmul: 0.92 },
      { prefix: "tri", dh: -118, cmul: 0.9 },
      { prefix: "spl", dh: 112, cmul: 0.88 },
    ];
    const lightnesses = [0.24, 0.38, 0.52, 0.66, 0.78, 0.88];
    for (const { prefix, dh, cmul } of offsets) {
      rawHues.push(normalizeHue(baseHue + dh));
      lightnesses.forEach((l, idx) => {
        const c = gamutSafeOklch(l, targetChroma * cmul, normalizeHue(baseHue + dh));
        out[`${prefix}-${idx}`] = toSafeHex(c);
      });
    }
  }

  // Exact seeds placed cleanly in candidates (exact hex preserved when sRGB hex)
  seeds.forEach((s, idx) => {
    const exact = normalizeHexInput(rawSeeds[idx]!) ?? toSafeHex(s);
    out[`seed-${idx}`] = exact;
    if (s.c >= 0.02) rawHues.unshift(normalizeHue(s.h));
    out[`seed-${idx}-deep`] = toSafeHex(
      gamutSafeOklch(0.36, Math.max(s.c, profile.accentChromaMin), s.h ?? baseHue),
    );
    out[`seed-${idx}-bright`] = toSafeHex(
      gamutSafeOklch(0.76, Math.max(s.c, profile.accentChromaMin), s.h ?? baseHue),
    );
  });

  // Deduplicate hues within 12 degrees while preserving generator order
  const generatorHues: number[] = [];
  for (const h of rawHues) {
    if (!generatorHues.some((existing) => hueDistance(existing, h) < 12)) {
      generatorHues.push(h);
    }
  }

  return { candidates: out, generatorHues };
}

interface ChartCandidate {
  key: string;
  hue: number;
  hex: string;
  oklch: string;
  chroma: number;
  synthetic: boolean;
}

/**
 * Legibility-wins chart pool builder:
 * 1. Maps generator hues to polarity-safe lightness & chroma so every candidate
 *    passes WCAG >= 3.0:1 AND APCA |Lc| >= 45 against `modeBgHex`.
 * 2. Runs deterministic maximin OKLab farthest-point sampling (deduplicated,
 *    lexical tie-break) to pick 5 colors.
 * 3. If the generator's hue arc is too narrow to clear `0.8 * effectiveChroma`
 *    (e.g., 1-seed rampensau spanning ~126 deg), supplements with evenly spaced
 *    synthetic hues and records exactly which picks were synthetic.
 */
function buildChartSeries(
  generatorHues: number[],
  fallbackBaseHue: number,
  polarity: "light" | "dark",
  modeBgHex: string,
  profile: MoodProfile,
): { scopeEntries: Record<string, string>; diagnostics: ChartPolarityDiagnostics } {
  const targetChroma = Math.max(0.095, Math.min(0.2, profile.accentChromaMax));
  const bgParsed = parseCssColorExact(modeBgHex);
  const bgRgb = bgParsed.ok ? bgParsed.rgb : polarity === "light" ? WHITE_RGB : BLACK_RGB;

  const makeReadableAtHue = (hue: number, key: string, synthetic: boolean): ChartCandidate | undefined => {
    // Prefer consistent polarity lightness, nudging if a yellow/blue hue needs slightly
    // darker (light mode) or lighter (dark mode) L to clear 3.0:1 WCAG + |Lc| >= 45 APCA.
    const tryLightnesses =
      polarity === "light"
        ? [0.5, 0.47, 0.44, 0.41, 0.38]
        : [0.74, 0.77, 0.8, 0.83, 0.86];

    for (const l of tryLightnesses) {
      const ok = gamutSafeOklch(l, targetChroma, hue);
      const serialized = formatOklchCss(ok);
      const reparsed = parseCssColorExact(serialized);
      if (!reparsed.ok) continue;
      const w = wcagRatioExact(reparsed.rgb, bgRgb);
      const a = Math.abs(apcaContrastExact(reparsed.rgb, bgRgb));
      if (w >= 3.05 && a >= 46) {
        const finalOk = parseToOklch(serialized);
        return {
          key,
          hue: normalizeHue(hue),
          hex: toSafeHex(serialized),
          oklch: serialized,
          chroma: finalOk.c,
          synthetic,
        };
      }
    }
    return undefined;
  };

  const selectMaximin = (pool: ChartCandidate[]): ChartCandidate[] => {
    // Deduplicate by hex, deterministic lexical key order for ties
    const unique: ChartCandidate[] = [];
    const seenHex = new Set<string>();
    for (const item of pool) {
      if (!seenHex.has(item.hex)) {
        seenHex.add(item.hex);
        unique.push(item);
      }
    }
    if (unique.length <= 5) return unique;

    const picked: ChartCandidate[] = [unique[0]!];
    const remaining = unique.slice(1);

    while (picked.length < 5 && remaining.length > 0) {
      let bestIdx = 0;
      let bestMinDist = -1;

      for (let i = 0; i < remaining.length; i++) {
        const cand = remaining[i]!;
        let minDist = Infinity;
        for (const p of picked) {
          const d = oklabDistance(cand.oklch, p.oklch);
          if (d < minDist) minDist = d;
        }
        // Deterministic tie-break: prefer non-synthetic first, then lexical key
        const isBetter =
          minDist > bestMinDist + 1e-9 ||
          (Math.abs(minDist - bestMinDist) <= 1e-9 &&
            ((!cand.synthetic && remaining[bestIdx]!.synthetic) ||
              (cand.synthetic === remaining[bestIdx]!.synthetic &&
                cand.key.localeCompare(remaining[bestIdx]!.key) < 0)));
        if (isBetter) {
          bestMinDist = minDist;
          bestIdx = i;
        }
      }
      picked.push(remaining.splice(bestIdx, 1)[0]!);
    }
    return picked;
  };

  const measureSeries = (picks: ChartCandidate[]) => {
    let minDist = Infinity;
    for (let i = 0; i < picks.length; i++) {
      for (let j = i + 1; j < picks.length; j++) {
        const d = oklabDistance(picks[i]!.oklch, picks[j]!.oklch);
        if (d < minDist) minDist = d;
      }
    }
    const effectiveChroma =
      picks.length > 0 ? picks.reduce((s, p) => s + p.chroma, 0) / picks.length : 0;
    return {
      minOklabDist: Number.isFinite(minDist) ? minDist : 0,
      effectiveChroma,
    };
  };

  // Start with generator hues
  const genCandidates: ChartCandidate[] = [];
  generatorHues.forEach((h, idx) => {
    const c = makeReadableAtHue(h, `g-${String(idx).padStart(2, "0")}`, false);
    if (c) genCandidates.push(c);
  });

  let picks = selectMaximin(genCandidates);
  let stats = measureSeries(picks);
  const thresholdRatio = 0.8;

  // Legibility wins: if fewer than 5 picks OR greedy maximin fell below 0.8 * effectiveChroma
  // (e.g. narrow hue arc OR greedy circle bifurcation to 45 deg), place 5 evenly-spaced
  // pentagon spokes anchored at the generator's first hue, snapping to a generator candidate
  // whenever one lies within +/-24 deg of a spoke and using a synthetic spoke otherwise.
  if (picks.length < 5 || stats.minOklabDist < thresholdRatio * stats.effectiveChroma) {
    const anchorHue = generatorHues[0] ?? fallbackBaseHue;
    const usedGen = new Set<string>();
    const pentagon: ChartCandidate[] = [];

    for (let k = 0; k < 5; k++) {
      const targetHue = normalizeHue(anchorHue + k * 72);
      let bestGen: ChartCandidate | undefined;
      let bestAngle = Infinity;
      for (const g of genCandidates) {
        if (usedGen.has(g.key)) continue;
        const d = hueDistance(g.hue, targetHue);
        if (d <= 14 && d < bestAngle) {
          bestAngle = d;
          bestGen = g;
        }
      }
      if (bestGen) {
        usedGen.add(bestGen.key);
        pentagon.push(bestGen);
      } else {
        const synth = makeReadableAtHue(targetHue, `s-${k}`, true);
        if (synth) pentagon.push(synth);
      }
    }
    if (pentagon.length === 5) {
      const pentStats = measureSeries(pentagon);
      if (pentStats.minOklabDist >= thresholdRatio * pentStats.effectiveChroma) {
        picks = pentagon;
        stats = pentStats;
      } else {
        const pure: ChartCandidate[] = [];
        for (let k = 0; k < 5; k++) {
          const targetHue = normalizeHue(anchorHue + k * 72);
          const item =
            k === 0 && genCandidates[0]
              ? genCandidates[0]!
              : makeReadableAtHue(targetHue, `s-${k}`, true);
          if (item) pure.push(item);
        }
        if (pure.length === 5) {
          picks = pure;
          stats = measureSeries(pure);
        }
      }
    }
  }

  const scopeEntries: Record<string, string> = {};
  const syntheticKeys: string[] = [];
  picks.forEach((p, idx) => {
    const slotKey = `c-${idx + 1}`;
    scopeEntries[slotKey] = p.hex;
    if (p.synthetic) syntheticKeys.push(`chart-${idx + 1}`);
  });

  return {
    scopeEntries,
    diagnostics: {
      minOklabDist: Number(stats.minOklabDist.toFixed(4)),
      effectiveChroma: Number(stats.effectiveChroma.toFixed(4)),
      thresholdRatio,
      syntheticCount: syntheticKeys.length,
      syntheticKeys,
    },
  };
}

function buildStatusPool(
  hue: number,
  chroma: number,
  polarity: "light" | "dark",
  standard: AuditStandard,
): { target: string; pool: Record<string, string> } {
  // Dense lightness ramp filtered by canInkPassStandard so AA, AAA, and APCA all have
  // honest named Design Book pools with zero dead-band failures.
  const preferredL = polarity === "light" ? 0.5 : 0.72;
  const target = toSafeHex(gamutSafeOklch(preferredL, chroma, hue));
  const pool: Record<string, string> = {};

  for (let i = 0; i <= 36; i++) {
    const l = 0.16 + (i / 36) * 0.74; // 0.16..0.90
    const hex = toSafeHex(gamutSafeOklch(l, chroma, hue));
    if (canInkPassStandard(hex, standard)) {
      pool[`s-${String(i).padStart(2, "0")}`] = hex;
    }
  }
  // Always ensure at least extreme dark/light safety fallback
  if (Object.keys(pool).length === 0) {
    pool["s-fallback"] = polarity === "light" ? "#1f1f1f" : "#f5f5f5";
  }
  return { target, pool };
}

export function generatePools(
  seedInputs: string[],
  mood: Mood = "neutral",
  generator: GeneratorKind = "oklch",
  standard: AuditStandard = "wcag-aa",
): GeneratedPools {
  if (seedInputs.length === 0) {
    throw new Error("At least one --seed color is required.");
  }
  const profile = MOOD_PROFILES[mood];
  const seedOklch = seedInputs.map(parseToOklch);
  // Preserve exact lowercase hex for 8-bit sRGB hex inputs without OKLCH round-trip drift
  const seedHexes = seedInputs.map((raw, i) => normalizeHexInput(raw) ?? toSafeHex(seedOklch[i]!));
  const primary = seedOklch[0]!;
  const isAchromatic = primary.c < 0.015;
  const primaryHue = isAchromatic ? 0 : normalizeHue(primary.h);

  // Neutral ramp: tinted subtly by seed hue unless seed is achromatic
  const neutralChroma = isAchromatic ? 0 : profile.neutralChroma;
  const neutrals: Record<string, string> = {};
  for (const [key, l] of NEUTRAL_STOPS) {
    const endTaper = Math.sin(Math.PI * l);
    const c = neutralChroma * Math.max(0.15, endTaper);
    neutrals[key] = toSafeHex(gamutSafeOklch(l, c, primaryHue));
  }

  // Brand ramp anchored on seed 0 — insert exact seed-0 FIRST so deterministic tie-breaks prefer it!
  const brandChroma = isAchromatic
    ? 0
    : Math.max(profile.accentChromaMin, Math.min(profile.accentChromaMax, primary.c));
  const brand: Record<string, string> = {
    "seed-0": seedHexes[0]!,
  };
  for (const [key, l, mul] of BRAND_STOPS) {
    const hueShift = !isAchromatic && l > 0.7 ? 4 : !isAchromatic && l < 0.35 ? -4 : 0;
    brand[key] = toSafeHex(
      gamutSafeOklch(l, brandChroma * mul, normalizeHue(primaryHue + hueShift)),
    );
  }

  // Named standard-solvable brand scopes: guarantees BOTH that primary-foreground clears
  // the active standard (AA, AAA, or APCA) AND that ring/focus clears UI graphic contrast
  // on each mode's background (plus an extreme neutral fallback so closest(..., readableOn)
  // can never throw FunctionError).
  const brandSolvableLight: Record<string, string> = {};
  const brandSolvableDark: Record<string, string> = {};
  for (const [k, hex] of Object.entries(brand)) {
    if (!canInkPassStandard(hex, standard)) continue;
    if (clearsUiGraphicOnBg(hex, neutrals.n000!, standard)) {
      brandSolvableLight[k] = hex;
    }
    if (clearsUiGraphicOnBg(hex, neutrals.n950!, standard)) {
      brandSolvableDark[k] = hex;
    }
  }
  brandSolvableLight["fallback-dark"] = neutrals.n990!;
  brandSolvableDark["fallback-light"] = neutrals.n000!;

  // Candidate pool & generator hues (incorporates all seeds + chosen generator)
  const { candidates, generatorHues } = buildGeneratorCandidates(
    seedInputs,
    seedOklch,
    mood,
    generator,
  );

  // Standard-solvable status pools (works uniformly across AA, AAA, and APCA!)
  const statusCh = profile.statusChroma;
  const dangerLight = buildStatusPool(25, statusCh, "light", standard);
  const dangerDark = buildStatusPool(24, statusCh, "dark", standard);
  const successLight = buildStatusPool(150, statusCh * 0.88, "light", standard);
  const successDark = buildStatusPool(152, statusCh * 0.85, "dark", standard);
  const warningLight = buildStatusPool(72, statusCh * 0.86, "light", standard);
  const warningDark = buildStatusPool(78, statusCh * 0.86, "dark", standard);

  const statusTargets: Record<string, string> = {
    "danger-light": dangerLight.target,
    "danger-dark": dangerDark.target,
    "success-light": successLight.target,
    "success-dark": successDark.target,
    "warning-light": warningLight.target,
    "warning-dark": warningDark.target,
  };

  // Generator-driven chart series with maximin OKLab spacing + legibility supplementation
  const chartFallbackHue = isAchromatic ? 55 : primaryHue;
  const lightCharts = buildChartSeries(
    generatorHues,
    chartFallbackHue,
    "light",
    neutrals.n000!,
    profile,
  );
  const darkCharts = buildChartSeries(
    generatorHues,
    chartFallbackHue,
    "dark",
    neutrals.n950!,
    profile,
  );

  return {
    rawSeeds: [...seedInputs],
    seedHexes,
    seedOklch,
    primaryHue,
    neutrals,
    brand,
    brandSolvableLight,
    brandSolvableDark,
    candidates,
    statusTargets,
    statusPools: {
      dangerLight: dangerLight.pool,
      dangerDark: dangerDark.pool,
      successLight: successLight.pool,
      successDark: successDark.pool,
      warningLight: warningLight.pool,
      warningDark: warningDark.pool,
    },
    chartsLight: lightCharts.scopeEntries,
    chartsDark: darkCharts.scopeEntries,
    chartDiagnostics: {
      light: lightCharts.diagnostics,
      dark: darkCharts.diagnostics,
    },
  };
}
