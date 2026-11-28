# Changelog

Notable changes to `theme-book`. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versioning is [SemVer](https://semver.org/). Pre-1.0: the CLI, library APIs and emitted output
may change between minor versions.

## [Unreleased]

### Added

- **`--mood corporate` and `--mood freak`: light and dark from one palette** (shadcn only;
  another preset is refused, exit `2`). The rules are fitted to seven famous light/dark pairs
  (Solarized, Gruvbox, Tokyo Night, One, Catppuccin, Rosé Pine, GitHub): the dark page takes the
  light theme's ink hue at about OKLCH L 0.24, never black; accents keep their hue and move
  together (dark L = (1 − b)(L + s) + b · 0.76, chroma × k), `corporate` at the fitted average
  (s 0.12, b 0.6, k 0.85) and `freak` unchanged, with the palette's own colors as flat fills;
  contrast is a floor in each mode. Destructive is a fixed red that holds white text and, in dark,
  is set for shadcn's 60% over the page; secondary and accent never take a red, yellow or green
  palette color (with no other color, they tint a status-hued primary); charts run light to dark, each bar clearing 3:1 on its mode's pages. The first
  colored seed is primary, whatever its lightness. Both are built for WCAG AA; `--generator` has
  no effect, and `--standard wcag-aaa|apca` audits without changing the colors. See
  [docs/topics/derived-moods](docs/topics/derived-moods/README.md).
- **A benchmark against famous themes** (`scripts/benchmark/`): their verified palettes with
  sources, a method scorer (theme-book's move lands within OKLab 0.080 of the official accents,
  against 0.124 for Material's tone table), a per-theme fit (`fit.ts`), a scoreboard page with a
  static SVG, and a Mermaid sankey drawn from a built book's recorded origins. The test suite
  fails if the move gets worse.
- **`chartsAdvisory`** in `evaluateAudit`, and **`theme-book audit --charts-advisory`**: chart
  bars against the page are reported but not required. Off by default. A derived mood turns it on
  only for a palette with no hue (stock shadcn's greys), and the theme's header then reads
  `audit=pass (wcag-aa, charts advisory)`, so `audit --charts-advisory` reproduces its verdict.
  The report gains a `chartsAdvisory` field.
- **The README specimen is a stack of light/dark pairs**, one row per theme, and a test fails if
  any two of its elements overlap.

### Changed

- **The `shadcn` preset's rules version is 1.1.0**, for the two new moods; every other mood's
  rules are unchanged. An extension naming `shadcn@1.0.0` is refused, as for any version change.
- **design-book is a vendored build of `main` at `2d80b33`**, nine commits past the 0.26.0
  release: a book that measures APCA itself, contrast thresholds given as text styles, and
  selectors rendered as `var()`. No release contains them yet (meodai/design-book#5). Recipes
  record `designBookVersion` as `0.26.0+main.2d80b33`. `install.sh` stages `vendor/`. See
  [`vendor/README.md`](vendor/README.md).

## [0.4.0] — 2026-11-23

### Added

- **Book extensions: a site's own rules on top of a preset** (flyingrobots/theme-book#22).
  `theme-book theme --book <file.ts>` loads a module that names itself, its version, and the
  preset and preset rules version it extends, and overrides rules through `apply`. The rule
  constructors are passed in, so the file needs no imports. An extension may only override tokens
  the preset emits, and is audited like a preset. Without `--preset`, its parent decides.
- **Versioned preset rules.** Each preset declares a rules version, independent of the tool's
  (`shadcn`, `semantic` and `slide-deck` start at 1.0.0). An extension naming any other version
  is refused with exit `2`. A fingerprint of each preset's rules is recorded per version, and a
  test fails when a rule changes without a version bump. The fingerprint covers each token's rule
  expression in every mood, every standard and three kinds of seed set (one chromatic seed, an
  achromatic seed, two seeds), so a change confined to an achromatic, second-seed, AAA or APCA
  branch is caught. It also covers what those rules build on, sampled at fixed seeds: every helper
  scope's tokens (the pools, `inks`, `accentSeeds`), the preset's extras (slide-deck's fonts,
  radius and shadows), the pools each generator makes, and the rules at seeds either side of the
  achromatic threshold (flyingrobots/theme-book#24). Tests mutate a copy of `src/` and check that
  each of these changes the fingerprint. The fingerprint was widened before any release recorded
  one, so no extension was ever checked against the narrower one, and the rules versions stay at
  1.0.0.
- **Strict extension headers.** Versions follow semver's core form, so `01.0.0` is refused;
  an explicitly empty `--book=` is refused rather than ignored. The recipe command quotes
  the `--book` path as a POSIX shell word, so it replays literally.
- **The hash names the extension module, which may import nothing; an extension that reads
  files at runtime is outside the contract** (flyingrobots/theme-book#24). An extension is imported
  from a private copy of the bytes it was hashed from, so reloading a rewritten file in one process
  applies the new rules, never a cached module, and a path with a backslash, quote, `#` or `?`
  loads. Before importing, theme-book scans those bytes: a static import, a re-export, `import()`
  and `require` of any form, and `import.meta` are refused with exit `2`, naming the import, before
  any of the extension's code runs. Type-only imports are erased and allowed. A runtime API that
  reads a file (`Bun.file`, `Bun.spawn`, `fetch`) cannot be refused by scanning; that is why such
  an extension is outside the contract rather than refused. The extension loader does not make
  `design-book` resolvable.
- **`--book-sha256 <hex>`** refuses an extension whose SHA-256 differs, with exit `2`, before
  importing it. The recipe `command` records it ahead of `--book`, so replaying the command
  refuses a rewritten extension. A bare `--book` verifies nothing; it records the hash of whatever
  it loaded.
- **`recipe.book`** in `--format json`: the preset, its rules version and, with `--book`, the
  extension's name, version and SHA-256. The recipe `command` includes `--book-sha256` and
  `--book`.
- **Extension errors exit `2` and name the extension.** An `apply` that returns a promise is
  refused, and `set()` throws once `apply` has returned, so no rule lands after the theme is
  built. An error thrown by `apply`, or by resolving the rules once an extension has set them,
  exits `2` with the extension's name, version and path.
  Loading a module runs its top-level code, so an extension's top-level code runs before its
  header is checked; the README and skill say so.

### Fixed

- **`--native` and `w3-tokens` emitted tokens the preset does not have** (a regression in
  v0.3.0, fixed in c97dcc8). Both render the whole book, and v0.3.0 registered tokens in presets
  that do not emit them: `shadcn` emitted `light-`/`dark-destructive-foreground`, and
  `slide-deck` emitted the eight `sidebar-*` tokens in each mode (`sidebar`,
  `sidebar-foreground`, `sidebar-primary`, `sidebar-primary-foreground`, `sidebar-accent`,
  `sidebar-accent-foreground`, `sidebar-border`, `sidebar-ring`). Each preset now registers only
  the tokens it emits. Plain `css` and `--format json` were not affected, and `semantic` was not
  affected in any format.
- **The audit checks `sidebar-ring` and `sidebar-border` without a page background** (c97dcc8).
  In v0.3.0 these pairs were only added when the file also defined `background` or `surface`, so a
  file with sidebar tokens alone passed with its sidebar ring unchecked. `sidebar-ring` on
  `sidebar` is now a required ui-graphic pair and `sidebar-border` on `sidebar` a border advisory
  whenever `sidebar` is defined.
- The README and skill said theme-book was "paired with skill.color-expert, plus culori", which
  read as if culori were paired. culori is a runtime dependency like design-book, poline and
  rampensau; color-expert is the separate skill theme-book pairs with.

## [0.3.0] — 2026-11-22

### Changed

- **The `shadcn` preset now emits stock shadcn's token set** (flyingrobots/theme-book#19). It was
  written from an older shadcn theme and had drifted: it emitted `destructive-foreground`, which
  current shadcn does not define, and omitted the eight `sidebar-*` tokens current shadcn does.
  It now matches the `src/index.css` that `shadcn init` writes (CLI 4.23.0), checked by a test
  against that file. The `slide-deck` and `semantic` presets are unchanged.
- **Sidebar tokens are solved, not copied.** `sidebar` sits one neutral step off `background`
  (light) or at the card level (dark); `sidebar-foreground`, `sidebar-primary`,
  `sidebar-accent` and their foregrounds use the page-level rules re-solved against the sidebar's
  own surface; `sidebar-ring` follows `sidebar-primary`.
- **The audit checks the sidebar's ring and border against the sidebar.** `sidebar-ring` on
  `sidebar` is a required ui-graphic pair and `sidebar-border` on `sidebar` a border advisory. The
  sidebar's text pairs were already covered by the `<base>-foreground` rule.
- **The specimen draws the destructive button as stock shadcn does**: destructive text on a
  destructive tint, since there is no `destructive-foreground`.

## [0.2.1] — 2026-11-21

### Added

- **`skills/theme-book/CHANGELOG.md`.** The skill is synced into an agent hub and travels apart
  from this repository, so it now carries its own history. `RELEASE.md` requires updating both.

## [0.2.0] — 2026-11-21

### Added

- **Polarity advisory in `theme-book audit`.** WCAG 2.x scores a pair identically in both
  directions, so a dark theme can clear AA or AAA while reading materially worse than its light
  counterpart. The audit now reports required text pairs that pass the requested WCAG standard but
  that APCA rates below `Lc 75` (fluent body reading), in both the text and JSON reports as
  `polarityAdvisories`. **Advisory only — the exit code is unchanged**, because WCAG is the
  conformance standard and APCA, the WCAG 3 candidate, has no legal standing yet. Auditing under
  `--standard apca` raises none.
- `APCA_FLUENT_READING` and the `PolarityAdvisory` type are exported from `src/audit`.
- The skill gains a **"Which Standard, and When"** section documenting the polarity problem and the
  APCA `Lc` thresholds.

### Changed

- **The README specimen has a transparent canvas.** It painted a hardcoded `#18181b` backdrop that
  fought whatever page embedded it; each panel already paints its own themed background, so the
  backdrop was doing no work. Verified against white and GitHub dark.
- **The specimen uses one uniform 24px gutter.** It was 24px horizontally but 16px between rows with
  20px top and bottom, which read as uneven. The canvas is now 1200×832.

### Known

- A theme can pass `--standard wcag-aaa` and still fail `--standard apca`; that is the polarity
  problem the advisory exists to surface, not a defect in either check.
- `audit --fix` reports suggested fixes but does not write them to the file.
