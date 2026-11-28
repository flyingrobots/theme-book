// Probe: build corporate and freak across palettes; report audit status, failing required pairs,
// failing chart pairs (hidden by chartsAdvisory), and role facts.
import { buildThemeBook } from "../../subject/src/books";
import { wcagRatio } from "../../subject/src/audit";
import { statusHue } from "../../subject/src/derived";
const palettes: Record<string, string[]> = {
  owlCoral: ["#e88e8d", "#79cce2", "#d1a45f", "#60bd90", "#cfa0e8", "#292c2f"],
  singleTeal: ["#0f766e"],
  singleRed: ["#d32f2f"],
  grey: ["#777777"],
  twoSeed: ["#0f766e", "#f59e0b"],
  yellowOnly: ["#facc15"],
  paleFirst: ["#f5f0e6", "#2563eb", "#9333ea"],
  greyFirst: ["#6b7280", "#2563eb"],
  deepNavyBrand: ["#0b1f4d", "#f97316"],
  neonLime: ["#ccff00", "#ff00ff", "#00ffff"],
  darkOnly: ["#111111", "#1a1a2e"],
  lowChromaRed: ["#2563eb", "#b07a78"],
  blackWhite: ["#000000", "#ffffff"],
  creamInk: ["#fdf6e3", "#002b36", "#268bd2", "#d33682", "#859900"],
  vividYellowPurple: ["#7c3aed", "#eab308", "#ef4444", "#22c55e"],
};
const out: any[] = [];
for (const mood of ["corporate", "freak"] as const) {
  for (const [name, seeds] of Object.entries(palettes)) {
    let t;
    try { t = buildThemeBook({ seeds, preset: "shadcn", mood, generator: "oklch" }); }
    catch (e) { out.push({ mood, name, error: String(e) }); continue; }
    const a = t.audit;
    const reqFail = a.pairs.filter((p) => p.required && !p.pass).map((p) => `${p.mode}:${p.fgToken}/${p.bgToken}=${p.wcag}`);
    const chartFail = a.pairs.filter((p) => /^chart-/.test(p.fgToken) && p.wcag < 3).map((p) => `${p.mode}:${p.fgToken}=${p.wcag}`);
    const h = (m: "light" | "dark", k: string) => (m === "light" ? t.light : t.dark)[k]!.hex;
    const roles = (m: "light" | "dark") => ({
      primary: h(m, "primary"), secondary: h(m, "secondary"), accent: h(m, "accent"),
      secStatus: statusHue(h(m, "secondary")) ?? null, accStatus: statusHue(h(m, "accent")) ?? null,
      destructive: h(m, "destructive"), whiteOnDestructive: Number(wcagRatio("#ffffff", h(m, "destructive")).toFixed(2)),
      bg: h(m, "background"),
    });
    out.push({ mood, name, status: a.status, passed: a.passed, failed: a.failed, reqFail, chartFail, light: roles("light"), dark: roles("dark") });
  }
}
console.log(JSON.stringify(out, null, 1));
