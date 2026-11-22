// The shadcn preset emits exactly stock shadcn's color tokens (flyingrobots/theme-book#19).
// Oracle: test/fixtures/shadcn-stock-index.css, captured from `shadcn init -t vite -b radix -p nova`
// (shadcn CLI 4.23.0). Its :root and .dark blocks are the token set the preset must match.
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { evaluateAudit, parseTokensFromText } from "../src/audit";
import { buildThemeBook } from "../src/books";
import { renderThemeOutput } from "../src/render";

const stock = readFileSync(join(import.meta.dir, "fixtures", "shadcn-stock-index.css"), "utf8");

/** Token names declared directly in a top-level block of the stock file, without the leading `--`. */
function stockNames(selector: string): string[] {
  const start = stock.search(new RegExp(`(^|\\n)${selector.replace(".", "\\.")}\\s*\\{`));
  const open = stock.indexOf("{", start);
  const body = stock.slice(open + 1, stock.indexOf("}", open));
  return [...body.matchAll(/--([\w-]+)\s*:/g)].map((m) => m[1]!);
}

// --radius is not a color; theme-book emits colors only.
const stockColors = (selector: string) => stockNames(selector).filter((n) => n !== "radius").sort();

const build = (seeds: string[], preset: "shadcn" | "slide-deck" = "shadcn") =>
  buildThemeBook({ seeds, preset, mood: "editorial", generator: "oklch", standard: "wcag-aaa" });

test.each([
  ["light", ":root"],
  ["dark", ".dark"],
] as const)("the shadcn preset emits exactly stock shadcn's %s color tokens", (mode, selector) => {
  expect(Object.keys(build(["#0f766e"])[mode]).sort()).toEqual(stockColors(selector));
});

// Seeds chosen to exercise the solver's hard regions: a deep teal, a mid blue, an orange,
// an achromatic grey, and a light yellow that is difficult to make readable.
test.each(["#0f766e", "#2563eb", "#c2410c", "#777777", "#eab308"])(
  "a shadcn theme from seed %s passes its own WCAG AAA audit, sidebar included",
  (seed) => {
    const report = evaluateAudit(parseTokensFromText(renderThemeOutput(build([seed]), "json"), "theme.json"), { standard: "wcag-aaa" });
    const required = report.pairs.filter((p) => p.required);
    const failing = required.filter((p) => !p.pass).map((p) => `${p.mode} ${p.fgToken} on ${p.bgToken}: ${p.wcagExact.toFixed(2)}:1`);
    expect(required.length).toBeGreaterThan(0); // zero witnesses would mean the audit checked nothing
    expect(failing).toEqual([]);
    expect(report.status).toBe("pass"); // also fails on unverified evidence, which `failing` cannot see
  },
);

test.each([
  ["sidebar-foreground", "sidebar", "text"],
  ["sidebar-primary-foreground", "sidebar-primary", "text"],
  ["sidebar-accent-foreground", "sidebar-accent", "text"],
  ["sidebar-ring", "sidebar", "ui-graphic"],
  ["sidebar-border", "sidebar", "border-advisory"],
] as const)("the audit checks %s on %s (%s) in both modes", (foreground, background, kind) => {
  const report = evaluateAudit(parseTokensFromText(renderThemeOutput(build(["#0f766e"]), "json"), "theme.json"), { standard: "wcag-aaa" });
  const modes = report.pairs.filter((p) => p.fgToken === foreground && p.bgToken === background && p.kind === kind).map((p) => p.mode).sort();
  expect(modes).toEqual(["dark", "light"]);
});

test("the slide-deck preset keeps destructive-foreground and gains no sidebar tokens", () => {
  const names = Object.keys(build(["#0f766e"], "slide-deck").light);
  expect([names.includes("destructive-foreground"), names.some((n) => n.startsWith("sidebar"))]).toEqual([true, false]);
});

// Every output format renders the token set, not only the serialized CSS (CodeRabbit on #20):
// --native and w3-tokens render the book itself, so the book must hold exactly the preset's tokens.
const tokensIn = (text: string) => new Set([...text.matchAll(/(?:--|"light\.|\b)(destructive-foreground|sidebar(?:-[a-z-]+)?)\b/g)].map((m) => m[1]!));
test.each([
  ["shadcn", "css", { native: true }],
  ["shadcn", "w3-tokens", {}],
] as const)("%s %s output (%o) has the sidebar tokens and no destructive-foreground", (preset, format, opts) => {
  const found = tokensIn(renderThemeOutput(build(["#0f766e"], preset), format, opts));
  expect([found.has("destructive-foreground"), found.has("sidebar-ring")]).toEqual([false, true]);
});
test.each([
  ["slide-deck", "css", { native: true }],
  ["slide-deck", "w3-tokens", {}],
] as const)("%s %s output (%o) has destructive-foreground and no sidebar tokens", (preset, format, opts) => {
  const found = tokensIn(renderThemeOutput(build(["#0f766e"], preset), format, opts));
  expect([found.has("destructive-foreground"), [...found].some((n) => n.startsWith("sidebar"))]).toEqual([true, false]);
});

test("the audit checks the sidebar ring against the sidebar even without a page background", () => {
  const css = ":root { --sidebar: #ffffff; --sidebar-foreground: #000000; --sidebar-ring: #ffffff; }";
  const ring = evaluateAudit(parseTokensFromText(css, "t.css"), { standard: "wcag-aa" }).pairs.filter((p) => p.fgToken === "sidebar-ring");
  expect(ring.map((p) => [p.bgToken, p.pass])).toEqual([["sidebar", false]]);
});
