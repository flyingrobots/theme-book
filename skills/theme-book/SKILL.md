---
name: theme-book
description: Build rule-based light/dark UI color themes, shadcn/ui tokens, slide-deck themes, and contrast-verified companion color suggestions using a private local design-book + poline + rampensau engine (theme-book CLI). Use whenever the user asks to create or refine a color theme, pick colors that work together, generate dark/light mode tokens, audit or fix color contrast, or encode procedural design-token rules. Pairs with color-expert.
---

# Theme Book (`theme-book`)

> **Standing on giants:** All of the color science, reactive token resolution, and palette generation behind this skill belong to **David Aerne ([`@meodai`](https://github.com/meodai) / Elastiq GmbH)** — creator of [`skill.color-expert`](https://github.com/meodai/skill.color-expert), [`design-book`](https://github.com/meodai/design-book), [`poline`](https://github.com/meodai/poline), and [`rampensau`](https://github.com/meodai/rampensau) — together with [`culori`](https://culorijs.org/). All `theme-book` does is humbly feed one into the other so coding agents can solve and verify color rules locally.

## Two-Stage Workflow (Pair With `color-expert`)

1. **Think with `color-expert`** — decide the mood/character (*neutral, muted, vivid, editorial, high-contrast*), hue strategy, medium, naming register, and gamut constraints.
2. **Solve & verify with `theme-book`** — pass those seed colors and mood into the `theme-book` CLI so `design-book` resolves semantic roles by constraint (`bestContrastWith`, `minContrastWith`, `mostVivid`, `furthestFrom`, `shade`, `colorMix`, `dark extends light`) and verifies every foreground/background pair with **WCAG 2.1** and **APCA Lc**.

**Never eyeball contrast ratios or invent ad-hoc hex pairs when `theme-book` can compute and prove them.**

---

## Commands

### 1. Suggest Companion Colors (`theme-book suggest`)

Use when picking accents, complementary hues, muted companions, inks, or adaptive borders that work on a specific surface:

```bash
theme-book suggest --seed "#2563eb" --mood editorial --generator poline
theme-book suggest --seed "#d97706" --surface "#0f172a" --generator rampensau --format json
```

Options:
- `--seed <color>` (repeatable; hex, `oklch(...)`, named CSS color, etc.)
- `--surface <color>` or `--polarity light|dark`
- `--mood neutral|muted|vivid|editorial|high-contrast`
- `--generator oklch|poline|rampensau`
- `--count <n>` (default `8`)
- `--format text|json`

### 2. Build a Complete Light + Dark Theme (`theme-book theme`)

Compiles a procedural `DesignBook` (`light` + `dark extends light`) and emits ready-to-drop tokens:

```bash
# shadcn/ui :root + .dark OKLCH CSS variables + contrast audit
theme-book theme --seed "#0f766e" --preset shadcn --mood editorial --audit

# Drop-in slide-deck tokens (matches slide-deck/template.html)
theme-book theme --seed "#2563eb" --preset slide-deck --generator poline --format css

# Generic semantic UI tokens as W3C Design Tokens JSON
theme-book theme --seed "#9333ea" --preset semantic --format w3-tokens

# Dependency graph visualization (SVG)
theme-book theme --seed "#2563eb" --preset shadcn --format svg --out theme-graph.svg
```

Options:
- `--preset shadcn|semantic|slide-deck`
- `--mood neutral|muted|vivid|editorial|high-contrast`
- `--generator oklch|poline|rampensau`
- `--format css|json|w3-tokens|svg`
- `--hex` (emit hex instead of OKLCH) or `--native` (emit Design Book's native CSS `var()`/`color-mix()`)
- `--audit` (print WCAG + APCA verification table)
- `--out <path>`

### 3. Audit & Fix Existing Themes (`theme-book audit`)

Checks every inferred foreground/background pair in an existing CSS (`:root` / `.dark`) or JSON token file, and with `--fix` runs Design Book's `minContrastWith` over a hue-preserving OKLCH lightness ramp to propose minimal passing replacements:

```bash
theme-book audit path/to/tokens.css
theme-book audit path/to/tokens.css --standard wcag-aaa --fix
theme-book audit path/to/tokens.json --standard apca --fix --format json
```

### 4. Run Bespoke Design Book Scripts Privately (`theme-book eval`)

When a design needs custom scopes, `layer()` / `composeBook()`, `diffBooks()`, `spacingScale`, or `typographyScale`, execute a TypeScript file (or stdin via `-`) with `design-book`, `poline`, `rampensau`, and `culori` pre-resolved from `~/.theme-book/` — **without installing anything into the user's project**:

```bash
theme-book eval - <<'EOF'
import { DesignBook, color, ref, bestContrastWith, mostVivid, shade } from "design-book";

const book = new DesignBook("custom");
const p = book.addScope("palette");
p.set("ink", color("#111827"));
p.set("paper", color("#fafaf9"));
p.set("cobalt", color("#1d4ed8"));

const ui = book.addScope("ui");
ui.set("bg", ref("palette.paper"));
ui.set("fg", bestContrastWith(ref("ui.bg"), ref("palette")));
ui.set("accent", mostVivid(ref("palette"), { readableOn: ref("ui.bg"), readableContrast: 4.5 }));
ui.set("border", shade(ref("ui.bg"), { amount: 0.1 }));

console.log(book.render("css-variables"));
EOF
```

---

## Licensing & Privacy Boundary

`design-book` is licensed **AGPL-3.0-only**. Keep `design-book` strictly behind the private local `theme-book` CLI when authoring themes for non-AGPL projects: commit only the generated static CSS/JSON theme tokens to target repositories, never add `design-book` as a project runtime dependency unless the project is AGPL-compatible or commercially licensed from [Elastiq GmbH](mailto:david@elastiq.ch).
