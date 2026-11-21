import { DesignBook, closest, color, minContrastWith, ref } from "design-book";
import { converter, parse, wcagContrast } from "culori";
import { formatOklchCss, gamutSafeOklch, normalizeHue, parseToOklch, toSafeHex } from "./palette";

const toRgb = converter("rgb");

/**
 * APCA-W3 0.0.98G-4g perceptual lightness contrast (Lc, range roughly -108..+106).
 * Positive Lc = dark text on light background; negative Lc = light text on dark background.
 */
export function apcaContrast(textColor: string, bgColor: string): number {
  const fg = toRgb(parse(textColor));
  const bg = toRgb(parse(bgColor));
  if (!fg || !bg) return 0;

  const srgbToY = (r: number, g: number, b: number) => {
    const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
    return (
      0.2126729 * Math.pow(clamp01(r), 2.4) +
      0.7151522 * Math.pow(clamp01(g), 2.4) +
      0.072175 * Math.pow(clamp01(b), 2.4)
    );
  };

  const softClamp = (y: number) => (y > 0.022 ? y : y + Math.pow(0.022 - y, 1.414));
  const yTxt = softClamp(srgbToY(fg.r, fg.g, fg.b));
  const yBg = softClamp(srgbToY(bg.r, bg.g, bg.b));

  if (Math.abs(yBg - yTxt) < 0.0005) return 0;

  let sapc = 0;
  let output = 0;

  if (yBg > yTxt) {
    // Dark text on light background (BoW)
    sapc = (Math.pow(yBg, 0.56) - Math.pow(yTxt, 0.57)) * 1.14;
    output = sapc < 0.1 ? 0 : sapc - 0.027;
  } else {
    // Light text on dark background (WoB)
    sapc = (Math.pow(yBg, 0.65) - Math.pow(yTxt, 0.62)) * 1.14;
    output = sapc > -0.1 ? 0 : sapc + 0.027;
  }

  return Number((output * 100).toFixed(1));
}

export function wcagRatio(colorA: string, colorB: string): number {
  const ratio = wcagContrast(colorA, colorB);
  return Number((ratio ?? 1).toFixed(2));
}

export type AuditStandard = "wcag-aa" | "wcag-aaa" | "apca";

export interface PairAudit {
  mode: "light" | "dark";
  fgToken: string;
  bgToken: string;
  fgHex: string;
  bgHex: string;
  fgOklch: string;
  bgOklch: string;
  wcag: number;
  apcaLc: number;
  requiredWcag: number;
  requiredApca: number;
  pass: boolean;
  suggestedFix?: {
    hex: string;
    oklch: string;
    wcag: number;
    apcaLc: number;
    reason: string;
  };
}

export interface AuditReport {
  standard: AuditStandard;
  passed: number;
  failed: number;
  pairs: PairAudit[];
}

export function thresholdsForStandard(standard: AuditStandard): { wcag: number; apca: number } {
  switch (standard) {
    case "wcag-aaa":
      return { wcag: 7.0, apca: 75 };
    case "apca":
      return { wcag: 4.5, apca: 60 };
    case "wcag-aa":
    default:
      return { wcag: 4.5, apca: 60 };
  }
}

/**
 * Use Design Book's `minContrastWith` over a hue-preserving OKLCH lightness ramp
 * to propose the closest color that satisfies the contrast target.
 */
export function solveContrastFix(
  fgColor: string,
  bgColor: string,
  minRatio: number,
): PairAudit["suggestedFix"] {
  const fg = parseToOklch(fgColor);
  const bg = parseToOklch(bgColor);
  const hue = normalizeHue(fg.h);
  const book = new DesignBook("contrast-fix");
  const ramp = book.addScope("ramp");

  for (let i = 0; i <= 40; i++) {
    const l = i / 40;
    const candidate = gamutSafeOklch(l, fg.c, hue);
    ramp.set(`l-${String(i).padStart(2, "0")}`, color(toSafeHex(candidate)));
  }

  const fixScope = book.addScope("fix");
  fixScope.set("bg", color(toSafeHex(bg)));
  fixScope.set("orig", color(toSafeHex(fg)));

  const preferDirection = bg.l > 0.5 ? "darker" : "lighter";
  fixScope.set(
    "resolved",
    minContrastWith(ref("fix.bg"), ref("ramp"), {
      minContrast: minRatio,
      direction: preferDirection,
    }),
  );

  let resolvedHex = book.resolve("fix.resolved");
  let ratio = wcagRatio(resolvedHex, toSafeHex(bg));

  // If the preferred side couldn't reach minRatio, check all directions
  if (ratio < minRatio) {
    fixScope.set(
      "resolved-any",
      minContrastWith(ref("fix.bg"), ref("ramp"), { minContrast: minRatio }),
    );
    const altHex = book.resolve("fix.resolved-any");
    const altRatio = wcagRatio(altHex, toSafeHex(bg));
    if (altRatio > ratio) {
      resolvedHex = altHex;
      ratio = altRatio;
    }
  }

  // If still short (e.g. very chromatic mid-hue), allow lower chroma toward neutral
  if (ratio < minRatio) {
    const neutralRamp = book.addScope("nramp");
    for (let i = 0; i <= 40; i++) {
      const l = i / 40;
      neutralRamp.set(`n-${String(i).padStart(2, "0")}`, color(toSafeHex(gamutSafeOklch(l, fg.c * 0.35, hue))));
    }
    fixScope.set(
      "resolved-neutral",
      minContrastWith(ref("fix.bg"), ref("nramp"), { minContrast: minRatio }),
    );
    const nHex = book.resolve("fix.resolved-neutral");
    const nRatio = wcagRatio(nHex, toSafeHex(bg));
    if (nRatio > ratio) {
      resolvedHex = nHex;
      ratio = nRatio;
    }
  }

  // Verify closeness diagnostic
  fixScope.set("nearest", closest(ref("fix.orig"), ref("ramp")));
  const _nearest = book.resolve("fix.nearest");
  void _nearest;

  return {
    hex: resolvedHex,
    oklch: formatOklchCss(resolvedHex),
    wcag: ratio,
    apcaLc: apcaContrast(resolvedHex, toSafeHex(bg)),
    reason: `Design Book minContrastWith(bg, OKLCH hue=${hue.toFixed(0)}° ramp, minContrast=${minRatio})`,
  };
}

export function evaluatePairs(
  pairs: Array<{ mode: "light" | "dark"; fgToken: string; bgToken: string; fg: string; bg: string }>,
  standard: AuditStandard = "wcag-aa",
  withFixes = false,
): AuditReport {
  const { wcag: reqWcag, apca: reqApca } = thresholdsForStandard(standard);
  const results: PairAudit[] = [];

  for (const item of pairs) {
    const fgHex = toSafeHex(item.fg);
    const bgHex = toSafeHex(item.bg);
    const wcag = wcagRatio(fgHex, bgHex);
    const apcaLc = apcaContrast(fgHex, bgHex);
    const pass =
      standard === "apca" ? Math.abs(apcaLc) >= reqApca : wcag >= reqWcag;

    const entry: PairAudit = {
      mode: item.mode,
      fgToken: item.fgToken,
      bgToken: item.bgToken,
      fgHex,
      bgHex,
      fgOklch: formatOklchCss(fgHex),
      bgOklch: formatOklchCss(bgHex),
      wcag,
      apcaLc,
      requiredWcag: reqWcag,
      requiredApca: reqApca,
      pass,
    };

    if (!pass && withFixes) {
      const targetRatio = standard === "apca" ? 5.5 : reqWcag;
      entry.suggestedFix = solveContrastFix(fgHex, bgHex, targetRatio);
    }
    results.push(entry);
  }

  const passed = results.filter((r) => r.pass).length;
  return {
    standard,
    passed,
    failed: results.length - passed,
    pairs: results,
  };
}

export interface ParsedTokenModes {
  light: Record<string, string>;
  dark: Record<string, string>;
}

/**
 * Parse CSS `:root { --token: value; }` / `.dark { ... }` or JSON token files.
 */
export function parseTokensFromText(content: string, filename: string): ParsedTokenModes {
  const trimmed = content.trim();
  if (filename.endsWith(".json") || trimmed.startsWith("{")) {
    const obj = JSON.parse(trimmed) as Record<string, unknown>;
    const light: Record<string, string> = {};
    const dark: Record<string, string> = {};

    const extractFlat = (src: unknown, dest: Record<string, string>) => {
      if (!src || typeof src !== "object") return;
      for (const [k, v] of Object.entries(src as Record<string, unknown>)) {
        if (typeof v === "string" && parse(v)) {
          dest[k.replace(/^--/, "")] = v;
        } else if (v && typeof v === "object" && "$value" in v) {
          const val = (v as { $value?: unknown }).$value;
          if (typeof val === "string" && parse(val)) {
            dest[k.replace(/^--/, "")] = val;
          }
        }
      }
    };

    if (obj.light && typeof obj.light === "object") extractFlat(obj.light, light);
    if (obj.dark && typeof obj.dark === "object") extractFlat(obj.dark, dark);
    if (Object.keys(light).length === 0 && Object.keys(dark).length === 0) {
      extractFlat(obj, light);
    }
    return { light, dark };
  }

  // CSS parsing: strip block comments, read :root and .dark / [data-theme="dark"] blocks
  const noComments = content.replace(/\/\*[\s\S]*?\*\//g, "");
  const light: Record<string, string> = {};
  const dark: Record<string, string> = {};

  const blockRegex = /([^{}]+)\{([^{}]+)\}/g;
  let match: RegExpExecArray | null;
  while ((match = blockRegex.exec(noComments)) !== null) {
    const selector = match[1]!.trim();
    const body = match[2]!;
    const isDark =
      /(?:^|[\s,])\.dark(?:\b|$)/.test(selector) ||
      /data-theme\s*=\s*["']?dark["']?/.test(selector);
    const isLight =
      /:root\b/.test(selector) ||
      /data-theme\s*=\s*["']?light["']?/.test(selector);

    if (!isLight && !isDark) continue;
    const target = isDark ? dark : light;

    const declRegex = /--([A-Za-z0-9_-]+)\s*:\s*([^;]+);?/g;
    let decl: RegExpExecArray | null;
    while ((decl = declRegex.exec(body)) !== null) {
      const name = decl[1]!;
      const value = decl[2]!.trim();
      if (parse(value)) {
        target[name] = value;
      }
    }
  }

  return { light, dark };
}

/**
 * Infer foreground/background pairs from standard shadcn and semantic token naming conventions.
 */
export function inferAuditPairs(
  modes: ParsedTokenModes,
): Array<{ mode: "light" | "dark"; fgToken: string; bgToken: string; fg: string; bg: string }> {
  const pairs: Array<{
    mode: "light" | "dark";
    fgToken: string;
    bgToken: string;
    fg: string;
    bg: string;
  }> = [];

  const checkMode = (mode: "light" | "dark", tokens: Record<string, string>) => {
    const addIfBoth = (fgToken: string, bgToken: string) => {
      if (tokens[fgToken] && tokens[bgToken]) {
        pairs.push({ mode, fgToken, bgToken, fg: tokens[fgToken]!, bg: tokens[bgToken]! });
      }
    };

    // shadcn conventions
    addIfBoth("foreground", "background");
    addIfBoth("card-foreground", "card");
    addIfBoth("popover-foreground", "popover");
    addIfBoth("primary-foreground", "primary");
    addIfBoth("secondary-foreground", "secondary");
    addIfBoth("muted-foreground", "muted");
    addIfBoth("muted-foreground", "background");
    addIfBoth("accent-foreground", "accent");
    addIfBoth("destructive-foreground", "destructive");

    // generic semantic conventions
    addIfBoth("ink", "surface");
    addIfBoth("ink", "surface-raised");
    addIfBoth("ink-muted", "surface");
    addIfBoth("accent-ink", "accent");
    addIfBoth("success-ink", "success");
    addIfBoth("warning-ink", "warning");
    addIfBoth("danger-ink", "danger");

    // Any remaining `<base>-foreground` / `<base>-ink` paired with `<base>`
    const seen = new Set(pairs.map((p) => `${p.mode}:${p.fgToken}@${p.bgToken}`));
    for (const key of Object.keys(tokens)) {
      const fgMatch = key.match(/^(.+)-(foreground|ink)$/);
      if (fgMatch) {
        const base = fgMatch[1]!;
        const id = `${mode}:${key}@${base}`;
        if (tokens[base] && !seen.has(id)) {
          seen.add(id);
          pairs.push({ mode, fgToken: key, bgToken: base, fg: tokens[key]!, bg: tokens[base]! });
        }
      }
    }
  };

  checkMode("light", modes.light);
  if (Object.keys(modes.dark).length > 0) {
    checkMode("dark", { ...modes.light, ...modes.dark });
  }

  return pairs;
}
