// M-A-5: derived builds that PASS at generation but whose chart bars fail 3:1 (would a standalone audit fail?)
import { buildThemeBook } from "../../../subject/src/books";
const sets = [["#2563eb"], ["#0f766e", "#c2410c"], ["#ffffff", "#000000"], ["#e88e8d", "#79cce2", "#d1a45f", "#60bd90", "#cfa0e8", "#292c2f"], ["#facc15"], ["#7c3aed", "#db2777", "#0891b2"]];
let n = 0;
for (const seeds of sets) for (const mood of ["corporate", "freak"] as const) {
  const t = buildThemeBook({ seeds, preset: "shadcn", mood, generator: "oklch" });
  const chartFails = t.audit.pairs.filter((p: any) => /^chart-\d$/.test(p.fgToken) && !p.pass).map((p: any) => `${p.mode} ${p.fgToken}/${p.bgToken} ${p.wcagExact.toFixed(3)}`);
  console.log(JSON.stringify({ seeds, mood, status: t.audit.status, chartFails }));
}
