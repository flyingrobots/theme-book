// Dump resolved hex and audit status of every existing mood x preset x standard x seed set,
// from the tree given as argv[2], to compare head with 7a41cc1 (same vendored engine).
const root = process.argv[2]!;
const { buildThemeBook } = await import(`${root}/src/books.ts`);
const moods = ["neutral", "muted", "vivid", "editorial", "high-contrast"];
const seedSets = [["#0f766e"], ["#777777"], ["#c2410c", "#0f766e"], ["#2563eb"], ["#e88e8d", "#79cce2", "#d1a45f"]];
const lines: string[] = [];
for (const preset of ["shadcn", "semantic", "slide-deck"])
  for (const mood of moods)
    for (const standard of ["wcag-aa", "wcag-aaa", "apca"])
      for (const seeds of seedSets) {
        const t = buildThemeBook({ seeds, preset, mood, generator: "oklch", standard });
        const tok = t.lightKeys.map((k: string) => `${k}=${t.light[k].hex}|${t.dark[k].hex}`).join(" ");
        lines.push(`${preset}/${mood}/${standard}/${seeds.join(",")} audit=${t.audit.status}:${t.audit.passed}/${t.audit.failed} ${tok} chartDiag=${JSON.stringify(t.chartDiagnostics)}`);
      }
console.log(lines.join("\n"));
