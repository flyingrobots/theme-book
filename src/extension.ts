// Book extensions: a site's own rules on top of a preset (flyingrobots/theme-book#22).
// An extension names itself, its version, and the preset and preset rules version it extends.
// Its rules are design-book expressions, built with constructors passed to `apply`, so an
// extension file needs no imports and carries no dependency on design-book itself.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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

const SEMVER = /^\d+\.\d+\.\d+$/;
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
  const mod = (await import(path)) as { default?: unknown };
  const def = mod.default;
  const fail = (msg: string): never => {
    throw new ExtensionError(`extension ${path}: ${msg}`);
  };
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
    sha256: new Bun.CryptoHasher("sha256").update(bytes).digest("hex"),
    path,
  };
}
