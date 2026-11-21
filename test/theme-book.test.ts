import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { buildThemeBook, suggestCompanionColors, type ThemePreset } from "../src/books";
import { evaluatePairs, inferAuditPairs, parseTokensFromText } from "../src/audit";
import { renderThemeOutput } from "../src/render";
import type { GeneratorKind, Mood } from "../src/palette";

const REPO_ROOT = resolve(import.meta.dir, "..");
const CLI_BIN = join(REPO_ROOT, "bin", "theme-book");
const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop()!, { recursive: true, force: true });
  }
});

describe("theme-book engine", () => {
  const seeds = ["#000000", "#2563eb", "#facc15", "#c2410c", "#06b6d4", "#0f766e"];
  const presets: ThemePreset[] = ["shadcn", "semantic", "slide-deck"];

  test("all presets pass WCAG AA on every foreground/background pair across diverse seeds", () => {
    for (const preset of presets) {
      for (const seed of seeds) {
        const built = buildThemeBook({
          seeds: [seed],
          preset,
          mood: "editorial",
          generator: "oklch",
        });
        expect(built.audit.pairs.length).toBeGreaterThanOrEqual(8);
        if (built.audit.failed > 0) {
          const failures = built.audit.pairs.filter((p) => !p.pass);
          throw new Error(
            `Preset=${preset} seed=${seed} had ${built.audit.failed} failures: ${JSON.stringify(failures)}`,
          );
        }
        expect(built.audit.failed).toBe(0);
        if (preset === "semantic") {
          expect(built.light.ink!.hex).not.toBe(built.light["ink-muted"]!.hex);
          expect(built.dark.ink!.hex).not.toBe(built.dark["ink-muted"]!.hex);
        } else {
          expect(built.light.foreground!.hex).not.toBe(built.light["muted-foreground"]!.hex);
          expect(built.dark.foreground!.hex).not.toBe(built.dark["muted-foreground"]!.hex);
        }
      }
    }
  });

  test("suggest works with oklch, poline, and rampensau generators", () => {
    const generators: GeneratorKind[] = ["oklch", "poline", "rampensau"];
    const moods: Mood[] = ["neutral", "muted", "vivid", "editorial", "high-contrast"];

    for (const generator of generators) {
      for (const mood of moods) {
        const res = suggestCompanionColors({
          seeds: ["#2563eb"],
          polarity: "dark",
          mood,
          generator,
          count: 6,
        });
        expect(res.suggestions.length).toBe(6);
        // Primary ink & primary accent must meet >= 4.5:1 on surface
        const ink = res.suggestions.find((s) => s.role === "readable-ink");
        expect(ink).toBeDefined();
        expect(ink!.wcagOnSurface).toBeGreaterThanOrEqual(7.0);
        const accent = res.suggestions.find((s) => s.role === "primary-accent");
        expect(accent).toBeDefined();
        expect(accent!.wcagOnSurface).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  test("renders css, json, w3-tokens, and svg cleanly", () => {
    const built = buildThemeBook({
      seeds: ["#0f766e"],
      preset: "slide-deck",
      mood: "neutral",
      generator: "poline",
    });

    const css = renderThemeOutput(built, "css");
    expect(css).toContain(":root {");
    expect(css).toContain(".dark {");
    expect(css).toContain("--background: oklch(");
    expect(css).toContain("--font-sans:");
    expect(css).toContain("--chart-1:");

    const w3 = JSON.parse(renderThemeOutput(built, "w3-tokens"));
    expect(w3.light).toBeDefined();
    expect(w3.dark).toBeDefined();

    const svg = renderThemeOutput(built, "svg");
    expect(svg).toContain("<svg");
  });

  test("audit detects failing low-contrast CSS and --fix suggests passing replacements", () => {
    const brokenCss = `
      :root {
        --background: #ffffff;
        --foreground: #cccccc;
        --primary: #facc15;
        --primary-foreground: #fef9c3;
      }
      .dark {
        --background: #0a0a0a;
        --foreground: #262626;
      }
    `;
    const modes = parseTokensFromText(brokenCss, "broken.css");
    const pairs = inferAuditPairs(modes);
    const report = evaluatePairs(pairs, "wcag-aa", true);
    // 2 pairs in :root + 2 pairs in .dark (inherits --primary/--primary-foreground from :root)
    expect(report.failed).toBe(4);

    for (const p of report.pairs) {
      expect(p.pass).toBe(false);
      expect(p.suggestedFix).toBeDefined();
      expect(p.suggestedFix!.wcag).toBeGreaterThanOrEqual(4.5);
    }
  });

  test("CLI eval runs a Design Book + Poline script from /tmp with zero local node_modules", () => {
    const script = `
      import { DesignBook, color, ref, bestContrastWith } from "design-book";
      import { Poline } from "poline";
      const pol = new Poline({ anchorColors: [[210, 0.7, 0.3], [35, 0.8, 0.7]], numPoints: 3 });
      const book = new DesignBook("eval-smoke");
      const p = book.addScope("p");
      p.set("bg", color("#ffffff"));
      p.set("ink", color("#111111"));
      const ui = book.addScope("ui");
      ui.set("fg", bestContrastWith(ref("p.bg"), ref("p")));
      console.log(JSON.stringify({ fg: book.resolve("ui.fg"), polCount: pol.colorsCSS.length }));
    `;
    const dir = mkdtempSync(join(tmpdir(), "theme-book-eval-cwd-"));
    tempDirs.push(dir);
    const scriptFile = join(dir, "smoke.ts");
    writeFileSync(scriptFile, script, "utf8");

    const proc = Bun.spawnSync([CLI_BIN, "eval", scriptFile], {
      cwd: dir,
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(proc.exitCode).toBe(0);
    const out = JSON.parse(proc.stdout.toString().trim());
    expect(out.fg).toBe("#111111");
    expect(out.polCount).toBeGreaterThanOrEqual(3);
  });
});
