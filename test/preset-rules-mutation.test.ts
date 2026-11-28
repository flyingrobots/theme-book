// The preset rules fingerprint must catch a change to any rule an extension builds on, not only
// each token's top-level expression (flyingrobots/theme-book#24). Each case mutates a copy of
// src/ and recomputes the fingerprint there; a fingerprint equal to the recorded one would let the
// change ship under the same rules version.
import { afterAll, expect, test } from "bun:test";
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");
const recorded = JSON.parse(readFileSync(join(ROOT, "test", "fixtures", "preset-rules.json"), "utf8")) as Record<
  string,
  { version: string; fingerprint: string }
>;
const work = mkdtempSync(join(tmpdir(), "theme-book-mutant-"));
afterAll(() => rmSync(work, { recursive: true, force: true }));

interface Mutation {
  file: "books.ts" | "palette.ts";
  from: string;
  to: string;
}

/** Copy the runtime, apply one exact textual mutation, and print the preset's fingerprint from the copy. */
async function fingerprintOf(name: string, preset: string, mutation?: Mutation): Promise<string> {
  const dir = join(work, name);
  cpSync(join(ROOT, "src"), join(dir, "src"), { recursive: true });
  cpSync(join(ROOT, "package.json"), join(dir, "package.json"));
  symlinkSync(join(ROOT, "node_modules"), join(dir, "node_modules"));
  if (mutation) {
    const path = join(dir, "src", mutation.file);
    const source = readFileSync(path, "utf8");
    // The mutation must apply exactly once, or the case would test nothing.
    const hits = source.split(mutation.from).length - 1;
    if (hits !== 1) throw new Error(`${name}: mutation matched ${hits} times in ${mutation.file}`);
    writeFileSync(path, source.replace(mutation.from, mutation.to));
  }
  const proc = Bun.spawn(
    ["bun", "-e", `import { presetRulesFingerprint } from "./src/books"; process.stdout.write(presetRulesFingerprint(${JSON.stringify(preset)}));`],
    { cwd: dir, stdout: "pipe", stderr: "pipe" },
  );
  const [out, err, code] = [await new Response(proc.stdout).text(), await new Response(proc.stderr).text(), await proc.exited];
  if (code !== 0 || err !== "") throw new Error(`${name}: fingerprint exited ${code}: ${err}`);
  return out;
}

const MUTATIONS: Array<[string, string, Mutation]> = [
  ["inks.black", "shadcn", { file: "books.ts", from: `inks.set("black", color("#000000"));`, to: `inks.set("black", color("#111111"));` }],
  [
    "accentSeeds.seed-1",
    "shadcn",
    { file: "books.ts", from: `accentSeeds.set("seed-1", ref("candidates.seed-1"));`, to: `accentSeeds.set("seed-1", ref("brand.seed-0"));` },
  ],
  [
    "the achromatic threshold in the rules (0.015 -> 0.05)",
    "shadcn",
    { file: "books.ts", from: `const isAchromatic = pools.seedOklch[0]!.c < 0.015;`, to: `const isAchromatic = pools.seedOklch[0]!.c < 0.05;` },
  ],
  ["the slide-deck radius", "slide-deck", { file: "books.ts", from: `radius: "0.5rem",`, to: `radius: "0.75rem",` }],
  [
    "the neutral ramp's chroma",
    "shadcn",
    {
      file: "palette.ts",
      from: `const c = neutralChroma * Math.max(0.15, endTaper);`,
      to: `const c = neutralChroma * 2 * Math.max(0.15, endTaper);`,
    },
  ],
  [
    "the achromatic threshold in the pools (0.015 -> 0.05)",
    "semantic",
    { file: "palette.ts", from: `const isAchromatic = primary.c < 0.015;`, to: `const isAchromatic = primary.c < 0.05;` },
  ],
];

// Start every copy at once; each test awaits its own.
const control = fingerprintOf("control", "shadcn");
const mutants = MUTATIONS.map(([, preset, mutation], i) => fingerprintOf(`mutant-${i}`, preset, mutation));

test("an unmutated copy of src/ reproduces the recorded fingerprint", async () => {
  expect(await control).toBe(recorded.shadcn!.fingerprint);
}, 60_000);

test.each(MUTATIONS.map(([name, preset], i) => [name, preset, i] as const))(
  "a change to %s changes the %s fingerprint",
  async (_, preset, i) => {
    expect(await mutants[i]!).not.toBe(recorded[preset]!.fingerprint);
  },
  60_000,
);
