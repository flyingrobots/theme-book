import { describe, expect, test } from "bun:test";
import { apcaContrast } from "design-book";
import { converter, differenceEuclidean, parse } from "culori";
import { buildThemeBook, type BuiltTheme } from "../src/books";

// The `freak` mood spends the palette: surfaces tinted with the first seed in both modes,
// secondary, accent and muted from the other seeds, charts made of the seeds themselves, and a
// dark theme derived from the light rules on an APCA book, so each role reads the same in both.

const oklch = converter("oklch");
const deltaE = differenceEuclidean("oklab");
const lc = (fg: string, bg: string) => Math.abs(apcaContrast(fg, bg));
const L = (hex: string) => oklch(parse(hex)!)!.l;
const C = (hex: string) => oklch(parse(hex)!)!.c;
const H = (hex: string) => oklch(parse(hex)!)!.h ?? 0;
const hueGap = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);

// The rampensau fruit punch (tangerine, cherry, hot pink, magenta, grape), hot pink first.
const PUNCH = ["#f61083", "#f99710", "#f81910", "#e911f2", "#6e13ec"];
const SEED_SETS: Record<string, string[]> = {
  punch: PUNCH,
  "one seed": ["#2563eb"],
  "two seeds": ["#0f766e", "#c2410c"],
  "three seeds": ["#16a34a", "#eab308", "#0ea5e9"],
};

const SURFACES = ["background", "card", "popover", "sidebar"];

function build(seeds: string[]): BuiltTheme {
  return buildThemeBook({ seeds, preset: "shadcn", mood: "freak", generator: "rampensau" });
}

describe("freak mood", () => {
  for (const [name, seeds] of Object.entries(SEED_SETS)) {
    describe(name, () => {
      const t = build(seeds);
      const l = (k: string) => t.light[k]!.hex;
      const d = (k: string) => t.dark[k]!.hex;
      const seedHue = H(seeds[0]!);

      test("is measured with APCA and passes its own audit", () => {
        expect(t.standard).toBe("apca");
        expect(t.audit.status).toBe("pass");
      });

      test("tints the background with the first seed in both modes; dark is not black", () => {
        expect(C(l("background"))).toBeGreaterThanOrEqual(0.03);
        expect(hueGap(H(l("background")), seedHue)).toBeLessThanOrEqual(15);
        expect(L(d("background"))).toBeGreaterThanOrEqual(0.14);
        expect(L(d("background"))).toBeLessThanOrEqual(0.2);
        expect(C(d("background"))).toBeGreaterThanOrEqual(0.03);
        expect(hueGap(H(d("background")), seedHue)).toBeLessThanOrEqual(15);
      });

      test("the card is a visible step off the background in both modes", () => {
        expect(deltaE(l("card"), l("background"))).toBeGreaterThanOrEqual(0.02);
        expect(deltaE(d("card"), d("background"))).toBeGreaterThanOrEqual(0.02);
      });

      test("secondary, accent and muted are visible fills, and keep their hue between modes", () => {
        for (const k of ["secondary", "accent", "muted"]) {
          expect(deltaE(l(k), l("background"))).toBeGreaterThanOrEqual(0.04);
          expect(deltaE(d(k), d("background"))).toBeGreaterThanOrEqual(0.04);
          expect(hueGap(H(l(k)), H(d(k)))).toBeLessThanOrEqual(15);
        }
      });

      test("text and the primary fill read the same in both modes (APCA within 5 Lc)", () => {
        for (const k of ["foreground", "muted-foreground", "primary"]) {
          expect(Math.abs(lc(l(k), l("background")) - lc(d(k), d("background")))).toBeLessThanOrEqual(5);
        }
      });

      test("the primary fill stands off the background at Lc 60 or more in both modes", () => {
        expect(lc(l("primary"), l("background"))).toBeGreaterThanOrEqual(60);
        expect(lc(d("primary"), d("background"))).toBeGreaterThanOrEqual(60);
      });

      test("the charts are made of the seeds: every seed appears, and no bar strays from the seeds' hues when there are five", () => {
        for (const mode of [t.light, t.dark]) {
          const bars = [1, 2, 3, 4, 5].map((i) => mode[`chart-${i}`]!.hex);
          for (const s of seeds.slice(0, 5)) {
            expect(Math.min(...bars.map((b) => hueGap(H(b), H(s))))).toBeLessThanOrEqual(15);
          }
          if (seeds.length >= 5) {
            for (const b of bars) expect(Math.min(...seeds.map((s) => hueGap(H(b), H(s))))).toBeLessThanOrEqual(15);
          }
        }
      });

      test("every chart bar is distinct and stands off the background at Lc 45 or more", () => {
        for (const [mode, bg] of [[t.light, l("background")], [t.dark, d("background")]] as const) {
          const bars = [1, 2, 3, 4, 5].map((i) => mode[`chart-${i}`]!.hex);
          for (const b of bars) expect(lc(b, bg)).toBeGreaterThanOrEqual(45);
          for (let i = 0; i < bars.length; i++)
            for (let j = i + 1; j < bars.length; j++) expect(deltaE(bars[i]!, bars[j]!)).toBeGreaterThanOrEqual(0.08);
        }
      });

      test("dark is derived from the light rules: only the surfaces are its own", () => {
        for (const k of t.lightKeys) {
          if (SURFACES.includes(k)) continue;
          expect(t.dark[k]!.rule).toBe(t.light[k]!.rule);
        }
      });
    });
  }

  test("is refused for a preset it has no rules for", () => {
    expect(() => buildThemeBook({ seeds: PUNCH, preset: "semantic", mood: "freak", generator: "oklch" })).toThrow(/freak/);
  });
});
