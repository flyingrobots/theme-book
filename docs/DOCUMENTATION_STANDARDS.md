# Documentation standards

**Status:** current policy for new and substantially changed documentation in `theme-book`.
**Normative terms:** **MUST**, **SHOULD**, **MAY** indicate requirement strength.

This adapts the standard proven in
[`colorful-language`](https://github.com/flyingrobots/colorful-language) —
`docs/DOCUMENTATION_STANDARDS.md` there is the fuller text and the source of this one. Read it
before a substantial change. This page records only what differs or what a `theme-book` author
needs on hand.

Apply this when creating documentation, changing behavior, or touching a page enough that leaving
it below the bar would create new debt. It does not require rewriting existing pages.

## Corpus map

| Location | Job |
| --- | --- |
| [`README.md`](../README.md) | Front door: what theme-book is, install, first look |
| [`docs/README.md`](README.md) | Spine and routing index. Add durable pages here. |
| `docs/topics/<topic>/README.md` | Living reference for current behavior on `main` |
| `docs/topics/<topic>/test-plan.md` | Requirements, cases, oracles, evidence, gaps |
| [`CHANGELOG.md`](../CHANGELOG.md) | Release-visible history of CLI and library |
| [`skills/theme-book/CHANGELOG.md`](../skills/theme-book/CHANGELOG.md) | History of the skill's guidance, which syncs independently |
| [`RELEASE.md`](../RELEASE.md) | Release runbook |
| [`AGENTS.md`](../AGENTS.md) | Working agreement |

## Living, not archived

A topic reference describes **only** behavior that exists on `main`. Keep it current and delete
what stops being true — git history is the archive.

- Do **not** add `-old`, `-v2`, `-deprecated` suffixes or an `archive/` directory.
- Do **not** create empty placeholder directories.
- Planned work belongs in a `test-plan.md`, a GitHub issue, or a release note — never in a living
  reference.
- Known gaps MUST be labeled as gaps, not omitted and not written as promises.

## Page types

A page MUST have one primary job: a **topic reference** (current behavior), a **test plan**
(the contract ledger), a **tutorial** (guided first success), a **how-to** (one real task,
titled as a goal), a **reference** (exact lookup), an **explanation** (mental model), or
**troubleshooting** (starts from an observable symptom).

## Examples

Examples are part of the contract. They MUST be valid, use supported behavior, and show an
observable result where one exists.

- Label an example **illustrative** when it omits setup, and **abridged** when it shortens output.
- Declare a language on every fenced block: `bash` for copyable commands, `text` for expected
  output, `css`/`json`/`typescript` for structured input.
- Do not include `$` prompts in copyable blocks. Present commands and output separately.
- **Never fabricate output.** If it was not run, do not show it as a result.

Colors are a visual product. A page about theme output SHOULD show the colors, not only name
them — rendered swatches, a specimen, or at minimum the hex and the measured contrast.

## The maintenance loop

See [`AGENTS.md`](../AGENTS.md). In short: update the test plan before the code, write the
failing test, implement, update the living reference after the behavior exists, then record the
real evidence.

## Checks

```bash
bun test
```

There is no documentation CI gate yet — no markdown linter and no link checker. Internal links
are checked by review. That is a **known gap**; add the gate when the corpus is large enough to
need it.
