#!/usr/bin/env bun
/**
 * The famous-themes scoreboard: give theme-book one side of a famous theme, compare the side it
 * generates with the official other side. Writes an interactive page (three views of the fourth
 * chart) and a static SVG of the "both moves" view for the README.
 * Also writes the README's Tokyo Night comparison as four transparent, text-free images.
 * `bun scripts/benchmark/scoreboard.ts` -> docs/topics/derived-moods/scoreboard.{html,svg} and tokyo-night-{input,ours,official,moves}.svg
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { buildThemeBook } from "../../src/books";
import { FAMOUS_THEMES, type Side } from "./famous-themes";
import { DERIVED_SETTINGS, accentMove } from "../../src/derived";
import { converter, parse } from "culori";
const oklch = converter("oklch");

const PAIRS = FAMOUS_THEMES;

const W = 360, H = 150, G = 16;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
function panel(x: number, y: number, title: string, page: string, ink: string, chips: string[], tag: string) {
  const chip = chips.map((c, i) => `<rect x="${x + 16 + i * 34}" y="${y + 76}" width="28" height="28" rx="5" fill="${c}" stroke="${ink}" stroke-opacity="0.15"/>`).join("");
  return `<g><rect x="${x}" y="${y}" width="${W}" height="${H}" rx="10" fill="${page}" stroke="#8884" />
  <text x="${x + 16}" y="${y + 30}" fill="${ink}" font-size="15" font-weight="700">${esc(title)}</text>
  <text x="${x + 16}" y="${y + 52}" fill="${ink}" font-size="11.5" opacity="0.8">${esc(tag)}</text>${chip}
  <text x="${x + 16}" y="${y + 130}" fill="${ink}" font-size="10.5" font-family="Menlo, monospace" opacity="0.75">page ${page} · ink ${ink}</text></g>`;
}
const officialChips = (s: Side) => [s.primary, ...s.accents];

/**
 * Lightness (OKLCH L, bottom to top) against hue (0-360, left to right). Circles are the official
 * answer, squares are ours; thin lines join the matching page, ink and primary, ours to theirs.
 */
function plot(x: number, y: number, ours: { page: string; ink: string; chips: string[] }, theirs: Side, input: Side) {
  const PX = 40, PY = 14, PW = W - PX - 12, PH = H - PY - 26;
  const at = (hex: string) => {
    const c = oklch(parse(hex)!)!;
    return { x: x + PX + ((c.h ?? 0) / 360) * PW, y: y + PY + (1 - c.l) * PH, chroma: c.c };
  };
  const parts: string[] = [`<rect x="${x}" y="${y}" width="${W}" height="${H}" rx="10" fill="#fff" stroke="#8884"/>`];
  for (const l of [0, 0.25, 0.5, 0.75, 1]) {
    const yy = y + PY + (1 - l) * PH;
    parts.push(`<line x1="${x + PX}" y1="${yy}" x2="${x + PX + PW}" y2="${yy}" stroke="#0001"/><text x="${x + PX - 6}" y="${yy + 3}" font-size="8" text-anchor="end" fill="#888">L ${l}</text>`);
  }
  for (const h of [0, 90, 180, 270, 360]) {
    const xx = x + PX + (h / 360) * PW;
    parts.push(`<text x="${xx}" y="${y + H - 8}" font-size="8" text-anchor="middle" fill="#888">${h}°</text>`);
  }
  // Pairs, ours -> theirs: page, ink and primary by role; the rest one-to-one by nearest hue
  // (greedy, closest pair first), since our charts are ordered by lightness, not by theirs.
  const hueOf = (hex: string) => oklch(parse(hex)!)!.h ?? 0;
  const hueGap = (a: string, b: string) => Math.abs(((hueOf(a) - hueOf(b) + 540) % 360) - 180);
  const pairs: [string, string][] = [[ours.page, theirs.page], [ours.ink, theirs.ink], [ours.chips[0]!, theirs.primary]];
  // Charts only: destructive (the last chip) is a fixed red, derived from no palette color.
  const mine = ours.chips.slice(1, 6);
  const yours = [...theirs.accents];
  const candidates = mine.flatMap((m, i) => yours.map((t, j) => ({ i, j, d: hueGap(m, t) }))).sort((a, b) => a.d - b.d);
  const usedM = new Set<number>(), usedT = new Set<number>();
  for (const { i, j } of candidates) {
    if (usedM.has(i) || usedT.has(j)) continue;
    usedM.add(i); usedT.add(j);
    pairs.push([mine[i]!, yours[j]!]);
  }
  parts.push(`<g class="cmp-ours">`);
  for (const [a, b] of pairs) {
    const p = at(a), q = at(b);
    parts.push(`<line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}" stroke="${b}" stroke-width="1.6" stroke-opacity="0.9"/>`);
    parts.push(`<line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}" stroke="#000" stroke-width="0.4" stroke-dasharray="2 2"/>`);
  }
  for (const hex of [theirs.page, theirs.ink, theirs.primary, ...theirs.accents]) {
    const p = at(hex);
    parts.push(`<circle cx="${p.x}" cy="${p.y}" r="5.5" fill="${hex}" stroke="#000" stroke-width="0.8"/>`);
  }
  for (const hex of [ours.page, ours.ink, ...ours.chips]) {
    const p = at(hex);
    parts.push(`<rect x="${p.x - 4.5}" y="${p.y - 4.5}" width="9" height="9" fill="${hex}" stroke="#000" stroke-width="0.8"/>`);
  }
  parts.push(`<text x="${x + W - 10}" y="${y + 12}" font-size="8.5" text-anchor="end" fill="#666">● official answer   ■ ours   — ours to its match</text>`);
  parts.push(`</g><g class="cmp-official">`);
  // The official move: each role in the input mode joined to the same role in the other mode.
  const officialPairs: [string, string][] = [
    [input.page, theirs.page], [input.ink, theirs.ink], [input.primary, theirs.primary],
    ...input.accents.map((a, i) => [a, theirs.accents[i]!] as [string, string]),
  ];
  for (const [a, b] of officialPairs) {
    const p = at(a), q = at(b);
    parts.push(`<line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}" stroke="${b}" stroke-width="1.6" stroke-opacity="0.9"/>`);
    parts.push(`<line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}" stroke="#000" stroke-width="0.4" stroke-dasharray="2 2"/>`);
  }
  for (const [a] of officialPairs) {
    const p = at(a);
    parts.push(`<path d="M ${p.x} ${p.y - 6} L ${p.x + 6} ${p.y} L ${p.x} ${p.y + 6} L ${p.x - 6} ${p.y} Z" fill="${a}" stroke="#000" stroke-width="0.8"/>`);
  }
  for (const hex of [theirs.page, theirs.ink, theirs.primary, ...theirs.accents]) {
    const p = at(hex);
    parts.push(`<circle cx="${p.x}" cy="${p.y}" r="5.5" fill="${hex}" stroke="#000" stroke-width="0.8"/>`);
  }
  parts.push(`<text x="${x + W - 10}" y="${y + 12}" font-size="8.5" text-anchor="end" fill="#666">◆ official input mode   ● official other mode   — the designers' move</text>`);
  parts.push(`</g><g class="cmp-both">`);
  // Both moves from the same source: the designers' (solid, colored, to the circle) and ours
  // (dashed black, to the square). Our colors are matched to the input's: page, ink, primary by
  // role; the rest one-to-one by nearest hue.
  const oursFrom: [string, string][] = [[input.page, ours.page], [input.ink, ours.ink], [input.primary, ours.chips[0]!]];
  {
    const mine2 = ours.chips.slice(1, 6); // charts only; destructive is fixed
    const src = [...input.accents];
    const cand = mine2.flatMap((m, i) => src.map((t, j) => ({ i, j, d: hueGap(m, t) }))).sort((a, b) => a.d - b.d);
    const um = new Set<number>(), ut = new Set<number>();
    for (const { i, j } of cand) {
      if (um.has(i) || ut.has(j)) continue;
      um.add(i); ut.add(j);
      oursFrom.push([src[j]!, mine2[i]!]);
    }
  }
  for (const [a, b] of officialPairs) {
    const p = at(a), q = at(b);
    parts.push(`<line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}" stroke="${b}" stroke-width="2.2" stroke-opacity="0.85"/>`);
  }
  for (const [a, b] of oursFrom) {
    const p = at(a), q = at(b);
    parts.push(`<line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}" stroke="#000" stroke-width="1.1" stroke-dasharray="3 2"/>`);
  }
  for (const hex of [theirs.page, theirs.ink, theirs.primary, ...theirs.accents]) {
    const p = at(hex);
    parts.push(`<circle cx="${p.x}" cy="${p.y}" r="5" fill="${hex}" stroke="#000" stroke-width="0.8"/>`);
  }
  for (const [, b] of oursFrom) {
    const p = at(b);
    parts.push(`<rect x="${p.x - 4}" y="${p.y - 4}" width="8" height="8" fill="${b}" stroke="#000" stroke-width="0.8"/>`);
  }
  for (const [a] of officialPairs) {
    const p = at(a);
    parts.push(`<path d="M ${p.x} ${p.y - 6} L ${p.x + 6} ${p.y} L ${p.x} ${p.y + 6} L ${p.x - 6} ${p.y} Z" fill="${a}" stroke="#000" stroke-width="0.8"/>`);
  }
  parts.push(`<text x="${x + W - 10}" y="${y + 12}" font-size="8.5" text-anchor="end" fill="#666">◆ source   ━ designers' move to ●   ┅ our move to ■</text>`);
  parts.push(`</g>`);
  return parts.join("");
}

function ours(from: Side, mode: "light" | "dark") {
  const seeds = [from.primary, ...from.accents, from.page, from.ink];
  const t = buildThemeBook({ seeds, preset: "shadcn", mood: "corporate", generator: "rampensau" });
  const m = mode === "light" ? t.light : t.dark;
  const chips = ["primary", "chart-1", "chart-2", "chart-3", "chart-4", "chart-5", "destructive"].map((k) => m[k]!.hex);
  return { page: m.background!.hex, ink: m.foreground!.hex, chips };
}

let y = 50;
const out: string[] = [];
const header = (text: string) => { out.push(`<text x="16" y="${y}" font-size="20" font-weight="700" fill="#222">${esc(text)}</text>`); y += 18; };
const cols = (labels: string[]) => { labels.forEach((l, i) => out.push(`<text x="${16 + i * (W + G)}" y="${y + 4}" font-size="12" fill="#555">${esc(l)}</text>`)); y += 14; };

header("Official light → our dark (generated from the light side only) → official dark");
cols(["official light (input)", "OURS: dark, from the light", "official dark (the answer)", "where ours landed vs theirs"]);
for (const p of PAIRS) {
  const o = ours(p.light, "dark");
  out.push(panel(16, y, p.lightName, p.light.page, p.light.ink, officialChips(p.light), "primary + accents"));
  out.push(panel(16 + W + G, y, `ours → ${p.name} dark`, o.page, o.ink, o.chips, "primary, charts 1–5, destructive"));
  out.push(panel(16 + 2 * (W + G), y, p.darkName, p.dark.page, p.dark.ink, officialChips(p.dark), "primary + accents"));
  out.push(plot(16 + 3 * (W + G), y, o, p.dark, p.light));
  y += H + G;
}
y += 30;
header("Official dark → our light (generated from the dark side only) → official light");
cols(["official dark (input)", "OURS: light, from the dark", "official light (the answer)", "where ours landed vs theirs"]);
for (const p of PAIRS) {
  const o = ours(p.dark, "light");
  out.push(panel(16, y, p.darkName, p.dark.page, p.dark.ink, officialChips(p.dark), "primary + accents"));
  out.push(panel(16 + W + G, y, `ours → ${p.name} light`, o.page, o.ink, o.chips, "primary, charts 1–5, destructive"));
  out.push(panel(16 + 2 * (W + G), y, p.lightName, p.light.page, p.light.ink, officialChips(p.light), "primary + accents"));
  out.push(plot(16 + 3 * (W + G), y, o, p.light, p.dark));
  y += H + G;
}
const width = 16 + 4 * (W + G);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${y + 20}" style="background:#fff;font-family:-apple-system,Segoe UI,Roboto,sans-serif">${out.join("\n")}</svg>`;
const outDir = resolve(import.meta.dir, "..", "..", "docs", "topics", "derived-moods");
mkdirSync(outDir, { recursive: true });
// The static SVG shows the "both moves" view: GitHub renders SVG but runs no script.
writeFileSync(
  resolve(outDir, "scoreboard.svg"),
  svg.replace(">", `><style>.cmp-ours, .cmp-official { display: none; }</style>`),
);
// The README's hero, as four separate images for layout: the official light side given as input, the dark
// side theme-book generates from it, the official dark side, and both moves in OKLCH (lightness against hue).
// Transparent and text-free, so each sits on any page, light or dark; the titles and the caption are prose in
// the README. Chrome lines use a translucent mid-grey that reads on both. Theme colors are 6-digit hex and
// never change; chrome colors are 3- or 4-digit.
{
  const p = PAIRS.find((t) => t.name === "Tokyo")!;
  const o = ours(p.light, "dark");
  const bare = (inner: string) =>
    inner
      .replace(/<text[^>]*>[\s\S]*?<\/text>/g, "")
      .replace(/ fill="#fff"/g, ' fill="none"')
      .replace(/stroke="#000"/g, 'stroke="#8889"')
      .replace(/stroke="#0001"/g, 'stroke="#8883"');
  const svg = (inner: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><style>.cmp-ours, .cmp-official { display: none; }</style>${bare(inner)}</svg>\n`;
  const files: [string, string][] = [
    ["tokyo-night-input.svg", panel(0, 0, "", p.light.page, p.light.ink, officialChips(p.light), "")],
    ["tokyo-night-ours.svg", panel(0, 0, "", o.page, o.ink, o.chips, "")],
    ["tokyo-night-official.svg", panel(0, 0, "", p.dark.page, p.dark.ink, officialChips(p.dark), "")],
  ];
  for (const [name, inner] of files) writeFileSync(resolve(outDir, name), svg(inner));
  // The moves chart, exact pairs. For each light accent: an × at the source (the light theme's color), a □
  // at the official dark color, an ○ at theme-book's move of that same accent (the move the benchmark scores),
  // and two arrows from the ×: the designers' move (solid, in the official color) and ours (dashed, in our
  // color). Lightness (OKLCH L, 0.4 to 0.9) runs bottom to top, hue (0 to 360) left to right; the README's
  // table gives each miss. Casing (design-book's bestContrastWith against GitHub's two pages, see the docs):
  // a #222222 core outline carries a mark on the light page, an #eeeeee ring carries a dark one on the dark.
  {
    const MW = 760, MH = 340, M = 30, CORE = "#222222", CASING = "#eeeeee";
    const at = (hex: string) => { const c = oklch(parse(hex)!)!; return { x: M + ((c.h ?? 0) / 360) * (MW - 2 * M), y: M + (1 - ((c.l - 0.4) / 0.5)) * (MH - 2 * M) }; };
    const src = [p.light.primary, ...p.light.accents], off = [p.dark.primary, ...p.dark.accents];
    const ourMoves = src.map((h) => accentMove(h, DERIVED_SETTINGS.corporate, true));
    const parts: string[] = [];
    for (const l of [0.5, 0.6, 0.7, 0.8]) { const y = M + (1 - (l - 0.4) / 0.5) * (MH - 2 * M); parts.push(`<line x1="${M}" y1="${y}" x2="${MW - M}" y2="${y}" stroke="#8884" stroke-width="1"/>`); }
    // An arrow from a to b that stops short of the mark at b, with its head drawn as a triangle.
    const arrow = (a: { x: number; y: number }, b: { x: number; y: number }, color: string, dashed: boolean) => {
      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
      const tip = { x: b.x - ux * 12, y: b.y - uy * 12 }, base = { x: tip.x - ux * 11, y: tip.y - uy * 11 };
      const head = `M ${tip.x} ${tip.y} L ${base.x - uy * 6} ${base.y + ux * 6} L ${base.x + uy * 6} ${base.y - ux * 6} Z`;
      const start = { x: a.x + ux * 10, y: a.y + uy * 10 };
      const dash = dashed ? ' stroke-dasharray="7 5"' : "";
      return [
        `<line x1="${start.x}" y1="${start.y}" x2="${base.x}" y2="${base.y}" stroke="${CORE}" stroke-width="5"${dash} stroke-linecap="round"/>`,
        `<path d="${head}" fill="${CORE}" stroke="${CORE}" stroke-width="3" stroke-linejoin="round"/>`,
        `<line x1="${start.x}" y1="${start.y}" x2="${base.x}" y2="${base.y}" stroke="${color}" stroke-width="3"${dash} stroke-linecap="round"/>`,
        `<path d="${head}" fill="${color}"/>`,
      ].join("");
    };
    src.forEach((s0, i) => {
      const a = at(s0);
      parts.push(arrow(a, at(off[i]!), off[i]!, false), arrow(a, at(ourMoves[i]!), ourMoves[i]!, true));
    });
    src.forEach((s0, i) => {
      const a = at(s0), t = at(off[i]!), o2 = at(ourMoves[i]!), k = 7;
      const x = (w: number, c: string) => `<path d="M ${a.x - k} ${a.y - k} L ${a.x + k} ${a.y + k} M ${a.x + k} ${a.y - k} L ${a.x - k} ${a.y + k}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
      parts.push(x(9, CASING), x(6.5, CORE), x(3.5, s0));
      parts.push(`<rect x="${t.x - 8}" y="${t.y - 8}" width="16" height="16" rx="2" fill="${off[i]}" stroke="${CORE}" stroke-width="2"/>`);
      parts.push(`<circle cx="${o2.x}" cy="${o2.y}" r="8" fill="none" stroke="${CORE}" stroke-width="6"/>`, `<circle cx="${o2.x}" cy="${o2.y}" r="8" fill="none" stroke="${ourMoves[i]}" stroke-width="3"/>`);
    });
    writeFileSync(resolve(outDir, "tokyo-night-moves.svg"), `<svg xmlns="http://www.w3.org/2000/svg" width="${MW}" height="${MH}" viewBox="0 0 ${MW} ${MH}">${parts.join("")}</svg>\n`);
  }
}
writeFileSync(resolve(outDir, "scoreboard.html"), `<!doctype html><meta charset="utf-8"><title>Famous themes</title>
<style>
  body { margin: 0; background: #fff; font-family: -apple-system, "Segoe UI", Roboto, sans-serif; }
  .bar { position: sticky; top: 0; z-index: 1; background: #fffe; padding: 10px 16px; border-bottom: 1px solid #ddd; display: flex; gap: 8px; align-items: center; }
  .bar button { font: inherit; padding: 6px 12px; border-radius: 6px; border: 1px solid #bbb; background: #fff; cursor: pointer; }
  .bar button[aria-pressed="true"] { background: #111; color: #fff; border-color: #111; }
  .cmp-ours, .cmp-official, .cmp-both { display: none; }
  body[data-mode="ours"] .cmp-ours, body[data-mode="official"] .cmp-official, body[data-mode="both"] .cmp-both { display: inline; }
</style>
<div class="bar">Fourth chart:
  <button id="ours" aria-pressed="true">Ours vs actual</button>
  <button id="official" aria-pressed="false">Official light vs official dark</button>
  <button id="both" aria-pressed="false">Both moves from the source</button>
</div>
${svg}
<script>
  const modes = ["ours", "official", "both"];
  const set = (mode) => {
    document.body.dataset.mode = mode;
    for (const m of modes) document.getElementById(m).setAttribute("aria-pressed", String(m === mode));
  };
  for (const m of modes) document.getElementById(m).onclick = () => set(m);
  set(modes.includes(location.hash.slice(1)) ? location.hash.slice(1) : "ours");
</script>`);
console.log(`wrote ${outDir}/scoreboard.html and scoreboard.svg (${width}x${y + 20})`);
