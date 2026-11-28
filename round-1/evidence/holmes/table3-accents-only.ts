// Variant (accents without primary) of Table 3 of docs/topics/derived-moods: per theme, OLS of dark L on light L over primary+accents,
// mean lift (dark L - light L), and chroma ratio (two definitions), in OKLCH via culori.
import { converter, parse } from "culori";
import { FAMOUS_THEMES } from "../../subject/scripts/benchmark/famous-themes";
const ok = converter("oklch");
for (const t of FAMOUS_THEMES) {
  const L = t.light.accents.map((h) => ok(parse(h)!)!);
  const D = t.dark.accents.map((h) => ok(parse(h)!)!);
  const x = L.map((c) => c.l), y = D.map((c) => c.l), n = x.length;
  const mx = x.reduce((a, b) => a + b) / n, my = y.reduce((a, b) => a + b) / n;
  const sxy = x.reduce((s, xi, i) => s + (xi - mx) * (y[i]! - my), 0), sxx = x.reduce((s, xi) => s + (xi - mx) ** 2, 0), syy = y.reduce((s, yi) => s + (yi - my) ** 2, 0);
  const slope = sxx ? sxy / sxx : NaN, off = my - slope * mx, r2 = sxx && syy ? (sxy * sxy) / (sxx * syy) : NaN;
  const lift = my - mx;
  const kRatioOfMeans = D.reduce((s, c) => s + c.c, 0) / L.reduce((s, c) => s + c.c, 0);
  const kMeanRatio = D.reduce((s, c, i) => s + c.c / L[i]!.c, 0) / n;
  console.log(t.name.padEnd(11), `slope ${slope.toFixed(2)} offset ${off >= 0 ? "+" : ""}${off.toFixed(2)} R2 ${r2.toFixed(2)} lift ${lift >= 0 ? "+" : ""}${lift.toFixed(2)} k(ratio of means) ${kRatioOfMeans.toFixed(2)} k(mean ratio) ${kMeanRatio.toFixed(2)}`);
}
