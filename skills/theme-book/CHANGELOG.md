# Changelog — `theme-book` skill

Changes to the **skill** specifically: the guidance an agent loads. The CLI and library have
their own entries in the [repository changelog](../../CHANGELOG.md); this file records only what
changed about how an agent is told to use them.

The skill is distributed by being synced into an agent hub (`~/.agents/skills/theme-book`), so it
travels apart from the repository and needs its own history.

Versions track the tool's releases.

## [Unreleased]

### Added

- **Generate, never hand-pick and audit.** The skill now says a theme must come from
  `theme-book theme`; colors chosen by hand or copied from another theme and then checked with
  `theme-book audit` are not a theme-book theme and must not be called one. When nothing fits
  the target, write an extension or say a preset is needed.
- **The `corporate` and `freak` moods** (shadcn only): light and dark from one palette, with the
  rules fitted to famous themes; and shadcn's rules version 1.1.0 in the extension example.
  The skill says what they do not read (`--generator`; `--standard` beyond WCAG AA only audits),
  that the first colored seed is primary and the next non-status colors fill secondary then accent, that an
  extension sees only their `seeds` and `palette` scopes, and that a hueless palette's charts are
  audited with `theme-book audit --charts-advisory`.

## [0.4.0] — 2026-11-23

### Added

- **Section 5, book extensions.** When a site needs some preset rules changed, the skill now says
  to write a `--book` extension naming its parent preset and rules version, never to fork the
  preset or hand-edit emitted tokens, and to keep the extension with the site's private theme
  material.
- **What the extension's hash names** (flyingrobots/theme-book#24). The hash names the extension
  module, which may import nothing; an extension that reads files at runtime is outside the
  contract. The skill says theme-book refuses every import form (exit `2`) before the extension
  runs, and that runtime file reads (`Bun.file`, `fetch`) cannot be refused, so an agent never
  writes one.
- **Extensions set every rule inside `apply`, synchronously**, since an async `apply` is
  refused and `set()` throws after `apply` returns. Top-level code stays limited to the
  `export default`, because it runs before the header is checked. An error from the extension's
  own code exits `2` naming the extension and its path.
- **Replay with the recipe `command`.** It carries `--book-sha256`, which refuses an extension
  whose bytes changed; a bare `--book` verifies nothing.

### Fixed

- The v0.3.0 tool emitted `destructive-foreground` for `shadcn` and the eight `sidebar-*` tokens
  for `slide-deck` in `--native` and `w3-tokens` output, though neither preset defines them. The
  audit also skipped `sidebar-ring` and `sidebar-border` in a file with no page background. Both
  are fixed in the tool (see the [repository changelog](../../CHANGELOG.md)). The skill's
  guidance did not change, but output it told an agent to trust was wrong in v0.3.0.
- The description no longer reads as if culori were paired with theme-book; it is a dependency.

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
