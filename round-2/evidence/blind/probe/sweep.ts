// Blind-pass sweep: build corporate and freak themes over a seeded random corpus and fixed edge
// cases; report every required audit pair that fails (oracle: the project's own evaluateAudit,
// already run inside buildThemeBook), plus exceptions. Run from the subject root.
import { buildThemeBook } from "~/.local/state/baker-street/cases/2026-11-27-theme-book-pr30-r2/subject/src/books";
const SUBJECT = "~/.local/state/baker-street/cases/2026-11-27-theme-book-pr30-r2/subject";
let seed = Number(process.env.SEED ?? 20261127);
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
const hex = () => "#" + [0, 0, 0].map(() => Math.floor(rnd() * 256).toString(16).padStart(2, "0")).join("");
const N = Number(process.env.N ?? 400);
const fixed: string[][] = [
  ["#000000"], ["#ffffff"], ["#808080"], ["#000000", "#ffffff"], ["#6b7280"], ["#64748b"],
  ["#ff0000"], ["#00ff00"], ["#0000ff"], ["#ffff00"], ["#00ffff"], ["#ff00ff"],
  ["#facc15"], ["#fef08a"], ["#1e1b4b"], ["#3b0764"], ["#2563eb", "#3b0764"],
  ["#dc2626"], ["#16a34a"], ["#ca8a04", "#16a34a", "#dc2626"],
  ["#f5f5f5", "#0a0a0a"], ["#fdf6e3", "#002b36"], ["#ffffff", "#2563eb"], ["#111111", "#2563eb"],
  ["#2563eb", "#2563eb", "#2563eb"], ["#e5e7eb", "#d1d5db", "#9ca3af"], ["#7f7f7f", "#7f7f80"],
  ["#0d0d0d", "#fafafa", "#ff6600"], ["#ffe4e6", "#2563eb"], ["#fff1f2", "#9f1239"],
];
const corpus: string[][] = [...fixed];
for (let i = 0; i < N; i++) corpus.push(Array.from({ length: 1 + Math.floor(rnd() * 7) }, hex));
const fails: string[] = [];
let built = 0, advisoryRuns = 0;
for (const seeds of corpus) for (const mood of ["corporate", "freak"] as const) {
  try {
    const t = buildThemeBook({ seeds, preset: "shadcn", mood, generator: "oklch", standard: (process.env.STD as any) || undefined });
    built++;
    if (t.audit.chartsAdvisory) advisoryRuns++;
    const bad = t.audit.pairs.filter((p: any) => p.required && !p.pass);
    if (bad.length || t.audit.status !== "pass")
      fails.push(`${mood} ${JSON.stringify(seeds)} status=${t.audit.status} ${bad.map((p: any) => `${p.mode}:${p.fgToken}/${p.bgToken}=${(p.wcagRatio ?? p.ratio ?? "?")}`).join(" ")}`);
  } catch (e) {
    fails.push(`${mood} ${JSON.stringify(seeds)} THREW ${(e as Error).message}`);
  }
}
console.log(`subject=${SUBJECT} seed0=${process.env.SEED ?? 20261127} palettes=${corpus.length} built=${built} chartsAdvisoryRuns=${advisoryRuns} failures=${fails.length}`);
for (const f of fails) console.log(f);
