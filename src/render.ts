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
    `/* ${theme.recipe.command} */`,
  );
  lines.push(
    `/* theme-book v${theme.recipe.toolVersion} · design-book v${theme.recipe.designBookVersion} · audit=${theme.audit.status} (${theme.standard}) */`,
  );
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
            recipe: {
              ...theme.recipe,
              formatOptions: {
                hex: opts.hex ?? theme.recipe.formatOptions.hex,
                native: opts.native ?? theme.recipe.formatOptions.native,
              },
            },
            preset: theme.preset,
            mood: theme.mood,
            generator: theme.generator,
            standard: theme.standard,
            seeds: theme.seeds,
            light: theme.light,
            dark: theme.dark,
            chartDiagnostics: theme.chartDiagnostics,
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
    `Contrast Audit [${report.status.toUpperCase()}] (${report.standard}): ${report.passed} passed, ${report.failed} failed, ${report.unverifiedCount} unverified, ${report.advisoryCount} advisory`,
  );
  lines.push(
    `Coverage: ${report.coverage.assessedPairs.text} text, ${report.coverage.assessedPairs.uiGraphic} ui-graphic, ${report.coverage.assessedPairs.borderAdvisory} border-advisory`,
  );
  lines.push("");
  for (const p of report.pairs) {
    const badge = !p.required ? "INFO" : p.pass ? "PASS" : "FAIL";
    const compNote = p.composited ? " [composited]" : "";
    lines.push(
      `[${badge}] (${p.mode} · ${p.kind}) ${p.fgToken} (${p.fgHex}) on ${p.bgToken} (${p.bgHex})${compNote} — WCAG ${p.wcag}:1 (exact ${p.wcagExact.toFixed(4)}) | APCA Lc ${p.apcaLc}`,
    );
    if (p.suggestedFix) {
      if (p.suggestedFix.status === "fixed") {
        lines.push(
          `       fix [pair-local, verified] -> ${p.suggestedFix.oklch} (${p.suggestedFix.hex}) [WCAG ${p.suggestedFix.wcag}:1 | APCA Lc ${p.suggestedFix.apcaLc}] (${p.suggestedFix.reason})`,
        );
      } else {
        lines.push(
          `       fix [pair-local, no-solution] -> ${p.suggestedFix.reason}`,
        );
      }
    }
  }
  if (report.coverage.unverifiedPairs.length > 0) {
    lines.push("");
    lines.push("Unverified pairs:");
    for (const u of report.coverage.unverifiedPairs) {
      lines.push(
        `[UNVERIFIED] (${u.mode} · ${u.kind}${u.required ? "" : " · advisory"}) ${u.fgToken} (${u.fgRaw}) on ${u.bgToken} (${u.bgRaw}) — ${u.reason}`,
      );
    }
  }
  if (report.coverage.skippedTokens.length > 0) {
    lines.push("");
    lines.push("Skipped tokens:");
    for (const s of report.coverage.skippedTokens) {
      lines.push(`[SKIPPED] (${s.mode}) --${s.token}: ${s.raw} — ${s.reason}`);
    }
  }
  if (report.coverage.assumptions.length > 0) {
    lines.push("");
    lines.push("Assumptions:");
    for (const a of report.coverage.assumptions) {
      lines.push(`- ${a}`);
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
  if (res.warnings.length > 0) {
    lines.push("");
    for (const w of res.warnings) {
      lines.push(`[warning] ${w}`);
    }
  }
  return lines.join("\n") + "\n";
}
