import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, readlinkSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DesignBook, FunctionError, closest, color, ref } from "design-book";
import { buildThemeBook, suggestCompanionColors, type ThemePreset } from "../src/books";
import { evaluateAudit, parseTokensFromText, type AuditStandard } from "../src/audit";
import { formatOklchCss, oklabDistance, parseToOklch, toSafeHex } from "../src/palette";
import { renderThemeOutput } from "../src/render";
import { generateSpecimenSvg } from "../scripts/specimen";
import type { GeneratorKind, Mood } from "../src/palette";

const REPO_ROOT = resolve(import.meta.dir, "..");
const CLI_BIN = join(REPO_ROOT, "bin", "theme-book");
const INSTALL_SH = join(REPO_ROOT, "install.sh");
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

describe("theme-book Commit 2: generator charts, exact seeds, AA/AAA/APCA matrix, count & safe installer", () => {
  test("exact readable sRGB hex seed reaches light.primary verbatim (picked brandSolvableLight.seed-0); unreadable yellow adjusts", () => {
    const blue = buildThemeBook({
      seeds: ["#2563eb"],
      preset: "shadcn",
      mood: "editorial",
      generator: "oklch",
      standard: "wcag-aa",
    });
    expect(blue.light.primary!.hex).toBe("#2563eb");
    expect(blue.light.primary!.picked).toBe("brandSolvableLight.seed-0");
    expect(toSafeHex(blue.light.primary!.oklch)).toBe("#2563eb");

    const yellow = buildThemeBook({
      seeds: ["#facc15"],
      preset: "shadcn",
      mood: "editorial",
      generator: "oklch",
      standard: "wcag-aa",
    });
    expect(yellow.light.primary!.hex).not.toBe("#facc15");
    expect(yellow.audit.status).toBe("pass");
  });

  test("generator drives chart-1..5 while single-seed shadcn accent/secondary stay quiet primary tints; seed-1 tints accent", () => {
    const tOklch = buildThemeBook({
      seeds: ["#2563eb"],
      preset: "shadcn",
      mood: "editorial",
      generator: "oklch",
    });
    const tPoline = buildThemeBook({
      seeds: ["#2563eb"],
      preset: "shadcn",
      mood: "editorial",
      generator: "poline",
    });
    const tRamp = buildThemeBook({
      seeds: ["#2563eb"],
      preset: "shadcn",
      mood: "editorial",
      generator: "rampensau",
    });

    const chartSig = (t: ReturnType<typeof buildThemeBook>) =>
      [1, 2, 3, 4, 5].map((i) => t.light[`chart-${i}`]!.hex).join(",");

    // Discriminating fixture: all three generators produce distinct chart palettes
    expect(chartSig(tOklch)).not.toBe(chartSig(tPoline));
    expect(chartSig(tOklch)).not.toBe(chartSig(tRamp));
    expect(chartSig(tPoline)).not.toBe(chartSig(tRamp));

    // Single-seed shadcn accent stays in the blue hue family (NOT turned faintly orange by generator!)
    const accentHue = parseToOklch(tPoline.light.accent!.hex).h ?? 0;
    expect(accentHue).toBeGreaterThan(220);
    expect(accentHue).toBeLessThan(300);
    expect(tPoline.light.accent!.hex).toBe(tOklch.light.accent!.hex);

    // Explicit second seed (#d97706 warm amber) tints accent cleanly
    const tDual = buildThemeBook({
      seeds: ["#2563eb", "#d97706"],
      preset: "shadcn",
      mood: "editorial",
      generator: "oklch",
    });
    expect(tDual.light.accent!.hex).not.toBe(tOklch.light.accent!.hex);
    expect(tDual.audit.status).toBe("pass");
  });

  test("design-book closest(..., { readableOn }) fallback behavior when no candidate in pool clears readableContrast", () => {
    const book = new DesignBook("no-candidate-check");
    const pool = book.addScope("pool");
    pool.set("light-gray", color("#d4d4d4"));
    pool.set("mid-gray", color("#a3a3a3"));
    const ui = book.addScope("ui");
    ui.set("bg", color("#ffffff"));
    ui.set(
      "pick",
      closest(ref("pool.light-gray"), ref("pool"), {
        readableOn: ref("ui.bg"),
        readableContrast: 10.0,
      }),
    );
    // Verify design-book fails closed by throwing FunctionError when no pool member meets readableContrast
    expect(() => book.resolve("ui.pick")).toThrow(FunctionError);
  });

  test("chart series meets chroma-scaled pairwise OKLab separation (>= 0.8 * effectiveChroma) across all 10 pairs and generators", () => {
    const generators: GeneratorKind[] = ["oklch", "poline", "rampensau"];
    const moods: Mood[] = ["muted", "editorial", "vivid"];

    for (const generator of generators) {
      for (const mood of moods) {
        const built = buildThemeBook({
          seeds: ["#2563eb"],
          preset: "shadcn",
          mood,
          generator,
        });
        for (const polarity of ["light", "dark"] as const) {
          const map = polarity === "light" ? built.light : built.dark;
          const colors = [1, 2, 3, 4, 5].map((i) => map[`chart-${i}`]!.oklch);
          let minDist = Infinity;
          for (let i = 0; i < 5; i++) {
            for (let j = i + 1; j < 5; j++) {
              minDist = Math.min(minDist, oklabDistance(colors[i]!, colors[j]!));
            }
          }
          const diag = built.chartDiagnostics[polarity];
          expect(minDist).toBeGreaterThanOrEqual(diag.thresholdRatio * diag.effectiveChroma - 1e-3);
        }
      }
    }
  });

  test("full matrix: all 5 moods x all 3 generators x all 3 presets x all 3 standards (AA, AAA, APCA) pass with zero failures", () => {
    const moods: Mood[] = ["neutral", "muted", "vivid", "editorial", "high-contrast"];
    const generators: GeneratorKind[] = ["oklch", "poline", "rampensau"];
    const presets: ThemePreset[] = ["shadcn", "semantic", "slide-deck"];
    const standards: AuditStandard[] = ["wcag-aa", "wcag-aaa", "apca"];

    for (const standard of standards) {
      for (const mood of moods) {
        for (const generator of generators) {
          for (const preset of presets) {
            const built = buildThemeBook({
              seeds: ["#2563eb"],
              preset,
              mood,
              generator,
              standard,
            });
            if (built.audit.status !== "pass") {
              const bad = built.audit.pairs.filter((p) => p.required && !p.pass);
              throw new Error(
                `Failed matrix (${standard}/${mood}/${generator}/${preset}): status=${built.audit.status}, unverified=${built.audit.unverifiedCount}, failures=${JSON.stringify(bad)}`,
              );
            }
            expect(built.audit.status).toBe("pass");
            expect(built.audit.failed).toBe(0);
            expect(built.audit.unverifiedCount).toBe(0);
          }
        }
      }
    }

    // Also verify high-contrast defaults to wcag-aaa automatically and passes diverse seeds
    for (const seed of ["#000000", "#2563eb", "#facc15", "#c2410c", "#0f766e"]) {
      const hc = buildThemeBook({
        seeds: [seed],
        preset: "shadcn",
        mood: "high-contrast",
        generator: "oklch",
      });
      expect(hc.standard).toBe("wcag-aaa");
      expect(hc.audit.status).toBe("pass");
      expect(hc.light.foreground!.hex).not.toBe(hc.light["muted-foreground"]!.hex);
      expect(hc.dark.foreground!.hex).not.toBe(hc.dark["muted-foreground"]!.hex);
    }
  }, 60_000); // 140 theme builds, each audited: seconds of work, well past the 5 s default on a loaded host

  test("suggest honors --count 10 and reports shortage warning when pool is exhausted", () => {
    const ten = suggestCompanionColors({
      seeds: ["#2563eb"],
      polarity: "light",
      mood: "editorial",
      generator: "oklch",
      count: 10,
    });
    expect(ten.suggestions.length).toBe(10);
    expect(ten.warnings.length).toBe(0);

    const huge = suggestCompanionColors({
      seeds: ["#2563eb"],
      polarity: "light",
      mood: "editorial",
      generator: "oklch",
      count: 200,
    });
    expect(huge.suggestions.length).toBeLessThan(200);
    expect(huge.warnings.length).toBeGreaterThan(0);
  });

  test("install.sh 4-case matrix: fresh relative prefix, marked upgrade, legacy upgrade, and unrelated dir refusal", () => {
    const root = mkdtempSync(join(tmpdir(), "theme-book-install-test-"));
    tempDirs.push(root);
    const binDir = join(root, "bin");
    mkdirSync(binDir, { recursive: true });

    // 1. Fresh destination with RELATIVE --prefix produces working absolute symlink
    const fresh = Bun.spawnSync(
      [INSTALL_SH, "--prefix", "./rel-install", "--bin-dir", "./bin", "--no-skill"],
      { cwd: root, stdout: "pipe", stderr: "pipe" },
    );
    expect(fresh.exitCode).toBe(0);
    const linkTarget = readlinkSync(join(binDir, "theme-book"));
    expect(linkTarget.startsWith("/")).toBe(true);
    expect(existsSync(join(root, "rel-install", ".theme-book-install"))).toBe(true);
    const smoke = Bun.spawnSync([join(binDir, "theme-book"), "--help"], {
      cwd: tmpdir(),
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(smoke.exitCode).toBe(0);

    // 2. Existing marked installation upgrades cleanly
    const marked = Bun.spawnSync(
      [INSTALL_SH, "--prefix", join(root, "rel-install"), "--bin-dir", binDir, "--no-skill"],
      { cwd: root, stdout: "pipe", stderr: "pipe" },
    );
    expect(marked.exitCode).toBe(0);

    // 3. Baseline unmarked legacy layout (package.json name="theme-book" + bin/theme-book + src/cli.ts) migrates cleanly
    const legacyDir = join(root, "legacy-install");
    mkdirSync(join(legacyDir, "bin"), { recursive: true });
    mkdirSync(join(legacyDir, "src"), { recursive: true });
    writeFileSync(join(legacyDir, "package.json"), JSON.stringify({ name: "theme-book" }));
    writeFileSync(join(legacyDir, "bin", "theme-book"), "#!/usr/bin/env bash\n");
    writeFileSync(join(legacyDir, "src", "cli.ts"), "// legacy\n");
    const legacy = Bun.spawnSync(
      [INSTALL_SH, "--prefix", legacyDir, "--bin-dir", binDir, "--no-skill"],
      { cwd: root, stdout: "pipe", stderr: "pipe" },
    );
    expect(legacy.exitCode).toBe(0);
    expect(legacy.stdout.toString()).toContain("[migrate]");
    expect(existsSync(join(legacyDir, ".theme-book-install"))).toBe(true);

    // 4. Unrelated non-empty directory is REFUSED and its contents remain untouched
    const unrelatedDir = join(root, "unrelated");
    mkdirSync(unrelatedDir, { recursive: true });
    writeFileSync(join(unrelatedDir, "precious.txt"), "do not delete");
    const refused = Bun.spawnSync(
      [INSTALL_SH, "--prefix", unrelatedDir, "--bin-dir", binDir, "--no-skill"],
      { cwd: root, stdout: "pipe", stderr: "pipe" },
    );
    expect(refused.exitCode).toBe(1);
    expect(refused.stderr.toString()).toContain("refusing to overwrite");
    expect(existsSync(join(unrelatedDir, "precious.txt"))).toBe(true);
  });
});

describe("theme-book Commit 3: full rule provenance, reproducible recipe & deterministic SVG specimen", () => {
  test("provenance exposes full Design Book rule arguments (no abbreviated ...) and recipe preserves rawSeeds + hex audit authority", () => {
    const built = buildThemeBook({
      seeds: ["#2563eb"],
      preset: "shadcn",
      mood: "editorial",
      generator: "poline",
      standard: "wcag-aa",
      hexOutput: true,
    });

    expect(built.light.primary!.rule).not.toContain("(...)");
    expect(built.light.primary!.rule).toContain("closest(");
    expect(built.light.primary!.rule).toContain("brandSolvableLight");
    expect(built.light.primary!.rule).toContain("readableOn: ref(light.background)");

    expect(built.recipe.version).toBe(1);
    expect(built.recipe.rawSeeds).toEqual(["#2563eb"]);
    expect(built.recipe.formatOptions.hex).toBe(true);
    expect(built.recipe.command).toContain('--seed "#2563eb"');
    expect(built.recipe.command).toContain("--hex");

    const jsonText = renderThemeOutput(built, "json", { hex: true });
    const parsed = parseTokensFromText(jsonText, "theme.json");
    expect(parsed.light.primary).toBe("#2563eb");
    const report = evaluateAudit(parsed, { standard: "wcag-aa" });
    expect(report.status).toBe("pass");
    expect(report.coverage.assumptions.some((a) => a.includes("hex"))).toBe(true);
  });

  test("docs/specimen.svg matches deterministic regeneration from scripts/specimen.ts", () => {
    const specimenPath = join(REPO_ROOT, "docs", "specimen.svg");
    expect(existsSync(specimenPath)).toBe(true);
    const onDisk = readFileSync(specimenPath, "utf8");
    const generated = generateSpecimenSvg();
    expect(onDisk).toBe(generated);
    expect(onDisk).toContain("<svg");
    expect(onDisk).toContain("corporate");
    expect(onDisk).toContain("freak");
  });
});

describe("polarity advisory", () => {
  // WCAG 2.x is symmetric, so a dark theme can clear AAA while reading materially worse
  // than its light counterpart. The advisory surfaces that without touching conformance.
  const css = `
:root {
  --background: #ffffff;
  --foreground: #000000;
  --muted: #ffffff;
  --muted-foreground: #595959;
}
.dark {
  --background: #000000;
  --foreground: #ffffff;
  --muted: #000000;
  --muted-foreground: #767676;
}
`;

  test("flags a dark pair that passes WCAG but reads below APCA fluent reading", () => {
    const report = evaluateAudit(parseTokensFromText(css, "t.css"), { standard: "wcag-aa" });
    expect(report.exitCode).toBe(0); // advisory must never change conformance
    expect(report.status).toBe("pass");

    const dark = report.polarityAdvisories.filter((a) => a.mode === "dark");
    expect(dark.length).toBeGreaterThan(0);
    for (const a of dark) {
      expect(Math.abs(a.apcaLc)).toBeLessThan(75);
      expect(a.wcagExact).toBeGreaterThanOrEqual(4.5);
      expect(a.note).toContain("fluent body reading");
    }
  });

  test("auditing under apca raises no advisory, because apca already is the standard", () => {
    const report = evaluateAudit(parseTokensFromText(css, "t.css"), { standard: "apca" });
    expect(report.polarityAdvisories).toEqual([]);
  });

  test("a pair comfortably above the fluent-reading threshold is not flagged", () => {
    const strong = `:root { --background: #ffffff; --foreground: #000000; }`;
    const report = evaluateAudit(parseTokensFromText(strong, "t.css"), { standard: "wcag-aaa" });
    expect(report.polarityAdvisories).toEqual([]);
  });
});

