// Versioned preset rules, and extensions that name their parent and version (flyingrobots/theme-book#22).
import { expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { PRESET_RULES_VERSION, buildThemeBook, presetRulesFingerprint, presetRulesLines, type ThemePreset } from "../src/books";
import { ExtensionError, loadBookExtension } from "../src/extension";

const PRESETS: ThemePreset[] = ["shadcn", "semantic", "slide-deck"];
const recorded = JSON.parse(readFileSync(join(import.meta.dir, "fixtures", "preset-rules.json"), "utf8")) as Record<
  string,
  { version: string; fingerprint: string }
>;
const dir = mkdtempSync(join(tmpdir(), "theme-book-ext-"));
const CLI = resolve(import.meta.dir, "..", "bin", "theme-book");

/** Write an extension module with no imports: the rule constructors arrive through `apply`. */
function extension(name: string, header: Record<string, unknown>, body: string): string {
  const path = join(dir, `${name}.ts`);
  writeFileSync(path, `export default { ...${JSON.stringify(header)}, apply({ light, dark, rules }) { ${body} } };\n`);
  return path;
}

const LIGHTER_DARK = 'dark.set("background", rules.closest(rules.color("oklch(0.145 0 0)"), rules.ref("neutrals")));';
const school = (version = PRESET_RULES_VERSION.shadcn, preset = "shadcn") =>
  extension(`school-${preset}-${version}`, { name: "school", version: "1.0.0", extends: { preset, version } }, LIGHTER_DARK);
const build = (opts: { seed?: string; extension?: Awaited<ReturnType<typeof loadBookExtension>> } = {}) =>
  buildThemeBook({ seeds: [opts.seed ?? "#0f766e"], preset: "shadcn", mood: "editorial", generator: "oklch", standard: "wcag-aaa", extension: opts.extension });

test.each(PRESETS)("the %s preset's rules are versioned, and a rule change without a version bump fails here", (preset) => {
  expect(PRESET_RULES_VERSION[preset]).toMatch(/^\d+\.\d+\.\d+$/);
  // If this fails you changed a rule: bump PRESET_RULES_VERSION and record the new fingerprint.
  expect({ version: PRESET_RULES_VERSION[preset], fingerprint: presetRulesFingerprint(preset) }).toEqual(recorded[preset]!);
}, 60_000); // a fingerprint builds a few hundred themes

test("a preset's fingerprint depends on its rules, not on the seeds", () => {
  // Other seeds of the same three kinds: the rules are the same, so the fingerprint must be too.
  const others = { chromatic: ["#2563eb"], achromatic: ["#555555"], "two-seed": ["#2563eb", "#eab308"] };
  expect(presetRulesFingerprint("shadcn", others)).toBe(presetRulesFingerprint("shadcn"));
}, 60_000);

test("the fingerprint covers the achromatic, second-seed, AAA and APCA rule branches", () => {
  const lines = presetRulesLines("shadcn");
  const configs = new Set(lines.map((l) => l.split(" ")[0]));
  // 7 moods (freak and corporate included) x 3 standards x 3 kinds of seed set.
  expect(configs.size).toBe(63);
  for (const part of ["/achromatic", "/two-seed", "/wcag-aaa/", "/apca/", "high-contrast/"]) {
    expect([part, [...configs].some((c) => c.includes(part))]).toEqual([part, true]);
  }
});

test("an extension overrides the rules it sets, and only the tokens that depend on them change", async () => {
  const base = build();
  const extended = build({ extension: await loadBookExtension(school()) });
  expect(extended.dark.background!.oklch).not.toBe(base.dark.background!.oklch);
  expect(extended.light).toEqual(base.light);
  // Tokens whose rules reach dark.background may move; every other dark token must not.
  const reaches = (key: string, seen = new Set<string>()): boolean => {
    if (key === "dark.background") return true;
    if (seen.has(key)) return false;
    seen.add(key);
    const name = key.replace(/^dark\./, "");
    return (extended.dark[name]?.dependencies ?? []).some((d) => reaches(d, seen));
  };
  const untouched = extended.darkKeys.filter((k) => !reaches(`dark.${k}`));
  expect(untouched.length).toBeGreaterThan(0); // zero witnesses would mean the check compared nothing
  for (const k of untouched) expect([k, extended.dark[k]!.oklch]).toEqual([k, base.dark[k]!.oklch]);
});

test("an extended theme is audited exactly like a preset", async () => {
  const extended = build({ extension: await loadBookExtension(school()) });
  expect(extended.audit.pairs.filter((p) => p.required).length).toBeGreaterThan(0);
  expect(extended.audit.status).toBe("pass");
});

test.each([
  ["a different parent version", () => school("0.0.1"), /extends shadcn@0\.0\.1, but this theme-book's shadcn rules are \d+\.\d+\.\d+/],
  ["a different parent preset", () => school(PRESET_RULES_VERSION.semantic, "semantic"), /extends semantic, but the theme is being built with --preset shadcn/],
  ["a token the preset does not emit", () => extension("custom-token", { name: "x", version: "1.0.0", extends: { preset: "shadcn", version: PRESET_RULES_VERSION.shadcn } }, 'dark.set("brand-glow", rules.color("#ff00ff"));'), /"brand-glow" is not a shadcn token/],
] as const)("an extension naming %s is refused", async (_, make, message) => {
  const ext = await loadBookExtension(make());
  expect(() => build({ extension: ext })).toThrow(message);
});

test.each([
  ["a version that is not semver", { name: "x", version: "one", extends: { preset: "shadcn", version: "1.0.0" } }, /version "one" must be semver/],
  ["a version with a leading zero", { name: "x", version: "01.0.0", extends: { preset: "shadcn", version: "1.0.0" } }, /version "01\.0\.0" must be semver/],
  ["a parent version that is not semver", { name: "x", version: "1.0.0", extends: { preset: "shadcn", version: "latest" } }, /extends\.version "latest" must be semver/],
  ["no parent", { name: "x", version: "1.0.0" }, /must name its parent: extends \{ preset, version \}/],
  ["no name", { version: "1.0.0", extends: { preset: "shadcn", version: "1.0.0" } }, /must have a name/],
] as const)("an extension with %s fails to load", async (_, header, message) => {
  await expect(loadBookExtension(extension(`bad-${Math.random().toString(36).slice(2)}`, header, ""))).rejects.toThrow(message);
});

test("an extension without apply fails to load", async () => {
  const path = join(dir, "no-apply.ts");
  writeFileSync(path, `export default { name: "x", version: "1.0.0", extends: { preset: "shadcn", version: "1.0.0" } };\n`);
  await expect(loadBookExtension(path)).rejects.toThrow(/must export an apply function/);
});

test("the recipe records the preset's rules version and the extension's name, version and hash", async () => {
  const path = school();
  const extended = build({ extension: await loadBookExtension(path) });
  const sha256 = new Bun.CryptoHasher("sha256").update(readFileSync(path)).digest("hex");
  expect(extended.recipe.book).toEqual({
    preset: "shadcn",
    rulesVersion: PRESET_RULES_VERSION.shadcn,
    extension: { name: "school", version: "1.0.0", sha256 },
  });
  expect(build().recipe.book).toEqual({ preset: "shadcn", rulesVersion: PRESET_RULES_VERSION.shadcn });
});

test("the CLI builds with --book, and refuses a stale parent with exit 2", async () => {
  const ok = Bun.spawnSync([CLI, "theme", "--seed", "#0f766e", "--preset", "shadcn", "--mood", "editorial", "--standard", "wcag-aaa", "--format", "json", "--book", school()]);
  expect(ok.exitCode).toBe(0);
  expect(JSON.parse(ok.stdout.toString()).recipe.book.extension.name).toBe("school");

  const stale = Bun.spawnSync([CLI, "theme", "--seed", "#0f766e", "--preset", "shadcn", "--book", school("0.0.1")]);
  expect(stale.exitCode).toBe(2);
  expect(stale.stderr.toString()).toMatch(/extends shadcn@0\.0\.1, but this theme-book's shadcn rules are/);
});

test("the CLI refuses an empty --book and a leading-zero version with exit 2", () => {
  const empty = Bun.spawnSync([CLI, "theme", "--seed", "#0f766e", "--book="]);
  expect([empty.exitCode, empty.stderr.toString()]).toEqual([2, expect.stringMatching(/--book requires a file path/)]);
  const zero = extension("leading-zero", { name: "x", version: "01.0.0", extends: { preset: "shadcn", version: PRESET_RULES_VERSION.shadcn } }, "");
  const bad = Bun.spawnSync([CLI, "theme", "--seed", "#0f766e", "--book", zero]);
  expect([bad.exitCode, bad.stderr.toString()]).toEqual([2, expect.stringMatching(/version "01\.0\.0" must be semver/)]);
});

test("the recipe command replays the --book path literally in a POSIX shell", async () => {
  const loaded = await loadBookExtension(school());
  const awkward = "/tmp/it's $HOME `x` \\ a b.ts"; // quote, expansion, substitution, backslash, spaces
  const command = build({ extension: { ...loaded, path: awkward } }).recipe.command;
  const arg = command.split(" --book ")[1]!;
  // Let sh parse the quoted word back, and compare it with the real path.
  expect(Bun.spawnSync(["sh", "-c", `printf '%s' ${arg}`]).stdout.toString()).toBe(awkward);
});

test("an extension loads from a path with a backslash, quote, spaces, # and ?", async () => {
  const path = join(dir, "it's \\ a b #h ?q.ts");
  const bytes = readFileSync(school());
  writeFileSync(path, bytes);
  const loaded = await loadBookExtension(path);
  expect(loaded.path).toBe(path);
  expect(loaded.sha256).toBe(new Bun.CryptoHasher("sha256").update(bytes).digest("hex"));
});

test("reloading a rewritten extension applies the new rules, and the hash describes them", async () => {
  const header = { name: "rewritten", version: "1.0.0", extends: { preset: "shadcn", version: PRESET_RULES_VERSION.shadcn } };
  const path = extension("rewritten", header, LIGHTER_DARK);
  const first = await loadBookExtension(path);
  extension("rewritten", { ...header, version: "2.0.0" }, LIGHTER_DARK.replace("0.145", "0.3"));
  const second = await loadBookExtension(path);
  const bytes = readFileSync(path);
  expect(second.version).toBe("2.0.0");
  expect(second.sha256).toBe(new Bun.CryptoHasher("sha256").update(bytes).digest("hex"));
  expect(second.sha256).not.toBe(first.sha256);
  expect(build({ extension: second }).dark.background).not.toBe(build({ extension: first }).dark.background);
});

// flyingrobots/theme-book#24: the hash names the extension module, which may import nothing.
const HEADER = `name: "x", version: "1.0.0", extends: { preset: "shadcn", version: "${PRESET_RULES_VERSION.shadcn}" }`;
const module = (name: string, source: string) => {
  const path = join(dir, `${name}.ts`);
  writeFileSync(path, source);
  return path;
};
const helper = module("helper", `export const L = "oklch(0.5 0.3 30)";\n`);

test.each([
  ["a relative static import", `import { L } from "./helper.ts";`, /imports "\.\/helper\.ts"/],
  ["an absolute static import", `import { L } from ${JSON.stringify(helper)};`, /imports ".*\/helper\.ts"/],
  ["a bare import of design-book", `import "design-book";`, /imports "design-book"/],
  ["a node: import", `import { readFileSync } from "node:fs";`, /imports "node:fs"/],
  ["a re-export", `export * from ${JSON.stringify(helper)};`, /imports ".*\/helper\.ts"/],
  ["a literal dynamic import", `const m = await import(${JSON.stringify(helper)});`, /imports ".*\/helper\.ts"/],
  ["a computed dynamic import", `const p = ${JSON.stringify(helper)}; const m = await import(p);`, /uses import\(\)/],
  ["a literal require", `const fs = require("node:fs");`, /imports "node:fs"/],
  ["a computed require", `const n = "node:fs"; const fs = require(n);`, /uses require/],
  ["import.meta.require", `const fs = import.meta.require("node:fs");`, /uses import\.meta/],
] as const)("an extension with %s is refused before it runs", async (name, line, message) => {
  const marker = join(dir, `ran-${name.replace(/\W+/g, "-")}`);
  const path = module(`import-${name.replace(/\W+/g, "-")}`, `${line}\nawait Bun.write(${JSON.stringify(marker)}, "ran");\nexport default { ${HEADER}, apply() {} };\n`);
  const err = await loadBookExtension(path).then(() => undefined, (e: unknown) => e);
  expect(err).toBeInstanceOf(ExtensionError);
  expect((err as Error).message).toMatch(/must import nothing/);
  expect((err as Error).message).toMatch(message);
  expect(existsSync(marker)).toBe(false); // refused from the bytes, before any of its code ran
});

test("a type-only import is allowed, since it is erased and loads nothing", async () => {
  const path = module("type-only", `import type { BookExtension } from "./extension";\nexport default { ${HEADER}, apply() {} } as unknown as BookExtension;\n`);
  expect((await loadBookExtension(path)).name).toBe("x");
});

test("the CLI refuses an extension that imports, with exit 2", () => {
  const path = module("cli-import", `import "design-book";\nexport default { ${HEADER}, apply() {} };\n`);
  const r = Bun.spawnSync([CLI, "theme", "--seed", "#0f766e", "--book", path]);
  expect([r.exitCode, r.stderr.toString()]).toEqual([2, expect.stringMatching(/must import nothing, but imports "design-book"/)]);
});

test("an async apply is refused, in the library and the CLI with exit 2", async () => {
  const path = module("async-apply", `export default { ${HEADER}, async apply({ dark, rules }) { await 0; dark.set("background", rules.color("#f00")); } };\n`);
  expect(() => build({ extension: undefined })).not.toThrow();
  const loaded = await loadBookExtension(path);
  expect(() => build({ extension: loaded })).toThrow(/x@1\.0\.0 .*apply must return nothing; it returned a promise/);
  const r = Bun.spawnSync([CLI, "theme", "--seed", "#0f766e", "--book", path]);
  expect([r.exitCode, r.stderr.toString()]).toEqual([2, expect.stringMatching(/apply must return nothing; it returned a promise/)]);
});

test("set() after apply returns throws", async () => {
  const path = module("late-set", `export default { ${HEADER}, apply(ctx) { globalThis.__lateCtx = ctx; } };\n`);
  build({ extension: await loadBookExtension(path) });
  const ctx = (globalThis as { __lateCtx?: { dark: { set(t: string, r: unknown): void }; rules: { color(c: string): unknown } } }).__lateCtx!;
  expect(() => ctx.dark.set("background", ctx.rules.color("#f00"))).toThrow(/extension x@1\.0\.0 \(.*\): set\(\) after apply returned/);
  expect(() => ctx.dark.set("background", ctx.rules.color("#f00"))).toThrow(ExtensionError);
});

test.each([
  ["an apply that throws", `apply() { throw new Error("boom"); }`, /apply threw: boom/],
  ["a rule naming a missing token", `apply({ dark, rules }) { dark.set("background", rules.ref("light.nope")); }`, /rules failed to resolve: .*nope/],
  ["a rule that is not an expression", `apply({ dark }) { dark.set("background", "red"); }`, /rules failed to resolve/],
] as const)("%s exits 2 naming the extension and its path", async (name, apply, message) => {
  const path = module(`errors-${name.replace(/\W+/g, "-")}`, `export default { ${HEADER}, ${apply} };\n`);
  const loaded = await loadBookExtension(path);
  expect(() => build({ extension: loaded })).toThrow(ExtensionError);
  const r = Bun.spawnSync([CLI, "theme", "--seed", "#0f766e", "--book", path]);
  const stderr = r.stderr.toString();
  expect([r.exitCode, stderr.includes(`extension x@1.0.0 (${path})`)]).toEqual([2, true]);
  expect(stderr).toMatch(message);
});

test("--book-sha256 accepts the extension's hash and refuses any other before running it, with exit 2", () => {
  const path = school();
  const sha = new Bun.CryptoHasher("sha256").update(readFileSync(path)).digest("hex");
  const run = (...args: string[]) => Bun.spawnSync([CLI, "theme", "--seed", "#0f766e", ...args]);
  expect(run("--book", path, "--book-sha256", sha).exitCode).toBe(0);
  expect(run("--book", path, "--book-sha256", sha.toUpperCase()).exitCode).toBe(0);
  const wrong = run("--book", path, "--book-sha256", "0".repeat(64));
  expect([wrong.exitCode, wrong.stderr.toString()]).toEqual([2, expect.stringMatching(new RegExp(`sha256 is ${sha}, but --book-sha256 is 0{64}`))]);
  const marker = join(dir, "sha-mismatch-ran");
  const side = module("sha-side-effect", `await Bun.write(${JSON.stringify(marker)}, "ran");\nexport default { ${HEADER}, apply() {} };\n`);
  expect(run("--book", side, "--book-sha256", "0".repeat(64)).exitCode).toBe(2);
  expect(existsSync(marker)).toBe(false);
  const malformed = run("--book", path, "--book-sha256", "abc");
  expect([malformed.exitCode, malformed.stderr.toString()]).toEqual([2, expect.stringMatching(/--book-sha256 must be 64 hex digits/)]);
  const alone = run("--book-sha256", sha);
  expect([alone.exitCode, alone.stderr.toString()]).toEqual([2, expect.stringMatching(/--book-sha256 requires --book/)]);
}, 30_000); // seven CLI runs

test("the recipe command records --book-sha256, so replaying it refuses a rewritten extension", () => {
  const header = { name: "replayed", version: "1.0.0", extends: { preset: "shadcn", version: PRESET_RULES_VERSION.shadcn } };
  const path = extension("replayed", header, LIGHTER_DARK);
  const first = Bun.spawnSync([CLI, "theme", "--seed", "#0f766e", "--format", "json", "--book", path]);
  const recipe = JSON.parse(first.stdout.toString()).recipe as { command: string; book: { extension: { sha256: string } } };
  expect(recipe.command).toContain(` --book-sha256 ${recipe.book.extension.sha256} --book `);
  const replay = () => Bun.spawnSync(["sh", "-c", recipe.command.replace(/^theme-book /, `${JSON.stringify(CLI)} `)]);
  expect(replay().exitCode).toBe(0);
  extension("replayed", header, LIGHTER_DARK.replace("0.145", "0.3"));
  const stale = replay();
  expect([stale.exitCode, stale.stderr.toString()]).toEqual([2, expect.stringMatching(/but --book-sha256 is/)]);
}, 30_000); // three CLI runs

test("an apply whose return value throws when inspected exits 2 naming the extension and its path", async () => {
  // CodeRabbit on flyingrobots/theme-book#25: reading `then` on the returned value runs the extension's code too.
  const path = module("throwing-then", `export default { ${HEADER}, apply() { return { get then() { throw new Error("boom"); } }; } };\n`);
  const loaded = await loadBookExtension(path);
  expect(() => build({ extension: loaded })).toThrow(ExtensionError);
  expect(() => build({ extension: loaded })).toThrow(/apply returned a value that threw when inspected: boom/);
  const r = Bun.spawnSync([CLI, "theme", "--seed", "#0f766e", "--book", path]);
  const stderr = r.stderr.toString();
  expect([r.exitCode, stderr.includes(`extension x@1.0.0 (${path})`)]).toEqual([2, true]);
  expect(stderr).toMatch(/apply returned a value that threw when inspected: boom/);
});
