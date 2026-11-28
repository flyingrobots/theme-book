// M-A-1b: audit status distribution and unverified counts over the M-A-1 corpus (same LCG seed)
import { buildThemeBook } from "../../../subject/src/books";
let seed = 12345;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const hex = () => "#" + [0, 1, 2].map(() => Math.floor(rnd() * 256).toString(16).padStart(2, "0")).join("");
const pal: string[][] = []; for (let i = 0; i < 300; i++) pal.push(Array.from({ length: 1 + Math.floor(rnd() * 6) }, hex));
const dist: Record<string, number> = {}; let unver = 0, outOfGamutRaw = 0;
for (const seeds of pal) for (const mood of ["corporate", "freak"] as const) {
  const t = buildThemeBook({ seeds, preset: "shadcn", mood, generator: "oklch" });
  dist[t.audit.status] = (dist[t.audit.status] ?? 0) + 1; unver += t.audit.unverifiedCount;
}
console.log(JSON.stringify({ builds: pal.length * 2, dist, unverifiedTotal: unver }));
