---
name: theme-book
description: Build rule-based light/dark UI color themes, shadcn/ui tokens, slide-deck themes, and contrast-verified companion color suggestions using a private local design-book + poline + rampensau engine (theme-book CLI). Use whenever the user asks to create or refine a color theme, pick colors that work together, generate dark/light mode tokens, audit or fix color contrast, or encode procedural design-token rules. Pairs with color-expert.
---

# Theme Book (`theme-book`)

Compile rule-based light/dark UI color themes, verify contrast at full floating-point precision, and suggest accessible companion colors locally — built on **David Aerne's ([`@meodai`](https://github.com/meodai) / Elastiq GmbH)** [`design-book`](https://github.com/meodai/design-book), [`poline`](https://github.com/meodai/poline) and [`rampensau`](https://github.com/meodai/rampensau), and on [`culori`](https://culorijs.org/), and paired with the separate [`skill.color-expert`](https://github.com/meodai/skill.color-expert) skill.

## Two-Stage Workflow (Pair With `color-expert`)

1. **Choose color direction with `color-expert`** — decide the mood/character (*neutral, muted, vivid, editorial, high-contrast, corporate, freak*), hue strategy, medium, naming register, and gamut constraints.
2. **Solve & verify with `theme-book`** — pass those seed colors and mood into the `theme-book` CLI so `design-book` resolves semantic roles by constraint (`closest`, `bestContrastWith`, `minContrastWith`, `mostVivid`, `furthestFrom`, `shade`, `colorMix`, `dark extends light`) and verifies serialized outputs against **WCAG 2.1** (`wcag-aa` / `wcag-aaa`) or **APCA Lc** (`apca`).

**Never eyeball contrast ratios or invent ad-hoc hex pairs when `theme-book` can compute and verify them.**

**Generate a theme with `theme-book theme`; never hand-pick its colors and then audit them.** An audit proves a theme is legible, not that its light and dark modes are related. A theme whose colors were chosen by hand, or copied from another theme, and only checked with `theme-book audit` is not a theme-book theme, and must not be described as one. When no preset or mood fits the target, write a book extension, or say that the target needs a preset; do not improvise the colors.

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
- `--seed <color>` (repeatable; opaque in-gamut 8-bit sRGB hex seeds are preserved verbatim when readable; `seed-1` tints `--accent` in the existing moods; in `corporate` and `freak` the first colored seed is primary and the next non-status colors fill `--secondary`, then `--accent`)
- `--preset shadcn|semantic|slide-deck`
- `--mood neutral|muted|vivid|editorial|high-contrast|corporate|freak`. `corporate` and `freak` (shadcn only) build light and dark from one palette, with rules fitted to famous themes: give the whole palette as seeds, primary first (a grey seed is read as page or ink, not as primary), including its page and ink colors if it has them. `corporate` is quiet (soft tints, accents lifted in dark); `freak` puts the palette's own colors on show as flat fills, the same in both modes when they carry text. Every chart bar of a hued palette clears 3:1. They are built for WCAG AA: `--generator` has no effect, and `--standard wcag-aaa|apca` audits without changing the colors, so expect failures. A `--book` extension sees only their `seeds` and `palette` scopes (no `neutrals`). A hueless palette's charts are advisory; audit its file with `theme-book audit --charts-advisory`. See `docs/topics/derived-moods` in the theme-book repository.
- `--generator oklch|poline|rampensau` (drives `chart-1..5` with legibility-wins pentagon supplementation when needed)
- `--standard wcag-aa|wcag-aaa|apca` (defaults to `wcag-aaa` for `high-contrast`, `wcag-aa` otherwise)
- `--format css|json|w3-tokens|svg` (`json` includes full rule expressions, `chartDiagnostics`, and a versioned `recipe`)
- `--hex` (emit hex) or `--native` (emit Design Book's native CSS `var()`/`color-mix()`)
- `--audit` (run serialized-output verification and exit `0`/`1`/`3`)
- `--out <path>`
- `--book <extension.ts>` and `--book-sha256 <hex>` (a site's rule overrides; see section 5)

### Which Standard, and When

**Audit with WCAG for conformance, and read the APCA numbers for the truth. Never one alone.**

WCAG 2.x is *polarity-blind*: its ratio is symmetric, so dark-on-light and light-on-dark score
identically. Human vision is not symmetric — light text on a dark background blooms and reads
worse than the arithmetic implies. The practical consequence:

> **Passing WCAG AAA does not mean dark mode is readable.** Audit dark themes with WCAG alone and
> you will systematically overrate them.

`theme-book audit` prints a **polarity advisory** for any required text pair that clears the
requested WCAG standard but that APCA rates below `Lc 75` (fluent body reading). It is advisory
and never changes the exit code, because WCAG is the conformance standard and APCA — the WCAG 3
candidate — has no legal standing yet.

| APCA `Lc` | Reading |
| --- | --- |
| 45 | large or non-body text floor |
| 60 | body-text minimum |
| 75 | fluent body reading |
| 90 | preferred for body copy |

When an advisory fires, decide deliberately rather than reflexively: raising a dark theme's muted
greys to `Lc 75` is a visible change in character, and `Lc` in the 50s is defensible for secondary
or large text. Record the decision either way, so the next person does not "fix" it by accident.

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


### 5. Change a Few Preset Rules for One Site (`theme-book theme --book`)

When a site needs a preset with some rules changed (for example, lighter dark surfaces), **write a book extension; never fork or edit the preset, and never hand-edit the emitted tokens.** The extension names its parent preset and the parent's **rules version**; any other version is refused with exit `2`.

```ts
export default {
  name: "school",
  version: "1.0.0",
  extends: { preset: "shadcn", version: "1.1.0" },
  apply({ light, dark, rules }) {
    dark.set("background", rules.closest(rules.color("oklch(0.145 0 0)"), rules.ref("neutrals")));
  },
};
```

```bash
theme-book theme --book school.book.ts --seed "#0f766e" --mood editorial --standard wcag-aaa --audit
```

- Only tokens the preset emits may be set; an extension adds no tokens.
- Rule constructors (`closest`, `nth`, `ref`, `color`, `minContrastWith`, `bestContrastWith`, `mostVivid`, `leastVivid`, `furthestFrom`, `colorMix`, `shade`, `relativeTo`) arrive as `rules`, so the file needs no imports, and it may have none. The hash names the extension module, which may import nothing; an extension that reads files at runtime is outside the contract. theme-book refuses any static import, re-export, `import()`, `require` or `import.meta` with exit `2` before the extension runs. It cannot refuse runtime file reads (`Bun.file`, `fetch`), so never write one.
- Set every rule inside `apply`, synchronously: an async `apply` is refused, and `set()` throws after `apply` returns. Keep top-level code to the `export default`, because it runs before the header is checked.
- An error from the extension's own code (a throw in `apply`, a rule that fails to resolve) exits `2` naming the extension and its path.
- To replay a theme exactly, run the recipe `command` from `--format json`. It carries `--book-sha256 <hex>`, which refuses the extension if its bytes changed. A bare `--book` does not verify anything.
- Keep a site's extension with that site's private theme material, not in a non-AGPL repository's published code.
- When theme-book bumps a preset's rules version, re-check the extension against the new rules and update its `extends.version`.

## Licensing & Privacy Boundary

`design-book` is licensed **AGPL-3.0-only**. Keep `design-book` strictly behind the private local `theme-book` CLI when authoring themes for non-AGPL projects: commit only the generated static CSS/JSON theme tokens to target repositories, and never add `design-book` as a project runtime dependency unless the project is AGPL-compatible or commercially licensed from [Elastiq GmbH](mailto:david@elastiq.ch).
