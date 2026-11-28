// Check destructive claims: light holds white (>=4.5); dark at 60% over the dark page vs light red (OKLab distance)
// and white text on that composite; light destructive vs a red primary (OKLab distance >= 0.12 claimed by code).
import { converter, differenceEuclidean, formatHex, parse } from "culori";
import { buildThemeBook } from "../../subject/src/books";
import { wcagRatio } from "../../subject/src/audit";
const rgb = converter("rgb"), dE = differenceEuclidean("oklab");
const over = (fg: string, bg: string, a: number) => { const f = rgb(parse(fg)!)!, b = rgb(parse(bg)!)!; return formatHex({ mode: "rgb", r: f.r * a + b.r * (1 - a), g: f.g * a + b.g * (1 - a), b: f.b * a + b.b * (1 - a) })!; };
for (const seeds of [["#e88e8d", "#79cce2", "#d1a45f", "#60bd90", "#cfa0e8", "#292c2f"], ["#d32f2f"], ["#e11d48", "#2563eb"], ["#ffffff", "#000000"], ["#0f766e"]]) for (const mood of ["corporate", "freak"] as const) {
  const t = buildThemeBook({ seeds, preset: "shadcn", mood, generator: "oklch" });
  const L = t.light.destructive!.hex, D = t.dark.destructive!.hex, page = t.dark.background!.hex, comp = over(D, page, 0.6);
  console.log(mood, seeds.join(","), `light ${L} white ${wcagRatio("#ffffff", L).toFixed(2)} | dark token ${D} @60% over ${page} = ${comp}, dE to light red ${dE(comp, L).toFixed(3)}, white on composite ${wcagRatio("#ffffff", comp).toFixed(2)} | dE(destructive, primary) ${dE(L, t.light.primary!.hex).toFixed(3)}`);
}
