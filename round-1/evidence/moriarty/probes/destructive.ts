// M-A-9: destructive stands apart from a red primary; dark destructive at 60% over the page lands near light's red
import { buildThemeBook } from "../../../subject/src/books";
import { converter, differenceEuclidean, formatHex, parse } from "culori";
const dE = differenceEuclidean("oklab"); const rgb = converter("rgb");
const over = (fg: string, bg: string, a: number) => { const f = rgb(parse(fg)!)!, b = rgb(parse(bg)!)!; return formatHex({ mode: "rgb", r: f.r * a + b.r * (1 - a), g: f.g * a + b.g * (1 - a), b: f.b * a + b.b * (1 - a) })!; };
for (const seeds of [["#dc2626"], ["#e11d48"], ["#b91c1c", "#2563eb"], ["#df202e"], ["#2563eb"], ["#ffffff", "#000000"], ["#f4f4f5", "#18181b"]]) for (const mood of ["corporate", "freak"] as const) {
  const t = buildThemeBook({ seeds, preset: "shadcn", mood, generator: "oklch" });
  const ld = t.light.destructive!.hex, dd = t.dark.destructive!.hex, lp = t.light.primary!.hex, dbg = t.dark.background!.hex;
  const seen = over(dd, dbg, 0.6);
  console.log(JSON.stringify({ seeds, mood, lightPrimary: lp, lightDestr: ld, dE_primary_destr: +dE(lp, ld).toFixed(3), darkDestr: dd, darkSeenAt60: seen, dE_seen_vs_light: +dE(seen, ld).toFixed(3) }));
}
