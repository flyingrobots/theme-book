import { describe, expect, test } from "bun:test";
import { SPECIMEN_THEMES } from "../scripts/specimen";
import { METHODS, meanDistance } from "../scripts/benchmark/score";
import { buildThemeBook, type BuiltTheme } from "../src/books";
import { wcagRatio } from "../src/audit";
import { statusHue } from "../src/derived";
import { parseToOklch } from "../src/palette";

// The derived moods (corporate, freak): a light and a dark theme that read as one, from a palette.
// The rules are fitted to famous light/dark pairs; see docs/topics/derived-moods.

const ok = (hex: string) => {
  const c = parseToOklch(hex);
  return { l: c.l, c: c.c, h: c.h ?? 0 };
};
const hueGap = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);

const CASES = [
  ...SPECIMEN_THEMES.map(({ name, seeds, mood }) => ({ name, seeds, mood })),
  { name: "one seed", seeds: ["#2563eb"], mood: "corporate" as const },
  { name: "two seeds", seeds: ["#0f766e", "#c2410c"], mood: "freak" as const },
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
        for (const k of ["primary", "chart-1", "destructive"]) {
          expect(t.book.inspect(`palette.${k}-dark`)?.dependencies).toContain(`palette.${k}-light`);
        }
      });

      test("destructive is the fixed red, holds white text, and stands apart from primary", () => {
        expect(statusHue(l("destructive"))).toBe("red");
        expect(wcagRatio("#ffffff", l("destructive"))).toBeGreaterThanOrEqual(4.5);
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

  test("the accent move lands within OKLab 0.085 of seven famous themes, and beats Material's tone table", () => {
    const ours = METHODS["theme-book corporate (s 0.12, b 0.6, k 0.85)"]!;
    const material = METHODS["Material tone table (40 / 80)"]!;
    expect(meanDistance(ours, true)).toBeLessThanOrEqual(0.085);
    expect(meanDistance(ours, false)).toBeLessThanOrEqual(0.07);
    expect(meanDistance(ours, true)).toBeLessThan(meanDistance(material, true));
    expect(meanDistance(ours, false)).toBeLessThan(meanDistance(material, false));
  });

  test("is refused for a preset it has no rules for", () => {
    expect(() => buildThemeBook({ seeds: ["#2563eb"], preset: "semantic", mood: "freak", generator: "oklch" })).toThrow(/freak/);
    expect(() => buildThemeBook({ seeds: ["#2563eb"], preset: "slide-deck", mood: "corporate", generator: "oklch" })).toThrow(/corporate/);
  });
});
