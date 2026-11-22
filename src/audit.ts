import { converter, formatHex, parse } from "culori";
import {
  SRGB_GAMUT_EPSILON,
  formatOklchCss,
  gamutSafeOklch,
  isRgbInSrgbGamut,
  normalizeHue,
  parseToOklch,
  toSafeHex,
} from "./palette";

const toRgb = converter("rgb");

export interface ExactRgb {
  r: number;
  g: number;
  b: number;
  alpha: number;
}

export type AuditStandard = "wcag-aa" | "wcag-aaa" | "apca";
export type PairKind = "text" | "ui-graphic" | "border-advisory";
export type AuditStatus = "pass" | "fail" | "incomplete";

export type ParsedColorResult =
  | { ok: true; rgb: ExactRgb; raw: string }
  | { ok: false; raw: string; reason: "unparseable-color" | "out-of-srgb-gamut" | "unsupported-color-space" };

/**
 * Classic Tailwind v3 / shadcn bare HSL triple:
 *   "222.2 47.4% 11.2%" or "222.2 47.4% 11.2% / 0.5" or "0 0% 100% / 50%"
 */
const BARE_HSL_RE =
  /^\s*(-?\d*\.?\d+)(?:deg)?\s+(\d*\.?\d+)%\s+(\d*\.?\d+)%(?:\s*\/\s*(\d*\.?\d+%?))?\s*$/;

export function normalizeCssColorInput(raw: string): string {
  const trimmed = raw.trim();
  const bare = trimmed.match(BARE_HSL_RE);
  if (bare) {
    const [, h, s, l, a] = bare;
    return a ? `hsl(${h} ${s}% ${l}% / ${a})` : `hsl(${h} ${s}% ${l}%)`;
  }
  return trimmed;
}

/**
 * Parse a CSS color string directly into full-precision floating-point sRGB + alpha,
 * WITHOUT quantizing to 8-bit hex. Rejects out-of-sRGB-gamut colors explicitly so
 * sRGB contrast math never silently clamps and falsely passes.
 */
export function parseCssColorExact(raw: string): ParsedColorResult {
  const normalized = normalizeCssColorInput(raw);
  const parsed = parse(normalized);
  if (!parsed) {
    return { ok: false, raw, reason: "unparseable-color" };
  }
  const rgb = toRgb(parsed);
  if (!rgb || Number.isNaN(rgb.r) || Number.isNaN(rgb.g) || Number.isNaN(rgb.b)) {
    return { ok: false, raw, reason: "unparseable-color" };
  }
  if (!isRgbInSrgbGamut(rgb, SRGB_GAMUT_EPSILON)) {
    return { ok: false, raw, reason: "out-of-srgb-gamut" };
  }
  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
  const alpha = parsed.alpha === undefined ? 1 : clamp01(parsed.alpha);
  return {
    ok: true,
    raw,
    rgb: {
      r: clamp01(rgb.r),
      g: clamp01(rgb.g),
      b: clamp01(rgb.b),
      alpha,
    },
  };
}

export function compositeOverSrgb(fg: ExactRgb, bg: ExactRgb): ExactRgb {
  const a = fg.alpha;
  return {
    r: a * fg.r + (1 - a) * bg.r,
    g: a * fg.g + (1 - a) * bg.g,
    b: a * fg.b + (1 - a) * bg.b,
    alpha: 1,
  };
}

function srgbChannelToLinear(c: number): number {
  const v = Math.max(0, Math.min(1, c));
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/** Full-precision WCAG 2.x relative luminance (IEC 61966-2-1 threshold 0.04045). */
export function relativeLuminanceExact(rgb: ExactRgb): number {
  return (
    0.2126 * srgbChannelToLinear(rgb.r) +
    0.7152 * srgbChannelToLinear(rgb.g) +
    0.0722 * srgbChannelToLinear(rgb.b)
  );
}

/** Full-precision unrounded WCAG 2.x contrast ratio. */
export function wcagRatioExact(rgbA: ExactRgb, rgbB: ExactRgb): number {
  const l1 = relativeLuminanceExact(rgbA);
  const l2 = relativeLuminanceExact(rgbB);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Full-precision unrounded APCA-W3 0.0.98G-4g perceptual lightness contrast (Lc).
 * Positive Lc = dark text on light background; negative Lc = light text on dark background.
 */
export function apcaContrastExact(textRgb: ExactRgb, bgRgb: ExactRgb): number {
  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
  const srgbToY = (rgb: ExactRgb) =>
    0.2126729 * Math.pow(clamp01(rgb.r), 2.4) +
    0.7151522 * Math.pow(clamp01(rgb.g), 2.4) +
    0.072175 * Math.pow(clamp01(rgb.b), 2.4);

  const softClamp = (y: number) => (y > 0.022 ? y : y + Math.pow(0.022 - y, 1.414));
  const yTxt = softClamp(srgbToY(textRgb));
  const yBg = softClamp(srgbToY(bgRgb));

  if (Math.abs(yBg - yTxt) < 0.0005) return 0;

  let sapc = 0;
  let output = 0;

  if (yBg > yTxt) {
    sapc = (Math.pow(yBg, 0.56) - Math.pow(yTxt, 0.57)) * 1.14;
    output = sapc < 0.1 ? 0 : sapc - 0.027;
  } else {
    sapc = (Math.pow(yBg, 0.65) - Math.pow(yTxt, 0.62)) * 1.14;
    output = sapc > -0.1 ? 0 : sapc + 0.027;
  }

  return output * 100;
}

/** Convenience wrappers for opaque CSS color strings (returns display-rounded values). */
export function wcagRatio(colorA: string, colorB: string): number {
  const a = parseCssColorExact(colorA);
  const b = parseCssColorExact(colorB);
  if (!a.ok || !b.ok) return 1;
  return Number(wcagRatioExact(a.rgb, b.rgb).toFixed(2));
}

export function apcaContrast(textColor: string, bgColor: string): number {
  const a = parseCssColorExact(textColor);
  const b = parseCssColorExact(bgColor);
  if (!a.ok || !b.ok) return 0;
  return Number(apcaContrastExact(a.rgb, b.rgb).toFixed(1));
}

export function rgbToDisplayHex(rgb: ExactRgb): string {
  const hex = formatHex({ mode: "rgb", r: rgb.r, g: rgb.g, b: rgb.b });
  return (hex ?? "#000000").toLowerCase();
}

export function rgbToDisplayOklch(rgb: ExactRgb): string {
  const hex = rgbToDisplayHex(rgb);
  return formatOklchCss(hex);
}

export interface ThresholdSpec {
  textWcag: number;
  textApca: number;
  uiGraphicWcag: number;
  uiGraphicApca: number;
  borderWcag: number;
  borderApca: number;
}

export function thresholdsForStandard(standard: AuditStandard): ThresholdSpec {
  switch (standard) {
    case "wcag-aaa":
      return {
        textWcag: 7.0,
        textApca: 75,
        uiGraphicWcag: 3.0,
        uiGraphicApca: 45,
        borderWcag: 3.0,
        borderApca: 45,
      };
    case "apca":
      return {
        textWcag: 4.5,
        textApca: 60,
        uiGraphicWcag: 3.0,
        uiGraphicApca: 45,
        borderWcag: 3.0,
        borderApca: 45,
      };
    case "wcag-aa":
    default:
      return {
        textWcag: 4.5,
        textApca: 60,
        uiGraphicWcag: 3.0,
        uiGraphicApca: 45,
        borderWcag: 3.0,
        borderApca: 45,
      };
  }
}

export function pairThresholds(
  kind: PairKind,
  standard: AuditStandard,
): { requiredWcag: number; requiredApca: number } {
  const t = thresholdsForStandard(standard);
  if (kind === "text") return { requiredWcag: t.textWcag, requiredApca: t.textApca };
  if (kind === "ui-graphic") return { requiredWcag: t.uiGraphicWcag, requiredApca: t.uiGraphicApca };
  return { requiredWcag: t.borderWcag, requiredApca: t.borderApca };
}

export type SuggestedFix =
  | {
      status: "fixed";
      scope: "pair-local";
      verified: true;
      hex: string;
      oklch: string;
      wcagExact: number;
      wcag: number;
      apcaExact: number;
      apcaLc: number;
      reason: string;
    }
  | {
      status: "no-solution";
      scope: "pair-local";
      verified: false;
      reason: string;
    };

export interface PairAudit {
  mode: "light" | "dark";
  kind: PairKind;
  required: boolean;
  fgToken: string;
  bgToken: string;
  fgRaw: string;
  bgRaw: string;
  fgHex: string;
  bgHex: string;
  fgOklch: string;
  bgOklch: string;
  composited: boolean;
  fgAlpha?: number;
  assumptions?: string[];
  wcagExact: number;
  wcag: number;
  apcaExact: number;
  apcaLc: number;
  requiredWcag: number;
  requiredApca: number;
  pass: boolean;
  suggestedFix?: SuggestedFix;
}

export interface UnverifiedPair {
  mode: "light" | "dark";
  kind: PairKind;
  required: boolean;
  fgToken: string;
  bgToken: string;
  fgRaw: string;
  bgRaw: string;
  reason: string;
}

export interface SkippedToken {
  mode: "light" | "dark" | "unknown";
  token: string;
  raw: string;
  reason: string;
}

/**
 * APCA's guidance levels. Lc 75 is the threshold for fluent body reading; below it text is
 * usable for secondary or large copy but is not comfortable prose.
 */
export const APCA_FLUENT_READING = 75;

/**
 * A pair that satisfies the requested WCAG standard but that APCA rates below fluent
 * reading. WCAG 2.x is polarity-blind — it scores light-on-dark and dark-on-light
 * identically — so dark themes routinely pass WCAG while reading worse than their light
 * counterparts. Advisory only: it never changes the exit code, because WCAG is the
 * conformance standard and APCA (WCAG 3, still draft) is not.
 */
export interface PolarityAdvisory {
  mode: "light" | "dark";
  fgToken: string;
  bgToken: string;
  wcagExact: number;
  apcaLc: number;
  requiredApca: number;
  note: string;
}

export interface AuditReport {
  status: AuditStatus;
  exitCode: 0 | 1 | 3;
  standard: AuditStandard;
  strictBorders: boolean;
  passed: number;
  failed: number;
  advisoryCount: number;
  unverifiedCount: number;
  pairs: PairAudit[];
  /** WCAG-passing pairs that APCA rates below fluent reading. Advisory; see PolarityAdvisory. */
  polarityAdvisories: PolarityAdvisory[];
  coverage: {
    assessedPairs: {
      text: number;
      uiGraphic: number;
      borderAdvisory: number;
    };
    unverifiedPairs: UnverifiedPair[];
    skippedTokens: SkippedToken[];
    thresholds: ThresholdSpec;
    assumptions: string[];
  };
}

/**
 * Pair-local contrast repair solver: searches a hue-preserving OKLCH lightness ramp
 * (with chroma-taper fallback) and verifies the *serialized* oklch() output directly
 * against the pair's actual requested standard and unrounded threshold.
 */
export function solveContrastFix(
  fgRgb: ExactRgb,
  bgRgb: ExactRgb,
  standard: AuditStandard,
  requiredWcag: number,
  requiredApca: number,
): SuggestedFix {
  const fgHex = rgbToDisplayHex(fgRgb);
  const fgOklch = parseToOklch(fgHex);
  const hue = normalizeHue(fgOklch.h);

  const meetsTarget = (candRgb: ExactRgb): { ok: boolean; wcagExact: number; apcaExact: number } => {
    const wcagExact = wcagRatioExact(candRgb, bgRgb);
    const apcaExact = apcaContrastExact(candRgb, bgRgb);
    const ok =
      standard === "apca"
        ? Math.abs(apcaExact) >= requiredApca
        : wcagExact >= requiredWcag;
    return { ok, wcagExact, apcaExact };
  };

  // Search full lightness range at original chroma first, then tapered chroma, then pure neutral.
  // Pick the candidate closest in OKLCH lightness to the original fg that passes on its serialized oklch() form.
  const chromaScales = [1.0, 0.55, 0.2, 0.0];
  for (const scale of chromaScales) {
    let best:
      | {
          dist: number;
          oklch: string;
          hex: string;
          wcagExact: number;
          apcaExact: number;
        }
      | undefined;

    for (let i = 0; i <= 200; i++) {
      const l = i / 200;
      const cand = gamutSafeOklch(l, fgOklch.c * scale, hue);
      const serializedOklch = formatOklchCss(cand);
      const reparsed = parseCssColorExact(serializedOklch);
      if (!reparsed.ok) continue;

      const check = meetsTarget(reparsed.rgb);
      if (!check.ok) continue;

      const dist = Math.abs(l - fgOklch.l);
      if (!best || dist < best.dist) {
        best = {
          dist,
          oklch: serializedOklch,
          hex: rgbToDisplayHex(reparsed.rgb),
          wcagExact: check.wcagExact,
          apcaExact: check.apcaExact,
        };
      }
    }

    if (best) {
      const targetDesc =
        standard === "apca"
          ? `|APCA Lc| >= ${requiredApca}`
          : `WCAG >= ${requiredWcag}:1`;
      return {
        status: "fixed",
        scope: "pair-local",
        verified: true,
        hex: best.hex,
        oklch: best.oklch,
        wcagExact: best.wcagExact,
        wcag: Number(best.wcagExact.toFixed(2)),
        apcaExact: best.apcaExact,
        apcaLc: Number(best.apcaExact.toFixed(1)),
        reason:
          scale === 1.0
            ? `Hue-preserving OKLCH lightness search (${hue.toFixed(0)}°) verified for ${targetDesc}`
            : `OKLCH lightness search (${hue.toFixed(0)}°, chroma ×${scale}) verified for ${targetDesc}`,
      };
    }
  }

  const maxWcag = Math.max(
    wcagRatioExact({ r: 0, g: 0, b: 0, alpha: 1 }, bgRgb),
    wcagRatioExact({ r: 1, g: 1, b: 1, alpha: 1 }, bgRgb),
  );
  const maxApca = Math.max(
    Math.abs(apcaContrastExact({ r: 0, g: 0, b: 0, alpha: 1 }, bgRgb)),
    Math.abs(apcaContrastExact({ r: 1, g: 1, b: 1, alpha: 1 }, bgRgb)),
  );
  return {
    status: "no-solution",
    scope: "pair-local",
    verified: false,
    reason:
      standard === "apca"
        ? `No opaque sRGB foreground can reach |APCA Lc| >= ${requiredApca} on this background (max achievable |Lc| ≈ ${maxApca.toFixed(1)}); adjust the background.`
        : `No opaque sRGB foreground can reach WCAG >= ${requiredWcag}:1 on this background (max achievable ≈ ${maxWcag.toFixed(2)}:1); adjust the background.`,
  };
}

export interface TokenMapWithMeta {
  light: Record<string, string>;
  dark: Record<string, string>;
  skippedTokens: SkippedToken[];
  assumptions: string[];
}

export interface AuditOptions {
  standard?: AuditStandard;
  withFixes?: boolean;
  strictBorders?: boolean;
}

const COLOR_TOKEN_NAME_RE =
  /(background|foreground|card|popover|primary|secondary|muted|accent|destructive|border|input|ring|chart-\d+|surface|ink|focus|success|warning|danger)/i;

function isLikelyColorToken(name: string): boolean {
  if (/^(font-|radius|shadow|spacing|space-|text-|leading-|tracking-|z-)/i.test(name)) {
    return false;
  }
  return COLOR_TOKEN_NAME_RE.test(name);
}

/**
 * Resolve var(--name) and var(--name, fallback) references inside a merged mode dictionary.
 */
function resolveVarInMap(
  rawValue: string,
  map: Record<string, string>,
  stack: Set<string> = new Set(),
): { ok: true; value: string } | { ok: false; reason: "unresolved-var" | "cyclic-var" } {
  const trimmed = rawValue.trim();
  const varMatch = trimmed.match(/^var\(\s*--([A-Za-z0-9_-]+)\s*(?:,\s*(.+))?\)$/);
  if (!varMatch) {
    return { ok: true, value: trimmed };
  }
  const target = varMatch[1]!;
  const fallback = varMatch[2]?.trim();

  if (stack.has(target)) {
    return { ok: false, reason: "cyclic-var" };
  }
  const nextRaw = map[target];
  if (nextRaw === undefined) {
    if (fallback !== undefined && fallback.length > 0) {
      return resolveVarInMap(fallback, map, stack);
    }
    return { ok: false, reason: "unresolved-var" };
  }
  const nextStack = new Set(stack);
  nextStack.add(target);
  return resolveVarInMap(nextRaw, map, nextStack);
}

/**
 * Classify a CSS selector list under an optional enclosing prefers-color-scheme media query.
 * Checks dark selectors BEFORE light selectors so `:root.dark` and `html.dark` route to `dark`.
 */
function classifyCssSelector(
  selectorList: string,
  mediaScheme: "light" | "dark" | null,
): "light" | "dark" | null {
  const selectors = selectorList
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  let hasDark = false;
  let hasLight = false;

  for (const sel of selectors) {
    const isDarkSel =
      /(?:^|[\s>+~])(?::root|html)?\.dark(?:\b|$)/.test(sel) ||
      /\[data-(?:theme|mode)\s*=\s*["']?dark["']?\]/i.test(sel);
    if (isDarkSel) {
      hasDark = true;
      continue;
    }

    const isLightExplicit = /\[data-(?:theme|mode)\s*=\s*["']?light["']?\]/i.test(sel);
    if (isLightExplicit) {
      hasLight = true;
      continue;
    }

    const isRootOrHtml = /^(?::root|html)(?:\b|$)/.test(sel);
    if (isRootOrHtml) {
      if (mediaScheme === "dark") hasDark = true;
      else hasLight = true;
    }
  }

  if (hasDark) return "dark";
  if (hasLight) return "light";
  return null;
}

/**
 * Bounded stack-based CSS custom-property parser.
 *
 * Supported grammar:
 * - `@layer <name> { ... }`, `@supports (...) { ... }` (passed through)
 * - `@media (prefers-color-scheme: dark|light) { ... }` (sets mode context)
 * - Root/mode selectors: `:root`, `html`, `:root.dark`, `html.dark`, `.dark`,
 *   `[data-theme="light"|"dark"]`, `[data-mode="light"|"dark"]`
 * - Unsupported conditional at-rules (e.g. `@media (min-width: ...)`, `@container`)
 *   containing color custom properties are recorded in `skippedTokens`.
 */
function parseCssTokens(content: string): TokenMapWithMeta {
  const noComments = content.replace(/\/\*[\s\S]*?\*\//g, "");
  const rawLight: Record<string, string> = {};
  const rawDark: Record<string, string> = {};
  const skippedTokens: SkippedToken[] = [];
  const assumptions: string[] = [];

  interface Frame {
    header: string;
    kind: "passthrough" | "media-dark" | "media-light" | "unsupported-cond" | "rule";
  }

  const stack: Frame[] = [];
  let buf = "";

  const currentMediaScheme = (): "light" | "dark" | null => {
    for (let i = stack.length - 1; i >= 0; i--) {
      if (stack[i]!.kind === "media-dark") return "dark";
      if (stack[i]!.kind === "media-light") return "light";
    }
    return null;
  };

  const insideUnsupportedCond = (): boolean =>
    stack.some((f) => f.kind === "unsupported-cond");

  const extractDecls = (body: string, selectorHeader: string) => {
    const declRe = /--([A-Za-z0-9_-]+)\s*:\s*([^;{}]+)(?:;|$)/g;
    let m: RegExpExecArray | null;
    if (insideUnsupportedCond()) {
      while ((m = declRe.exec(body)) !== null) {
        const name = m[1]!;
        const val = m[2]!.trim();
        if (isLikelyColorToken(name)) {
          skippedTokens.push({
            mode: "unknown",
            token: name,
            raw: val,
            reason: "unsupported-conditional-at-rule",
          });
        }
      }
      return;
    }

    const mode = classifyCssSelector(selectorHeader, currentMediaScheme());
    if (!mode) return;
    const dest = mode === "dark" ? rawDark : rawLight;
    while ((m = declRe.exec(body)) !== null) {
      const name = m[1]!;
      const val = m[2]!.trim();
      dest[name] = val;
    }
  };

  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < noComments.length; i++) {
    const ch = noComments[i]!;
    if (ch === "'" && !inDouble && noComments[i - 1] !== "\\") {
      inSingle = !inSingle;
      buf += ch;
      continue;
    }
    if (ch === '"' && !inSingle && noComments[i - 1] !== "\\") {
      inDouble = !inDouble;
      buf += ch;
      continue;
    }
    if (inSingle || inDouble) {
      buf += ch;
      continue;
    }

    if (ch === "{") {
      const header = buf.trim();
      buf = "";
      if (header.startsWith("@")) {
        const lower = header.toLowerCase();
        if (lower.startsWith("@layer") || lower.startsWith("@supports")) {
          stack.push({ header, kind: "passthrough" });
        } else if (lower.startsWith("@media")) {
          if (/prefers-color-scheme\s*:\s*dark/i.test(header) && !/min-width|max-width|orientation/i.test(header)) {
            stack.push({ header, kind: "media-dark" });
          } else if (/prefers-color-scheme\s*:\s*light/i.test(header) && !/min-width|max-width|orientation/i.test(header)) {
            stack.push({ header, kind: "media-light" });
          } else {
            stack.push({ header, kind: "unsupported-cond" });
          }
        } else {
          stack.push({ header, kind: "unsupported-cond" });
        }
      } else {
        stack.push({ header, kind: "rule" });
      }
    } else if (ch === "}") {
      const frame = stack.pop();
      if (frame && frame.kind === "rule") {
        extractDecls(buf, frame.header);
      }
      buf = "";
    } else {
      buf += ch;
    }
  }

  // Post-merge var() resolution: dark inherits light defaults before resolving var()
  const resolvedLight: Record<string, string> = {};
  for (const [k, raw] of Object.entries(rawLight)) {
    const res = resolveVarInMap(raw, rawLight);
    if (res.ok) {
      resolvedLight[k] = res.value;
    } else if (isLikelyColorToken(k)) {
      resolvedLight[k] = `__ERR__:${res.reason}:${raw}`;
      skippedTokens.push({ mode: "light", token: k, raw, reason: res.reason });
    }
  }

  const resolvedDark: Record<string, string> = {};
  if (Object.keys(rawDark).length > 0) {
    const mergedDarkRaw = { ...rawLight, ...rawDark };
    for (const [k, raw] of Object.entries(mergedDarkRaw)) {
      const res = resolveVarInMap(raw, mergedDarkRaw);
      if (res.ok) {
        resolvedDark[k] = res.value;
      } else if (isLikelyColorToken(k)) {
        resolvedDark[k] = `__ERR__:${res.reason}:${raw}`;
        skippedTokens.push({ mode: "dark", token: k, raw, reason: res.reason });
      }
    }
  }

  return { light: resolvedLight, dark: resolvedDark, skippedTokens, assumptions };
}

/**
 * Convert a DTCG structured color object `{ colorSpace, components, alpha?, hex? }`
 * into a full-precision CSS color string, preserving `components` and `alpha` as
 * authoritative over any 6-digit `hex` fallback.
 */
function dtcgColorToString(val: Record<string, unknown>): { ok: true; value: string } | { ok: false; reason: string } {
  const cs = typeof val.colorSpace === "string" ? val.colorSpace.toLowerCase() : undefined;
  const comps = Array.isArray(val.components) ? val.components : undefined;
  const alpha = typeof val.alpha === "number" ? val.alpha : 1;

  if (comps && comps.length >= 3 && comps.every((n) => typeof n === "number")) {
    const [c0, c1, c2] = comps as [number, number, number];
    if (!cs || cs === "srgb") {
      // Full-precision rgb() channels in 0..255 (floating point preserved!)
      const r = c0 * 255;
      const g = c1 * 255;
      const b = c2 * 255;
      return {
        ok: true,
        value: alpha < 1 ? `rgb(${r} ${g} ${b} / ${alpha})` : `rgb(${r} ${g} ${b})`,
      };
    }
    if (cs === "oklch") {
      return {
        ok: true,
        value: alpha < 1 ? `oklch(${c0} ${c1} ${c2} / ${alpha})` : `oklch(${c0} ${c1} ${c2})`,
      };
    }
    if (cs === "oklab") {
      return {
        ok: true,
        value: alpha < 1 ? `oklab(${c0} ${c1} ${c2} / ${alpha})` : `oklab(${c0} ${c1} ${c2})`,
      };
    }
    return { ok: false, reason: `unsupported-color-space:${cs}` };
  }

  if (typeof val.hex === "string") {
    return { ok: true, value: val.hex };
  }
  return { ok: false, reason: "unparseable-dtcg-color" };
}

function parseJsonTokens(content: string): TokenMapWithMeta {
  const obj = JSON.parse(content) as Record<string, unknown>;
  const light: Record<string, string> = {};
  const dark: Record<string, string> = {};
  const skippedTokens: SkippedToken[] = [];
  const assumptions: string[] = [];

  // Determine authoritative representation for theme-book --format json output:
  // default to `oklch` (CSS default), or `hex` if recipe.formatOptions.hex === true.
  const recipe = obj.recipe as { formatOptions?: { hex?: boolean } } | undefined;
  const preferHex = recipe?.formatOptions?.hex === true;
  if (obj.light && obj.dark && obj.preset) {
    assumptions.push(
      preferHex
        ? "Audited `hex` representation from theme-book JSON (per recipe.formatOptions.hex)"
        : "Audited `oklch` representation from theme-book JSON (default CSS output format)",
    );
  }

  const lookupDtcgPath = (
    path: string,
    stack: Set<string> = new Set(),
  ): { ok: true; value: string } | { ok: false; reason: string } => {
    if (stack.has(path)) return { ok: false, reason: "cyclic-dtcg-ref" };
    const parts = path.split(".");
    let cur: unknown = obj;
    for (const part of parts) {
      if (!cur || typeof cur !== "object" || !(part in (cur as Record<string, unknown>))) {
        return { ok: false, reason: "unresolved-dtcg-ref" };
      }
      cur = (cur as Record<string, unknown>)[part];
    }
    if (typeof cur === "string") {
      const m = cur.trim().match(/^\{([^}]+)\}$/);
      if (m) {
        const next = new Set(stack);
        next.add(path);
        return lookupDtcgPath(m[1]!, next);
      }
      return { ok: true, value: cur };
    }
    if (cur && typeof cur === "object" && "$value" in (cur as Record<string, unknown>)) {
      const v = (cur as Record<string, unknown>).$value;
      if (typeof v === "string") {
        const m = v.trim().match(/^\{([^}]+)\}$/);
        if (m) {
          const next = new Set(stack);
          next.add(path);
          return lookupDtcgPath(m[1]!, next);
        }
        return { ok: true, value: v };
      }
      if (v && typeof v === "object" && !Array.isArray(v)) {
        return dtcgColorToString(v as Record<string, unknown>);
      }
    }
    return { ok: false, reason: "unparseable-dtcg-ref" };
  };

  const extractFlat = (
    src: unknown,
    dest: Record<string, string>,
    mode: "light" | "dark",
  ) => {
    if (!src || typeof src !== "object" || Array.isArray(src)) return;
    for (const [rawKey, v] of Object.entries(src as Record<string, unknown>)) {
      const k = rawKey.replace(/^--/, "");
      if (typeof v === "string") {
        const m = v.trim().match(/^\{([^}]+)\}$/);
        if (m) {
          const resolved = lookupDtcgPath(m[1]!);
          if (resolved.ok) dest[k] = resolved.value;
          else if (isLikelyColorToken(k)) {
            dest[k] = `__ERR__:${resolved.reason}:${v}`;
            skippedTokens.push({ mode, token: k, raw: v, reason: resolved.reason });
          }
        } else {
          dest[k] = v;
        }
      } else if (v && typeof v === "object" && !Array.isArray(v)) {
        const rec = v as Record<string, unknown>;
        if ("$value" in rec) {
          const val = rec.$value;
          if (typeof val === "string") {
            const m = val.trim().match(/^\{([^}]+)\}$/);
            if (m) {
              const resolved = lookupDtcgPath(m[1]!);
              if (resolved.ok) dest[k] = resolved.value;
              else if (isLikelyColorToken(k)) {
                dest[k] = `__ERR__:${resolved.reason}:${val}`;
                skippedTokens.push({ mode, token: k, raw: val, reason: resolved.reason });
              }
            } else {
              dest[k] = val;
            }
          } else if (val && typeof val === "object" && !Array.isArray(val)) {
            const converted = dtcgColorToString(val as Record<string, unknown>);
            if (converted.ok) {
              dest[k] = converted.value;
            } else if (isLikelyColorToken(k)) {
              dest[k] = `__ERR__:${converted.reason}:${JSON.stringify(val)}`;
              skippedTokens.push({
                mode,
                token: k,
                raw: JSON.stringify(val),
                reason: converted.reason,
              });
            }
          }
        } else if (typeof rec.oklch === "string" || typeof rec.hex === "string") {
          const chosen = preferHex
            ? (typeof rec.hex === "string" ? rec.hex : (rec.oklch as string))
            : (typeof rec.oklch === "string" ? rec.oklch : (rec.hex as string));
          dest[k] = chosen;
        }
      }
    }
  };

  if (obj.light && typeof obj.light === "object") extractFlat(obj.light, light, "light");
  if (obj.dark && typeof obj.dark === "object") extractFlat(obj.dark, dark, "dark");
  if (Object.keys(light).length === 0 && Object.keys(dark).length === 0) {
    extractFlat(obj, light, "light");
  }

  return { light, dark, skippedTokens, assumptions };
}

export function parseTokensFromText(content: string, filename: string): TokenMapWithMeta {
  const trimmed = content.trim();
  if (filename.endsWith(".json") || trimmed.startsWith("{")) {
    return parseJsonTokens(trimmed);
  }
  return parseCssTokens(content);
}

export interface RawAuditPair {
  mode: "light" | "dark";
  kind: PairKind;
  fgToken: string;
  bgToken: string;
  fgRaw: string;
  bgRaw: string;
  modeBackgroundRaw?: string;
}

/**
 * Infer foreground/background text pairs, non-text UI graphics (ring, focus, chart-1..5),
 * and advisory border pairs (border, input) from shadcn and semantic token sets.
 */
export function inferAuditPairs(modes: {
  light: Record<string, string>;
  dark: Record<string, string>;
}): RawAuditPair[] {
  const pairs: RawAuditPair[] = [];

  const checkMode = (mode: "light" | "dark", tokens: Record<string, string>) => {
    const seen = new Set<string>();
    const modeBgRaw = tokens.background ?? tokens.surface;

    const add = (fgToken: string, bgToken: string, kind: PairKind) => {
      if (tokens[fgToken] === undefined || tokens[bgToken] === undefined) return;
      const id = `${mode}:${fgToken}@${bgToken}`;
      if (seen.has(id)) return;
      seen.add(id);
      pairs.push({
        mode,
        kind,
        fgToken,
        bgToken,
        fgRaw: tokens[fgToken]!,
        bgRaw: tokens[bgToken]!,
        modeBackgroundRaw: modeBgRaw,
      });
    };

    // Text pairs (shadcn)
    add("foreground", "background", "text");
    add("card-foreground", "card", "text");
    add("popover-foreground", "popover", "text");
    add("primary-foreground", "primary", "text");
    add("secondary-foreground", "secondary", "text");
    add("muted-foreground", "muted", "text");
    add("muted-foreground", "background", "text");
    add("accent-foreground", "accent", "text");
    add("destructive-foreground", "destructive", "text");

    // Text pairs (generic semantic)
    add("ink", "surface", "text");
    add("ink", "surface-raised", "text");
    add("ink-muted", "surface", "text");
    add("accent-ink", "accent", "text");
    add("success-ink", "success", "text");
    add("warning-ink", "warning", "text");
    add("danger-ink", "danger", "text");

    // Any other `<base>-foreground` / `<base>-ink` pairs
    for (const key of Object.keys(tokens)) {
      const m = key.match(/^(.+)-(foreground|ink)$/);
      if (m) add(key, m[1]!, "text");
    }

    // Non-text UI graphic pairs (WCAG 1.4.11 >= 3:1): focus rings & data-viz series
    const rootBg = tokens.background !== undefined ? "background" : tokens.surface !== undefined ? "surface" : undefined;
    if (rootBg) {
      add("ring", rootBg, "ui-graphic");
      add("focus", rootBg, "ui-graphic");
      for (let i = 1; i <= 5; i++) {
        add(`chart-${i}`, rootBg, "ui-graphic");
      }
      // Subtle dividers / input borders (advisory unless --strict-borders)
      add("border", rootBg, "border-advisory");
      add("input", rootBg, "border-advisory");
      add("border-strong", rootBg, "border-advisory");
    }
  };

  checkMode("light", modes.light);
  if (Object.keys(modes.dark).length > 0) {
    checkMode("dark", modes.dark);
  }
  return pairs;
}

function parseMaybeErrorToken(raw: string): ParsedColorResult | { ok: false; raw: string; reason: string } {
  if (raw.startsWith("__ERR__:")) {
    const [, reason, orig] = raw.split(/^__ERR__:([^:]+):(.*)$/);
    return { ok: false, raw: orig ?? raw, reason: reason ?? "unresolved-token" };
  }
  return parseCssColorExact(raw);
}

export function evaluateAudit(
  parsedModes: TokenMapWithMeta,
  opts: AuditOptions = {},
): AuditReport {
  const standard: AuditStandard = opts.standard ?? "wcag-aa";
  const withFixes = opts.withFixes ?? false;
  const strictBorders = opts.strictBorders ?? false;
  const thresholds = thresholdsForStandard(standard);

  const rawPairs = inferAuditPairs(parsedModes);
  const pairs: PairAudit[] = [];
  const unverifiedPairs: UnverifiedPair[] = [];
  const assumptions = [...parsedModes.assumptions];

  if (standard === "apca") {
    assumptions.push(
      `APCA policy uses |Lc| >= ${thresholds.textApca} for text (content-text baseline; font size & weight determine exact APCA Bronze/Silver requirements) and |Lc| >= ${thresholds.uiGraphicApca} for UI graphics`,
    );
  } else {
    assumptions.push(
      `sRGB gamut policy: WCAG 2.x ratios are evaluated at full floating-point precision without pre-comparison rounding; colors outside sRGB gamut are marked unverified`,
    );
  }

  for (const item of rawPairs) {
    const required = item.kind !== "border-advisory" || strictBorders;
    const { requiredWcag, requiredApca } = pairThresholds(item.kind, standard);

    const fgParsed = parseMaybeErrorToken(item.fgRaw);
    const bgParsed = parseMaybeErrorToken(item.bgRaw);

    if (!fgParsed.ok || !bgParsed.ok) {
      const reasons: string[] = [];
      if (!fgParsed.ok) reasons.push(`${item.fgToken}: ${fgParsed.reason}`);
      if (!bgParsed.ok) reasons.push(`${item.bgToken}: ${bgParsed.reason}`);
      unverifiedPairs.push({
        mode: item.mode,
        kind: item.kind,
        required,
        fgToken: item.fgToken,
        bgToken: item.bgToken,
        fgRaw: fgParsed.raw,
        bgRaw: bgParsed.raw,
        reason: reasons.join("; "),
      });
      continue;
    }

    let effBg = bgParsed.rgb;
    let composited = false;
    const pairAssumptions: string[] = [];

    // Handle translucent background
    if (effBg.alpha < 1) {
      const isRootBg = item.bgToken === "background" || item.bgToken === "surface";
      if (!isRootBg && item.modeBackgroundRaw) {
        const rootBgParsed = parseMaybeErrorToken(item.modeBackgroundRaw);
        if (rootBgParsed.ok && rootBgParsed.rgb.alpha === 1) {
          effBg = compositeOverSrgb(effBg, rootBgParsed.rgb);
          composited = true;
          pairAssumptions.push(`composited ${item.bgToken} (alpha=${bgParsed.rgb.alpha}) over mode ${item.mode} background`);
        } else {
          unverifiedPairs.push({
            mode: item.mode,
            kind: item.kind,
            required,
            fgToken: item.fgToken,
            bgToken: item.bgToken,
            fgRaw: item.fgRaw,
            bgRaw: item.bgRaw,
            reason: "translucent-backdrop-unknown",
          });
          continue;
        }
      } else {
        unverifiedPairs.push({
          mode: item.mode,
          kind: item.kind,
          required,
          fgToken: item.fgToken,
          bgToken: item.bgToken,
          fgRaw: item.fgRaw,
          bgRaw: item.bgRaw,
          reason: "translucent-backdrop-unknown",
        });
        continue;
      }
    }

    // Handle translucent foreground over opaque effective background
    let effFg = fgParsed.rgb;
    let fgAlpha: number | undefined;
    if (effFg.alpha < 1) {
      fgAlpha = effFg.alpha;
      effFg = compositeOverSrgb(effFg, effBg);
      composited = true;
      pairAssumptions.push(`composited ${item.fgToken} (alpha=${fgAlpha}) over ${item.bgToken}`);
    }

    const wcagExact = wcagRatioExact(effFg, effBg);
    const apcaExact = apcaContrastExact(effFg, effBg);
    const pass =
      standard === "apca"
        ? Math.abs(apcaExact) >= requiredApca
        : wcagExact >= requiredWcag;

    const entry: PairAudit = {
      mode: item.mode,
      kind: item.kind,
      required,
      fgToken: item.fgToken,
      bgToken: item.bgToken,
      fgRaw: item.fgRaw,
      bgRaw: item.bgRaw,
      fgHex: rgbToDisplayHex(effFg),
      bgHex: rgbToDisplayHex(effBg),
      fgOklch: rgbToDisplayOklch(effFg),
      bgOklch: rgbToDisplayOklch(effBg),
      composited,
      ...(fgAlpha !== undefined ? { fgAlpha } : {}),
      ...(pairAssumptions.length > 0 ? { assumptions: pairAssumptions } : {}),
      wcagExact,
      wcag: Number(wcagExact.toFixed(2)),
      apcaExact,
      apcaLc: Number(apcaExact.toFixed(1)),
      requiredWcag,
      requiredApca,
      pass,
    };

    if (!pass && required && withFixes) {
      entry.suggestedFix = solveContrastFix(effFg, effBg, standard, requiredWcag, requiredApca);
    }

    pairs.push(entry);
  }

  const requiredPairs = pairs.filter((p) => p.required);
  const advisoryPairs = pairs.filter((p) => !p.required);
  const requiredUnverified = unverifiedPairs.filter((u) => u.required);
  const passed = requiredPairs.filter((p) => p.pass).length;
  const failed = requiredPairs.length - passed;

  // WCAG 2.x scores a pair identically whichever way round it is, so a dark theme can clear
  // AA or AAA while reading materially worse than the light one. Surface that, without
  // letting it affect conformance.
  const polarityAdvisories: PolarityAdvisory[] =
    standard === "apca"
      ? []
      : pairs
          .filter((p) => p.required && p.pass && p.kind === "text" && Math.abs(p.apcaLc) < APCA_FLUENT_READING)
          .map((p) => ({
            mode: p.mode,
            fgToken: p.fgToken,
            bgToken: p.bgToken,
            wcagExact: p.wcagExact,
            apcaLc: p.apcaLc,
            requiredApca: APCA_FLUENT_READING,
            note:
              `passes ${standard} at ${p.wcagExact.toFixed(2)}:1 but APCA rates it Lc ${Math.abs(p.apcaLc).toFixed(1)}, ` +
              `below the Lc ${APCA_FLUENT_READING} needed for fluent body reading`,
          }));

  // Determine explicit AuditStatus & exitCode
  let status: AuditStatus;
  let exitCode: 0 | 1 | 3;
  if (failed > 0) {
    status = "fail";
    exitCode = 1;
  } else if (
    requiredUnverified.length > 0 ||
    requiredPairs.length === 0 ||
    parsedModes.skippedTokens.some((s) => s.reason === "unsupported-conditional-at-rule")
  ) {
    status = "incomplete";
    exitCode = 3;
  } else {
    status = "pass";
    exitCode = 0;
  }

  return {
    polarityAdvisories,
    status,
    exitCode,
    standard,
    strictBorders,
    passed,
    failed,
    advisoryCount: advisoryPairs.length,
    unverifiedCount: requiredUnverified.length,
    pairs,
    coverage: {
      assessedPairs: {
        text: pairs.filter((p) => p.kind === "text").length,
        uiGraphic: pairs.filter((p) => p.kind === "ui-graphic").length,
        borderAdvisory: advisoryPairs.length,
      },
      unverifiedPairs,
      skippedTokens: parsedModes.skippedTokens,
      thresholds,
      assumptions,
    },
  };
}
