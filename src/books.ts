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

import { existsSync, readFileSync } from "node:fs";
import { ExtensionError, RULES, type BookExtension } from "./extension";
import { resolve } from "node:path";
import pkgJson from "../package.json";

function readDesignBookVersion(): string {
  const pkgPath = resolve(import.meta.dir, "..", "node_modules", "design-book", "package.json");
  if (existsSync(pkgPath)) {
    try {
      const parsed = JSON.parse(readFileSync(pkgPath, "utf8")) as { version?: string };
      if (parsed.version) return parsed.version;
    } catch {
      // fall through
    }
  }
  return pkgJson.dependencies["design-book"];
}

const DESIGN_BOOK_VERSION = readDesignBookVersion();

export type ThemePreset = "shadcn" | "semantic" | "slide-deck";

/**
 * Each preset's rules version, independent of the tool's version. An extension names the version
 * it was written against and is refused by any other. Bump it whenever a rule changes; the
 * fingerprint test in test/book-extension.test.ts fails until you do.
 */
export const PRESET_RULES_VERSION: Record<ThemePreset, string> = {
  shadcn: "1.0.0",
  semantic: "1.0.0",
  "slide-deck": "1.0.0",
};

export interface ThemeBuildOptions {
  seeds: string[];
  preset: ThemePreset;
  mood: Mood;
  generator: GeneratorKind;
  standard?: AuditStandard;
  hexOutput?: boolean;
  nativeOutput?: boolean;
  extension?: BookExtension;
}

export interface ThemeRecipe {
  version: 1;
  toolVersion: string;
  designBookVersion: string;
  rawSeeds: string[];
  preset: ThemePreset;
  mood: Mood;
  generator: GeneratorKind;
  standard: AuditStandard;
  formatOptions: {
    hex: boolean;
    native: boolean;
  };
  command: string;
  book: {
    preset: ThemePreset;
    rulesVersion: string;
    extension?: { name: string; version: string; sha256: string };
  };
}

export interface TokenProvenance {
  hex: string;
  oklch: string;
  rule: string;
  picked?: string;
  dependencies: string[];
}

export interface BuiltTheme {
  recipe: ThemeRecipe;
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

function formatAstArg(arg: unknown): string {
  if (arg === null || arg === undefined) return String(arg);
  if (typeof arg === "string") return JSON.stringify(arg);
  if (typeof arg === "number" || typeof arg === "boolean") return String(arg);
  if (Array.isArray(arg)) return `[${arg.map(formatAstArg).join(", ")}]`;
  if (typeof arg === "object") {
    const o = arg as Record<string, unknown>;
    if (o.type === "reference" && typeof o.key === "string") return `ref(${o.key})`;
    if (o.type === "pool" && typeof o.key === "string") return `pool(${o.key})`;
    if (o.type === "member" && typeof o.key === "string") return `member(${o.key})`;
    if (o.type === "function" && typeof o.name === "string") {
      const fnArgs = Array.isArray(o.args) ? o.args.map(formatAstArg) : [];
      if (o.options && typeof o.options === "object") {
        const optEntries = Object.entries(o.options as Record<string, unknown>)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => `${k}: ${formatAstArg(v)}`);
        if (optEntries.length > 0) fnArgs.push(`{ ${optEntries.join(", ")} }`);
      }
      return `${o.name}(${fnArgs.join(", ")})`;
    }
    if ("rawValue" in o && typeof o.type === "string") {
      return `${o.type}(${JSON.stringify(o.rawValue)})`;
    }
    const entries = Object.entries(o)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}: ${formatAstArg(v)}`);
    return `{ ${entries.join(", ")} }`;
  }
  return String(arg);
}

function describeInspection(book: DesignBook, key: string): TokenProvenance {
  const resolved = book.resolve(key);
  const info = book.inspect(key);
  const raw = book.getTokenByKey(key);
  let rule = info?.tokenType ?? "literal";
  if (raw && typeof raw === "object" && "type" in raw) {
    rule = formatAstArg(raw);
    if (info?.picked) {
      rule = `${rule} -> ${info.picked}`;
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

function buildRecipeCommand(opts: {
  rawSeeds: string[];
  preset: ThemePreset;
  mood: Mood;
  generator: GeneratorKind;
  standard: AuditStandard;
  hex: boolean;
  native: boolean;
  book?: { path: string; sha256: string };
}): string {
  const parts = ["theme-book theme"];
  for (const s of opts.rawSeeds) {
    parts.push(`--seed ${JSON.stringify(s)}`);
  }
  parts.push(`--preset ${opts.preset}`);
  parts.push(`--mood ${opts.mood}`);
  parts.push(`--generator ${opts.generator}`);
  parts.push(`--standard ${opts.standard}`);
  if (opts.hex) parts.push("--hex");
  if (opts.native) parts.push("--native");
  // The hash first, so a replay refuses a rewritten extension before running any of it.
  if (opts.book) parts.push(`--book-sha256 ${opts.book.sha256} --book ${shellWord(opts.book.path)}`);
  return parts.join(" ");
}

export function resolveEffectiveStandard(mood: Mood, explicit?: AuditStandard): AuditStandard {
  if (explicit) return explicit;
  return mood === "high-contrast" ? "wcag-aaa" : "wcag-aa";
}

/**
 * Run an extension's rules over the preset's. The parent must be this preset at exactly this
 * rules version, and only tokens the preset emits may be set: an extension adds no tokens.
 */
function applyExtension(
  ext: BookExtension,
  preset: ThemePreset,
  keys: readonly string[],
  light: ReturnType<DesignBook["addScope"]>,
  dark: ReturnType<DesignBook["addScope"]>,
): void {
  const where = extensionWhere(ext);
  if (ext.extends.preset !== preset) {
    throw new ExtensionError(`${where} extends ${ext.extends.preset}, but the theme is being built with --preset ${preset}`);
  }
  const installed = PRESET_RULES_VERSION[preset];
  if (ext.extends.version !== installed) {
    throw new ExtensionError(
      `${where} extends ${preset}@${ext.extends.version}, but this theme-book's ${preset} rules are ${installed}; update the extension to name ${preset}@${installed}`,
    );
  }
  const allowed = new Set(keys);
  let open = true; // the guards close when apply returns, so a rule set later is refused
  const guard = (scope: ReturnType<DesignBook["addScope"]>) => ({
    set(token: string, rule: unknown) {
      if (!open) {
        throw new ExtensionError(`${where}: set() after apply returned; an extension sets every rule inside apply, synchronously`);
      }
      if (!allowed.has(token)) {
        throw new ExtensionError(`${where}: "${token}" is not a ${preset} token; an extension may only override the tokens the preset emits`);
      }
      scope.set(token, rule as Parameters<typeof scope.set>[1]);
    },
  });
  let returned: unknown;
  try {
    returned = ext.apply({ light: guard(light), dark: guard(dark), rules: RULES });
  } catch (err) {
    if (err instanceof ExtensionError) throw err;
    throw new ExtensionError(`${where}: apply threw: ${errorMessage(err)}`);
  } finally {
    open = false;
  }
  // Inspecting the returned value can run the extension's code too (a `then` getter): keep its
  // errors inside the boundary, named like any other error from the extension.
  let thenable: boolean;
  try {
    thenable = isThenable(returned);
  } catch (err) {
    throw new ExtensionError(`${where}: apply returned a value that threw when inspected: ${errorMessage(err)}`);
  }
  if (thenable) {
    // Its later set() calls now throw; keep that rejection from surfacing as an unhandled one.
    try {
      (returned as PromiseLike<unknown>).then(undefined, () => {});
    } catch {
      // a thenable whose then throws: nothing more to silence
    }
    throw new ExtensionError(`${where}: apply must return nothing; it returned a promise, so its rules would land after the theme was built`);
  }
}

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));
const isThenable = (v: unknown): v is PromiseLike<unknown> =>
  (typeof v === "object" || typeof v === "function") && v !== null && typeof (v as { then?: unknown }).then === "function";
/** How an error names the extension it came from: name, version and path. */
const extensionWhere = (ext: BookExtension) => `extension ${ext.name}@${ext.version} (${ext.path})`;

/** Seed sets that drive each kind of rule branch: one chromatic seed, an achromatic seed, two seeds. */
export const FINGERPRINT_SEEDS: Record<"chromatic" | "achromatic" | "two-seed", string[]> = {
  chromatic: ["#0f766e"],
  achromatic: ["#777777"],
  "two-seed": ["#0f766e", "#c2410c"],
};

/**
 * Every rule expression a preset uses, one line per token per configuration: each mood, each
 * standard and each kind of seed set, so conditional branches are covered. A rule is taken
 * without the pool entry it picked, so the lines follow the rules and not the seeds.
 */
export function presetRulesLines(preset: ThemePreset, seedSets: Record<string, string[]> = FINGERPRINT_SEEDS): string[] {
  const rule = (r: string) => r.split(" -> ")[0];
  const lines: string[] = [];
  for (const mood of Object.keys(MOOD_PROFILES) as Mood[]) {
    for (const standard of ["wcag-aa", "wcag-aaa", "apca"] as const) {
      for (const [kind, seeds] of Object.entries(seedSets)) {
        const built = buildThemeBook({ seeds, preset, mood, generator: "oklch", standard });
        for (const k of built.lightKeys) {
          lines.push(`${mood}/${standard}/${kind} ${k}=${rule(built.light[k]!.rule)}|${rule(built.dark[k]!.rule)}`);
        }
      }
    }
  }
  return lines;
}

/**
 * Fixed seeds just either side of the achromatic threshold (chroma 0.015), so moving the threshold
 * in either direction flips a branch the fingerprint sees.
 */
const THRESHOLD_SEEDS: Record<string, string[]> = {
  "just-chromatic": ["oklch(0.6 0.016 200)"],
  "just-achromatic": ["oklch(0.6 0.014 200)"],
};

// The helper lines depend on nothing but the code, and take seconds to compute.
const helperLinesCache = new Map<ThemePreset, string[]>();
/**
 * Numbers rounded to six decimals: the pools hold raw OKLCH floats (the seeds' l, c, h, the primary
 * hue) whose last bits differ between platforms' math libraries, which must not move a fingerprint.
 */
const quantized = (_: string, v: unknown) => (typeof v === "number" && !Number.isInteger(v) ? Number(v.toFixed(6)) : v);
const sha256 = (s: string) => new Bun.CryptoHasher("sha256").update(s).digest("hex");

/**
 * Everything else an extension builds on, sampled at fixed seeds so it follows the code and not
 * the caller's seeds: every helper scope's tokens (the pools, `inks`, `accentSeeds`), the preset's
 * extras, the pools `generatePools` makes with each generator, and the rules at seeds either side
 * of the achromatic threshold.
 */
export function presetHelperLines(preset: ThemePreset): string[] {
  const cached = helperLinesCache.get(preset);
  if (cached) return [...cached];
  const lines: string[] = [];
  for (const mood of Object.keys(MOOD_PROFILES) as Mood[]) {
    for (const standard of ["wcag-aa", "wcag-aaa", "apca"] as const) {
      for (const [kind, seeds] of Object.entries({ ...FINGERPRINT_SEEDS, ...THRESHOLD_SEEDS })) {
        const config = `${mood}/${standard}/${kind}`;
        const built = buildThemeBook({ seeds, preset, mood, generator: "oklch", standard });
        for (const scope of built.book.getAllScopes()) {
          if (scope.name === "light" || scope.name === "dark") continue;
          for (const key of built.book.getAllKeysForScope(scope.name)) {
            lines.push(`${config} ${scope.name}.${key}=${formatAstArg(built.book.getTokenByKey(`${scope.name}.${key}`))}`);
          }
        }
        for (const [k, v] of Object.entries(built.extras ?? {})) lines.push(`${config} extra ${k}=${v}`);
        for (const generator of ["oklch", "poline", "rampensau"] as const) {
          lines.push(`${config} pools/${generator}=${sha256(JSON.stringify(generatePools(seeds, mood, generator, standard), quantized))}`);
        }
        if (kind in THRESHOLD_SEEDS) {
          for (const k of built.lightKeys) lines.push(`${config} ${k}=${built.light[k]!.rule}|${built.dark[k]!.rule}`);
        }
      }
    }
  }
  helperLinesCache.set(preset, lines);
  return [...lines];
}

/**
 * A hash of presetRulesLines and presetHelperLines, recorded per rules version so a change to any
 * rule, helper scope, extra or pool generation forces a version bump.
 */
export function presetRulesFingerprint(preset: ThemePreset, seedSets: Record<string, string[]> = FINGERPRINT_SEEDS): string {
  return sha256([...presetRulesLines(preset, seedSets), ...presetHelperLines(preset)].join("\n"));
}

/** One POSIX shell word that replays as exactly `s`: plain when safe, otherwise single-quoted. */
function shellWord(s: string): string {
  return /^[A-Za-z0-9_./:@%+=,-]+$/.test(s) ? s : `'${s.replace(/'/g, `'\\''`)}'`;
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
    // Stock shadcn's token set (flyingrobots/theme-book#19): current shadcn has no
    // destructive-foreground and has eight sidebar tokens. slide-deck keeps its own set.
    if (opts.preset === "shadcn") {
      keys = keys.filter((k) => k !== "destructive-foreground").concat([
        "sidebar",
        "sidebar-foreground",
        "sidebar-primary",
        "sidebar-primary-foreground",
        "sidebar-accent",
        "sidebar-accent-foreground",
        "sidebar-border",
        "sidebar-ring",
      ]);
    }

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
    if (opts.preset !== "shadcn") {
      light.set("destructive-foreground", bestContrastWith(ref("light.destructive"), ref("inks")));
    }
    light.set("border", shade(ref("light.background"), { amount: 0.09 }));
    light.set("input", shade(ref("light.background"), { amount: 0.07 }));
    light.set("ring", ref("light.primary"));

    // Generator-driven maximin chart series
    light.set("chart-1", ref("chartsLight.c-1"));
    light.set("chart-2", ref("chartsLight.c-2"));
    light.set("chart-3", ref("chartsLight.c-3"));
    light.set("chart-4", ref("chartsLight.c-4"));
    light.set("chart-5", ref("chartsLight.c-5"));

    if (opts.preset === "shadcn") {
      // Sidebar: the page-level rules again, solved against the sidebar's own surface, which sits
      // one neutral step off the background so the two regions read as distinct.
      light.set("sidebar", nth(ref("neutrals"), 1));
      light.set(
        "sidebar-foreground",
        minContrastWith(ref("light.sidebar"), ref("neutrals"), {
          minContrast: effectiveTextContrast,
          direction: "darker",
        }),
      );
      light.set(
        "sidebar-primary",
        isAchromatic
          ? ref("neutrals.n990")
          : closest(ref("brand.seed-0"), ref("brandSolvableLight"), {
              readableOn: ref("light.sidebar"),
              readableContrast: primaryOnBgContrast,
            }),
      );
      light.set("sidebar-primary-foreground", bestContrastWith(ref("light.sidebar-primary"), ref("inks")));
      light.set(
        "sidebar-accent",
        colorMix(
          ref("light.sidebar"),
          hasSecondarySeed ? ref("accentSeeds.seed-1") : ref("light.sidebar-primary"),
          { ratio: 0.11, colorSpace: "oklch" },
        ),
      );
      light.set("sidebar-accent-foreground", bestContrastWith(ref("light.sidebar-accent"), ref("inks")));
      light.set("sidebar-border", shade(ref("light.sidebar"), { amount: 0.09 }));
      light.set("sidebar-ring", ref("light.sidebar-primary"));
    }

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
    if (opts.preset !== "shadcn") {
      dark.set("destructive-foreground", bestContrastWith(ref("dark.destructive"), ref("inks")));
    }
    dark.set("border", shade(ref("dark.background"), { amount: 0.14 }));
    dark.set("input", shade(ref("dark.background"), { amount: 0.18 }));
    dark.set("ring", ref("dark.primary"));

    dark.set("chart-1", ref("chartsDark.c-1"));
    dark.set("chart-2", ref("chartsDark.c-2"));
    dark.set("chart-3", ref("chartsDark.c-3"));
    dark.set("chart-4", ref("chartsDark.c-4"));
    dark.set("chart-5", ref("chartsDark.c-5"));

    if (opts.preset === "shadcn") {
      dark.set("sidebar", nth(ref("neutrals"), -3));
      dark.set(
        "sidebar-foreground",
        minContrastWith(ref("dark.sidebar"), ref("neutrals"), {
          minContrast: effectiveTextContrast,
          direction: "lighter",
        }),
      );
      dark.set(
        "sidebar-primary",
        isAchromatic
          ? ref("neutrals.n000")
          : closest(ref("brand.seed-0"), ref("brandSolvableDark"), {
              readableOn: ref("dark.sidebar"),
              readableContrast: primaryOnBgContrast,
            }),
      );
      dark.set("sidebar-primary-foreground", bestContrastWith(ref("dark.sidebar-primary"), ref("inks")));
      dark.set(
        "sidebar-accent",
        colorMix(
          ref("dark.sidebar"),
          hasSecondarySeed ? ref("accentSeeds.seed-1") : ref("dark.sidebar-primary"),
          { ratio: 0.18, colorSpace: "oklch" },
        ),
      );
      dark.set("sidebar-accent-foreground", bestContrastWith(ref("dark.sidebar-accent"), ref("inks")));
      dark.set("sidebar-border", shade(ref("dark.sidebar"), { amount: 0.14 }));
      dark.set("sidebar-ring", ref("dark.sidebar-primary"));
    }

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

  if (opts.extension) applyExtension(opts.extension, opts.preset, keys, light, dark);

  const lightResolved: Record<string, TokenProvenance> = {};
  const darkResolved: Record<string, TokenProvenance> = {};
  const lightSerialized: Record<string, string> = {};
  const darkSerialized: Record<string, string> = {};

  for (const k of keys) {
    try {
      lightResolved[k] = describeInspection(book, `light.${k}`);
      darkResolved[k] = describeInspection(book, `dark.${k}`);
    } catch (err) {
      // With an extension, a rule that fails to resolve is the extension's: name it, and exit 2.
      if (!opts.extension || err instanceof ExtensionError) throw err;
      throw new ExtensionError(`${extensionWhere(opts.extension)}: its rules failed to resolve: ${errorMessage(err)}`);
    }
    lightSerialized[k] = opts.hexOutput ? lightResolved[k]!.hex : lightResolved[k]!.oklch;
    darkSerialized[k] = opts.hexOutput ? darkResolved[k]!.hex : darkResolved[k]!.oklch;
  }

  const audit = evaluateAudit(
    { light: lightSerialized, dark: darkSerialized, skippedTokens: [], assumptions: [] },
    { standard, withFixes: false },
  );

  const hexFlag = opts.hexOutput ?? false;
  const nativeFlag = opts.nativeOutput ?? false;
  const recipe: ThemeRecipe = {
    version: 1,
    toolVersion: pkgJson.version,
    designBookVersion: DESIGN_BOOK_VERSION,
    rawSeeds: pools.rawSeeds,
    preset: opts.preset,
    mood: opts.mood,
    generator: opts.generator,
    standard,
    formatOptions: {
      hex: hexFlag,
      native: nativeFlag,
    },
    command: buildRecipeCommand({
      rawSeeds: pools.rawSeeds,
      preset: opts.preset,
      mood: opts.mood,
      generator: opts.generator,
      standard,
      hex: hexFlag,
      native: nativeFlag,
      book: opts.extension && { path: opts.extension.path, sha256: opts.extension.sha256 },
    }),
    book: {
      preset: opts.preset,
      rulesVersion: PRESET_RULES_VERSION[opts.preset],
      ...(opts.extension
        ? { extension: { name: opts.extension.name, version: opts.extension.version, sha256: opts.extension.sha256 } }
        : {}),
    },
  };

  return {
    recipe,
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
