# Changelog

Notable changes to `theme-book`. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versioning is [SemVer](https://semver.org/). Pre-1.0: the CLI, library APIs and emitted output
may change between minor versions.

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
