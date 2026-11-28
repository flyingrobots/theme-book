// Dump legacy-mood outputs (hex, all presets) and shadcn rule lines for the source tree given in ROOT.
const ROOT = process.env.ROOT!;
const { buildThemeBook, presetRulesLines } = await import(`${ROOT}/src/books.ts`);
let seed = 99;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
const hex = () => "#" + [0, 0, 0].map(() => Math.floor(rnd() * 256).toString(16).padStart(2, "0")).join("");
const corpus = [["#0f766e"], ["#2563eb"], ["#000000"], ["#ffffff", "#000000"], ["#c2410c", "#0f766e"]];
for (let i = 0; i < 60; i++) corpus.push(Array.from({ length: 1 + Math.floor(rnd() * 4) }, hex));
const out: string[] = [];
for (const preset of ["shadcn", "semantic", "slide-deck"])
  for (const mood of ["neutral", "muted", "vivid", "editorial", "high-contrast"])
    for (const generator of ["oklch", "poline", "rampensau"])
      for (const seeds of corpus.slice(0, generator === "oklch" ? corpus.length : 8)) {
        const t = buildThemeBook({ seeds, preset, mood, generator, hexOutput: true });
        out.push(`${preset} ${mood} ${generator} ${seeds.join(",")} audit=${t.audit.status}/${t.audit.passed}/${t.audit.failed} ` +
          t.lightKeys.map((k: string) => `${k}=${t.light[k].hex}`).join(" ") + " | " + t.darkKeys.map((k: string) => `${k}=${t.dark[k].hex}`).join(" "));
      }
for (const l of presetRulesLines("shadcn")) if (!/^(freak|corporate)\//.test(l)) out.push(`RULE ${l}`);
console.log(out.join("\n"));
