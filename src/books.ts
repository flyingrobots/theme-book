import {
  DesignBook,
  bestContrastWith,
  closest,
  color,
  colorMix,
  furthestFrom,
  leastVivid,
  minContrastWith,
  mostVivid,
  nth,
  ref,
  relativeTo,
  shade,
} from "design-book";
import {
  MOOD_PROFILES,
  formatOklchCss,
  generatePools,
  oklabDistance,
  parseToOklch,
  toSafeHex,
  type ChartPolarityDiagnostics,
  type GeneratorKind,
  type Mood,
} from "./palette";
import {
  apcaContrast,
  evaluateAudit,
  parseCssColorExact,
  wcagRatio,
  wcagRatioExact,
  type AuditReport,
  type AuditStandard,
} from "./audit";

export type ThemePreset = "shadcn" | "semantic" | "slide-deck";

export interface ThemeBuildOptions {
  seeds: string[];
  preset: ThemePreset;
  mood: Mood;
  generator: GeneratorKind;
  standard?: AuditStandard;
  hexOutput?: boolean;
}

export interface TokenProvenance {
  hex: string;
  oklch: string;
  rule: string;
  picked?: string;
  dependencies: string[];
}

export interface BuiltTheme {
  preset: ThemePreset;
  mood: Mood;
  generator: GeneratorKind;
  standard: AuditStandard;
  seeds: string[];
  rawSeeds: string[];
  book: DesignBook;
  lightKeys: string[];
  darkKeys: string[];
  light: Record<string, TokenProvenance>;
  dark: Record<string, TokenProvenance>;
  audit: AuditReport;
  chartDiagnostics: {
    light: ChartPolarityDiagnostics;
    dark: ChartPolarityDiagnostics;
  };
  extras?: Record<string, string>;
}

function populateScope(book: DesignBook, name: string, entries: Record<string, string>) {
  const scope = book.addScope(name);
  for (const [k, hex] of Object.entries(entries)) {
    scope.set(k, color(hex));
  }
  return scope;
}

function describeInspection(book: DesignBook, key: string): TokenProvenance {
  const resolved = book.resolve(key);
  const info = book.inspect(key);
  const raw = book.getTokenByKey(key);
  let rule = info?.tokenType ?? "literal";
  if (raw && typeof raw === "object" && "type" in raw) {
    if (raw.type === "function" && "name" in raw) {
      rule = info?.picked ? `${raw.name}(...) -> ${info.picked}` : `${raw.name}(...)`;
    } else if (raw.type === "reference" && "target" in raw) {
      rule = `ref(${raw.target})`;
    }
  }
  const hex = toSafeHex(resolved);
  return {
    hex,
    oklch: formatOklchCss(hex),
    rule,
    ...(info?.picked ? { picked: info.picked } : {}),
    dependencies: info?.dependencies ?? [],
  };
}

export function resolveEffectiveStandard(mood: Mood, explicit?: AuditStandard): AuditStandard {
  if (explicit) return explicit;
  return mood === "high-contrast" ? "wcag-aaa" : "wcag-aa";
}

export function buildThemeBook(opts: ThemeBuildOptions): BuiltTheme {
  const standard = resolveEffectiveStandard(opts.mood, opts.standard);
  const pools = generatePools(opts.seeds, opts.mood, opts.generator, standard);
  const profile = MOOD_PROFILES[opts.mood];
  const isAchromatic = pools.seedOklch[0]!.c < 0.015;
  const hasSecondarySeed = opts.seeds.length > 1;

  // Compute required muted-text WCAG target for the active standard:
  // APCA |Lc| >= 60 on dark surfaces needs higher WCAG (~7.2) than 4.8.
  const effectiveTextContrast =
    standard === "wcag-aaa"
      ? Math.max(profile.minTextContrast, 14.5)
      : profile.minTextContrast;
  const effectiveMutedLightContrast =
    standard === "wcag-aaa"
      ? Math.max(profile.minMutedContrast, 7.2)
      : profile.minMutedContrast;
  const effectiveMutedDarkContrast =
    standard === "wcag-aaa"
      ? Math.max(profile.minMutedContrast, 7.4)
      : standard === "apca"
        ? Math.max(profile.minMutedContrast, 9.5)
        : profile.minMutedContrast;

  const book = new DesignBook(`theme-book-${opts.preset}`);
  populateScope(book, "neutrals", pools.neutrals);
  populateScope(book, "brand", pools.brand);
  populateScope(book, "brandSolvableLight", pools.brandSolvableLight);
  populateScope(book, "brandSolvableDark", pools.brandSolvableDark);
  populateScope(book, "candidates", pools.candidates);
  populateScope(book, "statusTargets", pools.statusTargets);
  populateScope(book, "dangerLightPool", pools.statusPools.dangerLight);
  populateScope(book, "dangerDarkPool", pools.statusPools.dangerDark);
  populateScope(book, "successLightPool", pools.statusPools.successLight);
  populateScope(book, "successDarkPool", pools.statusPools.successDark);
  populateScope(book, "warningLightPool", pools.statusPools.warningLight);
  populateScope(book, "warningDarkPool", pools.statusPools.warningDark);
  populateScope(book, "chartsLight", pools.chartsLight);
  populateScope(book, "chartsDark", pools.chartsDark);

  // Pure ink endpoints so bestContrastWith always maximizes contrast for button/badge text
  const inks = book.addScope("inks");
  inks.set("white", color("#ffffff"));
  inks.set("black", color("#000000"));

  // Helper scope holding secondary-seed accent target only when seed-1 is explicitly supplied
  const accentSeeds = book.addScope("accentSeeds");
  accentSeeds.set("seed-0", ref("brand.seed-0"));
  if (hasSecondarySeed) {
    accentSeeds.set("seed-1", ref("candidates.seed-1"));
  }

  const light = book.addScope("light");
  const dark = book.addScope("dark", { extends: "light" });

  // Primary fill vs background stays at >= 4.5:1 (even under AAA, because primary is a fill,
  // not body copy — while primary-foreground on primary enforces the full active standard
  // via brandSolvableLight/Dark). Under APCA, ring/focus on dark surface needs ~4.5+ WCAG
  // to clear |Lc| >= 45.
  const primaryOnBgContrast = standard === "apca" ? 5.2 : 4.5;

  let keys: string[];
  let extras: Record<string, string> | undefined;

  if (opts.preset === "semantic") {
    keys = [
      "surface",
      "surface-raised",
      "surface-sunken",
      "ink",
      "ink-muted",
      "accent",
      "accent-hover",
      "accent-ink",
      "border",
      "border-strong",
      "focus",
      "success",
      "success-ink",
      "warning",
      "warning-ink",
      "danger",
      "danger-ink",
    ];

    // Light semantic rules
    light.set("surface", nth(ref("neutrals"), 0));
    light.set("surface-raised", color("#ffffff"));
    light.set("surface-sunken", nth(ref("neutrals"), 2));
    light.set(
      "ink",
      minContrastWith(ref("light.surface"), ref("neutrals"), {
        minContrast: effectiveTextContrast,
        direction: "darker",
      }),
    );
    light.set(
      "ink-muted",
      minContrastWith(ref("light.surface"), ref("neutrals"), {
        minContrast: effectiveMutedLightContrast,
        direction: "darker",
      }),
    );
    light.set(
      "accent",
      isAchromatic
        ? ref("neutrals.n990")
        : closest(ref("brand.seed-0"), ref("brandSolvableLight"), {
            readableOn: ref("light.surface"),
            readableContrast: primaryOnBgContrast,
          }),
    );
    light.set("accent-hover", shade(ref("light.accent"), { amount: 0.1 }));
    light.set("accent-ink", bestContrastWith(ref("light.accent"), ref("inks")));
    light.set("border", shade(ref("light.surface"), { amount: 0.08 }));
    light.set("border-strong", shade(ref("light.surface"), { amount: 0.2 }));
    light.set("focus", ref("light.accent"));
    light.set("success", closest(ref("statusTargets.success-light"), ref("successLightPool")));
    light.set("success-ink", bestContrastWith(ref("light.success"), ref("inks")));
    light.set("warning", closest(ref("statusTargets.warning-light"), ref("warningLightPool")));
    light.set("warning-ink", bestContrastWith(ref("light.warning"), ref("inks")));
    light.set("danger", closest(ref("statusTargets.danger-light"), ref("dangerLightPool")));
    light.set("danger-ink", bestContrastWith(ref("light.danger"), ref("inks")));

    // Dark semantic rules (extends light)
    dark.set("surface", nth(ref("neutrals"), -2));
    dark.set("surface-raised", nth(ref("neutrals"), -3));
    dark.set("surface-sunken", nth(ref("neutrals"), -1));
    dark.set(
      "ink",
      minContrastWith(ref("dark.surface"), ref("neutrals"), {
        minContrast: effectiveTextContrast,
        direction: "lighter",
      }),
    );
    dark.set(
      "ink-muted",
      minContrastWith(ref("dark.surface"), ref("neutrals"), {
        minContrast: effectiveMutedDarkContrast,
        direction: "lighter",
      }),
    );
    dark.set(
      "accent",
      isAchromatic
        ? ref("neutrals.n000")
        : closest(ref("brand.seed-0"), ref("brandSolvableDark"), {
            readableOn: ref("dark.surface"),
            readableContrast: primaryOnBgContrast,
          }),
    );
    dark.set("accent-hover", shade(ref("dark.accent"), { amount: 0.1 }));
    dark.set("accent-ink", bestContrastWith(ref("dark.accent"), ref("inks")));
    dark.set("border", shade(ref("dark.surface"), { amount: 0.12 }));
    dark.set("border-strong", shade(ref("dark.surface"), { amount: 0.24 }));
    dark.set("focus", ref("dark.accent"));
    dark.set("success", closest(ref("statusTargets.success-dark"), ref("successDarkPool")));
    dark.set("success-ink", bestContrastWith(ref("dark.success"), ref("inks")));
    dark.set("warning", closest(ref("statusTargets.warning-dark"), ref("warningDarkPool")));
    dark.set("warning-ink", bestContrastWith(ref("dark.warning"), ref("inks")));
    dark.set("danger", closest(ref("statusTargets.danger-dark"), ref("dangerDarkPool")));
    dark.set("danger-ink", bestContrastWith(ref("dark.danger"), ref("inks")));
  } else {
    keys = [
      "background",
      "foreground",
      "card",
      "card-foreground",
      "popover",
      "popover-foreground",
      "primary",
      "primary-foreground",
      "secondary",
      "secondary-foreground",
      "muted",
      "muted-foreground",
      "accent",
      "accent-foreground",
      "destructive",
      "destructive-foreground",
      "border",
      "input",
      "ring",
      "chart-1",
      "chart-2",
      "chart-3",
      "chart-4",
      "chart-5",
    ];

    // Light shadcn / slide-deck rules
    light.set("background", nth(ref("neutrals"), 0));
    light.set(
      "foreground",
      minContrastWith(ref("light.background"), ref("neutrals"), {
        minContrast: effectiveTextContrast,
        direction: "darker",
      }),
    );
    light.set("card", color("#ffffff"));
    light.set("card-foreground", ref("light.foreground"));
    light.set("popover", ref("light.background"));
    light.set("popover-foreground", ref("light.foreground"));
    light.set(
      "primary",
      isAchromatic
        ? ref("neutrals.n990")
        : closest(ref("brand.seed-0"), ref("brandSolvableLight"), {
            readableOn: ref("light.background"),
            readableContrast: primaryOnBgContrast,
          }),
    );
    light.set("primary-foreground", bestContrastWith(ref("light.primary"), ref("inks")));
    light.set(
      "secondary",
      colorMix(ref("light.background"), ref("light.primary"), {
        ratio: 0.07,
        colorSpace: "oklch",
      }),
    );
    light.set("secondary-foreground", bestContrastWith(ref("light.secondary"), ref("inks")));
    light.set("muted", nth(ref("neutrals"), 2));
    light.set(
      "muted-foreground",
      minContrastWith(ref("light.muted"), ref("neutrals"), {
        minContrast: effectiveMutedLightContrast,
        direction: "darker",
      }),
    );
    // Quiet tint of primary by default; tint from seed-1 ONLY when explicitly supplied!
    light.set(
      "accent",
      colorMix(
        ref("light.background"),
        hasSecondarySeed ? ref("accentSeeds.seed-1") : ref("light.primary"),
        { ratio: 0.11, colorSpace: "oklch" },
      ),
    );
    light.set("accent-foreground", bestContrastWith(ref("light.accent"), ref("inks")));
    light.set("destructive", closest(ref("statusTargets.danger-light"), ref("dangerLightPool")));
    light.set("destructive-foreground", bestContrastWith(ref("light.destructive"), ref("inks")));
    light.set("border", shade(ref("light.background"), { amount: 0.09 }));
    light.set("input", shade(ref("light.background"), { amount: 0.07 }));
    light.set("ring", ref("light.primary"));

    // Generator-driven maximin chart series
    light.set("chart-1", ref("chartsLight.c-1"));
    light.set("chart-2", ref("chartsLight.c-2"));
    light.set("chart-3", ref("chartsLight.c-3"));
    light.set("chart-4", ref("chartsLight.c-4"));
    light.set("chart-5", ref("chartsLight.c-5"));

    // Dark shadcn / slide-deck rules (extends light)
    dark.set("background", nth(ref("neutrals"), -2));
    dark.set(
      "foreground",
      minContrastWith(ref("dark.background"), ref("neutrals"), {
        minContrast: effectiveTextContrast,
        direction: "lighter",
      }),
    );
    dark.set("card", nth(ref("neutrals"), -3));
    dark.set("card-foreground", ref("dark.foreground"));
    dark.set("popover", nth(ref("neutrals"), -4));
    dark.set("popover-foreground", ref("dark.foreground"));
    dark.set(
      "primary",
      isAchromatic
        ? ref("neutrals.n000")
        : closest(ref("brand.seed-0"), ref("brandSolvableDark"), {
            readableOn: ref("dark.background"),
            readableContrast: primaryOnBgContrast,
          }),
    );
    dark.set("primary-foreground", bestContrastWith(ref("dark.primary"), ref("inks")));
    dark.set(
      "secondary",
      colorMix(ref("dark.background"), ref("dark.primary"), {
        ratio: 0.13,
        colorSpace: "oklch",
      }),
    );
    dark.set("secondary-foreground", bestContrastWith(ref("dark.secondary"), ref("inks")));
    dark.set("muted", nth(ref("neutrals"), -4));
    dark.set(
      "muted-foreground",
      minContrastWith(ref("dark.muted"), ref("neutrals"), {
        minContrast: effectiveMutedDarkContrast,
        direction: "lighter",
      }),
    );
    dark.set(
      "accent",
      colorMix(
        ref("dark.background"),
        hasSecondarySeed ? ref("accentSeeds.seed-1") : ref("dark.primary"),
        { ratio: 0.18, colorSpace: "oklch" },
      ),
    );
    dark.set("accent-foreground", bestContrastWith(ref("dark.accent"), ref("inks")));
    dark.set("destructive", closest(ref("statusTargets.danger-dark"), ref("dangerDarkPool")));
    dark.set("destructive-foreground", bestContrastWith(ref("dark.destructive"), ref("inks")));
    dark.set("border", shade(ref("dark.background"), { amount: 0.14 }));
    dark.set("input", shade(ref("dark.background"), { amount: 0.18 }));
    dark.set("ring", ref("dark.primary"));

    dark.set("chart-1", ref("chartsDark.c-1"));
    dark.set("chart-2", ref("chartsDark.c-2"));
    dark.set("chart-3", ref("chartsDark.c-3"));
    dark.set("chart-4", ref("chartsDark.c-4"));
    dark.set("chart-5", ref("chartsDark.c-5"));

    if (opts.preset === "slide-deck") {
      extras = {
        "font-sans": '"Geist", ui-sans-serif, system-ui, sans-serif',
        "font-serif": "Georgia, serif",
        "font-mono": '"Geist Mono", ui-monospace, monospace',
        radius: "0.5rem",
        "shadow-sm":
          "0px 1px 2px 0px hsl(0 0% 0% / 0.18), 0px 1px 2px -1px hsl(0 0% 0% / 0.18)",
        "shadow-xl":
          "0px 1px 2px 0px hsl(0 0% 0% / 0.18), 0px 8px 10px -1px hsl(0 0% 0% / 0.18)",
      };
    }
  }

  const lightResolved: Record<string, TokenProvenance> = {};
  const darkResolved: Record<string, TokenProvenance> = {};
  const lightSerialized: Record<string, string> = {};
  const darkSerialized: Record<string, string> = {};

  for (const k of keys) {
    lightResolved[k] = describeInspection(book, `light.${k}`);
    darkResolved[k] = describeInspection(book, `dark.${k}`);
    lightSerialized[k] = opts.hexOutput ? lightResolved[k]!.hex : lightResolved[k]!.oklch;
    darkSerialized[k] = opts.hexOutput ? darkResolved[k]!.hex : darkResolved[k]!.oklch;
  }

  const audit = evaluateAudit(
    { light: lightSerialized, dark: darkSerialized, skippedTokens: [], assumptions: [] },
    { standard, withFixes: false },
  );

  return {
    preset: opts.preset,
    mood: opts.mood,
    generator: opts.generator,
    standard,
    seeds: pools.seedHexes,
    rawSeeds: pools.rawSeeds,
    book,
    lightKeys: keys,
    darkKeys: keys,
    light: lightResolved,
    dark: darkResolved,
    audit,
    chartDiagnostics: pools.chartDiagnostics,
    extras,
  };
}

export interface ColorSuggestion {
  role: string;
  hex: string;
  oklch: string;
  wcagOnSurface: number;
  apcaOnSurface: number;
  rule: string;
}

export interface SuggestResult {
  seeds: string[];
  surface: { hex: string; oklch: string; polarity: "light" | "dark" };
  mood: Mood;
  generator: GeneratorKind;
  requestedCount: number;
  suggestions: ColorSuggestion[];
  warnings: string[];
}

export function suggestCompanionColors(opts: {
  seeds: string[];
  surface?: string;
  polarity?: "light" | "dark";
  mood: Mood;
  generator: GeneratorKind;
  count: number;
}): SuggestResult {
  const pools = generatePools(opts.seeds, opts.mood, opts.generator, "wcag-aa");
  const defaultSurfaceHex =
    opts.polarity === "dark" ? pools.neutrals.n950! : pools.neutrals.n000!;
  const surfaceHex = opts.surface ? toSafeHex(opts.surface) : defaultSurfaceHex;
  const surfaceOklch = parseToOklch(surfaceHex);
  const polarity: "light" | "dark" = surfaceOklch.l > 0.5 ? "light" : "dark";

  const book = new DesignBook("theme-book-suggest");
  const poolEntries: Record<string, string> = {
    ...pools.candidates,
    ...pools.brand,
  };
  populateScope(book, "pool", poolEntries);
  populateScope(book, "neutrals", pools.neutrals);
  const s = book.addScope("pick");
  s.set("seed", color(pools.seedHexes[0]!));
  s.set("surface", color(surfaceHex));

  const roles: Array<{ name: string; rule: string; setup: () => void }> = [
    {
      name: "primary-accent",
      rule: "mostVivid(pool, { readableOn: surface, readableContrast: 4.5 })",
      setup: () =>
        s.set(
          "primary-accent",
          mostVivid(ref("pool"), { readableOn: ref("pick.surface"), readableContrast: 4.5 }),
        ),
    },
    {
      name: "complementary",
      rule: "closest(relativeTo(seed, oklch, [null, null, +180]), pool, { readableOn: surface, readableContrast: 4.5 })",
      setup: () => {
        s.set("comp-raw", relativeTo(ref("pick.seed"), "oklch", [null, null, "+180"]));
        s.set(
          "complementary",
          closest(ref("pick.comp-raw"), ref("pool"), {
            readableOn: ref("pick.surface"),
            readableContrast: 4.5,
            not: [ref("pick.primary-accent")],
          }),
        );
      },
    },
    {
      name: "distinct-companion",
      rule: "furthestFrom(primary-accent, pool, { readableOn: surface, readableContrast: 4.5, not: [primary-accent] })",
      setup: () =>
        s.set(
          "distinct-companion",
          furthestFrom(ref("pick.primary-accent"), ref("pool"), {
            readableOn: ref("pick.surface"),
            readableContrast: 4.5,
            not: [ref("pick.primary-accent")],
          }),
        ),
    },
    {
      name: "muted-companion",
      rule: "leastVivid(pool, { readableOn: surface, readableContrast: 4.5, not: [primary-accent] })",
      setup: () =>
        s.set(
          "muted-companion",
          leastVivid(ref("pool"), {
            readableOn: ref("pick.surface"),
            readableContrast: 4.5,
            not: [ref("pick.primary-accent")],
          }),
        ),
    },
    {
      name: "readable-ink",
      rule: "bestContrastWith(surface, neutrals)",
      setup: () => s.set("readable-ink", bestContrastWith(ref("pick.surface"), ref("neutrals"))),
    },
    {
      name: "muted-ink",
      rule: "minContrastWith(surface, neutrals, { minContrast: 4.8 })",
      setup: () =>
        s.set(
          "muted-ink",
          minContrastWith(ref("pick.surface"), ref("neutrals"), {
            minContrast: 4.8,
            direction: polarity === "light" ? "darker" : "lighter",
          }),
        ),
    },
    {
      name: "soft-tint-surface",
      rule: "colorMix(surface, primary-accent, { ratio: 0.12, colorSpace: oklch })",
      setup: () =>
        s.set(
          "soft-tint-surface",
          colorMix(ref("pick.surface"), ref("pick.primary-accent"), {
            ratio: 0.12,
            colorSpace: "oklch",
          }),
        ),
    },
    {
      name: "adaptive-border",
      rule: "shade(surface, { amount: 0.12 })",
      setup: () => s.set("adaptive-border", shade(ref("pick.surface"), { amount: 0.12 })),
    },
  ];

  const requestedCount = Math.max(1, Math.floor(opts.count));
  const suggestions: ColorSuggestion[] = [];
  const warnings: string[] = [];

  for (const r of roles.slice(0, requestedCount)) {
    r.setup();
    const hex = toSafeHex(book.resolve(`pick.${r.name}`));
    suggestions.push({
      role: r.name,
      hex,
      oklch: formatOklchCss(hex),
      wcagOnSurface: wcagRatio(hex, surfaceHex),
      apcaOnSurface: apcaContrast(hex, surfaceHex),
      rule: r.rule,
    });
  }

  // If caller asked for more than 8 suggestions, select additional readable,
  // deduplicated, maximally-separated candidates from the remaining pool.
  if (requestedCount > suggestions.length) {
    const surfaceParsed = parseCssColorExact(surfaceHex);
    const usedHexes = new Set(suggestions.map((x) => x.hex));
    const readableRemaining: Array<{ key: string; hex: string }> = [];

    for (const [k, hex] of Object.entries(poolEntries)) {
      if (usedHexes.has(hex)) continue;
      const p = parseCssColorExact(hex);
      if (p.ok && surfaceParsed.ok && wcagRatioExact(p.rgb, surfaceParsed.rgb) >= 4.5) {
        usedHexes.add(hex);
        readableRemaining.push({ key: k, hex });
      }
    }

    while (suggestions.length < requestedCount && readableRemaining.length > 0) {
      let bestIdx = 0;
      let bestMinDist = -1;
      for (let i = 0; i < readableRemaining.length; i++) {
        const cand = readableRemaining[i]!;
        let minDist = Infinity;
        for (const chosen of suggestions) {
          const d = oklabDistance(cand.hex, chosen.hex);
          if (d < minDist) minDist = d;
        }
        if (
          minDist > bestMinDist + 1e-9 ||
          (Math.abs(minDist - bestMinDist) <= 1e-9 &&
            cand.key.localeCompare(readableRemaining[bestIdx]!.key) < 0)
        ) {
          bestMinDist = minDist;
          bestIdx = i;
        }
      }
      const next = readableRemaining.splice(bestIdx, 1)[0]!;
      const idx = suggestions.length + 1;
      suggestions.push({
        role: `companion-${idx}`,
        hex: next.hex,
        oklch: formatOklchCss(next.hex),
        wcagOnSurface: wcagRatio(next.hex, surfaceHex),
        apcaOnSurface: apcaContrast(next.hex, surfaceHex),
        rule: `maximin(pool.${next.key}, readableContrast >= 4.5)`,
      });
    }

    if (suggestions.length < requestedCount) {
      warnings.push(
        `Requested ${requestedCount} suggestions, but only ${suggestions.length} unique readable candidates were available in the generated pool.`,
      );
    }
  }

  return {
    seeds: pools.seedHexes,
    surface: { hex: surfaceHex, oklch: formatOklchCss(surfaceHex), polarity },
    mood: opts.mood,
    generator: opts.generator,
    requestedCount,
    suggestions,
    warnings,
  };
}
