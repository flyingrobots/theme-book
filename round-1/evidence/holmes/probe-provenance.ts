// Probe: are palette colors real functions of the seeds they reference, or literals with a nominal reference?
// Build Owl Coral corporate, then replace the referenced seeds in the book and re-resolve.
import { color } from "design-book";
import { buildThemeBook } from "../../subject/src/books";
const t = buildThemeBook({ seeds: ["#e88e8d", "#79cce2", "#d1a45f", "#60bd90", "#cfa0e8", "#292c2f"], preset: "shadcn", mood: "corporate", generator: "oklch" });
const keys = ["palette.light-page", "palette.light-on-primary", "palette.primary-light", "palette.primary-dark", "light.primary", "dark.primary", "light.primary-foreground"];
const before = Object.fromEntries(keys.map((k) => [k, String(t.book.resolve(k))]));
console.log("rule light-on-primary:", JSON.stringify(t.light["primary-foreground"]!.rule));
console.log("deps palette.light-on-primary:", t.book.inspect("palette.light-on-primary")?.dependencies);
const seeds = t.book.getScope("seeds")!;
for (let i = 0; i < 6; i++) seeds.set(`seed-${i}`, color("#00ff00"));
const after = Object.fromEntries(keys.map((k) => [k, String(t.book.resolve(k))]));
for (const k of keys) console.log(k.padEnd(28), before[k], "->", after[k]);
// Controls: the seed itself re-resolves (no stale cache), and a relativeTo with a kept channel follows the seed.
import { ref, relativeTo } from "design-book";
console.log("control seeds.seed-0 now:", String(t.book.resolve("seeds.seed-0")));
t.book.getScope("palette")!.set("control-kept-hue", relativeTo(ref("seeds.seed-0"), "oklch", [0.5, 0.1, null]));
console.log("control relativeTo [0.5,0.1,null] of seed-0 (#00ff00):", String(t.book.resolve("palette.control-kept-hue")));
seeds.set("seed-0", color("#0000ff"));
console.log("control after seed-0 -> #0000ff:", String(t.book.resolve("palette.control-kept-hue")), "| primary-light still", String(t.book.resolve("palette.primary-light")));
