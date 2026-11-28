#!/usr/bin/env bun
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";

process.stdout.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EPIPE") process.exit(0);
  throw err;
});
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { ExtensionError, loadBookExtension, type BookExtension } from "./extension";
import {
  buildThemeBook,
  suggestCompanionColors,
  type ThemePreset,
} from "./books";
import {
  evaluateAudit,
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

const VALID_MOODS = new Set<Mood>(["neutral", "muted", "vivid", "editorial", "high-contrast", "freak", "corporate"]);
const VALID_GENERATORS = new Set<GeneratorKind>(["oklch", "poline", "rampensau"]);
const VALID_PRESETS = new Set<ThemePreset>(["shadcn", "semantic", "slide-deck"]);
const VALID_FORMATS = new Set<RenderOutputFormat>(["css", "json", "w3-tokens", "svg"]);
const VALID_STANDARDS = new Set<AuditStandard>(["wcag-aa", "wcag-aaa", "apca"]);

function usage(): string {
  return `theme-book — Rule-based color theme compiler and contrast auditor
             built on David Aerne's (@meodai) design-book, poline, rampensau, and culori.

Usage:
  theme-book suggest --seed <color> [--seed <color>...] [--surface <color>]
                     [--polarity light|dark] [--mood neutral|muted|vivid|editorial|high-contrast|corporate|freak]
                     [--generator oklch|poline|rampensau] [--count 8] [--format text|json]

  theme-book theme   --seed <color> [--seed <color>...] [--preset shadcn|semantic|slide-deck]
                     [--mood neutral|muted|vivid|editorial|high-contrast|corporate|freak]
                     [--generator oklch|poline|rampensau]
                     [--standard wcag-aa|wcag-aaa|apca]
                     [--format css|json|w3-tokens|svg] [--hex | --native]
                     [--audit] [--out <path>] [--book <extension.ts> [--book-sha256 <hex>]]

  theme-book audit   <file.css|file.json> [--standard wcag-aa|wcag-aaa|apca]
                     [--fix] [--strict-borders] [--format text|json]

  theme-book eval    <script.ts | -> [-- ...args]

Exit codes:
  0  Pass / success
  1  Audit failed (one or more required contrast checks failed)
  2  Invalid CLI usage or malformed input
  3  Incomplete audit (zero failures, but required checks could not be verified)
`;
}

function fail(msg: string, code = 2): never {
  console.error(`theme-book: ${msg}`);
  process.exit(code);
}

interface FlagSchema {
  valueFlags: Set<string>;
  boolFlags: Set<string>;
}

const COMMAND_SCHEMAS: Record<string, FlagSchema> = {
  suggest: {
    valueFlags: new Set(["seed", "surface", "polarity", "mood", "generator", "count", "format"]),
    boolFlags: new Set(["help", "h"]),
  },
  theme: {
    valueFlags: new Set(["seed", "preset", "mood", "generator", "standard", "format", "out", "book", "book-sha256"]),
    boolFlags: new Set(["hex", "native", "audit", "help", "h"]),
  },
  audit: {
    valueFlags: new Set(["standard", "format"]),
    boolFlags: new Set(["fix", "strict-borders", "help", "h"]),
  },
};

function parseFlags(
  args: string[],
  schema: FlagSchema,
): {
  positionals: string[];
  flags: Record<string, string[]>;
  booleans: Set<string>;
} {
  const positionals: string[] = [];
  const flags: Record<string, string[]> = {};
  const booleans = new Set<string>();

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
        if (!schema.valueFlags.has(k)) {
          fail(`unknown option "--${k}"`);
        }
        (flags[k] ??= []).push(v);
      } else {
        const k = a.slice(2);
        if (schema.boolFlags.has(k)) {
          booleans.add(k);
        } else if (schema.valueFlags.has(k)) {
          const next = args[i + 1];
          if (next === undefined) fail(`--${k} requires a value`);
          (flags[k] ??= []).push(next);
          i++;
        } else {
          fail(`unknown option "--${k}"`);
        }
      }
    } else if (a === "-h") {
      booleans.add("help");
    } else if (a.startsWith("-") && a.length > 1) {
      fail(`unknown option "${a}"`);
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

async function runEval(args: string[]): Promise<number> {
  const target = args[0];
  if (!target || target === "-h" || target === "--help") {
    console.log(usage());
    return 0;
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
    console.error(`theme-book: eval script not found: ${target}`);
    return 2;
  }

  try {
    const proc = Bun.spawnSync(["bun", "--preload", preload, scriptPath, ...rest], {
      cwd: process.cwd(),
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    return proc.exitCode;
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
    const code = await runEval(argv.slice(1));
    process.exit(code);
  }

  const schema = COMMAND_SCHEMAS[cmd];
  if (!schema) {
    fail(`unknown command "${cmd}". Run "theme-book --help" for usage.`);
  }

  const { positionals, flags, booleans } = parseFlags(argv.slice(1), schema);
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
    if (outFormat !== "text" && outFormat !== "json") fail(`invalid --format "${outFormat}"`);

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

    const bookPath = getOne(flags, "book");
    const bookSha256 = getOne(flags, "book-sha256");
    if (bookSha256 !== undefined) {
      if (bookPath === undefined) fail("--book-sha256 requires --book");
      if (!/^[0-9a-f]{64}$/i.test(bookSha256)) fail(`--book-sha256 must be 64 hex digits, got ${JSON.stringify(bookSha256)}`);
    }
    let extension: BookExtension | undefined;
    if (bookPath !== undefined) {
      if (bookPath.trim() === "") fail("--book requires a file path");
      try {
        extension = await loadBookExtension(bookPath, { sha256: bookSha256 });
      } catch (e) {
        fail(e instanceof Error ? e.message : String(e));
      }
    }

    // With --book and no --preset, the extension's parent decides the preset.
    const preset = (getOne(flags, "preset") ?? extension?.extends.preset ?? "shadcn") as ThemePreset;
    if (!VALID_PRESETS.has(preset)) fail(`invalid --preset "${preset}"`);

    const mood = (getOne(flags, "mood") ?? "neutral") as Mood;
    if (!VALID_MOODS.has(mood)) fail(`invalid --mood "${mood}"`);
    if ((mood === "freak" || mood === "corporate") && preset !== "shadcn") fail(`--mood ${mood} has rules for --preset shadcn only, not "${preset}"`);

    const generator = (getOne(flags, "generator") ?? "oklch") as GeneratorKind;
    if (!VALID_GENERATORS.has(generator)) fail(`invalid --generator "${generator}"`);

    const format = (getOne(flags, "format") ?? "css") as RenderOutputFormat;
    if (!VALID_FORMATS.has(format)) fail(`invalid --format "${format}"`);

    const standardRaw = getOne(flags, "standard");
    if (standardRaw && !VALID_STANDARDS.has(standardRaw as AuditStandard)) {
      fail(`invalid --standard "${standardRaw}"`);
    }

    let built: ReturnType<typeof buildThemeBook>;
    try {
      built = buildThemeBook({
        seeds,
        preset,
        mood,
        generator,
        standard: standardRaw as AuditStandard | undefined,
        hexOutput: booleans.has("hex"),
        nativeOutput: booleans.has("native"),
        extension,
      });
    } catch (e) {
      if (e instanceof ExtensionError) fail(e.message);
      throw e;
    }
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
      if (built.audit.exitCode !== 0) {
        process.exit(built.audit.exitCode);
      }
    }
    return;
  }

  if (cmd === "audit") {
    const filePath = positionals[0];
    if (!filePath) fail("audit requires a <file.css|file.json> argument");
    if (!existsSync(filePath)) fail(`file not found: ${filePath}`, 2);

    const standard = (getOne(flags, "standard") ?? "wcag-aa") as AuditStandard;
    if (!VALID_STANDARDS.has(standard)) fail(`invalid --standard "${standard}"`);

    const outFormat = getOne(flags, "format") ?? "text";
    if (outFormat !== "text" && outFormat !== "json") fail(`invalid --format "${outFormat}"`);

    const content = readFileSync(filePath, "utf8");
    let parsedModes;
    try {
      parsedModes = parseTokensFromText(content, filePath);
    } catch (err) {
      fail(`failed to parse ${filePath}: ${err instanceof Error ? err.message : String(err)}`, 2);
    }

    const report = evaluateAudit(parsedModes, {
      standard,
      withFixes: booleans.has("fix"),
      strictBorders: booleans.has("strict-borders"),
    });

    if (outFormat === "json") {
      process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    } else {
      process.stdout.write(formatAuditText(report));
    }
    if (report.exitCode !== 0) {
      process.exit(report.exitCode);
    }
    return;
  }
}

main().catch((err) => {
  console.error(`theme-book: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
