import {
  clampChroma,
  converter,
  formatHex,
  parse,
  type Oklch,
} from "culori";
import { Poline, positionFunctions } from "poline";
import { generateColorRamp } from "rampensau";

export type Mood = "neutral" | "muted" | "vivid" | "editorial" | "high-contrast";
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
    minMutedContrast: 7.0,
    description: "Maximum legibility targeting AAA / APCA 75+ reading comfort",
  },
};

const toOklch = converter("oklch");
const toHsl = converter("hsl");

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
  const c = typeof input === "string" ? parseToOklch(input) : input;
  const clamped = clampChroma(c, "oklch", "rgb");
  const hex = formatHex(clamped);
  if (!hex) {
    throw new Error(`Failed to format color to hex: ${JSON.stringify(c)}`);
  }
  return hex.toLowerCase();
}

export function formatOklchCss(input: string | Oklch): string {
  const c = typeof input === "string" ? parseToOklch(input) : input;
  const l = Number(c.l.toFixed(4));
  const ch = c.c < 0.0005 ? 0 : Number(c.c.toFixed(4));
  const h = ch === 0 ? 0 : Number(normalizeHue(c.h).toFixed(2));
  return `oklch(${l} ${ch} ${h})`;
}

export interface GeneratedPools {
  seedHexes: string[];
  seedOklch: Oklch[];
  primaryHue: number;
  neutrals: Record<string, string>;
  brand: Record<string, string>;
  candidates: Record<string, string>;
  status: Record<string, string>;
  charts: Record<string, string>;
}

const NEUTRAL_STOPS: Array<[string, number]> = [
  ["n000", 0.995],
  ["n050", 0.98],
  ["n100", 0.955],
  ["n150", 0.925],
  ["n200", 0.885],
  ["n300", 0.81],
  ["n400", 0.71],
  ["n500", 0.56],
  ["n600", 0.44],
  ["n700", 0.34],
  ["n800", 0.25],
  ["n850", 0.195],
  ["n900", 0.145],
  ["n950", 0.085],
  ["n990", 0.03],
];

const BRAND_STOPS: Array<[string, number, number]> = [
  ["b050", 0.96, 0.22],
  ["b100", 0.92, 0.38],
  ["b200", 0.85, 0.58],
  ["b300", 0.76, 0.78],
  ["b400", 0.66, 0.95],
  ["b500", 0.56, 1.0],
  ["b600", 0.47, 0.96],
  ["b700", 0.38, 0.88],
  ["b800", 0.29, 0.72],
  ["b900", 0.21, 0.55],
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

function buildGeneratorCandidates(
  seeds: Oklch[],
  mood: Mood,
  generator: GeneratorKind,
): Record<string, string> {
  const profile = MOOD_PROFILES[mood];
  const primary = seeds[0]!;
  const isAchromaticSeed = primary.c < 0.015;
  const baseHue = isAchromaticSeed ? 255 : normalizeHue(primary.h);
  const targetChroma = isAchromaticSeed
    ? Math.min(0.02, profile.accentChromaMin)
    : Math.max(profile.accentChromaMin, Math.min(profile.accentChromaMax, primary.c));

  const out: Record<string, string> = {};

  if (generator === "poline") {
    const anchor1 = oklchToHslTriple(
      gamutSafeOklch(0.28, Math.max(0.06, targetChroma * 0.9), normalizeHue(baseHue - 18)),
    );
    const anchor2 =
      seeds.length > 1
        ? oklchToHslTriple(seeds[1]!)
        : oklchToHslTriple(
            gamutSafeOklch(0.62, Math.max(0.08, targetChroma), normalizeHue(baseHue + 32)),
          );
    const anchor3 =
      seeds.length > 2
        ? oklchToHslTriple(seeds[2]!)
        : oklchToHslTriple(
            gamutSafeOklch(0.84, Math.max(0.05, targetChroma * 0.7), normalizeHue(baseHue + 165)),
          );

    const poline = new Poline({
      anchorColors: [anchor1, anchor2, anchor3],
      numPoints: 5,
      positionFunctionX: positionFunctions.sinusoidalPosition,
      positionFunctionY: positionFunctions.quadraticPosition,
      positionFunctionZ: positionFunctions.linearPosition,
    });

    poline.colorsCSS.forEach((cssHsl, idx) => {
      const ok = parseToOklch(cssHsl);
      const shaped = gamutSafeOklch(
        ok.l,
        Math.min(profile.accentChromaMax, ok.c),
        ok.h ?? baseHue,
      );
      out[`pol-${String(idx).padStart(2, "0")}`] = toSafeHex(shaped);
    });
  } else if (generator === "rampensau") {
    const ramp = generateColorRamp({
      total: 12,
      hStart: baseHue,
      hCycles: seeds.length > 1 ? 0.55 : 0.35,
      sRange: [
        Math.max(0.15, profile.accentChromaMin * 2.5),
        Math.min(0.92, profile.accentChromaMax * 3.8),
      ],
      lRange: [0.16, 0.88],
    });
    ramp.forEach(([h, s, l], idx) => {
      const ok = parseToOklch(`hsl(${h.toFixed(1)} ${(s * 100).toFixed(1)}% ${(l * 100).toFixed(1)}%)`);
      const shaped = gamutSafeOklch(
        ok.l,
        Math.min(profile.accentChromaMax, ok.c),
        ok.h ?? baseHue,
      );
      out[`rmp-${String(idx).padStart(2, "0")}`] = toSafeHex(shaped);
    });
  } else {
    // Perceptually uniform OKLCH sweep across seed hue + analogous + complement
    const offsets = [
      { prefix: "pri", dh: 0, cmul: 1.0 },
      { prefix: "ana", dh: 35, cmul: 0.92 },
      { prefix: "cmp", dh: 180, cmul: 0.9 },
      { prefix: "tri", dh: -115, cmul: 0.85 },
    ];
    const lightnesses = [0.24, 0.38, 0.52, 0.66, 0.78, 0.88];
    for (const { prefix, dh, cmul } of offsets) {
      lightnesses.forEach((l, idx) => {
        const c = gamutSafeOklch(l, targetChroma * cmul, normalizeHue(baseHue + dh));
        out[`${prefix}-${idx}`] = toSafeHex(c);
      });
    }
  }

  // Always include the exact user seed(s) plus contrast-adjusted twins so Design Book
  // can pick them directly when they satisfy constraints.
  seeds.forEach((s, idx) => {
    out[`seed-${idx}`] = toSafeHex(s);
    out[`seed-${idx}-deep`] = toSafeHex(gamutSafeOklch(0.36, Math.max(s.c, profile.accentChromaMin), s.h ?? baseHue));
    out[`seed-${idx}-bright`] = toSafeHex(gamutSafeOklch(0.76, Math.max(s.c, profile.accentChromaMin), s.h ?? baseHue));
  });

  return out;
}

export function generatePools(
  seedInputs: string[],
  mood: Mood = "neutral",
  generator: GeneratorKind = "oklch",
): GeneratedPools {
  if (seedInputs.length === 0) {
    throw new Error("At least one --seed color is required.");
  }
  const profile = MOOD_PROFILES[mood];
  const seedOklch = seedInputs.map(parseToOklch);
  const seedHexes = seedOklch.map((c) => toSafeHex(c));
  const primary = seedOklch[0]!;
  const isAchromatic = primary.c < 0.015;
  const primaryHue = isAchromatic ? 0 : normalizeHue(primary.h);

  // Neutral ramp: tinted subtly by seed hue unless seed is truly achromatic
  const neutralChroma = isAchromatic ? 0 : profile.neutralChroma;
  const neutrals: Record<string, string> = {};
  for (const [key, l] of NEUTRAL_STOPS) {
    // Taper chroma at extreme black/white so pure ends stay crisp
    const endTaper = Math.sin(Math.PI * l);
    const c = neutralChroma * Math.max(0.15, endTaper);
    neutrals[key] = toSafeHex(gamutSafeOklch(l, c, primaryHue));
  }

  // Brand ramp anchored on seed 0
  const brandChroma = isAchromatic
    ? 0
    : Math.max(profile.accentChromaMin, Math.min(profile.accentChromaMax, primary.c));
  const brand: Record<string, string> = {};
  for (const [key, l, mul] of BRAND_STOPS) {
    // Subtle Bezold-Brucke / Abney warmth shift (per color-expert) for warm hues
    const hueShift = !isAchromatic && l > 0.7 ? 4 : !isAchromatic && l < 0.35 ? -4 : 0;
    brand[key] = toSafeHex(gamutSafeOklch(l, brandChroma * mul, normalizeHue(primaryHue + hueShift)));
  }

  // Candidate pool for selectors
  const candidates = buildGeneratorCandidates(seedOklch, mood, generator);

  // Semantic status hues harmonized to the mood's chroma envelope
  const statusCh = profile.statusChroma;
  const status: Record<string, string> = {
    "danger-light": toSafeHex(gamutSafeOklch(0.52, statusCh, 25)),
    "danger-dark": toSafeHex(gamutSafeOklch(0.68, statusCh, 24)),
    "success-light": toSafeHex(gamutSafeOklch(0.49, statusCh * 0.88, 150)),
    "success-dark": toSafeHex(gamutSafeOklch(0.72, statusCh * 0.85, 152)),
    "warning-light": toSafeHex(gamutSafeOklch(0.62, statusCh * 0.86, 72)),
    "warning-dark": toSafeHex(gamutSafeOklch(0.79, statusCh * 0.86, 78)),
  };

  // Distinct chart palette pool (wide perceptual hue separation)
  const chartBaseHue = isAchromatic ? 55 : primaryHue;
  const chartChroma = Math.max(0.12, Math.min(0.21, profile.accentChromaMax));
  const chartAngles = [0, 72, 148, 215, 290, 38, 185, 255];
  const charts: Record<string, string> = {};
  chartAngles.forEach((angle, idx) => {
    const h = normalizeHue(chartBaseHue + angle);
    charts[`cl-${idx}`] = toSafeHex(gamutSafeOklch(0.54, chartChroma, h));
    charts[`cd-${idx}`] = toSafeHex(gamutSafeOklch(0.73, chartChroma * 0.95, h));
  });

  return {
    seedHexes,
    seedOklch,
    primaryHue,
    neutrals,
    brand,
    candidates,
    status,
    charts,
  };
}
