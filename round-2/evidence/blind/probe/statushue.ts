// Classify secondary/accent of status-hued brands with the project's own statusHue().
import { buildThemeBook } from "~/.local/state/baker-street/cases/2026-11-27-theme-book-pr30-r2/subject/src/books";
import { statusHue } from "~/.local/state/baker-street/cases/2026-11-27-theme-book-pr30-r2/subject/src/derived";
import { parseToOklch } from "~/.local/state/baker-street/cases/2026-11-27-theme-book-pr30-r2/subject/src/palette";
for (const seeds of [["#dc2626"], ["#16a34a"], ["#16a34a", "#ca8a04"], ["#ca8a04"], ["#dc2626", "#2563eb"]])
  for (const mood of ["corporate", "freak"] as const) {
    const t = buildThemeBook({ seeds, preset: "shadcn", mood, generator: "oklch" });
    const row = ["secondary", "accent"].flatMap((k) => (["light", "dark"] as const).map((m) => {
      const h = (t as any)[m][k].hex; const c = parseToOklch(h);
      return `${m}.${k}=${h}(C${c.c.toFixed(3)} H${(c.h ?? 0).toFixed(0)} status=${statusHue(h) ?? "-"})`;
    }));
    console.log(mood, JSON.stringify(seeds), row.join(" "));
  }
