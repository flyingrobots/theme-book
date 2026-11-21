---
name: theme-book
description: Build rule-based light/dark UI color themes, shadcn/ui tokens, slide-deck themes, and contrast-verified companion color suggestions using a private local design-book + poline + rampensau engine (theme-book CLI). Use whenever the user asks to create or refine a color theme, pick colors that work together, generate dark/light mode tokens, audit or fix color contrast, or encode procedural design-token rules. Pairs with color-expert.
---

# Theme Book (`theme-book`)

Compile rule-based light/dark UI color themes, verify contrast at full floating-point precision, and suggest accessible companion colors locally — built on **David Aerne's ([`@meodai`](https://github.com/meodai) / Elastiq GmbH)** [`design-book`](https://github.com/meodai/design-book), [`poline`](https://github.com/meodai/poline), and [`rampensau`](https://github.com/meodai/rampensau), paired with [`skill.color-expert`](https://github.com/meodai/skill.color-expert), plus [`culori`](https://culorijs.org/).

## Two-Stage Workflow (Pair With `color-expert`)

1. **Choose color direction with `color-expert`** — decide the mood/character (*neutral, muted, vivid, editorial, high-contrast*), hue strategy, medium, naming register, and gamut constraints.
2. **Solve & verify with `theme-book`** — pass those seed colors and mood into the `theme-book` CLI so `design-book` resolves semantic roles by constraint (`closest`, `bestContrastWith`, `minContrastWith`, `mostVivid`, `furthestFrom`, `shade`, `colorMix`, `dark extends light`) and verifies serialized outputs against **WCAG 2.1** (`wcag-aa` / `wcag-aaa`) or **APCA Lc** (`apca`).

**Never eyeball contrast ratios or invent ad-hoc hex pairs when `theme-book` can compute and verify them.**

---

## Commands

### 1. Build a Complete Light + Dark Theme (`theme-book theme`)

```bash
# shadcn/ui :root + .dark OKLCH CSS variables + contrast audit
theme-book theme --seed "#2563eb" --preset shadcn --mood editorial --generator poline --audit

# High-contrast theme (defaults to wcag-aaa; solves text + status fills at 7:1 while keeping primary at >=4.5:1)
theme-book theme --seed "#2563eb" --preset shadcn --mood high-contrast --audit

# Dual-seed theme (seed-1 explicitly tints --accent; generator drives chart-1..5)
theme-book theme --seed "#c2410c" --seed "#0f766e" --preset shadcn --mood vivid --generator rampensau --standard apca --audit

# Slide-deck drop-in tokens, W3C Design Tokens JSON, or SVG dependency graph
theme-book theme --seed "#0f766e" --preset slide-deck --format css
theme-book theme --seed "#2563eb" --preset semantic --format w3-tokens
theme-book theme --seed "#2563eb" --preset shadcn --format svg --out theme-graph.svg
```

Options:
- `--seed <color>` (repeatable; opaque in-gamut 8-bit sRGB hex seeds are preserved verbatim when readable; `seed-1` tints `--accent`)
- `--preset shadcn|semantic|slide-deck`
- `--mood neutral|muted|vivid|editorial|high-contrast`
- `--generator oklch|poline|rampensau` (drives `chart-1..5` with legibility-wins pentagon supplementation when needed)
- `--standard wcag-aa|wcag-aaa|apca` (defaults to `wcag-aaa` for `high-contrast`, `wcag-aa` otherwise)
- `--format css|json|w3-tokens|svg` (`json` includes full rule expressions, `chartDiagnostics`, and a versioned `recipe`)
- `--hex` (emit hex) or `--native` (emit Design Book's native CSS `var()`/`color-mix()`)
- `--audit` (run serialized-output verification and exit `0`/`1`/`3`)
- `--out <path>`

### 2. Audit & Fix Existing Themes (`theme-book audit`)

Audits CSS (`@layer base`, `@supports`, `@media (prefers-color-scheme: dark)`, `:root.dark`, `html.dark`, classic shadcn bare HSL, post-merge `var()`), `theme-book` JSON, and W3C DTCG JSON at full floating-point precision with alpha compositing and explicit coverage reporting:

```bash
theme-book audit path/to/tokens.css
theme-book audit path/to/tokens.css --standard wcag-aaa --fix
theme-book audit path/to/tokens.css --standard apca --fix --strict-borders --format json
```

Exit codes:
- `0` — **pass**: all required checks (`text` and `ui-graphic`) evaluated and passed
- `1` — **fail**: one or more required checks failed
- `2` — **invalid**: unknown option or malformed input
- `3` — **incomplete**: zero failures, but required evidence was unverified (e.g. out-of-sRGB-gamut P3 colors such as stock Tailwind v4 stops, unresolved/cyclic `var()`, unknown translucent backdrop, or unsupported conditional `@media` overrides)

### 3. Suggest Companion Colors (`theme-book suggest`)

```bash
theme-book suggest --seed "#2563eb" --mood editorial --generator poline
theme-book suggest --seed "#d97706" --surface "#0f172a" --generator rampensau --count 10 --format json
```

### 4. Run Bespoke Design Book Scripts Privately (`theme-book eval`)

Executes a TypeScript file (or stdin via `-`) from any working directory with `design-book`, `poline`, `rampensau`, and `culori` resolved from `~/.theme-book/node_modules/` — **zero dependencies added to the user's project**:

```bash
theme-book eval - <<'EOF'
import { DesignBook, color, ref, bestContrastWith, closest, shade } from "design-book";

const book = new DesignBook("custom");
const p = book.addScope("palette");
p.set("ink", color("#111827"));
p.set("paper", color("#fafaf9"));
p.set("cobalt", color("#1d4ed8"));

const ui = book.addScope("ui");
ui.set("bg", ref("palette.paper"));
ui.set("fg", bestContrastWith(ref("ui.bg"), ref("palette")));
ui.set("accent", closest(ref("palette.cobalt"), ref("palette"), { readableOn: ref("ui.bg"), readableContrast: 4.5 }));
ui.set("border", shade(ref("ui.bg"), { amount: 0.1 }));

console.log(book.render("css-variables"));
EOF
```

---

## Licensing & Privacy Boundary

`design-book` is licensed **AGPL-3.0-only**. Keep `design-book` strictly behind the private local `theme-book` CLI when authoring themes for non-AGPL projects: commit only the generated static CSS/JSON theme tokens to target repositories, and never add `design-book` as a project runtime dependency unless the project is AGPL-compatible or commercially licensed from [Elastiq GmbH](mailto:david@elastiq.ch).
