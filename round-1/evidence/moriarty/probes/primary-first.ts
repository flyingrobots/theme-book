// M-A-7: "the first seed is always primary, a red brand included"
import { buildThemeBook } from "../../../subject/src/books";
import { parseToOklch } from "../../../subject/src/palette";
const cases = [
  ["#dc2626", "#2563eb"],            // red brand first (documented)
  ["#0b1f3a", "#f59e0b"],            // very dark navy brand first (L ~0.24)
  ["#1e1b4b", "#14b8a6"],            // deep indigo brand first
  ["#fde68a", "#2563eb"],            // pale yellow brand first (L > 0.93?)
  ["#8a8f98", "#2563eb"],            // slate brand first (low chroma)
  ["#292c2f", "#e88e8d"],            // charcoal first
];
for (const seeds of cases) for (const mood of ["corporate", "freak"] as const) {
  const t = buildThemeBook({ seeds, preset: "shadcn", mood, generator: "oklch" });
  const o = parseToOklch(seeds[0]!);
  console.log(JSON.stringify({ seeds, mood, seed0_oklch: [o.l.toFixed(3), o.c.toFixed(3)], lightPrimary: t.light.primary!.hex, darkPrimary: t.dark.primary!.hex, primaryDeps: t.book.inspect("palette.primary-light")?.dependencies ?? null, darkBg: t.dark.background!.hex, status: t.audit.status }));
}
