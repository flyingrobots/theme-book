// For each failing palette from the sweeps: the failing pairs' exact WCAG ratio in the default
// (OKLCH) serialization, and whether the same palette passes when serialized as hex.
import { buildThemeBook } from "~/.local/state/baker-street/cases/2026-11-27-theme-book-pr30-r2/subject/src/books";
const lines = (await Bun.stdin.text()).split("\n").filter((l) => / status=fail/.test(l));
for (const line of lines) {
  const mood = line.split(" ")[0] as "corporate" | "freak";
  const seeds = JSON.parse(line.slice(mood.length + 1, line.indexOf(" status=")));
  const t = buildThemeBook({ seeds, preset: "shadcn", mood, generator: "oklch" });
  const h = buildThemeBook({ seeds, preset: "shadcn", mood, generator: "oklch", hexOutput: true });
  const bad = t.audit.pairs.filter((p: any) => p.required && !p.pass).map((p: any) => `${p.mode}:${p.fgToken}/${p.bgToken} ${p.wcagExact.toFixed(5)}<${p.requiredWcag}`);
  console.log(`${mood} ${JSON.stringify(seeds)} oklch=${t.audit.status} hex=${h.audit.status} | ${bad.join(", ")}`);
}
