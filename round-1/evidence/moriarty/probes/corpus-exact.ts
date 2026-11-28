// M-A-1: corpus of palettes through corporate/freak; record required audit failures.
// Run from the subject worktree: bun <this file> [N]
import { buildThemeBook } from "$TMPDIR/…";
const N = Number(process.argv[2] ?? 300);
let seed = 12345;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const hex = () => "#" + [0, 1, 2].map(() => Math.floor(rnd() * 256).toString(16).padStart(2, "0")).join("");
const palettes: string[][] = [
  ["#0b1f3a", "#f59e0b"],           // very dark brand first
  ["#facc15"],                      // yellow brand only
  ["#fef08a", "#1e293b"],           // pale yellow first
  ["#16a34a", "#dc2626", "#eab308"],// status-only palette
  ["#ff0000"],                      // pure red brand
  ["#777777"],                      // achromatic grey
  ["#ffffff"],                      // white only
  ["#000000"],                      // black only
  ["#00ffff", "#ff00ff", "#ffff00"],
  ["#2563eb", "#2563eb", "#2563eb"],// duplicates
  ["#0f766e", "#7c3aed", "#db2777", "#ea580c", "#65a30d", "#0891b2", "#4f46e5"],
];
for (let i = 0; i < N; i++) palettes.push(Array.from({ length: 1 + Math.floor(rnd() * 6) }, hex));
const out: any[] = [];
let fails = 0, errors = 0;
for (const seeds of palettes) for (const mood of ["corporate", "freak"] as const) {
  try {
    const t = buildThemeBook({ seeds, preset: "shadcn", mood, generator: "oklch" });
    const bad = t.audit.pairs.filter((p: any) => p.required && !p.pass).map((p: any) => `${p.mode} ${p.fgToken}/${p.bgToken} ${p.wcag?.toFixed?.(2) ?? p.ratio}`);
    const unver = t.audit.pairs.filter((p: any) => p.required && p.pass === undefined).length;
    if (bad.length) { fails++; out.push({ seeds, mood, bad }); }
  } catch (e: any) { errors++; out.push({ seeds, mood, error: String(e?.message ?? e).slice(0, 200) }); }
}
console.log(JSON.stringify({ palettes: palettes.length, builds: palettes.length * 2, failingBuilds: fails, errors }, null, 0));
for (const o of out.slice(0, 60)) console.log(JSON.stringify(o));
