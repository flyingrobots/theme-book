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
  parseToOklch,
  toSafeHex,
  type GeneratorKind,
  type Mood,
} from "./palette";
import { apcaContrast, evaluateAudit, wcagRatio, type AuditReport } from "./audit";

export type ThemePreset = "shadcn" | "semantic" | "slide-deck";

export interface ThemeBuildOptions {
  seeds: string[];
  preset: ThemePreset;
  mood: Mood;
  generator: GeneratorKind;
}

export interface TokenProvenance {
  hex: string;
  oklch: string;
  rule: string;
  dependencies: string[];
}

export interface BuiltTheme {
  preset: ThemePreset;
  mood: Mood;
  generator: GeneratorKind;
  seeds: string[];
  book: DesignBook;
  lightKeys: string[];
  darkKeys: string[];
  light: Record<string, TokenProvenance>;
  dark: Record<string, TokenProvenance>;
  audit: AuditReport;
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
  return {
    hex: toSafeHex(resolved),
    oklch: formatOklchCss(resolved),
    rule,
    dependencies: info?.dependencies ?? [],
  };
}

export function buildThemeBook(opts: ThemeBuildOptions): BuiltTheme {
  const pools = generatePools(opts.seeds, opts.mood, opts.generator);
  const profile = MOOD_PROFILES[opts.mood];
  const isAchromatic = pools.seedOklch[0]!.c < 0.015;

  const book = new DesignBook(`theme-book-${opts.preset}`);
  populateScope(book, "neutrals", pools.neutrals);
  populateScope(book, "brand", pools.brand);
  populateScope(book, "candidates", pools.candidates);
  populateScope(book, "status", pools.status);
  populateScope(book, "charts", pools.charts);

  // Build explicit light/dark chart pools so chart colors read cleanly on each polarity
  const chartsLight = book.addScope("chartsLight");
  const chartsDark = book.addScope("chartsDark");
  for (const [k, v] of Object.entries(pools.charts)) {
    if (k.startsWith("cl-")) chartsLight.set(k, color(v));
    if (k.startsWith("cd-")) chartsDark.set(k, color(v));
  }

  // Ink pool with crisp pure endpoints so bestContrastWith always has high-contrast options
  const inks = book.addScope("inks");
  inks.set("white", color("#ffffff"));
  inks.set("black", color("#000000"));
  inks.set("light", ref("neutrals.n050"));
  inks.set("dark", ref("neutrals.n990"));

  const light = book.addScope("light");
  const dark = book.addScope("dark", { extends: "light" });

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
        minContrast: profile.minTextContrast,
        direction: "darker",
      }),
    );
    light.set(
      "ink-muted",
      minContrastWith(ref("light.surface"), ref("neutrals"), {
        minContrast: profile.minMutedContrast,
        direction: "darker",
      }),
    );
    light.set(
      "accent",
      isAchromatic
        ? ref("neutrals.n990")
        : mostVivid(ref("brand"), {
            readableOn: ref("light.surface"),
            readableContrast: 4.5,
          }),
    );
    light.set("accent-hover", shade(ref("light.accent"), { amount: 0.1 }));
    light.set("accent-ink", bestContrastWith(ref("light.accent"), ref("inks")));
    light.set("border", shade(ref("light.surface"), { amount: 0.08 }));
    light.set("border-strong", shade(ref("light.surface"), { amount: 0.2 }));
    light.set("focus", ref("light.accent"));
    light.set("success", ref("status.success-light"));
    light.set("success-ink", bestContrastWith(ref("light.success"), ref("inks")));
    light.set("warning", ref("status.warning-light"));
    light.set("warning-ink", bestContrastWith(ref("light.warning"), ref("inks")));
    light.set("danger", ref("status.danger-light"));
    light.set("danger-ink", bestContrastWith(ref("light.danger"), ref("inks")));

    // Dark semantic overrides (inherits structure from light)
    dark.set("surface", nth(ref("neutrals"), -2));
    dark.set("surface-raised", nth(ref("neutrals"), -3));
    dark.set("surface-sunken", nth(ref("neutrals"), -1));
    dark.set(
      "ink",
      minContrastWith(ref("dark.surface"), ref("neutrals"), {
        minContrast: profile.minTextContrast,
        direction: "lighter",
      }),
    );
    dark.set(
      "ink-muted",
      minContrastWith(ref("dark.surface"), ref("neutrals"), {
        minContrast: profile.minMutedContrast,
        direction: "lighter",
      }),
    );
    dark.set(
      "accent",
      isAchromatic
        ? ref("neutrals.n000")
        : mostVivid(ref("brand"), {
            readableOn: ref("dark.surface"),
            readableContrast: 4.5,
          }),
    );
    dark.set("accent-hover", shade(ref("dark.accent"), { amount: 0.1 }));
    dark.set("accent-ink", bestContrastWith(ref("dark.accent"), ref("inks")));
    dark.set("border", shade(ref("dark.surface"), { amount: 0.12 }));
    dark.set("border-strong", shade(ref("dark.surface"), { amount: 0.24 }));
    dark.set("focus", ref("dark.accent"));
    dark.set("success", ref("status.success-dark"));
    dark.set("success-ink", bestContrastWith(ref("dark.success"), ref("inks")));
    dark.set("warning", ref("status.warning-dark"));
    dark.set("warning-ink", bestContrastWith(ref("dark.warning"), ref("inks")));
    dark.set("danger", ref("status.danger-dark"));
    dark.set("danger-ink", bestContrastWith(ref("dark.danger"), ref("inks")));
  } else {
    // shadcn and slide-deck share the exact shadcn/ui OKLCH token surface
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

    // Light shadcn rules
    light.set("background", nth(ref("neutrals"), 0));
    light.set(
      "foreground",
      minContrastWith(ref("light.background"), ref("neutrals"), {
        minContrast: profile.minTextContrast,
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
        : mostVivid(ref("brand"), {
            readableOn: ref("light.background"),
            readableContrast: 4.5,
          }),
    );
    light.set("primary-foreground", bestContrastWith(ref("light.primary"), ref("inks")));
    light.set("secondary", colorMix(ref("light.background"), ref("light.primary"), { ratio: 0.08, colorSpace: "oklch" }));
    light.set("secondary-foreground", bestContrastWith(ref("light.secondary"), ref("inks")));
    light.set("muted", nth(ref("neutrals"), 2));
    light.set(
      "muted-foreground",
      minContrastWith(ref("light.muted"), ref("neutrals"), {
        minContrast: profile.minMutedContrast,
        direction: "darker",
      }),
    );
    light.set("accent", colorMix(ref("light.background"), ref("light.primary"), { ratio: 0.12, colorSpace: "oklch" }));
    light.set("accent-foreground", bestContrastWith(ref("light.accent"), ref("inks")));
    light.set("destructive", ref("status.danger-light"));
    light.set("destructive-foreground", bestContrastWith(ref("light.destructive"), ref("inks")));
    light.set("border", shade(ref("light.background"), { amount: 0.09 }));
    light.set("input", shade(ref("light.background"), { amount: 0.07 }));
    light.set("ring", ref("light.primary"));

    // Distinct chart colors solved sequentially via Design Book's furthestFrom / mostVivid + not exclusions
    light.set(
      "chart-1",
      mostVivid(ref("chartsLight"), {
        readableOn: ref("light.background"),
        readableContrast: 3.1,
      }),
    );
    light.set(
      "chart-2",
      furthestFrom(ref("light.chart-1"), ref("chartsLight"), {
        readableOn: ref("light.background"),
        readableContrast: 3.1,
        not: [ref("light.chart-1")],
      }),
    );
    light.set(
      "chart-3",
      furthestFrom(ref("light.chart-2"), ref("chartsLight"), {
        readableOn: ref("light.background"),
        readableContrast: 3.1,
        not: [ref("light.chart-1"), ref("light.chart-2")],
      }),
    );
    light.set(
      "chart-4",
      furthestFrom(ref("light.chart-3"), ref("chartsLight"), {
        readableOn: ref("light.background"),
        readableContrast: 3.1,
        not: [ref("light.chart-1"), ref("light.chart-2"), ref("light.chart-3")],
      }),
    );
    light.set(
      "chart-5",
      leastVivid(ref("chartsLight"), {
        readableOn: ref("light.background"),
        readableContrast: 3.1,
        not: [ref("light.chart-1"), ref("light.chart-2"), ref("light.chart-3"), ref("light.chart-4")],
      }),
    );

    // Dark shadcn rules (extends light)
    dark.set("background", nth(ref("neutrals"), -2));
    dark.set(
      "foreground",
      minContrastWith(ref("dark.background"), ref("neutrals"), {
        minContrast: profile.minTextContrast,
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
        : mostVivid(ref("brand"), {
            readableOn: ref("dark.background"),
            readableContrast: 4.5,
          }),
    );
    dark.set("primary-foreground", bestContrastWith(ref("dark.primary"), ref("inks")));
    dark.set("secondary", colorMix(ref("dark.background"), ref("dark.primary"), { ratio: 0.14, colorSpace: "oklch" }));
    dark.set("secondary-foreground", bestContrastWith(ref("dark.secondary"), ref("inks")));
    dark.set("muted", nth(ref("neutrals"), -4));
    dark.set(
      "muted-foreground",
      minContrastWith(ref("dark.muted"), ref("neutrals"), {
        minContrast: profile.minMutedContrast,
        direction: "lighter",
      }),
    );
    dark.set("accent", colorMix(ref("dark.background"), ref("dark.primary"), { ratio: 0.2, colorSpace: "oklch" }));
    dark.set("accent-foreground", bestContrastWith(ref("dark.accent"), ref("inks")));
    dark.set("destructive", ref("status.danger-dark"));
    dark.set("destructive-foreground", bestContrastWith(ref("dark.destructive"), ref("inks")));
    dark.set("border", shade(ref("dark.background"), { amount: 0.14 }));
    dark.set("input", shade(ref("dark.background"), { amount: 0.18 }));
    dark.set("ring", ref("dark.primary"));

    dark.set(
      "chart-1",
      mostVivid(ref("chartsDark"), {
        readableOn: ref("dark.background"),
        readableContrast: 3.5,
      }),
    );
    dark.set(
      "chart-2",
      furthestFrom(ref("dark.chart-1"), ref("chartsDark"), {
        readableOn: ref("dark.background"),
        readableContrast: 3.5,
        not: [ref("dark.chart-1")],
      }),
    );
    dark.set(
      "chart-3",
      furthestFrom(ref("dark.chart-2"), ref("chartsDark"), {
        readableOn: ref("dark.background"),
        readableContrast: 3.5,
        not: [ref("dark.chart-1"), ref("dark.chart-2")],
      }),
    );
    dark.set(
      "chart-4",
      furthestFrom(ref("dark.chart-3"), ref("chartsDark"), {
        readableOn: ref("dark.background"),
        readableContrast: 3.5,
        not: [ref("dark.chart-1"), ref("dark.chart-2"), ref("dark.chart-3")],
      }),
    );
    dark.set(
      "chart-5",
      leastVivid(ref("chartsDark"), {
        readableOn: ref("dark.background"),
        readableContrast: 3.5,
        not: [ref("dark.chart-1"), ref("dark.chart-2"), ref("dark.chart-3"), ref("dark.chart-4")],
      }),
    );

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
  const lightOklchMap: Record<string, string> = {};
  const darkOklchMap: Record<string, string> = {};

  for (const k of keys) {
    lightResolved[k] = describeInspection(book, `light.${k}`);
    darkResolved[k] = describeInspection(book, `dark.${k}`);
    lightOklchMap[k] = lightResolved[k]!.oklch;
    darkOklchMap[k] = darkResolved[k]!.oklch;
  }

  const audit = evaluateAudit(
    { light: lightOklchMap, dark: darkOklchMap, skippedTokens: [], assumptions: [] },
    { standard: "wcag-aa", withFixes: false },
  );

  return {
    preset: opts.preset,
    mood: opts.mood,
    generator: opts.generator,
    seeds: pools.seedHexes,
    book,
    lightKeys: keys,
    darkKeys: keys,
    light: lightResolved,
    dark: darkResolved,
    audit,
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
  suggestions: ColorSuggestion[];
}

export function suggestCompanionColors(opts: {
  seeds: string[];
  surface?: string;
  polarity?: "light" | "dark";
  mood: Mood;
  generator: GeneratorKind;
  count: number;
}): SuggestResult {
  const pools = generatePools(opts.seeds, opts.mood, opts.generator);
  const defaultSurfaceHex =
    opts.polarity === "dark" ? pools.neutrals.n950! : pools.neutrals.n000!;
  const surfaceHex = opts.surface ? toSafeHex(opts.surface) : defaultSurfaceHex;
  const surfaceOklch = parseToOklch(surfaceHex);
  const polarity: "light" | "dark" = surfaceOklch.l > 0.5 ? "light" : "dark";

  const book = new DesignBook("theme-book-suggest");
  populateScope(book, "pool", {
    ...pools.candidates,
    ...pools.brand,
  });
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

  const suggestions: ColorSuggestion[] = [];
  for (const r of roles.slice(0, Math.max(1, opts.count))) {
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

  return {
    seeds: pools.seedHexes,
    surface: { hex: surfaceHex, oklch: formatOklchCss(surfaceHex), polarity },
    mood: opts.mood,
    generator: opts.generator,
    suggestions,
  };
}
