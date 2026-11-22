# theme-book

A local CLI and AI agent skill for compiling rule-based light/dark UI color themes, auditing contrast at full floating-point precision, and suggesting accessible companion colors — built on [David Aerne's (`@meodai`)](https://github.com/meodai) [`design-book`](https://github.com/meodai/design-book), [`poline`](https://github.com/meodai/poline) and [`rampensau`](https://github.com/meodai/rampensau), and on [`culori`](https://culorijs.org/), and paired with the separate [`skill.color-expert`](https://github.com/meodai/skill.color-expert) skill.

![theme-book UI specimen across editorial and vivid moods in light and dark modes](docs/specimen.svg)

---

## What `theme-book` Does

- **Compiles procedural themes (`theme`)** — builds a reactive `DesignBook` (`light` + `dark extends light`) from one or more seed colors, a mood profile, a chart palette generator (`oklch`, `poline`, `rampensau`), and a contrast standard (`wcag-aa`, `wcag-aaa`, `apca`). Emits ready-to-drop CSS (`:root` + `.dark` in gamut-safe `oklch()`), provenance JSON with a reproducible `recipe`, W3C Design Tokens JSON, or an SVG dependency graph.
- **Audits & repairs existing token files (`audit`)** — evaluates CSS (`@layer base`, `@supports`, `@media (prefers-color-scheme: dark)`, `:root.dark`, `html.dark`, classic shadcn bare HSL triples, `var()` aliases), `theme-book` JSON, and W3C DTCG JSON at **full floating-point precision** without pre-comparison rounding or dropped alpha. Proposes pair-local repairs verified directly against the selected standard.
- **Suggests companion colors (`suggest`)** — generates gamut-safe candidate pools and runs `design-book` selectors (`mostVivid`, `closest`, `furthestFrom`, `leastVivid`, `bestContrastWith`, `minContrastWith`, `colorMix`, `shade`) against your target surface.
- **Runs private `design-book` scripts (`eval`)** — executes ad-hoc TypeScript files (or stdin via `-`) from any working directory with `design-book`, `poline`, `rampensau`, and `culori` pre-resolved from `~/.theme-book/node_modules/`, keeping target repositories free of AGPL runtime dependencies.

---

## Install (Isolated Local Runtime)

Requires [Bun](https://bun.sh/).

```bash
git clone https://github.com/flyingrobots/theme-book.git
cd theme-book
./install.sh
```

`install.sh` resolves paths canonically, stages an isolated runtime into `~/.theme-book/` (marked with `.theme-book-install` and refusing to overwrite unrelated non-empty directories), installs production dependencies via `--frozen-lockfile`, symlinks `~/.local/bin/theme-book`, and syncs `skills/theme-book/` if `sync-agents` from [`agent-hub`](https://github.com/flyingrobots/agent-hub) is installed.

---

## Usage

### 1. Build Complete Light + Dark Themes

```bash
# shadcn/ui (:root + .dark OKLCH CSS variables) with contrast audit
theme-book theme --seed "#2563eb" --preset shadcn --mood editorial --generator poline --audit

# High-contrast theme (defaults to wcag-aaa and solves all text + status fills at 7:1)
theme-book theme --seed "#2563eb" --preset shadcn --mood high-contrast --audit

# APCA-verified dual-seed theme (seed-1 explicitly tints --accent)
theme-book theme --seed "#c2410c" --seed "#0f766e" --preset shadcn --mood vivid --generator rampensau --standard apca --audit

# Slide-deck drop-in tokens, W3C Design Tokens JSON, or SVG dependency graph
theme-book theme --seed "#0f766e" --preset slide-deck --format css
theme-book theme --seed "#2563eb" --preset semantic --format w3-tokens
theme-book theme --seed "#2563eb" --preset shadcn --format svg --out graph.svg
```

### 2. Audit & Repair Existing Themes

```bash
theme-book audit path/to/tokens.css
theme-book audit path/to/tokens.css --standard wcag-aaa --fix
theme-book audit path/to/tokens.css --standard apca --fix --strict-borders
theme-book audit path/to/theme.json --format json
```

### 3. Suggest Companion Colors

```bash
theme-book suggest --seed "#2563eb" --mood editorial --generator poline
theme-book suggest --seed "#d97706" --surface "#0f172a" --generator rampensau --count 10 --format json
```

### 4. Run Bespoke `design-book` Scripts From Any Directory

```bash
theme-book eval my-book.ts
theme-book eval - < my-book.ts
```

### 5. Extend a Preset With a Site's Own Rules (`--book`)

A site that needs a preset with a few rules changed writes a **book extension** rather than
forking the preset. The extension names itself, its own version, and the preset and preset
**rules version** it extends. Its rules are `design-book` expressions built with constructors
passed to `apply`, so the file needs no imports:

```ts
// school.book.ts
export default {
  name: "school",
  version: "1.0.0",
  extends: { preset: "shadcn", version: "1.0.0" },
  apply({ dark, rules }) {
    dark.set("background", rules.closest(rules.color("oklch(0.145 0 0)"), rules.ref("neutrals")));
  },
};
```

```bash
theme-book theme --book school.book.ts --seed "#0f766e" --mood editorial --standard wcag-aaa --audit
```

- **Rules are versioned.** Each preset has a rules version, independent of the tool's version.
  An extension naming any other version is refused (exit `2`) with the installed version in the
  message, so an extension never silently runs against rules it was not written for.
- **No new tokens.** An extension may only override tokens the preset emits.
- **Audited like a preset.** `--audit` checks the extended theme exactly as it checks a preset.
- **Provenance.** `--format json` records `recipe.book`: the preset, its rules version, and the
  extension's name, version and SHA-256.
- Without `--preset`, the extension's parent decides the preset.

| Preset | Rules version |
| --- | --- |
| `shadcn` | 1.0.0 |
| `semantic` | 1.0.0 |
| `slide-deck` | 1.0.0 |

---

## Design Decisions & Audit Contracts

These rules and heuristics belong to `theme-book` itself (distinct from the upstream libraries it builds on):

### Role Assignment & Exact Seeds
- **Exact seed domain:** Opaque, in-gamut 8-bit sRGB hex inputs (`#rrggbb`) are preserved verbatim into `brand.seed-0` without an OKLCH round-trip, and `formatOklchCss()` ensures the emitted `oklch()` string stays strictly inside sRGB and re-parses back to the exact hex.
- **Token set (`shadcn`):** exactly stock shadcn's: `background` through `ring`, `chart-1..5`, and the eight `sidebar-*` tokens, with no `destructive-foreground` (current shadcn has none). A test compares it with the `src/index.css` that `shadcn init` writes.
- **Sidebar:** `sidebar` is one neutral step off `background` in light and at the card level in dark; its foreground, primary and accent pairs reuse the page-level rules solved against the sidebar's own surface, and the audit checks `sidebar-ring` and `sidebar-border` against `sidebar`.
- **`primary` vs. `background`:** Selected via `closest(ref("brand.seed-0"), pool(brandSolvableLight|Dark), { readableOn: background, readableContrast: 4.5 })`. `primary` stays at ≥ 4.5:1 against `background` even under `wcag-aaa` (since it is a UI fill, not body copy), while `primary-foreground` on `primary` and every status fill (`destructive`, `success`, `warning`, `danger`) enforce the full active text standard via standard-filtered named `DesignBook` scopes.
- **`secondary` & `accent`:** In `shadcn` and `slide-deck`, these remain quiet primary tints on single-seed themes; `--accent` tints from a second hue **only** when a second `--seed` is explicitly supplied.
- **`chart-1..5`:** Driven by `--generator` (`oklch`, `poline`, `rampensau`) + all seeds, mapped to polarity-safe lightness/chroma so every bar clears ≥ 3.0:1 WCAG and `|Lc| >= 45` APCA. Uses a **legibility-wins** policy: if a narrow generator arc falls below `0.8 × effectiveChroma` minimum pairwise OKLab distance, evenly-spaced synthetic pentagon spokes are added and reported transparently in `chartDiagnostics`.
- **Reproducible recipes:** `--format json` exports a versioned `recipe` (`toolVersion`, `designBookVersion`, `rawSeeds`, `preset`, `mood`, `generator`, `standard`, `formatOptions`, `command`, `book`) alongside full `DesignBook` rule expressions and dependencies.

### Audit Contract & Exit Codes

| Status | Meaning | Exit Code |
| :--- | :--- | :---: |
| `pass` | Every applicable required check (`text` and `ui-graphic`) was evaluated at full precision and passed | `0` |
| `fail` | One or more required checks failed (incomplete coverage, if any, is also reported) | `1` |
| `invalid` | Unknown CLI option, missing argument, or malformed input | `2` |
| `incomplete` | Zero known required failures, but required evidence could not be verified (unresolved/cyclic `var()`, out-of-sRGB-gamut color, unknown translucent backdrop, unsupported conditional `@media` override, or zero required pairs) | `3` |

- **Precision & alpha:** Colors are parsed into full-precision floating-point sRGB (no 8-bit hex quantization before measuring) and compared against unrounded thresholds. Translucent foregrounds composite over opaque backgrounds in sRGB; translucent non-root tokens (such as shadcn's `oklch(1 0 0 / 10%)` borders) composite over the mode's opaque `background` with the assumption recorded; translucent root backgrounds are marked `unverified` (`exit 3`).
- **sRGB gamut policy (note on Tailwind v4):** WCAG 2.x and APCA are evaluated on sRGB channels; colors outside sRGB gamut (such as wide-gamut P3 stops in stock Tailwind v4 palettes) are intentionally marked `unverified` (`exit 3`) rather than silently clamped into a false pass.
- **APCA policy assumption:** `--standard apca` uses `|Lc| >= 60` for text and `|Lc| >= 45` for UI graphics as a content-text baseline; APCA guidance varies by font size and weight, so treat `Lc 60` as a declared policy threshold rather than a guarantee for tiny or thin text.
- **Pair-local `--fix`:** Repairs verify serialized `oklch()` candidates directly against that pair's exact standard and threshold, returning `status: "fixed"` (`verified: true`) or `status: "no-solution"` (`verified: false`).

---

## Documentation

The [documentation spine](docs/README.md) routes to every durable page:

- [Contrast auditing](docs/topics/contrast-auditing/README.md) — what `audit` checks, which
  standard to ask for, how to read the result, and the known gaps
- [Documentation standards](docs/DOCUMENTATION_STANDARDS.md) — how pages here are written
- [`AGENTS.md`](AGENTS.md) — working agreement: the local gate, the install trap, hard don'ts

## Development & Tests

```bash
bun install --frozen-lockfile
bun run typecheck
bun test
bun run specimen
./install.sh
```

---

## Credits & Respect

Huge respect and gratitude to **David Aerne ([`@meodai`](https://github.com/meodai) / [Elastiq GmbH](https://elastiq.ch/))**, whose color engineering makes this entire workflow possible:

- [`meodai/design-book`](https://github.com/meodai/design-book) — the reactive constraint engine that encodes *how* design tokens are chosen instead of freezing static hex dumps
- [`meodai/skill.color-expert`](https://github.com/meodai/skill.color-expert) — the extraordinary 180+ document color knowledge base for AI agents
- [`meodai/poline`](https://github.com/meodai/poline) — the perceptually grounded anchor palette generator
- [`meodai/rampensau`](https://github.com/meodai/rampensau) — the easing-driven color ramp generator

And sincere thanks to the maintainers of [`culori`](https://culorijs.org/) for accurate OKLCH/OKLab conversions and gamut tooling.

---

## License

`theme-book` is licensed under **[AGPL-3.0-only](LICENSE)** in full compliance with [`meodai/design-book`](https://github.com/meodai/design-book).

If you want to embed `design-book` itself inside proprietary or closed-source software, please obtain a commercial license from [Elastiq GmbH](mailto:david@elastiq.ch). Running `theme-book` privately as a local authoring CLI to emit static CSS/JSON tokens keeps consuming projects free of runtime AGPL dependencies.
