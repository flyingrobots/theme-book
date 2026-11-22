# Changelog

Notable changes to `theme-book`. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versioning is [SemVer](https://semver.org/). Pre-1.0: the CLI, library APIs and emitted output
may change between minor versions.

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
