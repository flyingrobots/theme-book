#!/usr/bin/env bun
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";

process.stdout.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EPIPE") process.exit(0);
  throw err;
});
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  buildThemeBook,
  suggestCompanionColors,
  type ThemePreset,
} from "./books";
import {
  evaluatePairs,
  inferAuditPairs,
  parseTokensFromText,
  type AuditStandard,
} from "./audit";
import {
  formatAuditText,
  formatSuggestText,
  renderThemeOutput,
  type RenderOutputFormat,
} from "./render";
import type { GeneratorKind, Mood } from "./palette";

const VALID_MOODS = new Set<Mood>(["neutral", "muted", "vivid", "editorial", "high-contrast"]);
const VALID_GENERATORS = new Set<GeneratorKind>(["oklch", "poline", "rampensau"]);
const VALID_PRESETS = new Set<ThemePreset>(["shadcn", "semantic", "slide-deck"]);
const VALID_FORMATS = new Set<RenderOutputFormat>(["css", "json", "w3-tokens", "svg"]);
const VALID_STANDARDS = new Set<AuditStandard>(["wcag-aa", "wcag-aaa", "apca"]);

function usage(): string {
  return `theme-book — Humble glue CLI wiring David Aerne's (@meodai) color tools together
             (design-book + poline + rampensau + culori, paired with skill.color-expert).

Usage:
  theme-book suggest --seed <color> [--seed <color>...] [--surface <color>]
                     [--polarity light|dark] [--mood neutral|muted|vivid|editorial|high-contrast]
                     [--generator oklch|poline|rampensau] [--count 8] [--format text|json]

  theme-book theme   --seed <color> [--seed <color>...] [--preset shadcn|semantic|slide-deck]
                     [--mood neutral|muted|vivid|editorial|high-contrast]
                     [--generator oklch|poline|rampensau]
                     [--format css|json|w3-tokens|svg] [--hex | --native]
                     [--audit] [--out <path>]

  theme-book audit   <file.css|file.json> [--standard wcag-aa|wcag-aaa|apca]
                     [--fix] [--format text|json]

  theme-book eval    <script.ts | -> [-- ...args]

Credits:
  All of the reactive token engine, palette generators, and color science belong to
  David Aerne (@meodai / Elastiq GmbH) — design-book, poline, rampensau, and
  skill.color-expert — plus the culori authors. All theme-book does is feed one
  into the other for local coding agents.
`;
}

function fail(msg: string, code = 2): never {
  console.error(`theme-book: ${msg}`);
  process.exit(code);
}

function parseFlags(args: string[]): {
  positionals: string[];
  flags: Record<string, string[]>;
  booleans: Set<string>;
} {
  const positionals: string[] = [];
  const flags: Record<string, string[]> = {};
  const booleans = new Set<string>();
  const booleanNames = new Set(["hex", "native", "audit", "fix", "help", "h"]);

  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === "--") {
      positionals.push(...args.slice(i + 1));
      break;
    }
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      if (eq !== -1) {
        const k = a.slice(2, eq);
        const v = a.slice(eq + 1);
        (flags[k] ??= []).push(v);
      } else {
        const k = a.slice(2);
        if (booleanNames.has(k)) {
          booleans.add(k);
        } else {
          const next = args[i + 1];
          if (next === undefined) fail(`--${k} requires a value`);
          (flags[k] ??= []).push(next);
          i++;
        }
      }
    } else if (a === "-h") {
      booleans.add("help");
    } else {
      positionals.push(a);
    }
  }
  return { positionals, flags, booleans };
}

function getOne(flags: Record<string, string[]>, key: string): string | undefined {
  const arr = flags[key];
  return arr && arr.length > 0 ? arr[arr.length - 1] : undefined;
}

async function runEval(args: string[]): Promise<void> {
  const target = args[0];
  if (!target || target === "-h" || target === "--help") {
    console.log(usage());
    return;
  }
  const rest = args.slice(1);
  const preload = resolve(import.meta.dir, "eval-preload.ts");

  let scriptPath = target;
  let tempDir: string | undefined;

  if (target === "-") {
    const stdinText = await new Response(Bun.stdin.stream()).text();
    tempDir = mkdtempSync(join(tmpdir(), "theme-book-eval-"));
    scriptPath = join(tempDir, "stdin-script.ts");
    writeFileSync(scriptPath, stdinText, "utf8");
  } else if (!existsSync(target)) {
    fail(`eval script not found: ${target}`, 1);
  }

  try {
    const proc = Bun.spawnSync(["bun", "--preload", preload, scriptPath, ...rest], {
      cwd: process.cwd(),
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    process.exit(proc.exitCode);
  } finally {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0];

  if (!cmd || cmd === "-h" || cmd === "--help" || cmd === "help") {
    console.log(usage());
    return;
  }

  if (cmd === "eval") {
    await runEval(argv.slice(1));
    return;
  }

  const { positionals, flags, booleans } = parseFlags(argv.slice(1));
  if (booleans.has("help")) {
    console.log(usage());
    return;
  }

  if (cmd === "suggest") {
    const seeds = [...(flags.seed ?? []), ...positionals];
    if (seeds.length === 0) fail("suggest requires at least one --seed <color>");

    const mood = (getOne(flags, "mood") ?? "neutral") as Mood;
    if (!VALID_MOODS.has(mood)) fail(`invalid --mood "${mood}"`);

    const generator = (getOne(flags, "generator") ?? "oklch") as GeneratorKind;
    if (!VALID_GENERATORS.has(generator)) fail(`invalid --generator "${generator}"`);

    const polarityRaw = getOne(flags, "polarity");
    if (polarityRaw && polarityRaw !== "light" && polarityRaw !== "dark") {
      fail(`invalid --polarity "${polarityRaw}" (expected light or dark)`);
    }

    const count = Number(getOne(flags, "count") ?? "8");
    if (!Number.isFinite(count) || count < 1) fail(`invalid --count`);

    const outFormat = getOne(flags, "format") ?? "text";
    const result = suggestCompanionColors({
      seeds,
      surface: getOne(flags, "surface"),
      polarity: polarityRaw as "light" | "dark" | undefined,
      mood,
      generator,
      count,
    });

    if (outFormat === "json") {
      process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    } else {
      process.stdout.write(formatSuggestText(result));
    }
    return;
  }

  if (cmd === "theme") {
    const seeds = [...(flags.seed ?? []), ...positionals];
    if (seeds.length === 0) fail("theme requires at least one --seed <color>");

    const preset = (getOne(flags, "preset") ?? "shadcn") as ThemePreset;
    if (!VALID_PRESETS.has(preset)) fail(`invalid --preset "${preset}"`);

    const mood = (getOne(flags, "mood") ?? "neutral") as Mood;
    if (!VALID_MOODS.has(mood)) fail(`invalid --mood "${mood}"`);

    const generator = (getOne(flags, "generator") ?? "oklch") as GeneratorKind;
    if (!VALID_GENERATORS.has(generator)) fail(`invalid --generator "${generator}"`);

    const format = (getOne(flags, "format") ?? "css") as RenderOutputFormat;
    if (!VALID_FORMATS.has(format)) fail(`invalid --format "${format}"`);

    const built = buildThemeBook({ seeds, preset, mood, generator });
    const rendered = renderThemeOutput(built, format, {
      hex: booleans.has("hex"),
      native: booleans.has("native"),
    });

    const outPath = getOne(flags, "out");
    if (outPath) {
      writeFileSync(outPath, rendered, "utf8");
      console.error(`theme-book: wrote ${format} theme to ${outPath}`);
    } else {
      process.stdout.write(rendered);
    }

    if (booleans.has("audit")) {
      const stream = outPath ? process.stdout : process.stderr;
      stream.write("\n" + formatAuditText(built.audit));
    }
    return;
  }

  if (cmd === "audit") {
    const filePath = positionals[0];
    if (!filePath) fail("audit requires a <file.css|file.json> argument");
    if (!existsSync(filePath)) fail(`file not found: ${filePath}`, 1);

    const standard = (getOne(flags, "standard") ?? "wcag-aa") as AuditStandard;
    if (!VALID_STANDARDS.has(standard)) fail(`invalid --standard "${standard}"`);

    const content = readFileSync(filePath, "utf8");
    const modes = parseTokensFromText(content, filePath);
    const pairs = inferAuditPairs(modes);
    if (pairs.length === 0) {
      fail(`no foreground/background token pairs found in ${filePath}`, 1);
    }

    const report = evaluatePairs(pairs, standard, booleans.has("fix"));
    const outFormat = getOne(flags, "format") ?? "text";

    if (outFormat === "json") {
      process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    } else {
      process.stdout.write(formatAuditText(report));
    }
    if (report.failed > 0) {
      process.exit(1);
    }
    return;
  }

  fail(`unknown command "${cmd}". Run "theme-book --help" for usage.`);
}

main().catch((err) => {
  console.error(`theme-book: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
