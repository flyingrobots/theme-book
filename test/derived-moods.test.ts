import { describe, expect, test } from "bun:test";
import { SPECIMEN_THEMES } from "../scripts/specimen";
import { METHODS, meanDistance } from "../scripts/benchmark/score";
import { fitTheme } from "../scripts/benchmark/fit";
import { FAMOUS_THEMES } from "../scripts/benchmark/famous-themes";
import { buildThemeBook, type BuiltTheme } from "../src/books";
import { evaluateAudit, parseCssColorExact, wcagRatioExact } from "../src/audit";
import { readPalette, statusHue } from "../src/derived";
import { oklabDistance, parseToOklch } from "../src/palette";

// The derived moods (corporate, freak): a light and a dark theme that read as one, from a palette.
// The rules are fitted to famous light/dark pairs; see docs/topics/derived-moods.

const ok = (hex: string) => {
  const c = parseToOklch(hex);
  return { l: c.l, c: c.c, h: c.h ?? 0 };
};
const hueGap = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);
/** WCAG ratio at full precision, as the audit measures it (the display-rounded one hides 2.996 < 3). */
const exact = (a: string, b: string) => {
  const x = parseCssColorExact(a), y = parseCssColorExact(b);
  if (!x.ok || !y.ok) throw new Error(`not a color: ${a} ${b}`);
  return wcagRatioExact(x.rgb, y.rgb);
};

const CASES = [
  ...SPECIMEN_THEMES.map(({ name, seeds, mood }) => ({ name, seeds, mood })),
  { name: "one seed", seeds: ["#2563eb"], mood: "corporate" as const },
  { name: "two seeds", seeds: ["#0f766e", "#c2410c"], mood: "freak" as const },
  // Palettes whose floors land within rounding of 3:1 or 4.5:1 (found by a random sweep).
  { name: "rounding edge, one seed", seeds: ["#29da7e"], mood: "corporate" as const },
  { name: "rounding edge, freak", seeds: ["#be66e5"], mood: "freak" as const },
  { name: "rounding edge, six seeds", seeds: ["#041edd", "#a8caf8", "#27f51b", "#8de542", "#33822b", "#32fdd9"], mood: "corporate" as const },
  // A floor met on hex, lost when the default output rounds OKLCH to 4 decimals (sidebar-ring at 2.9996).
  { name: "rounding edge, OKLCH output", seeds: ["#d967a8"], mood: "corporate" as const },
  // Palettes whose charts fell below 3:1 (stress set).
  { name: "Solarized, freak", seeds: ["#268bd2", "#2aa198", "#d33682", "#6c71c4", "#b58900", "#cb4b16", "#fdf6e3", "#657b83"], mood: "freak" as const },
  { name: "violet, pink, cyan, freak", seeds: ["#7c3aed", "#db2777", "#0891b2"], mood: "freak" as const },
  // A later color three times, in two spellings (the unit test below asserts the count; this case runs the full suite on it).
  { name: "duplicate seeds", seeds: ["#0f766e", "#2563eb", "#2563EB", "#2563eb"], mood: "corporate" as const },
  // A near-black colored seed: its dark version must be lifted all the way to the floor (CodeRabbit, round 7).
  { name: "near-black seed", seeds: ["#000009"], mood: "freak" as const },
  { name: "near-black seed", seeds: ["#000009"], mood: "corporate" as const },
  // Five steps of one slate: lifted dark bars must not bunch.
  { name: "five steps of one slate", seeds: ["#788aa8", "#697b98", "#5b6d89", "#4d5e7a", "#40506c"], mood: "corporate" as const },
  // A stress set of edge palettes, in both moods.
  ...(["corporate", "freak"] as const).map((mood) => ({ name: "stress: single teal", seeds: ["#0f766e"], mood })),
  ...(["corporate", "freak"] as const).map((mood) => ({ name: "stress: single red", seeds: ["#d32f2f"], mood })),
  ...(["corporate", "freak"] as const).map((mood) => ({ name: "stress: grey", seeds: ["#777777"], mood })),
  ...(["corporate", "freak"] as const).map((mood) => ({ name: "stress: teal and amber", seeds: ["#0f766e", "#f59e0b"], mood })),
  ...(["corporate", "freak"] as const).map((mood) => ({ name: "stress: yellow only", seeds: ["#facc15"], mood })),
  ...(["corporate", "freak"] as const).map((mood) => ({ name: "stress: pale first", seeds: ["#f5f0e6", "#2563eb", "#9333ea"], mood })),
  ...(["corporate", "freak"] as const).map((mood) => ({ name: "stress: grey first", seeds: ["#6b7280", "#2563eb"], mood })),
  ...(["corporate", "freak"] as const).map((mood) => ({ name: "stress: deep navy brand", seeds: ["#0b1f4d", "#f97316"], mood })),
  ...(["corporate", "freak"] as const).map((mood) => ({ name: "stress: neon lime", seeds: ["#ccff00", "#ff00ff", "#00ffff"], mood })),
  ...(["corporate", "freak"] as const).map((mood) => ({ name: "stress: dark only", seeds: ["#111111", "#1a1a2e"], mood })),
  ...(["corporate", "freak"] as const).map((mood) => ({ name: "stress: low-chroma red", seeds: ["#2563eb", "#b07a78"], mood })),
  ...(["corporate", "freak"] as const).map((mood) => ({ name: "stress: black and white", seeds: ["#000000", "#ffffff"], mood })),
  ...(["corporate", "freak"] as const).map((mood) => ({ name: "stress: cream and ink", seeds: ["#fdf6e3", "#002b36", "#268bd2", "#d33682", "#859900"], mood })),
  ...(["corporate", "freak"] as const).map((mood) => ({ name: "stress: vivid, status-heavy", seeds: ["#7c3aed", "#eab308", "#ef4444", "#22c55e"], mood })),
];
const build = (seeds: string[], mood: "corporate" | "freak"): BuiltTheme =>
  buildThemeBook({ seeds, preset: "shadcn", mood, generator: "oklch" });

describe("derived moods", () => {
  for (const { name, seeds, mood } of CASES) {
    describe(`${name} (${mood})`, () => {
      const t = build(seeds, mood);
      const l = (k: string) => t.light[k]!.hex;
      const d = (k: string) => t.dark[k]!.hex;
      const hueless = seeds.every((s) => ok(s).c < 0.005);

      test("conforms to WCAG AA in both modes (chart bars are advisory, as in stock shadcn)", () => {
        expect(t.standard).toBe("wcag-aa");
        expect(t.audit.status).toBe("pass"); // an incomplete audit drops unverified pairs from the list below
        expect(t.audit.pairs.filter((p) => p.required && !p.pass).map((p) => `${p.mode} ${p.fgToken}/${p.bgToken}`)).toEqual([]);
      });

      test("the base is one ramp: a pale light page, a deep dark page that is not black, a lighter dark card", () => {
        expect(ok(l("background")).l).toBeGreaterThanOrEqual(0.85);
        expect(ok(d("background")).l).toBeGreaterThanOrEqual(hueless ? 0.14 : 0.16);
        expect(ok(d("background")).l).toBeLessThanOrEqual(0.32);
        expect(ok(d("card")).l).toBeGreaterThan(ok(d("background")).l);
      });

      test("the dark page takes the light ink's hue", () => {
        if (ok(l("foreground")).c < 0.01 || ok(d("background")).c < 0.01) return;
        expect(hueGap(ok(d("background")).h, ok(l("foreground")).h)).toBeLessThanOrEqual(20);
      });

      test("accents keep their hue and only ever lift into dark", () => {
        const keys = hueless ? [] : ["primary", "chart-1", "chart-2", "chart-3", "chart-4", "chart-5"];
        for (const k of keys) {
          expect([k, ok(d(k)).l >= ok(l(k)).l - 0.005]).toEqual([k, true]);
          if (ok(l(k)).c >= 0.04 && ok(d(k)).c >= 0.04) expect([k, hueGap(ok(l(k)).h, ok(d(k)).h) <= 8]).toEqual([k, true]);
        }
      });

      test("each dark accent is a rule on its light version", () => {
        if (hueless) return;
        // A palette with no colored seed takes its ink as primary, so primary has no palette entry.
        const colored = seeds.some((s) => ok(s).c >= 0.04);
        for (const k of [...(colored ? ["primary"] : []), "chart-1", "destructive"]) {
          expect(t.book.inspect(`palette.${k}-dark`)?.dependencies).toContain(`palette.${k}-light`);
        }
      });

      test("destructive is the fixed red, holds white text, and stands apart from primary", () => {
        expect(statusHue(l("destructive"))).toBe("red");
        expect(exact("#ffffff", l("destructive"))).toBeGreaterThanOrEqual(4.5);
        if (!hueless) expect(oklabDistance(l("destructive"), l("primary"))).toBeGreaterThanOrEqual(0.1);
      });

      test("chart bars clear 3:1 on every page in both modes, unless the palette has no hue", () => {
        if (hueless) return;
        for (const [m, mode] of [["light", t.light], ["dark", t.dark]] as const) {
          for (let i = 1; i <= 5; i++) {
            for (const bg of ["background", "card", "sidebar"]) {
              const r = exact(mode[`chart-${i}`]!.hex, mode[bg]!.hex);
              expect([m, `chart-${i}`, bg, r >= 3]).toEqual([m, `chart-${i}`, bg, true]);
            }
          }
          const bars = [1, 2, 3, 4, 5].map((i) => mode[`chart-${i}`]!.hex);
          for (let i = 0; i < bars.length; i++)
            for (let j = i + 1; j < bars.length; j++) expect(oklabDistance(bars[i]!, bars[j]!)).toBeGreaterThanOrEqual(0.03);
        }
      });

      test("secondary and accent never take a status hue (red, yellow, green) from the palette", () => {
        for (const k of ["secondary", "accent"]) {
          const hue = statusHue(l(k));
          if (hue) expect([k, hueGap(ok(l(k)).h, ok(seeds.find((s) => ok(s).c >= 0.04) ?? "#000").h) <= 10]).toEqual([k, true]);
        }
      });

      test("charts run light to dark, from the palette's own colors", () => {
        const bars = [1, 2, 3, 4, 5].map((i) => ok(l(`chart-${i}`)).l);
        for (let i = 1; i < bars.length; i++) expect(bars[i]!).toBeLessThanOrEqual(bars[i - 1]! + 0.001);
        const accents = seeds.filter((s) => ok(s).c >= 0.04 && ok(s).l > 0.25 && ok(s).l < 0.93);
        if (accents.length >= 3) {
          for (let i = 1; i <= 5; i++) {
            const bar = ok(l(`chart-${i}`));
            if (bar.c < 0.04) continue;
            expect(Math.min(...accents.map((a) => hueGap(bar.h, ok(a).h)))).toBeLessThanOrEqual(10);
          }
        }
      });

      test("the book holds only the derived scopes, none of the other moods' pools", () => {
        for (const legacy of ["neutrals", "brand", "candidates", "accentSeeds", "inks"]) expect(t.book.getScope(legacy)).toBeUndefined();
      });
    });
  }

  test("the first colored seed is primary, whatever its lightness; a grey first seed is base material", () => {
    const primarySource = (t: BuiltTheme) => t.book.inspect("palette.primary-light")?.dependencies ?? [];
    // Independent of the recorded origin: the light primary keeps the brand seed's hue.
    const keepsHue = (t: BuiltTheme, seed: string) => hueGap(ok(t.light.primary!.hex).h, ok(seed).h) <= 8;
    expect(keepsHue(build(["#0b1f3a", "#f59e0b"], "corporate"), "#0b1f3a")).toBe(true);
    expect(keepsHue(build(["#ffff00", "#2563eb"], "corporate"), "#ffff00")).toBe(true);
    expect(keepsHue(build(["#8a8f98", "#2563eb"], "corporate"), "#2563eb")).toBe(true);
    for (const mood of ["corporate", "freak"] as const) {
      expect(primarySource(build(["#0b1f3a", "#f59e0b"], mood))).toContain("seeds.seed-0");
    }
    const yellow = build(["#ffff00", "#2563eb"], "corporate");
    expect(primarySource(yellow)).toContain("seeds.seed-0");
    expect(ok(yellow.light.background!.hex).c).toBeLessThan(0.03);
    expect(primarySource(build(["#8a8f98", "#2563eb"], "corporate"))).toContain("seeds.seed-1");
    expect(primarySource(build(["#292c2f", "#e88e8d"], "corporate"))).toContain("seeds.seed-1");
    expect(primarySource(build(["#dc2626", "#2563eb"], "corporate"))).toContain("seeds.seed-0");
  });

  test("an audit that does not opt into chartsAdvisory still requires chart bars", () => {
    const t = build(["#ffffff", "#000000"], "corporate");
    const report = evaluateAudit({ light: Object.fromEntries(t.lightKeys.map((k) => [k, t.light[k]!.hex])), dark: Object.fromEntries(t.darkKeys.map((k) => [k, t.dark[k]!.hex])), skippedTokens: [], assumptions: [] }, { standard: "wcag-aa" });
    expect(report.pairs.some((p) => /^chart-/.test(p.fgToken) && p.required)).toBe(true);
  });

  test("advisory charts are not counted as border advisories in the audit's coverage", () => {
    const t = build(["#ffffff", "#000000"], "corporate");
    const modes = { light: Object.fromEntries(t.lightKeys.map((k) => [k, t.light[k]!.hex])), dark: Object.fromEntries(t.darkKeys.map((k) => [k, t.dark[k]!.hex])), skippedTokens: [], assumptions: [] };
    const borders = evaluateAudit(modes, { standard: "wcag-aa" }).coverage.assessedPairs.borderAdvisory;
    expect(evaluateAudit(modes, { standard: "wcag-aa", chartsAdvisory: true }).coverage.assessedPairs.borderAdvisory).toBe(borders);
    expect(evaluateAudit(modes, { standard: "wcag-aa", chartsAdvisory: true, strictBorders: true }).coverage.assessedPairs.borderAdvisory).toBe(0);
  });

  test("a palette with no hue keeps none, apart from one red for errors", () => {
    const t = build(["#ffffff", "#000000"], "corporate");
    for (const k of t.lightKeys) {
      if (k === "destructive") continue;
      expect([k, ok(t.light[k]!.hex).c < 0.005 && ok(t.dark[k]!.hex).c < 0.005]).toEqual([k, true]);
    }
    for (let i = 1; i <= 5; i++) expect(t.dark[`chart-${i}`]!.hex).toBe(t.light[`chart-${i}`]!.hex);
  });

  test("freak keeps the palette's own colors as flat fills, the same in both modes", () => {
    const memphis = SPECIMEN_THEMES.find((x) => x.name === "Memphis")!;
    const t = build(memphis.seeds, "freak");
    for (const k of ["primary", "secondary", "accent"]) {
      expect(memphis.seeds).toContain(t.light[k]!.hex);
      expect(t.dark[k]!.hex).toBe(t.light[k]!.hex);
    }
  });

  test("the accent move lands within OKLab 0.085 of seven famous themes, and beats a Material-style tone table", () => {
    const ours = METHODS["theme-book corporate (s 0.12, b 0.6, k 0.85)"]!;
    const material = METHODS["Material-style tones (CIELAB L* 40 / 80, not HCT)"]!;
    expect(meanDistance(ours, true)).toBeLessThanOrEqual(0.085);
    expect(meanDistance(ours, false)).toBeLessThanOrEqual(0.07);
    expect(meanDistance(ours, true)).toBeLessThan(meanDistance(material, true));
    expect(meanDistance(ours, false)).toBeLessThan(meanDistance(material, false));
  });

  test("the sankey draws a light-to-dark flow only where a dark token derives from a light one", () => {
    const out = Bun.spawnSync(["bun", "scripts/benchmark/sankey.ts"], { stdout: "pipe" }).stdout.toString();
    // Dark surfaces come from the seed, as light's do; dark primary derives from light primary.
    expect(out).not.toMatch(/^light surfaces,dark surfaces,/m);
    expect(out).toMatch(/^light primary,dark primary,\d+$/m);
    // A flow is labelled by the light role it reaches: dark rings follow the primary, not light lines.
    expect(out).toMatch(/^light primary,dark lines,2$/m);
    expect(out).not.toMatch(/^light lines,dark lines,/m);
  }, 30_000);

  test("a palette counts each distinct color once", () => {
    expect(readPalette(["#0f766e", "#2563eb", "#2563EB", "#2563eb"]).accents).toEqual(["#0f766e", "#2563eb"]);
  });

  test("suggest refuses the derived moods, which only theme builds", () => {
    for (const mood of ["corporate", "freak"]) {
      const r = Bun.spawnSync(["./bin/theme-book", "suggest", "--seed", "#2563eb", "--mood", mood], { stdout: "pipe", stderr: "pipe" });
      expect([mood, r.exitCode]).toEqual([mood, 2]);
    }
  }, 30_000);

  test("the fit reports no page-hue gap when the dark page or the light ink has no hue", () => {
    const gruvbox = FAMOUS_THEMES.find((t) => t.name === "Gruvbox")!;
    expect(fitTheme(gruvbox).pageHueGap).toBeNull(); // #282828 is achromatic
    expect(fitTheme(FAMOUS_THEMES.find((t) => t.name === "Solarized")!).pageHueGap).toBeCloseTo(2.1, 1);
  });

  test("is refused for a preset it has no rules for", () => {
    expect(() => buildThemeBook({ seeds: ["#2563eb"], preset: "semantic", mood: "freak", generator: "oklch" })).toThrow(/freak/);
    expect(() => buildThemeBook({ seeds: ["#2563eb"], preset: "slide-deck", mood: "corporate", generator: "oklch" })).toThrow(/corporate/);
  });
});
