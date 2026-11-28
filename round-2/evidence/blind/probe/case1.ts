// Inspect the failing palette from the seed-7 sweep.
import { buildThemeBook } from "~/.local/state/baker-street/cases/2026-11-27-theme-book-pr30-r2/subject/src/books";
import { wcagRatioExactCss } from "~/.local/state/baker-street/cases/2026-11-27-theme-book-pr30-r2/subject/src/audit";
import { parseToOklch } from "~/.local/state/baker-street/cases/2026-11-27-theme-book-pr30-r2/subject/src/palette";
const seeds = (process.argv[2] ?? "#b09551,#a58f24,#59193b").split(",");
for (const mood of ["corporate", "freak"] as const) {
  const t = buildThemeBook({ seeds, preset: "shadcn", mood, generator: "oklch" });
  console.log(mood, "status", t.audit.status, "exit", t.audit.exitCode);
  for (const m of ["light", "dark"] as const) {
    const g = (k: string) => (t as any)[m][k].hex as string;
    const o = (h: string) => { const c = parseToOklch(h); return `L${c.l.toFixed(3)} C${c.c.toFixed(3)} H${(c.h ?? 0).toFixed(0)}`; };
    for (const k of ["background", "card", "sidebar", "primary", "primary-foreground", "ring", "sidebar-ring"])
      console.log(` ${m} ${k} ${g(k)} ${o(g(k))}`);
    console.log(`  ring/background ${wcagRatioExactCss(g("ring"), g("background")).toFixed(4)} ring/card ${wcagRatioExactCss(g("ring"), g("card")).toFixed(4)} ring/sidebar ${wcagRatioExactCss(g("sidebar-ring"), g("sidebar")).toFixed(4)} primary-fg/primary ${wcagRatioExactCss(g("primary-foreground"), g("primary")).toFixed(4)}`);
  }
  console.log(" failing:", t.audit.pairs.filter((p: any) => p.required && !p.pass).map((p: any) => JSON.stringify(p)).join("\n  "));
}
