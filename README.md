# theme-book

> **Huge respect & gratitude to David Aerne ([`@meodai`](https://github.com/meodai) / [Elastiq GmbH](https://elastiq.ch/)).**
>
> All of the real brilliance here is David's work:
> - [`meodai/skill.color-expert`](https://github.com/meodai/skill.color-expert) — the extraordinary 180+ document color knowledge base for AI agents
> - [`meodai/design-book`](https://github.com/meodai/design-book) — the reactive constraint engine that encodes *how* design tokens are chosen instead of freezing static hex dumps
> - [`meodai/poline`](https://github.com/meodai/poline) — the esoteric, perceptually grounded anchor palette generator
> - [`meodai/rampensau`](https://github.com/meodai/rampensau) — the easing-driven color ramp generator
>
> Plus huge thanks to the maintainers of [`culori`](https://culorijs.org/) for rock-solid OKLCH conversions, gamut clamping, and contrast math.
>
> **All `theme-book` does is humbly feed one into the other.** It is a thin, local CLI and companion AI agent skill that lets coding agents combine `color-expert`'s color judgment with `poline` / `rampensau` candidate pools and `design-book`'s reactive constraint solver — so agents compute, explain, and mathematically verify themes instead of eyeballing hex codes.

---

## Why This Exists

- **`skill.color-expert`** gives an AI agent deep perceptual and practical color judgment (OKLCH, character-first harmony, gamut mapping, APCA/WCAG, naming).
- **`design-book`** gives you a reactive rule graph (`bestContrastWith`, `minContrastWith`, `mostVivid`, `leastVivid`, `furthestFrom`, `shade`, `colorMix`, `dark extends light`, `book.inspect()`) that turns a palette into an auditable, self-consistent token system.
- **`theme-book`** connects the two as a private local authoring CLI (`~/.theme-book/` + `~/.local/bin/theme-book`) paired with a lightweight agent skill (`skills/theme-book/SKILL.md`), so your agents can generate and audit themes cleanly without installing `design-book` into every target repository.

---

## Install (Isolated Local Runtime)

Requires [Bun](https://bun.sh/).

```bash
git clone https://github.com/flyingrobots/theme-book.git
cd theme-book
./install.sh
```

`install.sh` copies the runtime into `~/.theme-book/`, installs production dependencies inside `~/.theme-book/`, symlinks `~/.local/bin/theme-book`, and (if `sync-agents` from [`agent-hub`](https://github.com/flyingrobots/agent-hub) is installed) syncs `skills/theme-book/` across Claude Code, Codex, and Antigravity/Gemini.

Your dev checkout stays cleanly separated from `~/.theme-book/`.

---

## Usage

### 1. Suggest Companion Colors

```bash
theme-book suggest --seed "#2563eb" --mood editorial --generator poline
theme-book suggest --seed "#d97706" --surface "#0f172a" --generator rampensau --format json
```

Generates gamut-safe candidate pools (`oklch`, `poline`, or `rampensau`) and runs `design-book` selectors (`mostVivid`, `closest`, `furthestFrom`, `leastVivid`, `bestContrastWith`, `minContrastWith`, `colorMix`, `shade`) against your surface — returning OKLCH, hex, WCAG 2.1 ratio, APCA Lc, and the exact rule that won.

### 2. Build Complete Light + Dark Themes

```bash
# shadcn/ui (:root + .dark OKLCH CSS variables) with WCAG + APCA audit
theme-book theme --seed "#0f766e" --preset shadcn --mood editorial --audit

# Generic semantic UI tokens
theme-book theme --seed "#9333ea" --preset semantic --format css

# Slide-deck drop-in tokens
theme-book theme --seed "#2563eb" --preset slide-deck --generator poline

# W3C Design Tokens JSON
theme-book theme --seed "#2563eb" --preset semantic --format w3-tokens

# Visual SVG dependency graph (via design-book's SVGRenderer)
theme-book theme --seed "#2563eb" --preset shadcn --format svg --out graph.svg
```

### 3. Audit & Fix Existing Token Files

```bash
theme-book audit path/to/tokens.css
theme-book audit path/to/tokens.css --standard wcag-aaa --fix
theme-book audit path/to/tokens.json --standard apca --fix --format json
```

Evaluates every inferred foreground/background pair against WCAG 2.1 and APCA Lc. With `--fix`, uses `design-book`'s `minContrastWith` over a hue-preserving OKLCH lightness ramp to suggest minimal passing fixes.

### 4. Run Bespoke `design-book` Scripts From Any Directory

```bash
theme-book eval my-custom-book.ts
theme-book eval - < my-custom-book.ts
```

A Bun preload plugin resolves `design-book`, `design-book/engine`, `design-book/naming`, `design-book/internals`, `poline`, `rampensau`, and `culori` straight from `~/.theme-book/node_modules/` — no `npm install` in your working directory required.

---

## Development & Tests

```bash
bun install
bun run typecheck
bun test
./install.sh
```

---

## License

`theme-book` is licensed under **[AGPL-3.0-only](LICENSE)** in full compliance with and respect for [`meodai/design-book`](https://github.com/meodai/design-book).

If you want to embed `design-book` itself inside proprietary/closed-source software, please support David Aerne by obtaining a commercial license from [Elastiq GmbH](mailto:david@elastiq.ch). Running `theme-book` privately as a local authoring tool to emit static CSS/JSON tokens keeps your output tokens clean and dependency-free.
