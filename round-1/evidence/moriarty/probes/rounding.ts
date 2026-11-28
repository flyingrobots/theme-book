// M-A-2: is the failure the oklch rounding in put() (relativeTo with 4/4/2 decimals)?
import { buildThemeBook } from "../../../subject/src/books";
import { wcagRatio } from "../../../subject/src/audit";
const cases: [string[], "corporate" | "freak"][] = [
  [["#29da7e"], "corporate"], [["#be66e5"], "freak"],
  [["#041edd", "#a8caf8", "#27f51b", "#8de542", "#33822b", "#32fdd9"], "corporate"],
];
for (const [seeds, mood] of cases) {
  const t = buildThemeBook({ seeds, preset: "shadcn", mood, generator: "oklch" });
  for (const p of t.audit.pairs.filter((p: any) => p.required && !p.pass))
    console.log(JSON.stringify({ seeds, mood, pair: `${p.mode} ${p.fgToken}/${p.bgToken}`, fgRaw: p.fgRaw, fgHex: p.fgHex, bgRaw: p.bgRaw, bgHex: p.bgHex, wcagExact: p.wcagExact, hexRatio: wcagRatio(p.fgHex, p.bgHex), composited: p.composited }));
  const insp = (k: string) => t.book.inspect(k);
  console.log("  light-sidebar:", JSON.stringify(insp("palette.light-sidebar")?.expression ?? insp("palette.light-sidebar")).slice(0, 200));
}
