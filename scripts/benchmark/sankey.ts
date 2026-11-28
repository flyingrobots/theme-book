#!/usr/bin/env bun
/**
 * A Mermaid sankey-beta of how a derived theme is built: each seed flows into the light roles made
 * from it, and each dark role from the light role its recorded references reach (dark rings from
 * light primary), or from its own seed when it reaches none (dark surfaces, text and borders).
 * Values are computed and stored fixed.
 * `bun scripts/benchmark/sankey.ts` prints the block for the README.
 */
import { buildThemeBook } from "../../src/books";

const SEEDS = ["#e88e8d", "#79cce2", "#d1a45f", "#60bd90", "#cfa0e8", "#292c2f"];
const NAMES: Record<string, string> = {
  "#e88e8d": "coral", "#79cce2": "blue", "#d1a45f": "ochre", "#60bd90": "green", "#cfa0e8": "violet", "#292c2f": "charcoal",
};
const GROUPS: [string, RegExp][] = [
  ["surfaces", /^(background|card|popover|sidebar)$/],
  ["text", /foreground$/],
  ["lines", /^(border|input|ring|sidebar-border|sidebar-ring)$/],
  ["primary", /^(primary|sidebar-primary)$/],
  ["secondary and accent", /^(secondary|accent|muted|sidebar-accent)$/],
  ["destructive", /^destructive$/],
  ["charts", /^chart-\d$/],
];
const groupOf = (k: string) => GROUPS.find(([, re]) => re.test(k))?.[0] ?? "other";

const t = buildThemeBook({ seeds: SEEDS, preset: "shadcn", mood: "corporate", generator: "oklch" });

/** The seed a token comes from, followed through its references; or why it has none. */
function origin(key: string, seen = new Set<string>()): string {
  if (seen.has(key)) return "fixed";
  seen.add(key);
  if (key.startsWith("seeds.")) {
    const hex = String(t.book.resolve(key)).toLowerCase();
    return `seed ${NAMES[hex] ?? hex}`;
  }
  const deps = t.book.inspect(key)?.dependencies ?? [];
  if (deps.length === 0) return key === "palette.destructive-light" ? "fixed status red" : "fixed";
  for (const d of deps) {
    const o = origin(d, seen);
    if (o !== "fixed") return o;
  }
  return "fixed";
}

const flows = new Map<string, number>();
const add = (a: string, b: string) => flows.set(`${a}\u0000${b}`, (flows.get(`${a}\u0000${b}`) ?? 0) + 1);
/** The light role a token's references reach (a light token or a light palette entry), if any. */
function lightRole(key: string, seen = new Set<string>()): string | undefined {
  if (seen.has(key)) return undefined;
  seen.add(key);
  if (key.startsWith("light.")) return key.slice("light.".length);
  const m = /^palette\.(.*)-light$/.exec(key);
  if (m) return m[1];
  for (const d of t.book.inspect(key)?.dependencies ?? []) {
    const r = lightRole(d, seen);
    if (r) return r;
  }
  return undefined;
}
for (const k of t.lightKeys) add(origin(`light.${k}`), `light ${groupOf(k)}`);
// A dark token flows from the light role it derives from (dark rings from light primary); a dark token
// that derives from no light color flows from its own origin (dark surfaces from the seed).
for (const k of t.darkKeys) {
  const role = lightRole(`dark.${k}`);
  add(role ? `light ${groupOf(role)}` : origin(`dark.${k}`), `dark ${groupOf(k)}`);
}
const csv = (s: string) => (/[,"]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
// linkColor gradient: each flow takes its nodes' colors, so it shows on light and dark pages alike.
console.log("```mermaid\n---\nconfig:\n  sankey:\n    linkColor: gradient\n---\nsankey-beta\n");
for (const [k, v] of [...flows].sort()) {
  const [a, b] = k.split("\u0000");
  console.log(`${csv(a!)},${csv(b!)},${v}`);
}
console.log("```");
