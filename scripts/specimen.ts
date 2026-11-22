#!/usr/bin/env bun
/**
 * Generate a deterministic, browser-free SVG UI specimen (docs/specimen.svg)
 * rendered directly from `buildThemeBook()`. Shows an ordinary shadcn interface
 * (heading, body text, muted text, card, input + focus ring, primary/secondary
 * buttons, accent chip, destructive alert, and 5-bar chart) across two moods
 * and both light & dark polarities.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { buildThemeBook, type BuiltTheme } from "../src/books";

function esc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderPanel(
  theme: BuiltTheme,
  polarity: "light" | "dark",
  x: number,
  y: number,
  w: number,
  h: number,
  subtitle: string,
): string {
  const t = polarity === "light" ? theme.light : theme.dark;
  const c = (name: string) => t[name]!.hex;
  const modeLabel = polarity === "light" ? "Light" : "Dark";
  const auditPairs = theme.audit.pairs.filter((p) => p.mode === polarity && p.required);
  const auditPass = auditPairs.every((p) => p.pass);
  const barHeights = [54, 78, 42, 66, 36];

  return `
  <g transform="translate(${x}, ${y})">
    <!-- Panel background -->
    <rect x="0" y="0" width="${w}" height="${h}" rx="14" fill="${c("background")}" stroke="${c("border")}" stroke-width="1.5"/>

    <!-- Top header row -->
    <text x="24" y="34" font-size="16" font-weight="700" fill="${c("foreground")}">${esc(`${theme.mood} · ${modeLabel}`)}</text>
    <text x="24" y="54" font-size="11.5" fill="${c("muted-foreground")}">${esc(subtitle)}</text>

    <!-- Audit pill -->
    <rect x="${w - 134}" y="18" width="110" height="24" rx="12" fill="${c("muted")}" stroke="${c("border")}" stroke-width="1"/>
    <text x="${w - 79}" y="34" text-anchor="middle" font-size="11" font-weight="600" fill="${c("muted-foreground")}">${auditPass ? `✓ ${auditPairs.length}/${auditPairs.length} ${theme.standard}` : "Audit fail"}</text>

    <!-- Nested Card -->
    <rect x="24" y="70" width="${w - 48}" height="180" rx="10" fill="${c("card")}" stroke="${c("border")}" stroke-width="1"/>
    <text x="40" y="96" font-size="13.5" font-weight="600" fill="${c("card-foreground")}">Release Summary</text>
    <text x="40" y="114" font-size="11.5" fill="${c("muted-foreground")}">Body &amp; muted copy, focus input, primary/secondary actions, and accent hover.</text>

    <!-- Input with focus ring -->
    <rect x="40" y="128" width="236" height="32" rx="6" fill="${c("background")}" stroke="${c("ring")}" stroke-width="2"/>
    <text x="52" y="148" font-size="11.5" fill="${c("foreground")}">theme-book --seed ${esc(theme.rawSeeds[0]!)}</text>

    <!-- Accent hover badge beside input -->
    <rect x="288" y="128" width="136" height="32" rx="6" fill="${c("accent")}" stroke="${c("border")}" stroke-width="1"/>
    <text x="356" y="148" text-anchor="middle" font-size="11.5" font-weight="500" fill="${c("accent-foreground")}">Accent / Hover</text>

    <!-- Primary + Secondary Buttons -->
    <rect x="40" y="174" width="116" height="32" rx="6" fill="${c("primary")}"/>
    <text x="98" y="194" text-anchor="middle" font-size="12" font-weight="600" fill="${c("primary-foreground")}">Save Theme</text>

    <rect x="166" y="174" width="108" height="32" rx="6" fill="${c("secondary")}" stroke="${c("border")}" stroke-width="1"/>
    <text x="220" y="194" text-anchor="middle" font-size="12" font-weight="500" fill="${c("secondary-foreground")}">Preview</text>

    <!-- Destructive button, drawn as stock shadcn draws it: destructive text on a destructive tint
         (bg-destructive/10 in light, /20 in dark). Stock shadcn has no destructive-foreground. -->
    <rect x="288" y="174" width="240" height="32" rx="6" fill="${c("background")}"/>
    <rect x="288" y="174" width="240" height="32" rx="6" fill="${c("destructive")}" fill-opacity="${polarity === "dark" ? 0.2 : 0.1}"/>
    <text x="408" y="194" text-anchor="middle" font-size="11.5" font-weight="600" fill="${c("destructive")}">Destructive: Revoke token</text>

    <!-- Inline token footer inside card -->
    <text x="40" y="234" font-size="10.5" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" fill="${c("muted-foreground")}">primary=${c("primary")} · accent=${c("accent")} · ring=${c("ring")}</text>

    <!-- 5-Bar Chart (chart-1..5) -->
    <text x="24" y="274" font-size="11.5" font-weight="600" fill="${c("foreground")}">Chart series (chart-1..5 · min OKLab Δ=${theme.chartDiagnostics[polarity].minOklabDist})</text>
    <line x1="24" y1="352" x2="${w - 24}" y2="352" stroke="${c("border")}" stroke-width="1"/>
    ${barHeights
      .map((bh, idx) => {
        const bx = 34 + idx * 102;
        const by = 352 - bh;
        const tok = `chart-${idx + 1}`;
        return `
    <rect x="${bx}" y="${by}" width="72" height="${bh}" rx="5" fill="${c(tok)}"/>
    <text x="${bx + 36}" y="366" text-anchor="middle" font-size="10" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" fill="${c("muted-foreground")}">${tok}</text>`;
      })
      .join("")}
  </g>`;
}

export function generateSpecimenSvg(): string {
  const editorial = buildThemeBook({
    seeds: ["#2563eb"],
    preset: "shadcn",
    mood: "editorial",
    generator: "poline",
    standard: "wcag-aa",
  });

  const vividDual = buildThemeBook({
    seeds: ["#c2410c", "#0f766e"],
    preset: "shadcn",
    mood: "vivid",
    generator: "rampensau",
    standard: "wcag-aa",
  });

  const W = 1200;
  const PW = 564;
  const PH = 380;
  // One gutter everywhere. The horizontal rhythm was already 24 (24+564+24+564+24=1200);
  // the vertical was 20/16/20, which read as uneven. 24+380+24+380+24 = 832.
  const G = 24;
  const H = G * 3 + PH * 2;
  const ROW2 = G * 2 + PH;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="theme-book UI specimen across editorial and vivid moods in light and dark modes">
  <style>
    text { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  </style>
  ${renderPanel(editorial, "light", G, G, PW, PH, 'seed="#2563eb" · generator=poline · preset=shadcn')}
  ${renderPanel(editorial, "dark", G * 2 + PW, G, PW, PH, 'seed="#2563eb" · generator=poline · preset=shadcn')}
  ${renderPanel(vividDual, "light", G, ROW2, PW, PH, 'seeds="#c2410c, #0f766e" · generator=rampensau · preset=shadcn')}
  ${renderPanel(vividDual, "dark", G * 2 + PW, ROW2, PW, PH, 'seeds="#c2410c, #0f766e" · generator=rampensau · preset=shadcn')}
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
