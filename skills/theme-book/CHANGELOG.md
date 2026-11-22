# Changelog — `theme-book` skill

Changes to the **skill** specifically: the guidance an agent loads. The CLI and library have
their own entries in the [repository changelog](../../CHANGELOG.md); this file records only what
changed about how an agent is told to use them.

The skill is distributed by being synced into an agent hub (`~/.agents/skills/theme-book`), so it
travels apart from the repository and needs its own history.

Versions track the tool's releases.

## [0.2.1] — 2026-11-21

### Added

- This changelog, so the skill carries its own history wherever it is synced.

## [0.2.0] — 2026-11-21

### Added

- **"Which Standard, and When"** section. WCAG 2.x is polarity-blind — its ratio is symmetric, so
  dark-on-light and light-on-dark score the same, while human vision treats them differently.
  Passing WCAG AAA therefore does not mean a dark theme is readable. The section documents the
  rule (audit with WCAG for conformance, read APCA for the truth, never one alone), the APCA `Lc`
  thresholds (45 large-text floor, 60 body minimum, 75 fluent reading, 90 preferred), and the
  advice to decide deliberately when the advisory fires rather than reflexively chasing `Lc 75`.

## [0.1.0]

### Added

- Initial skill: the two-stage workflow (choose direction with `color-expert`, solve and verify
  with `theme-book`), the four commands (`theme`, `audit`, `suggest`, `eval`), and the
  AGPL/privacy boundary around keeping `design-book` behind the local CLI.
