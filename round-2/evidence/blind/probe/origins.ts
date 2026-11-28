// Which palette entries record an origin, and what each dark base/text entry records, in Owl Coral corporate.
import { buildThemeBook } from "~/.local/state/baker-street/cases/2026-11-27-theme-book-pr30-r2/subject/src/books";
const t = buildThemeBook({ seeds: ["#e88e8d", "#79cce2", "#d1a45f", "#60bd90", "#cfa0e8", "#292c2f"], preset: "shadcn", mood: "corporate", generator: "oklch" });
const pal = t.book.getScope("palette")!;
const keys: string[] = [...(pal as any).keys?.() ?? Object.keys((pal as any).entries ?? {})];
const names = keys.length ? keys : ["light-page","dark-page","light-ink","dark-ink","dark-muted","dark-border","destructive-light","destructive-dark","primary-dark","chart-1-dark","light-on-primary","dark-on-primary"];
for (const k of names) console.log(`palette.${k} deps=${JSON.stringify(t.book.inspect(`palette.${k}`)?.dependencies ?? null)}`);
