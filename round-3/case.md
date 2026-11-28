<!-- case-input-sha256: 3aec0004f18755c6b8b92d5b323b4ffd42430851665d62deb9c051fea2b68cb9 -->

# Case 2026-11-27-theme-book-pr30-r3

Decision: CHANGES_REQUIRED.

## Case header

```json
{
  "acceptance_criteria": [
    "bun test passes and the CLI works from the checkout",
    "existing moods (neutral, muted, vivid, editorial, high-contrast) and presets (semantic, slide-deck) behave as before except as documented",
    "corporate and freak themes pass WCAG AA in both modes (charts advisory, as documented)",
    "claims in README, docs/topics/derived-moods/README.md, CHANGELOG.md, skills/theme-book/SKILL.md and the PR body are true of the code and of observed output",
    "benchmark numbers stated in docs reproduce from scripts/benchmark",
    "no regression in audit behavior for callers that do not opt into chartsAdvisory",
    "repository rules in AGENTS.md (local gate, AGPL boundary, never fabricate example output, changelogs) are respected"
  ],
  "audience": [
    "theme-book maintainer (merges the PR)",
    "theme-book CLI users generating or auditing themes",
    "authors of --book extensions naming a shadcn rules version",
    "agents following skills/theme-book/SKILL.md",
    "readers of README and docs/topics/derived-moods"
  ],
  "authorized_actions": [
    "read the subject worktree",
    "run bun test, bun x tsc --noEmit, ./bin/theme-book and scripts in the subject worktree",
    "write only under the assigned write directory",
    "no commits, pushes, PR comments, or edits to any repository"
  ],
  "authorized_tools": [
    "Read",
    "Bash (bounded; no network except none needed)",
    "Grep/Glob via Bash"
  ],
  "budget": "Each investigator: bounded source inspection plus targeted probes; stop when material claims in scope are assessed or after about 45 minutes of work. Report unexamined contracts.",
  "capabilities": {
    "bounded_execution": "timeouts on Bash calls",
    "continuation": "yes (SendMessage)",
    "fresh_contexts": "yes (Agent tool, general-purpose)",
    "remote": "gh read-only for PR body",
    "worktrees": "yes"
  },
  "case_id": "2026-11-27-theme-book-pr30-r3",
  "evidence_locations": [
    "subject at f93fbdef5ef4b0b4d93601236d321d161ecff387",
    "delta: git diff 2fd268c..f93fbde",
    "round-2 case: ~/.local/state/baker-street/cases/2026-11-27-theme-book-pr30-r2/papers/CASE_FILE.md and evidence/",
    "PR body: gh pr view 30 -R flyingrobots/theme-book (read-only)"
  ],
  "execution": "Local macOS, bun 1.4.5, node not required. No sandbox: probes run as the user without network isolation; keep probes to running the project's own tests, CLI and small scripts that write only inside the write directory or the OS temp dir. Network: not needed; do not fetch.",
  "manner_change": "2026-11-27: user asked to disable plain voice for GitHub posting. Applies to packets built after this point; the round-3 checker packet was already dispatched with plain: true, and the checker speaks plainly regardless. Frozen reports keep their manner.",
  "phase": "decision check",
  "plain": true,
  "prior_case": {
    "case_id": "2026-11-27-theme-book-pr30-r2",
    "reviewed_head": "2fd268c609fcb66e80f3df1586db6170bbd9351f"
  },
  "requested_decision": "Is PR #30 ready to merge to main (READY), or what bounded repairs are required? Loop with repairs until READY.",
  "review_basis": {
    "from_head": "2fd268c609fcb66e80f3df1586db6170bbd9351f",
    "method": "DELTA_ANCESTOR",
    "to_head": "f93fbdef5ef4b0b4d93601236d321d161ecff387"
  },
  "review_series": "github:flyingrobots/theme-book/pull/30",
  "reviewer_basis": "FRESH_AGENT",
  "reviewer_exposure": "no prior exposure",
  "round": 3,
  "round_budget": 2,
  "round_budget_override": "user: 'baker street it in loop until APPROVED'; no CRITICAL/HIGH open in r2",
  "scope": "All changes in 9eed99b..9dbfc4d (the whole PR at its current head). Exclusions: internal correctness of the vendored design-book tarball beyond its integration; colour aesthetics as taste.",
  "scope_erratum": "scope field read '9eed99b..9dbfc4d'; the reviewed scope is 9eed99b..f93fbde (delta 2fd268c..f93fbde).",
  "sealed_basis": {
    "base": "9eed99b79485fe7964c1d855d4c9f488d07b7170",
    "head": "f93fbdef5ef4b0b4d93601236d321d161ecff387",
    "merge_base": "9eed99b79485fe7964c1d855d4c9f488d07b7170",
    "repository": "github.com/flyingrobots/theme-book",
    "subject_worktree": "~/.local/state/baker-street/cases/2026-11-27-theme-book-pr30-r3/subject",
    "working_tree": "clean"
  },
  "separation": "Fresh agent context. Given only the pinned candidate, the intended behavior (target and acceptance criteria) and repository instructions; no prior findings, repair menus, probe scripts, or earlier cases. Combined Holmes and Moriarty pass. The front office authored the target and its repairs (disclosed).",
  "target": "github:flyingrobots/theme-book/pull/30 (branch derived-moods): add derived shadcn moods corporate and freak (src/derived.ts), wire them into src/books.ts, chartsAdvisory audit option (src/audit.ts), benchmark scripts (scripts/benchmark/), docs (docs/topics/derived-moods/, README section, CHANGELOGs, skill), specimen (scripts/specimen.ts, docs/specimen.svg), tests, vendored design-book main build (vendor/, package.json, bun.lock, install.sh), shadcn rules version 1.1.0",
  "tier": "standard",
  "write_directory": "~/.local/state/baker-street/cases/2026-11-27-theme-book-pr30-r3/evidence/checker/"
}
```

## Findings reckoning

- CRITICAL: 0
- HIGH: 0
- MODERATE: 0
- LOW: 1
- INFORMATIONAL: 0
- UNKNOWN: 0

## Why READY is withheld

```json
[
  "C3-F-1"
]
```

## Findings

```json
[
  {
    "basis": [
      "SOURCE"
    ],
    "disposition": "REQUIRED_REPAIR",
    "id": "C3-F-1",
    "impact": "acceptance criterion 4; residual flake exposure",
    "mechanism": "PR body and 6d6d101's message claimed timeouts for the remaining CLI-spawning tests; a three-case test.each spawning the CLI was missed and an sh-only test was labelled as spawning the CLI",
    "notes": "Repaired (preferred R3-1): e708bad moves the limit to the test.each; PR body item 5 corrected; the 'run red' sentence tightened.",
    "severity": "LOW",
    "sources": [
      "evidence/checker/DECISION_CHECK.md"
    ],
    "status": "CONFIRMED"
  }
]
```

## Rulings

```json
[]
```

## Path to READY

```json
[
  "C3-F-1"
]
```

## Batched follow-ups

```json
[]
```

## Probe triage

```json
[]
```

## Coverage matrix

```json
[]
```

## Notes

```json
[
  {
    "decision_statement": "CHANGES_REQUIRED at f93fbde for C3-F-1 only; all round-2 and round-1 required repairs hold. Repaired in e708bad and the PR body. Valid only for the recorded artifacts, environment, and examined scope."
  }
]
```

Valid only for the recorded artifacts, environment, and examined scope. Reassess affected claims when these change.
