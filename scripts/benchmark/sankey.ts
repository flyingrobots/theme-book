#!/usr/bin/env bun
/**
 * A Mermaid sankey-beta of how a derived theme is built: each seed flows into the light roles made
 * from it, and each light role group into its dark counterpart. Drawn from the origin each color
 * records in the book; the values themselves are computed in TypeScript and stored fixed.
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
for (const k of t.lightKeys) {
  add(origin(`light.${k}`), `light ${groupOf(k)}`);
  add(`light ${groupOf(k)}`, `dark ${groupOf(k)}`);
}
const csv = (s: string) => (/[,"]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
console.log("```mermaid\nsankey-beta\n");
for (const [k, v] of [...flows].sort()) {
  const [a, b] = k.split("\u0000");
  console.log(`${csv(a!)},${csv(b!)},${v}`);
}
console.log("```");
