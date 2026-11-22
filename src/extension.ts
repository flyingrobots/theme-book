// Book extensions: a site's own rules on top of a preset (flyingrobots/theme-book#22).
// An extension names itself, its version, and the preset and preset rules version it extends.
// Its rules are design-book expressions, built with constructors passed to `apply`, so an
// extension file needs no imports and carries no dependency on design-book itself.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  bestContrastWith,
  closest,
  color,
  colorMix,
  furthestFrom,
  leastVivid,
  minContrastWith,
  mostVivid,
  nth,
  ref,
  relativeTo,
  shade,
} from "design-book";
import "./eval-preload"; // an extension that does import design-book resolves it from theme-book's runtime

export class ExtensionError extends Error {}

/** The rule constructors an extension builds its rules with. */
export const RULES = {
  bestContrastWith,
  closest,
  color,
  colorMix,
  furthestFrom,
  leastVivid,
  minContrastWith,
  mostVivid,
  nth,
  ref,
  relativeTo,
  shade,
};

export interface ExtensionScope {
  set(token: string, rule: unknown): void;
}

export interface ExtensionContext {
  light: ExtensionScope;
  dark: ExtensionScope;
  rules: typeof RULES;
}

export interface BookExtension {
  name: string;
  version: string;
  extends: { preset: string; version: string };
  apply: (ctx: ExtensionContext) => void;
  sha256: string;
  path: string;
}

const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/; // semver core: no leading zeroes
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

/** Load and check an extension module. Throws ExtensionError naming the first problem. */
export async function loadBookExtension(file: string): Promise<BookExtension> {
  const path = resolve(file);
  let bytes: Buffer;
  try {
    bytes = readFileSync(path);
  } catch {
    throw new ExtensionError(`extension not found: ${path}`);
  }
  const fail = (msg: string): never => {
    throw new ExtensionError(`extension ${path}: ${msg}`);
  };
  const sha256 = new Bun.CryptoHasher("sha256").update(bytes).digest("hex");
  // Import a private copy of the hashed bytes, so the code applied is the code the hash names,
  // never a module an earlier load cached or a file rewritten after it was read.
  const copyDir = mkdtempSync(join(tmpdir(), "theme-book-book-"));
  let mod: { default?: unknown };
  try {
    const copy = join(copyDir, `${sha256}.ts`);
    writeFileSync(copy, bytes);
    mod = (await import(pathToFileURL(copy).href)) as { default?: unknown };
  } catch (err) {
    return fail(`failed to import: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    rmSync(copyDir, { recursive: true, force: true });
  }
  const def = mod.default;
  if (!isObj(def)) return fail("must have a default export");
  if (typeof def.name !== "string" || def.name === "") return fail("must have a name");
  if (typeof def.version !== "string" || !SEMVER.test(def.version)) return fail(`version ${JSON.stringify(def.version)} must be semver (major.minor.patch)`);
  const parent = def.extends;
  if (!isObj(parent) || typeof parent.preset !== "string") return fail("must name its parent: extends { preset, version }");
  if (typeof parent.version !== "string" || !SEMVER.test(parent.version)) return fail(`extends.version ${JSON.stringify(parent.version)} must be semver (major.minor.patch)`);
  if (typeof def.apply !== "function") return fail("must export an apply function");
  return {
    name: def.name,
    version: def.version,
    extends: { preset: parent.preset, version: parent.version },
    apply: def.apply as BookExtension["apply"],
    sha256,
    path,
  };
}
