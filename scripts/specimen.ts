#!/usr/bin/env bun
/**
 * Generate a deterministic, browser-free SVG UI specimen (docs/specimen.svg)
 * rendered directly from `buildThemeBook()`. Shows an ordinary shadcn interface
 * (heading, body text, muted text, card, input + focus ring, primary/secondary
 * buttons, accent chip, destructive action, and 5-bar chart) across two moods
 * and both light & dark polarities.
 *
 * Geometry lives in `panelLayout()`, one box per element, so a test can check that
 * no two elements overlap and every element stays inside its container.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { buildThemeBook, type BuiltTheme } from "../src/books";

function esc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

/** One element of a panel. `parent` names the box it must sit inside; siblings must not overlap. */
export interface LayoutBox {
  id: string;
  parent: "panel" | "card" | "chart";
  kind: "rect" | "text";
  x: number;
  y: number;
  w: number;
  h: number;
  /** For text: the baseline, the string and the font, so the box can be estimated. */
  baseline?: number;
  text?: string;
  fontSize?: number;
  mono?: boolean;
}

/** The text a panel shows. Only the strings that change between panels. */
export interface PanelText {
  title: string;
  subtitle: string;
  audit: string;
  seed: string;
  tokens: string;
  chartTitle: string;
}

// A generous width estimate: average advance per character as a fraction of the font size.
// Sans-serif UI faces average about 0.55em; monospace is 0.6em. Bold adds a little.
function textBox(
  id: string,
  parent: LayoutBox["parent"],
  x: number,
  baseline: number,
  text: string,
  fontSize: number,
  opts: { mono?: boolean; bold?: boolean; anchor?: "start" | "middle" } = {},
): LayoutBox {
  const per = opts.mono ? 0.62 : opts.bold ? 0.6 : 0.56;
  const w = text.length * fontSize * per;
  const left = opts.anchor === "middle" ? x - w / 2 : x;
  // Ascent ~0.9em above the baseline, descent ~0.25em below it.
  return {
    id,
    parent,
    kind: "text",
    x: left,
    y: baseline - fontSize * 0.9,
    w,
    h: fontSize * 1.15,
    baseline,
    text,
    fontSize,
    mono: opts.mono,
  };
}

export const BAR_HEIGHTS = [40, 56, 30, 48, 24];
/** The chart's baseline, in panel coordinates. */
const AXIS_Y = 340;
/** Bars are centred: 5 × 72 wide with 30 between them. */
const BAR_W = 72;
const BAR_GAP = 30;

/** Every element of one panel, in panel coordinates. */
export function panelLayout(w: number, h: number, t: PanelText): LayoutBox[] {
  const card = { x: 24, y: 70, w: w - 48, h: 172 };
  const chart = { x: 24, y: 254, w: w - 48, h: h - 254 - 16 };
  const barsLeft = (w - (BAR_HEIGHTS.length * BAR_W + (BAR_HEIGHTS.length - 1) * BAR_GAP)) / 2;
  const boxes: LayoutBox[] = [
    { id: "card", parent: "panel", kind: "rect", ...card },
    { id: "chart", parent: "panel", kind: "rect", ...chart },
    textBox("title", "panel", 24, 34, t.title, 16, { bold: true }),
    textBox("subtitle", "panel", 24, 54, t.subtitle, 11.5),
    { id: "audit-pill", parent: "panel", kind: "rect", x: w - 134, y: 18, w: 110, h: 24 },
    textBox("card-title", "card", 40, 96, "Release v0.4.0", 13.5, { bold: true }),
    textBox("card-body", "card", 40, 114, "Three tokens changed since v0.3.0. Review them before publishing.", 11.5),
    { id: "input", parent: "card", kind: "rect", x: 40, y: 128, w: 236, h: 32 },
    { id: "accent", parent: "card", kind: "rect", x: 288, y: 128, w: 136, h: 32 },
    { id: "primary", parent: "card", kind: "rect", x: 40, y: 172, w: 116, h: 32 },
    { id: "secondary", parent: "card", kind: "rect", x: 166, y: 172, w: 108, h: 32 },
    { id: "destructive", parent: "card", kind: "rect", x: 288, y: 172, w: 236, h: 32 },
    textBox("tokens", "card", 40, 226, t.tokens, 10.5, { mono: true }),
    textBox("chart-title", "chart", 24, 272, t.chartTitle, 11.5, { bold: true }),
  ];
  BAR_HEIGHTS.forEach((bh, i) => {
    const bx = barsLeft + i * (BAR_W + BAR_GAP);
    boxes.push({ id: `bar-${i + 1}`, parent: "chart", kind: "rect", x: bx, y: AXIS_Y - bh, w: BAR_W, h: bh });
    boxes.push(textBox(`bar-label-${i + 1}`, "chart", bx + BAR_W / 2, AXIS_Y + 14, `chart-${i + 1}`, 10, { mono: true, anchor: "middle" }));
  });
  return boxes;
}

function panelText(theme: BuiltTheme, polarity: "light" | "dark", subtitle: string, name: string): PanelText {
  const t = polarity === "light" ? theme.light : theme.dark;
  const c = (name: string) => t[name]!.hex;
  const auditPairs = theme.audit.pairs.filter((p) => p.mode === polarity && p.required);
  const auditPass = auditPairs.every((p) => p.pass);
  return {
    title: `${name} · ${polarity === "light" ? "Light" : "Dark"}`,
    subtitle,
    audit: auditPass ? `✓ ${auditPairs.length}/${auditPairs.length} ${theme.standard}` : "Audit fail",
    seed: `theme-book --seed ${theme.rawSeeds[0]!}`,
    tokens: `primary=${c("primary")} · accent=${c("accent")} · ring=${c("ring")}`,
    chartTitle: `Chart series (chart-1..5 · min OKLab Δ=${theme.chartDiagnostics[polarity].minOklabDist})`,
  };
}

function renderPanel(
  theme: BuiltTheme,
  polarity: "light" | "dark",
  x: number,
  y: number,
  w: number,
  h: number,
  subtitle: string,
  name: string,
): string {
  const t = polarity === "light" ? theme.light : theme.dark;
  const c = (key: string) => t[key]!.hex;
  const text = panelText(theme, polarity, subtitle, name);
  const box = Object.fromEntries(panelLayout(w, h, text).map((b) => [b.id, b]));
  const r = (id: string) => box[id]!;
  const cx = (id: string) => r(id).x + r(id).w / 2;
  const cy = (id: string) => r(id).y + r(id).h / 2 + 4;

  return `
  <g transform="translate(${x}, ${y})">
    <!-- Panel background -->
    <rect x="0" y="0" width="${w}" height="${h}" rx="14" fill="${c("background")}" stroke="${c("border")}" stroke-width="1.5"/>

    <!-- Top header row -->
    <text x="${r("title").x}" y="${r("title").baseline}" font-size="16" font-weight="700" fill="${c("foreground")}">${esc(text.title)}</text>
    <text x="${r("subtitle").x}" y="${r("subtitle").baseline}" font-size="11.5" fill="${c("muted-foreground")}">${esc(text.subtitle)}</text>

    <!-- Audit pill -->
    <rect x="${r("audit-pill").x}" y="${r("audit-pill").y}" width="${r("audit-pill").w}" height="${r("audit-pill").h}" rx="12" fill="${c("muted")}" stroke="${c("border")}" stroke-width="1"/>
    <text x="${cx("audit-pill")}" y="${cy("audit-pill")}" text-anchor="middle" font-size="11" font-weight="600" fill="${c("muted-foreground")}">${esc(text.audit)}</text>

    <!-- Nested Card -->
    <rect x="${r("card").x}" y="${r("card").y}" width="${r("card").w}" height="${r("card").h}" rx="10" fill="${c("card")}" stroke="${c("border")}" stroke-width="1"/>
    <text x="${r("card-title").x}" y="${r("card-title").baseline}" font-size="13.5" font-weight="600" fill="${c("card-foreground")}">${esc(r("card-title").text!)}</text>
    <text x="${r("card-body").x}" y="${r("card-body").baseline}" font-size="11.5" fill="${c("muted-foreground")}">${esc(r("card-body").text!)}</text>

    <!-- Input with focus ring -->
    <rect x="${r("input").x}" y="${r("input").y}" width="${r("input").w}" height="${r("input").h}" rx="6" fill="${c("background")}" stroke="${c("ring")}" stroke-width="2"/>
    <text x="${r("input").x + 12}" y="${cy("input")}" font-size="11.5" fill="${c("foreground")}">${esc(text.seed)}</text>

    <!-- Accent hover badge beside input -->
    <rect x="${r("accent").x}" y="${r("accent").y}" width="${r("accent").w}" height="${r("accent").h}" rx="6" fill="${c("accent")}" stroke="${c("border")}" stroke-width="1"/>
    <text x="${cx("accent")}" y="${cy("accent")}" text-anchor="middle" font-size="11.5" font-weight="500" fill="${c("accent-foreground")}">Draft</text>

    <!-- Primary + Secondary Buttons -->
    <rect x="${r("primary").x}" y="${r("primary").y}" width="${r("primary").w}" height="${r("primary").h}" rx="6" fill="${c("primary")}"/>
    <text x="${cx("primary")}" y="${cy("primary")}" text-anchor="middle" font-size="12" font-weight="600" fill="${c("primary-foreground")}">Publish</text>

    <rect x="${r("secondary").x}" y="${r("secondary").y}" width="${r("secondary").w}" height="${r("secondary").h}" rx="6" fill="${c("secondary")}" stroke="${c("border")}" stroke-width="1"/>
    <text x="${cx("secondary")}" y="${cy("secondary")}" text-anchor="middle" font-size="12" font-weight="500" fill="${c("secondary-foreground")}">Preview</text>

    <!-- Destructive button, as shadcn's Button variant="destructive" draws it: white text on
         bg-destructive in light, on bg-destructive/60 over the page in dark. Stock shadcn has no
         destructive-foreground. -->
    <rect x="${r("destructive").x}" y="${r("destructive").y}" width="${r("destructive").w}" height="${r("destructive").h}" rx="6" fill="${c("background")}"/>
    <rect x="${r("destructive").x}" y="${r("destructive").y}" width="${r("destructive").w}" height="${r("destructive").h}" rx="6" fill="${c("destructive")}" fill-opacity="${polarity === "dark" ? 0.6 : 1}"/>
    <text x="${cx("destructive")}" y="${cy("destructive")}" text-anchor="middle" font-size="11.5" font-weight="600" fill="#ffffff">Revoke token</text>

    <!-- Inline token footer inside card -->
    <text x="${r("tokens").x}" y="${r("tokens").baseline}" font-size="10.5" font-family="${MONO}" fill="${c("muted-foreground")}">${esc(text.tokens)}</text>

    <!-- 5-Bar Chart (chart-1..5) -->
    <text x="${r("chart-title").x}" y="${r("chart-title").baseline}" font-size="11.5" font-weight="600" fill="${c("foreground")}">${esc(text.chartTitle)}</text>
    <line x1="${r("chart").x}" y1="${AXIS_Y}" x2="${r("chart").x + r("chart").w}" y2="${AXIS_Y}" stroke="${c("border")}" stroke-width="1"/>
    ${BAR_HEIGHTS.map((_, idx) => {
      const bar = r(`bar-${idx + 1}`);
      const label = r(`bar-label-${idx + 1}`);
      return `
    <rect x="${bar.x}" y="${bar.y}" width="${bar.w}" height="${bar.h}" rx="5" fill="${c(`chart-${idx + 1}`)}"/>
    <text x="${label.x + label.w / 2}" y="${label.baseline}" text-anchor="middle" font-size="10" font-family="${MONO}" fill="${c("muted-foreground")}">${esc(label.text!)}</text>`;
    }).join("")}
  </g>`;
}

export const SPECIMEN_PANEL = { w: 564, h: 380 } as const;

/** A theme the specimen shows: its palette, the mood it is built in, and a name for its row. */
interface SpecimenTheme {
  name: string;
  seeds: string[];
  mood: "corporate" | "freak";
  note: string;
}

export const SPECIMEN_THEMES: SpecimenTheme[] = [
  { name: "Owl Coral", seeds: ["#e88e8d", "#79cce2", "#d1a45f", "#60bd90", "#cfa0e8", "#292c2f"], mood: "corporate", note: "coral, blue, ochre, green, violet, charcoal" },
  { name: "Owl Coral, loud", seeds: ["#e88e8d", "#79cce2", "#d1a45f", "#60bd90", "#cfa0e8", "#292c2f"], mood: "freak", note: "the same palette, as fidelity" },
  { name: "Corporate", seeds: ["#ffffff", "#edeeeb", "#ccc7bf", "#31393c", "#3e96f4"], mood: "corporate", note: "white, fog, stone, charcoal, one blue" },
  { name: "Paper & ink", seeds: ["#0274bd", "#e9e6dd", "#c4ad9d", "#000000", "#f57251"], mood: "freak", note: "blue, paper, taupe, black, coral" },
  { name: "Merino", seeds: ["#f5eedd", "#84b3ce", "#16587b"], mood: "corporate", note: "Merino, Rock Blue, Venice Blue" },
  { name: "Vista & Oxford", seeds: ["#92acff", "#0e0929"], mood: "corporate", note: "a duotone: Vista Blue, Blue Oxford" },
  { name: "Dusty rose", seeds: ["#6d6875", "#b5838d", "#e5989b", "#ffb4a2", "#ffcdb2"], mood: "corporate", note: "Salt Box to Romantic, five dusty roses" },
  { name: "Black & white", seeds: ["#ffffff", "#000000"], mood: "corporate", note: "no hue at all" },
  { name: "Memphis", seeds: ["#f31685", "#f3c716", "#16f3dd", "#f33416", "#8c16f3"], mood: "freak", note: "pink, yellow, turquoise, tomato, violet" },
];

export function specimenThemes(): { theme: BuiltTheme; name: string; subtitle: string }[] {
  return SPECIMEN_THEMES.map(({ name, seeds, mood, note }) => ({
    theme: buildThemeBook({ seeds, preset: "shadcn", mood, generator: "rampensau" }),
    name,
    subtitle: `${note} · mood=${mood}`,
  }));
}

/** The layout of every panel the specimen draws, for the overlap test. */
export function specimenLayouts(): { name: string; boxes: LayoutBox[] }[] {
  const { w, h } = SPECIMEN_PANEL;
  return specimenThemes().flatMap(({ theme, name, subtitle }) =>
    (["light", "dark"] as const).map((p) => ({
      name: `${name} ${p}`,
      boxes: panelLayout(w, h, panelText(theme, p, subtitle, name)),
    })),
  );
}

/** Every theme as a pair: light on the left, dark on the right, one row each. */
export function generateSpecimenSvg(): string {
  const rows = specimenThemes();
  const W = 1200;
  const { w: PW, h: PH } = SPECIMEN_PANEL;
  // One gutter everywhere: 24+564+24+564+24 = 1200 across, and 24 between and around rows.
  const G = 24;
  const H = G + rows.length * (PH + G);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="theme-book UI specimen: ${rows.length} themes, each as a light and dark pair">
  <style>
    text { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  </style>
${rows
  .map(({ theme, name, subtitle }, i) => {
    const y = G + i * (PH + G);
    return `  ${renderPanel(theme, "light", G, y, PW, PH, subtitle, name)}\n  ${renderPanel(theme, "dark", G * 2 + PW, y, PW, PH, subtitle, name)}`;
  })
  .join("\n")}
</svg>
`;
}

if (import.meta.main) {
  const outPath = resolve(import.meta.dir, "..", "docs", "specimen.svg");
  mkdirSync(dirname(outPath), { recursive: true });
  const svg = generateSpecimenSvg();
  writeFileSync(outPath, svg, "utf8");
  console.log(`wrote ${outPath} (${svg.length} bytes)`);
}
