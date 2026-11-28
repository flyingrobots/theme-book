// Check: "the dark page's hue sits within 2-16 degrees of the light ink's in six of the seven"; dark page L about 0.24.
import { converter, parse } from "culori";
import { FAMOUS_THEMES } from "../../subject/scripts/benchmark/famous-themes";
const ok = converter("oklch");
const gap = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);
for (const t of FAMOUS_THEMES) {
  const ink = ok(parse(t.light.ink)!)!, page = ok(parse(t.dark.page)!)!;
  console.log(t.name.padEnd(11), `light ink h ${ink.h?.toFixed(1)} c ${ink.c.toFixed(3)} | dark page h ${page.h?.toFixed(1)} c ${page.c.toFixed(3)} L ${page.l.toFixed(3)} | gap ${ink.h !== undefined && page.h !== undefined ? gap(ink.h, page.h).toFixed(1) : "n/a"}`);
}
