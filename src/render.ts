import type { BuiltTheme, SuggestResult } from "./books";
import type { AuditReport } from "./audit";

export type RenderOutputFormat = "css" | "json" | "w3-tokens" | "svg";

export function renderThemeCss(
  theme: BuiltTheme,
  opts: { hex?: boolean; native?: boolean } = {},
): string {
  if (opts.native) {
    return theme.book.render("css-variables");
  }

  const pickVal = (k: string, mode: "light" | "dark") => {
    const entry = mode === "light" ? theme.light[k]! : theme.dark[k]!;
    return opts.hex ? entry.hex : entry.oklch;
  };

  const lines: string[] = [];
  lines.push(
    `/* theme-book (${theme.preset} · mood=${theme.mood} · generator=${theme.generator} · seeds=${theme.seeds.join(", ")}) */`,
  );
  lines.push(`/* Powered by David Aerne's (@meodai) design-book */`);
  lines.push(":root {");
  for (const k of theme.lightKeys) {
    lines.push(`  --${k}: ${pickVal(k, "light")};`);
  }
  if (theme.extras) {
    for (const [k, v] of Object.entries(theme.extras)) {
      lines.push(`  --${k}: ${v};`);
    }
  }
  lines.push("}");
  lines.push("");
  lines.push(".dark {");
  for (const k of theme.darkKeys) {
    lines.push(`  --${k}: ${pickVal(k, "dark")};`);
  }
  lines.push("}");
  return lines.join("\n") + "\n";
}

export function renderThemeOutput(
  theme: BuiltTheme,
  format: RenderOutputFormat,
  opts: { hex?: boolean; native?: boolean } = {},
): string {
  switch (format) {
    case "css":
      return renderThemeCss(theme, opts);
    case "w3-tokens":
      return theme.book.render("w3-design-tokens");
    case "svg":
      return theme.book.render("svg", { showConnections: true });
    case "json":
    default:
      return (
        JSON.stringify(
          {
            preset: theme.preset,
            mood: theme.mood,
            generator: theme.generator,
            seeds: theme.seeds,
            light: theme.light,
            dark: theme.dark,
            extras: theme.extras,
            audit: theme.audit,
          },
          null,
          2,
        ) + "\n"
      );
  }
}

export function formatAuditText(report: AuditReport): string {
  const lines: string[] = [];
  lines.push(
    `Contrast Audit (${report.standard}): ${report.passed} passed, ${report.failed} failed`,
  );
  lines.push("");
  for (const p of report.pairs) {
    const badge = p.pass ? "PASS" : "FAIL";
    lines.push(
      `[${badge}] (${p.mode}) ${p.fgToken} (${p.fgHex}) on ${p.bgToken} (${p.bgHex}) — WCAG ${p.wcag}:1 | APCA Lc ${p.apcaLc}`,
    );
    if (p.suggestedFix) {
      lines.push(
        `       fix -> ${p.suggestedFix.oklch} (${p.suggestedFix.hex}) [WCAG ${p.suggestedFix.wcag}:1 | APCA Lc ${p.suggestedFix.apcaLc}] via ${p.suggestedFix.reason}`,
      );
    }
  }
  return lines.join("\n") + "\n";
}

export function formatSuggestText(res: SuggestResult): string {
  const lines: string[] = [];
  lines.push(
    `Suggestions for seeds=${res.seeds.join(", ")} on ${res.surface.polarity} surface ${res.surface.oklch} (${res.surface.hex}) [mood=${res.mood}, generator=${res.generator}]`,
  );
  lines.push("");
  for (const s of res.suggestions) {
    lines.push(
      `- ${s.role.padEnd(18)} ${s.hex}  ${s.oklch.padEnd(28)}  WCAG ${String(s.wcagOnSurface).padStart(5)}:1  APCA ${String(s.apcaOnSurface).padStart(6)}  [${s.rule}]`,
    );
  }
  return lines.join("\n") + "\n";
}
