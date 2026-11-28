// M-A-3: dump legacy-mood outputs for comparison between base and head. Usage: bun legacy-dump.ts <repoRoot>
const root = process.argv[2]!;
const { buildThemeBook } = await import(`${root}/src/books.ts`);
const seedSets = [["#0f766e"], ["#777777"], ["#2563eb", "#c2410c"], ["#e88e8d", "#79cce2", "#d1a45f"], ["#ff0000"], ["#facc15"], ["#111111", "#eeeeee"]];
const rows: string[] = [];
for (const preset of ["shadcn", "semantic", "slide-deck"]) for (const mood of ["neutral", "muted", "vivid", "editorial", "high-contrast"])
  for (const standard of [undefined, "wcag-aa", "wcag-aaa", "apca"]) for (const generator of ["oklch", "poline", "rampensau"]) for (const seeds of seedSets) {
    const t = buildThemeBook({ seeds, preset, mood, generator, standard });
    const modes = ["light", "dark"].map((m) => Object.keys(t[m]).sort().map((k) => `${k}=${t[m][k].hex}`).join(","));
    rows.push([preset, mood, standard ?? "-", generator, seeds.join("+"), t.audit.status, t.audit.passed, t.audit.failed, t.audit.advisoryCount, ...modes].join("\t"));
  }
console.log(rows.join("\n"));
