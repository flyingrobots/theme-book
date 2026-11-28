<!-- case-input-sha256: 0ed0cab2b0ab37223456bab3e823541d1ce738d873c147b3c2083d8de1d6a1ee -->

# Case 2026-11-27-theme-book-pr30-r4

Decision: READY.

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
  "case_id": "2026-11-27-theme-book-pr30-r4",
  "evidence_locations": [
    "subject at e708bade42e4ab54dc3f2ca99cc55c4eca61b9a5",
    "delta: git diff f93fbde..e708bad",
    "prior cases: ~/.local/state/baker-street/cases/2026-11-27-theme-book-pr30-r{1,2,3}/papers/CASE_FILE.md",
    "PR body: gh pr view 30 -R flyingrobots/theme-book (read-only)"
  ],
  "execution": "Local macOS, bun 1.4.5, node not required. No sandbox: probes run as the user without network isolation; keep probes to running the project's own tests, CLI and small scripts that write only inside the write directory or the OS temp dir. Network: not needed; do not fetch.",
  "manner": "plain voice disabled by the user for GitHub posting (2026-11-27); the checker speaks plainly by rule",
  "phase": "decision check",
  "plain": false,
  "prior_case": {
    "case_id": "2026-11-27-theme-book-pr30-r3",
    "reviewed_head": "f93fbdef5ef4b0b4d93601236d321d161ecff387"
  },
  "requested_decision": "Is PR #30 ready to merge to main (READY), or what bounded repairs are required? Loop with repairs until READY.",
  "review_basis": {
    "from_head": "f93fbdef5ef4b0b4d93601236d321d161ecff387",
    "method": "DELTA_ANCESTOR",
    "to_head": "e708bade42e4ab54dc3f2ca99cc55c4eca61b9a5"
  },
  "review_series": "github:flyingrobots/theme-book/pull/30",
  "reviewer_basis": "FRESH_AGENT",
  "reviewer_exposure": "no prior exposure",
  "round": 4,
  "round_budget": 2,
  "round_budget_override": "user: 'baker street it in loop until APPROVED'; no CRITICAL/HIGH open in r3",
  "scope": "Whole PR 9eed99b..e708bad; delta f93fbde..e708bad examined fully; prior findings checked anew.",
  "sealed_basis": {
    "base": "9eed99b79485fe7964c1d855d4c9f488d07b7170",
    "head": "e708bade42e4ab54dc3f2ca99cc55c4eca61b9a5",
    "merge_base": "9eed99b79485fe7964c1d855d4c9f488d07b7170",
    "repository": "github.com/flyingrobots/theme-book",
    "subject_worktree": "~/.local/state/baker-street/cases/2026-11-27-theme-book-pr30-r4/subject",
    "working_tree": "clean"
  },
  "separation": "Fresh agent context. Given only the pinned candidate, the intended behavior (target and acceptance criteria) and repository instructions; no prior findings, repair menus, probe scripts, or earlier cases. Combined Holmes and Moriarty pass. The front office authored the target and its repairs (disclosed).",
  "target": "github:flyingrobots/theme-book/pull/30 (branch derived-moods): add derived shadcn moods corporate and freak (src/derived.ts), wire them into src/books.ts, chartsAdvisory audit option (src/audit.ts), benchmark scripts (scripts/benchmark/), docs (docs/topics/derived-moods/, README section, CHANGELOGs, skill), specimen (scripts/specimen.ts, docs/specimen.svg), tests, vendored design-book main build (vendor/, package.json, bun.lock, install.sh), shadcn rules version 1.1.0",
  "tier": "standard",
  "write_directory": "~/.local/state/baker-street/cases/2026-11-27-theme-book-pr30-r4/evidence/checker/"
}
```

## Findings reckoning

- CRITICAL: 0
- HIGH: 0
- MODERATE: 0
- LOW: 0
- INFORMATIONAL: 0
- UNKNOWN: 0

## Why READY is withheld

```json
[]
```

## Findings

```json
[]
```

## Rulings

```json
[]
```

## Path to READY

```json
[]
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
    "decision_statement": "READY at e708bade42e4ab54dc3f2ca99cc55c4eca61b9a5: C3-F-1 repaired; every required finding of rounds 1-3 holds; PR body claims verified (red-at-4259148 confirmed: 17 assertion failures). Coverage limits: the 622- and 47,220-build sweeps are taken from rounds 1-2 records; install.sh not run end to end; vendored tarball not compared with an upstream build. Informational: the --book-sha256 test (from main) runs the CLI seven times under 30 s. Valid only for the recorded artifacts, environment, and examined scope."
  }
]
```

Valid only for the recorded artifacts, environment, and examined scope. Reassess affected claims when these change.
