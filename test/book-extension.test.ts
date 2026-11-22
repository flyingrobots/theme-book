// Versioned preset rules, and extensions that name their parent and version (flyingrobots/theme-book#22).
import { expect, test } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { PRESET_RULES_VERSION, buildThemeBook, presetRulesFingerprint, presetRulesLines, type ThemePreset } from "../src/books";
import { loadBookExtension } from "../src/extension";

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
});

test("a preset's fingerprint depends on its rules, not on the seeds", () => {
  // Other seeds of the same three kinds: the rules are the same, so the fingerprint must be too.
  const others = { chromatic: ["#2563eb"], achromatic: ["#555555"], "two-seed": ["#2563eb", "#eab308"] };
  expect(presetRulesFingerprint("shadcn", others)).toBe(presetRulesFingerprint("shadcn"));
});

test("the fingerprint covers the achromatic, second-seed, AAA and APCA rule branches", () => {
  const lines = presetRulesLines("shadcn");
  const configs = new Set(lines.map((l) => l.split(" ")[0]));
  // 5 moods x 3 standards x 3 kinds of seed set.
  expect(configs.size).toBe(45);
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
