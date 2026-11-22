# Working agreement

The general rules — the documentation standard, the delivery loop, the issue templates — live in
`~/.agents/AGENTS.md` and apply here. This file records only what is specific to `theme-book`.

## The local gate

```bash
bun test
```

There is no separate typecheck or lint step. CI runs the same suite (`.github/workflows/ci.yml`,
job `test`).

For a change to theme output or the audit, also check a real theme:

```bash
theme-book audit path/to/tokens.css --standard wcag-aaa
```

## The install trap

**The CLI does not run from this checkout.** `install.sh` stages an isolated runtime into
`~/.theme-book/` and symlinks `~/.local/bin/theme-book` at it. Editing `src/` here changes nothing
until `./install.sh` runs — a trap that has already cost one debugging session where an edit
appeared to have no effect.

Release first, then install, so the live copy matches a tag. See [`RELEASE.md`](RELEASE.md).

## Two changelogs

- [`CHANGELOG.md`](CHANGELOG.md) — the CLI and library.
- [`skills/theme-book/CHANGELOG.md`](skills/theme-book/CHANGELOG.md) — the skill's guidance. The
  skill is synced into agent hubs as a standalone directory, so a reader of the installed skill
  cannot see the root changelog. It carries its own.

## Contrast work

Never eyeball a contrast ratio or invent a hex pair when the tool can compute and verify one.

Audit with WCAG for conformance and read the APCA numbers for the truth, never one alone — WCAG
2.x is polarity-blind and overrates light-on-dark. See
[contrast auditing](docs/topics/contrast-auditing/README.md).

Out-of-gamut colors are a real defect, not noise: a browser silently clips them to something
duller and hue-shifted. Gamut-map with `clampChroma`, which holds hue and lightness and reduces
only chroma.

## The AGPL boundary

`design-book` is **AGPL-3.0-only**. It stays behind this local CLI. Never add it as a runtime
dependency of a non-AGPL project; commit only generated static CSS or JSON tokens to a target
repository. See the licensing note in [`skills/theme-book/SKILL.md`](skills/theme-book/SKILL.md).

## Hard don'ts

- Do not weaken, skip or delete a test to go green. Fix the code.
- Do not claim a check passed that was not run. Report failures with their output.
- Do not fabricate example output in documentation.
- Do not move a published tag. Cut another patch release instead.
