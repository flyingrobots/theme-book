# The theme-book CLI

This is the reference for the `theme-book` command: how it installs, what each subcommand does, how a site extends a preset with its own rules, and the contracts the audit keeps. The [README](../../../README.md) is the tour; this page is where to look things up.

> [!NOTE]
> Agent-written on 2026-11-28 from the README it replaces, and not yet reviewed by a human.

## Install

theme-book runs on [Bun](https://bun.sh/) from an isolated runtime in `~/.theme-book/`, not from a checkout. There is no npm package.

```bash
git clone https://github.com/flyingrobots/theme-book.git
cd theme-book
./install.sh
```

_Listing 1. Installing from a checkout. Run it again after pulling to update the installed copy._

`install.sh` resolves paths canonically, stages the runtime into `~/.theme-book/` (marked with `.theme-book-install`, and refusing to overwrite an unrelated non-empty directory), installs production dependencies with `--frozen-lockfile` (design-book from the tarball in `vendor/`), symlinks `~/.local/bin/theme-book`, and syncs `skills/theme-book/` into the agent hub when `sync-agents` from [`agent-hub`](https://github.com/flyingrobots/agent-hub) is installed.

Editing `src/` in a checkout changes nothing until `install.sh` runs again.

## Commands

theme-book has four subcommands. `theme` builds themes, `audit` checks existing ones, `suggest` proposes companion colors, and `eval` runs your own design-book scripts.

| Command | What it does |
| --- | --- |
| `theme` | Builds a reactive `DesignBook` (`light`, and `dark`) from one or more seed colors, a mood, a chart palette generator (`oklch`, `poline`, `rampensau`) and a contrast standard (`wcag-aa`, `wcag-aaa`, `apca`). Emits CSS (`:root` and `.dark` in gamut-safe `oklch()`, or hex with `--hex`), provenance JSON with a reproducible `recipe`, W3C Design Tokens JSON, or an SVG dependency graph. |
| `audit` | Checks a CSS file (`@layer base`, `@supports`, `@media (prefers-color-scheme: dark)`, `:root.dark`, `html.dark`, shadcn's bare HSL triples, `var()` aliases), theme-book JSON or W3C DTCG JSON at full floating-point precision, without rounding before comparing or dropping alpha. `--fix` proposes pair-local repairs verified against the selected standard. |
| `suggest` | Generates gamut-safe candidate pools and runs design-book selectors (`mostVivid`, `closest`, `furthestFrom`, `leastVivid`, `bestContrastWith`, `minContrastWith`, `colorMix`, `shade`) against a target surface. |
| `eval` | Runs a TypeScript file (or stdin, with `-`) from any directory with `design-book`, `poline`, `rampensau` and `culori` resolved from `~/.theme-book/node_modules/`, keeping the target repository free of AGPL runtime dependencies. |

_Table 1. The four subcommands. Every one reads its options from `theme-book --help`, which is the exact syntax._

### Build light and dark themes

`theme` takes seeds, a preset and a mood. Listing 2 shows the common combinations.

```bash
# shadcn/ui (:root + .dark OKLCH CSS variables) with a contrast audit
theme-book theme --seed "#2563eb" --preset shadcn --mood editorial --generator poline --audit

# High contrast: defaults to wcag-aaa and solves every text and status fill at 7:1
theme-book theme --seed "#2563eb" --preset shadcn --mood high-contrast --audit

# Light and dark from one palette: corporate is quiet, freak puts every palette color on show
theme-book theme --seed "#e88e8d" --seed "#79cce2" --seed "#d1a45f" --seed "#60bd90" \
  --seed "#cfa0e8" --seed "#292c2f" --preset shadcn --mood corporate --audit

# APCA-verified two-seed theme (seed-1 tints --accent)
theme-book theme --seed "#c2410c" --seed "#0f766e" --preset shadcn --mood vivid --generator rampensau --standard apca --audit

# Slide-deck tokens, W3C Design Tokens JSON, or an SVG dependency graph
theme-book theme --seed "#0f766e" --preset slide-deck --format css
theme-book theme --seed "#2563eb" --preset semantic --format w3-tokens
theme-book theme --seed "#2563eb" --preset shadcn --format svg --out graph.svg
```

_Listing 2. Common `theme` runs. The `corporate` and `freak` moods are described in [derived moods](../derived-moods/README.md)._

Every run writes its own replay command as the first line of the CSS, and `--format json` records it in `recipe.command`.

### Audit and repair existing themes

`audit` reads a token file and checks every foreground and background pair it can find. Listing 3 shows the common forms.

```bash
theme-book audit path/to/tokens.css
theme-book audit path/to/tokens.css --standard wcag-aaa --fix
theme-book audit path/to/tokens.css --standard apca --fix --strict-borders
theme-book audit path/to/theme.json --format json
theme-book audit path/to/tokens.css --charts-advisory
```

_Listing 3. Common `audit` runs. `--charts-advisory` reports chart bars without requiring them, as a hueless `corporate` or `freak` theme's header asks._

[Contrast auditing](../contrast-auditing/README.md) explains which standard to ask for and how to read the result.

### Suggest companion colors

`suggest` proposes colors that work with a seed on a given surface. It refuses `--mood corporate` and `--mood freak` (exit `2`), which build whole themes and belong to `theme`.

```bash
theme-book suggest --seed "#2563eb" --mood editorial --generator poline
theme-book suggest --seed "#d97706" --surface "#0f172a" --generator rampensau --count 10 --format json
```

_Listing 4. Common `suggest` runs._

### Run your own design-book scripts

`eval` runs a script with theme-book's libraries already resolved, so a private experiment needs no install of its own.

```bash
theme-book eval my-book.ts
theme-book eval - < my-book.ts
```

_Listing 5. Running a script from a file or from stdin._

These four commands cover building, checking, choosing and experimenting.

## Extend a preset with your own rules

A site that needs a preset with a few rules changed writes a book extension rather than forking the preset. The extension names itself, its own version, and the preset and rules version it extends. Its rules are design-book expressions built with constructors passed to `apply`, so the file needs no imports, and may have none.

```ts
// school.book.ts
export default {
  name: "school",
  version: "1.0.0",
  extends: { preset: "shadcn", version: "1.1.0" },
  apply({ dark, rules }) {
    dark.set("background", rules.closest(rules.color("oklch(0.145 0 0)"), rules.ref("neutrals")));
  },
};
```

_Listing 6. An extension that picks the dark page from the preset's neutral pool._

```bash
theme-book theme --book school.book.ts --seed "#0f766e" --mood editorial --standard wcag-aaa --audit
```

_Listing 7. Building with the extension. Under `editorial` it passes WCAG AAA (observed with v0.5.0: 36 passed, 0 failed, 6 advisory)._

The `corporate` and `freak` moods build only the `seeds` and `palette` helper scopes, and their `dark` does not extend `light`, so this extension, which refers to `neutrals`, exits `2` under them, naming the extension and the unresolved rule. Table 2 lists the contract an extension runs under.

| Rule | What it means |
| --- | --- |
| Rules are versioned | Each preset has a rules version, independent of the tool's version. An extension naming any other version is refused (exit `2`) with the installed version in the message, so an extension never silently runs against rules it was not written for. |
| No new tokens | An extension may only override tokens the preset emits. |
| Audited like a preset | `--audit` checks the extended theme exactly as it checks a preset. |
| Provenance | `--format json` records `recipe.book`: the preset, its rules version, and the extension's name, version and SHA-256. The hash names the extension module, which may import nothing; an extension that reads files at run time is outside the contract. theme-book loads a private copy of exactly the bytes it hashed, after scanning them: a static import, a re-export, `import()` and `require` of any form, and `import.meta` are refused (exit `2`, naming the import) before any of the extension's code runs. Type-only imports are erased and allowed. A run-time API that reads a file (`Bun.file`, `Bun.spawn`, `fetch`) cannot be refused by scanning, which is why such an extension is outside the contract rather than refused. |
| Replay verifies the hash | `--book-sha256 <hex>` refuses an extension whose SHA-256 differs (exit `2`) before importing it. The recipe command includes it, so replaying the command refuses a rewritten extension. Without the flag, `--book` loads whatever the file holds and records its hash. |
| Top-level code runs first | Loading a module runs its top-level code, so an extension's top-level code runs before its header (name, versions, `apply`) is checked. Keep everything inside `apply`. |
| `apply` is synchronous | An `apply` that returns a promise is refused (exit `2`), and `set()` throws once `apply` has returned. |
| Errors name the extension | An error thrown by `apply`, or by resolving the rules it set, exits `2` with the extension's name, version and path. |
| The parent decides the preset | Without `--preset`, the extension's parent decides the preset. |

_Table 2. The contract an extension runs under. Each rule keeps an extension from running against rules, or code, it was not written for._

| Preset | Rules version |
| --- | --- |
| `shadcn` | 1.1.0 |
| `semantic` | 1.0.0 |
| `slide-deck` | 1.0.0 |

_Table 3. Each preset's rules version, which an extension's `extends.version` must name exactly._

An extension changes a preset's rules without forking it, and is refused the moment it no longer matches them.

## Design decisions

These rules belong to theme-book itself, as distinct from the libraries it builds on. They govern the presets' classic moods; `corporate` and `freak` follow [their own rules](../derived-moods/README.md).

| Decision | What it means |
| --- | --- |
| Exact seed domain | Opaque, in-gamut 8-bit sRGB hex inputs (`#rrggbb`) are kept verbatim in `brand.seed-0` without an OKLCH round trip, and `formatOklchCss()` keeps the emitted `oklch()` string inside sRGB so it parses back to the exact hex. |
| Token set (`shadcn`) | Exactly stock shadcn's: `background` through `ring`, `chart-1..5`, and the eight `sidebar-*` tokens, with no `destructive-foreground` (current shadcn has none). A test compares it with the `src/index.css` that `shadcn init` writes. |
| Sidebar | `sidebar` is one neutral step off `background` in light and at the card level in dark; its foreground, primary and accent pairs reuse the page-level rules solved against the sidebar's own surface, and the audit checks `sidebar-ring` and `sidebar-border` against `sidebar`. |
| `primary` against `background` | Chosen with `closest(ref("brand.seed-0"), pool(brandSolvableLight\|Dark), { readableOn: background, readableContrast: 4.5 })`. `primary` stays at 4.5:1 or more against `background` even under `wcag-aaa`, since it is a UI fill, not body copy, while `primary-foreground` on `primary` and every status fill (`destructive`, `success`, `warning`, `danger`) meet the full text standard through standard-filtered `DesignBook` scopes. |
| `secondary` and `accent` | In `shadcn` and `slide-deck`, these stay quiet primary tints on single-seed themes; `--accent` tints from a second hue only when a second `--seed` is given. |
| `chart-1..5` | Driven by `--generator` and all seeds, mapped to polarity-safe lightness and chroma so every bar clears 3:1 WCAG and APCA `\|Lc\| >= 45`. If a narrow generator arc falls below `0.8 × effectiveChroma` minimum pairwise OKLab distance, evenly spaced synthetic spokes are added and reported in `chartDiagnostics`. |
| Reproducible recipes | `--format json` exports a versioned `recipe` (`toolVersion`, `designBookVersion`, `rawSeeds`, `preset`, `mood`, `generator`, `standard`, `formatOptions`, `command`, `book`) alongside the full `DesignBook` rule expressions and dependencies. |

_Table 4. Decisions behind the classic moods. Each one is a rule a theme can be checked against, not a palette choice._

These decisions are why a classic theme's colors can be traced to a rule and replayed.

## The audit contract and exit codes

Every command exits with one of four codes, and the audit reports one of four statuses. Table 5 maps them.

| Status | Meaning | Exit code |
| --- | --- | --- |
| `pass` | Every applicable required check (`text` and `ui-graphic`) was evaluated at full precision and passed | `0` |
| `fail` | One or more required checks failed (incomplete coverage, if any, is also reported) | `1` |
| `invalid` | Unknown CLI option, missing argument, or malformed input | `2` |
| `incomplete` | No known required failures, but required evidence could not be verified (an unresolved or cyclic `var()`, an out-of-sRGB-gamut color, an unknown translucent backdrop, an unsupported conditional `@media` override, or no required pairs) | `3` |

_Table 5. Audit statuses and exit codes. An exit of `3` is never a pass: it means a required check could not be made._

Table 6 states how the audit measures.

| Policy | What it means |
| --- | --- |
| Precision and alpha | Colors are parsed into full-precision floating-point sRGB (no 8-bit quantization before measuring) and compared against unrounded thresholds. Translucent foregrounds composite over opaque backgrounds in sRGB; translucent non-root tokens (such as shadcn's `oklch(1 0 0 / 10%)` borders) composite over the mode's opaque `background`, with the assumption recorded; translucent root backgrounds are marked `unverified` (exit `3`). |
| sRGB gamut (Tailwind v4) | WCAG 2.x and APCA are evaluated on sRGB channels; colors outside the sRGB gamut (such as wide-gamut P3 stops in stock Tailwind v4 palettes) are marked `unverified` (exit `3`) rather than clamped into a false pass. |
| APCA threshold | `--standard apca` uses `\|Lc\| >= 60` for text and `\|Lc\| >= 45` for UI graphics as a content-text baseline. APCA guidance varies by font size and weight, so treat `Lc 60` as a declared policy threshold, not a guarantee for small or thin text. |
| Pair-local `--fix` | Repairs verify serialized `oklch()` candidates against that pair's exact standard and threshold, returning `status: "fixed"` (`verified: true`) or `status: "no-solution"` (`verified: false`). |

_Table 6. How the audit measures. None of these rounds a near miss into a pass._

The audit fails closed: it passes only what it measured, at full precision, against the threshold you asked for.
