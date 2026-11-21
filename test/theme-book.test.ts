import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { buildThemeBook, suggestCompanionColors, type ThemePreset } from "../src/books";
import { evaluateAudit, parseTokensFromText } from "../src/audit";
import { formatOklchCss, toSafeHex } from "../src/palette";
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

describe("theme-book Commit 1: audit integrity, precision, alpha, parser & CLI", () => {
  test("formatOklchCss stays strictly inside sRGB gamut and preserves exact 8-bit hex on re-parse", () => {
    const exactHexes = ["#2563eb", "#d97706", "#0f766e", "#ff0000", "#00ff00", "#0000ff", "#647a86"];
    for (const hex of exactHexes) {
      const ok = formatOklchCss(hex);
      expect(toSafeHex(ok)).toBe(hex);
    }
  });

  test("precision: #647a86 on #ffffff (4.49686...) fails WCAG AA without rounding up", () => {
    const css = `:root { --background: #ffffff; --foreground: #647a86; }`;
    const report = evaluateAudit(parseTokensFromText(css, "test.css"), { standard: "wcag-aa" });
    expect(report.status).toBe("fail");
    expect(report.exitCode).toBe(1);
    expect(report.pairs[0]!.wcagExact).toBeLessThan(4.5);
    expect(report.pairs[0]!.pass).toBe(false);
  });

  test("precision: fractional rgb(118.49 ...) on rgb(254.6 ...) fails WCAG AA without pre-measurement hex quantization", () => {
    const css = `:root { --background: rgb(254.6 254.6 254.6); --foreground: rgb(118.49 118.49 118.49); }`;
    const report = evaluateAudit(parseTokensFromText(css, "test.css"), { standard: "wcag-aa" });
    expect(report.status).toBe("fail");
    expect(report.exitCode).toBe(1);
    expect(report.pairs[0]!.wcagExact).toBeLessThan(4.5);
    expect(report.pairs[0]!.wcagExact).toBeGreaterThan(4.49);
    expect(report.pairs[0]!.pass).toBe(false);
  });

  test("alpha: rgba(0, 0, 0, 0.1) on #ffffff composites to ~1.25:1 and FAILS", () => {
    const css = `:root { --background: #ffffff; --foreground: rgba(0, 0, 0, 0.1); }`;
    const report = evaluateAudit(parseTokensFromText(css, "alpha.css"), { standard: "wcag-aa" });
    expect(report.status).toBe("fail");
    expect(report.exitCode).toBe(1);
    expect(report.pairs[0]!.composited).toBe(true);
    expect(report.pairs[0]!.wcagExact).toBeLessThan(1.35);
    expect(report.pairs[0]!.pass).toBe(false);
  });

  test("alpha: translucent root background yields status=incomplete and exitCode=3", () => {
    const css = `:root { --background: rgba(255, 255, 255, 0.5); --foreground: #000000; }`;
    const report = evaluateAudit(parseTokensFromText(css, "bg-alpha.css"), { standard: "wcag-aa" });
    expect(report.status).toBe("incomplete");
    expect(report.exitCode).toBe(3);
    expect(report.unverifiedCount).toBe(1);
    expect(report.coverage.unverifiedPairs[0]!.reason).toBe("translucent-backdrop-unknown");
  });

  test("alpha: translucent border oklch(1 0 0 / 10%) composites over opaque mode background with explicit assumption", () => {
    const css = `
      .dark {
        --background: #09090b;
        --foreground: #fafafa;
        --border: oklch(1 0 0 / 10%);
      }
    `;
    const report = evaluateAudit(parseTokensFromText(css, "border.css"), { standard: "wcag-aa" });
    expect(report.status).toBe("pass");
    const borderPair = report.pairs.find((p) => p.fgToken === "border");
    expect(borderPair).toBeDefined();
    expect(borderPair!.kind).toBe("border-advisory");
    expect(borderPair!.composited).toBe(true);
    expect(borderPair!.assumptions?.[0]).toContain("composited border");
  });

  test("out-of-sRGB-gamut color is marked unverified (incomplete, exit 3) rather than silently clamped", () => {
    const css = `:root { --background: #ffffff; --foreground: oklch(0.5 0.35 150); }`;
    const report = evaluateAudit(parseTokensFromText(css, "p3.css"), { standard: "wcag-aa" });
    expect(report.status).toBe("incomplete");
    expect(report.exitCode).toBe(3);
    expect(report.coverage.unverifiedPairs[0]!.reason).toContain("out-of-srgb-gamut");
  });

  test("CSS parser handles @layer base, @supports, @media prefers-color-scheme: dark, :root.dark, html.dark, bare HSL, and post-merge var()", () => {
    const css = `
      @layer base {
        :root {
          --base-ink: 222.2 84% 4.9%;
          --background: 0 0% 100%;
          --foreground: var(--base-ink);
          --shared-accent: #60a5fa;
        }
        @supports (color: oklch(0 0 0)) {
          @media (prefers-color-scheme: dark) {
            :root {
              --background: #09090b;
              --foreground: #fafafa;
              --ring: var(--shared-accent);
            }
          }
        }
      }
    `;
    const parsed = parseTokensFromText(css, "shadcn-v3.css");
    expect(parsed.light.background).toBe("0 0% 100%");
    expect(parsed.dark.background).toBe("#09090b");
    expect(parsed.dark.ring).toBe("#60a5fa");
    const report = evaluateAudit(parsed, { standard: "wcag-aa" });
    expect(report.status).toBe("pass");
    expect(report.passed).toBeGreaterThanOrEqual(3);

    // :root.dark and html.dark must route to dark, never overwrite light
    const rootDarkCss = `
      :root { --background: #ffffff; --foreground: #111111; }
      :root.dark { --background: #0a0a0a; --foreground: #f5f5f5; }
    `;
    const rd = parseTokensFromText(rootDarkCss, "rd.css");
    expect(rd.light.background).toBe("#ffffff");
    expect(rd.dark.background).toBe("#0a0a0a");

    const htmlDarkCss = `
      html { --background: #ffffff; --foreground: #111111; }
      html.dark { --background: #050505; --foreground: #eeeeee; }
    `;
    const hd = parseTokensFromText(htmlDarkCss, "hd.css");
    expect(hd.light.background).toBe("#ffffff");
    expect(hd.dark.background).toBe("#050505");
  });

  test("CSS parser flags alias cycles and unsupported conditional @media blocks as incomplete", () => {
    const cycleCss = `:root { --background: #ffffff; --foreground: var(--a); --a: var(--foreground); }`;
    const cycReport = evaluateAudit(parseTokensFromText(cycleCss, "cycle.css"));
    expect(cycReport.status).toBe("incomplete");
    expect(cycReport.exitCode).toBe(3);
    expect(cycReport.coverage.unverifiedPairs[0]!.reason).toContain("cyclic-var");

    const mediaWidthCss = `
      :root { --background: #ffffff; --foreground: #111111; }
      @media (min-width: 768px) { :root { --foreground: #999999; } }
    `;
    const mwReport = evaluateAudit(parseTokensFromText(mediaWidthCss, "mw.css"));
    expect(mwReport.status).toBe("incomplete");
    expect(mwReport.exitCode).toBe(3);
    expect(mwReport.coverage.skippedTokens[0]!.reason).toBe("unsupported-conditional-at-rule");
  });

  test("JSON & DTCG parsers preserve DTCG alpha and round-trip theme-book JSON + w3-tokens", () => {
    const dtcgAlpha = JSON.stringify({
      light: {
        background: { $value: { colorSpace: "srgb", components: [1, 1, 1], hex: "#ffffff" } },
        foreground: { $value: { colorSpace: "srgb", components: [0, 0, 0], alpha: 0.1, hex: "#000000" } },
      },
    });
    const dtcgReport = evaluateAudit(parseTokensFromText(dtcgAlpha, "dtcg.json"));
    expect(dtcgReport.status).toBe("fail");
    expect(dtcgReport.pairs[0]!.composited).toBe(true);
    expect(dtcgReport.pairs[0]!.wcagExact).toBeLessThan(1.35);

    const built = buildThemeBook({
      seeds: ["#2563eb"],
      preset: "shadcn",
      mood: "editorial",
      generator: "oklch",
    });
    const jsonText = renderThemeOutput(built, "json");
    const jsonReport = evaluateAudit(parseTokensFromText(jsonText, "theme.json"));
    expect(jsonReport.status).toBe("pass");
    expect(jsonReport.passed).toBeGreaterThanOrEqual(24);

    const w3Text = renderThemeOutput(built, "w3-tokens");
    const w3Report = evaluateAudit(parseTokensFromText(w3Text, "theme.tokens.json"));
    expect(w3Report.status).toBe("pass");
    expect(w3Report.passed).toBeGreaterThanOrEqual(24);
  });

  test("APCA --fix verifies directly against pair APCA target, and unsatisfiable AAA returns no-solution", () => {
    const brokenCss = `
      :root {
        --background: #ffffff;
        --foreground: #cccccc;
        --ring: #e5e5e5;
      }
    `;
    const apcaReport = evaluateAudit(parseTokensFromText(brokenCss, "apca.css"), {
      standard: "apca",
      withFixes: true,
    });
    expect(apcaReport.status).toBe("fail");
    for (const p of apcaReport.pairs.filter((x) => !x.pass)) {
      expect(p.suggestedFix?.status).toBe("fixed");
      if (p.suggestedFix?.status === "fixed") {
        expect(p.suggestedFix.verified).toBe(true);
        expect(Math.abs(p.suggestedFix.apcaExact)).toBeGreaterThanOrEqual(p.requiredApca);
      }
    }

    // Mid-gray #767676 background: max contrast with pure black or white is ~4.54:1, so AAA 7:1 has no fg-only fix
    const impossibleCss = `:root { --background: #767676; --foreground: #888888; }`;
    const aaaReport = evaluateAudit(parseTokensFromText(impossibleCss, "impossible.css"), {
      standard: "wcag-aaa",
      withFixes: true,
    });
    expect(aaaReport.status).toBe("fail");
    expect(aaaReport.pairs[0]!.suggestedFix?.status).toBe("no-solution");
    expect(aaaReport.pairs[0]!.suggestedFix?.verified).toBe(false);
  });

  test("CLI rejects unknown flags with exit 2 and eval - cleans up its temp directory", () => {
    const bad = Bun.spawnSync([CLI_BIN, "theme", "--seed", "#2563eb", "--bogus-flag"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(bad.exitCode).toBe(2);
    expect(bad.stderr.toString()).toContain("unknown option");

    const before = new Set(readdirSync(tmpdir()).filter((f) => f.startsWith("theme-book-eval-")));
    const ev = Bun.spawnSync([CLI_BIN, "eval", "-"], {
      stdin: Buffer.from(
        'import { DesignBook, color } from "design-book"; const b = new DesignBook("t"); b.addScope("p").set("c", color("#111111")); console.log(b.resolve("p.c"));\n',
      ),
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(ev.exitCode).toBe(0);
    expect(ev.stdout.toString().trim()).toBe("#111111");
    const after = readdirSync(tmpdir()).filter((f) => f.startsWith("theme-book-eval-") && !before.has(f));
    expect(after.length).toBe(0);
  });
});

describe("theme-book existing baseline checks", () => {
  const seeds = ["#000000", "#2563eb", "#facc15", "#c2410c", "#06b6d4", "#0f766e"];
  const presets: ThemePreset[] = ["shadcn", "semantic", "slide-deck"];

  test("all presets pass WCAG AA across diverse seeds", () => {
    for (const preset of presets) {
      for (const seed of seeds) {
        const built = buildThemeBook({
          seeds: [seed],
          preset,
          mood: "editorial",
          generator: "oklch",
        });
        expect(built.audit.status).toBe("pass");
        expect(built.audit.failed).toBe(0);
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
      }
    }
  });
});
