<!-- case-input-sha256: ddc8f945659517a3ee8afe6ec2b960e7694752effabdc0c00d456f40f83c5bce -->

# Case 2026-11-27-theme-book-pr30-r2

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
  "case_id": "2026-11-27-theme-book-pr30-r2",
  "evidence_locations": [
    "subject worktree at 2fd268c609fcb66e80f3df1586db6170bbd9351f",
    "git diff 9eed99b..2fd268c",
    "delta after the blind pass: git diff 7b451c9..2fd268c (tree of 7b451c9 == 9dbfc4d)",
    "evidence/blind/BLIND_PASS.md",
    "round-1 case: ../2026-11-27-theme-book-pr30-r1/papers/CASE_FILE.md"
  ],
  "execution": "Local macOS, bun 1.4.5, node not required. No sandbox: probes run as the user without network isolation; keep probes to running the project's own tests, CLI and small scripts that write only inside the write directory or the OS temp dir. Network: not needed; do not fetch.",
  "phase": "decision check",
  "plain": true,
  "prior_case": {
    "case_id": "2026-11-27-theme-book-pr30-r1",
    "reviewed_head": "4259148402f510aed7c5d5a5239fbe4ff2cc4369"
  },
  "requested_decision": "Is PR #30 ready to merge to main (READY), or what bounded repairs are required? Loop with repairs until READY.",
  "review_basis": "FULL",
  "review_series": "github:flyingrobots/theme-book/pull/30",
  "reviewer_basis": "FRESH_AGENT",
  "reviewer_exposure": "no prior exposure",
  "round": 2,
  "round_budget": 2,
  "scope": "All changes in 9eed99b..9dbfc4d (the whole PR at its current head). Exclusions: internal correctness of the vendored design-book tarball beyond its integration; colour aesthetics as taste.",
  "sealed_basis": {
    "base": "9eed99b79485fe7964c1d855d4c9f488d07b7170",
    "blind_pass_head": "9dbfc4dffa826490c86ab6a800374b4842056b4f (tree-identical to rewritten 7b451c9; trailers rewritten by force-push the user approved)",
    "head": "2fd268c609fcb66e80f3df1586db6170bbd9351f",
    "merge_base": "9eed99b79485fe7964c1d855d4c9f488d07b7170",
    "repository": "github.com/flyingrobots/theme-book",
    "subject_worktree": "~/.local/state/baker-street/cases/2026-11-27-theme-book-pr30-r2/subject (detached at head, bun install --frozen-lockfile done)",
    "working_tree": "clean"
  },
  "separation": "Fresh agent context. Given only the pinned candidate, the intended behavior (target and acceptance criteria) and repository instructions; no prior findings, repair menus, probe scripts, or earlier cases. Combined Holmes and Moriarty pass. The front office authored the target and its repairs (disclosed).",
  "target": "github:flyingrobots/theme-book/pull/30 (branch derived-moods): add derived shadcn moods corporate and freak (src/derived.ts), wire them into src/books.ts, chartsAdvisory audit option (src/audit.ts), benchmark scripts (scripts/benchmark/), docs (docs/topics/derived-moods/, README section, CHANGELOGs, skill), specimen (scripts/specimen.ts, docs/specimen.svg), tests, vendored design-book main build (vendor/, package.json, bun.lock, install.sh), shadcn rules version 1.1.0",
  "tier": "standard",
  "write_directory": "~/.local/state/baker-street/cases/2026-11-27-theme-book-pr30-r2/evidence/blind/"
}
```

## Findings reckoning

- CRITICAL: 0
- HIGH: 0
- MODERATE: 1
- LOW: 4
- INFORMATIONAL: 0
- UNKNOWN: 0

## Why READY is withheld

```json
[
  "B-F-1",
  "B-F-2",
  "B-F-3",
  "B-F-4",
  "C-F-1"
]
```

## Findings

```json
[
  {
    "basis": [
      "EXECUTED"
    ],
    "disposition": "REQUIRED_REPAIR",
    "id": "B-F-1",
    "impact": "theme --audit exits 1 for ~0.1% of palettes",
    "mechanism": "Derived floors measured on hex; default OKLCH output rounded to 4 decimals can drop a pair below 3:1 or 4.5:1 (#d967a8 corporate: light sidebar-ring/sidebar 2.9996)",
    "notes": "Repaired: red 32dc0dd (CASES #d967a8, failing light sidebar-ring/sidebar), green cda9a0e (0.01 margin on TEXT/MARK floors).",
    "severity": "MODERATE",
    "sources": [
      "evidence/blind/BLIND_PASS.md#B-F-1"
    ],
    "status": "CONFIRMED"
  },
  {
    "basis": [
      "SOURCE"
    ],
    "disposition": "REQUIRED_REPAIR",
    "id": "B-F-2",
    "impact": "docs overstated",
    "mechanism": "README/docs said the sankey draws recorded origins; light-to-dark flows are paired by role group",
    "notes": "Check FAILED at 2fd268c (CHANGELOG, PR body still overstated); repaired in f93fbde and the PR body rewrite.",
    "severity": "LOW",
    "sources": [
      "evidence/blind/BLIND_PASS.md#B-F-2"
    ],
    "status": "CONFIRMED"
  },
  {
    "basis": [
      "EXECUTED"
    ],
    "disposition": "REQUIRED_REPAIR",
    "id": "B-F-3",
    "impact": "flaky gate",
    "mechanism": "--book CLI test timed out at bun's 5 s default under host load",
    "notes": "Repaired in ba83d61 (explicit 30 s / 120 s limits on three spawn-heavy tests). Check: holds; hypothesis of same exposure in five more book-extension tests closed by 6d6d101.",
    "severity": "LOW",
    "sources": [
      "evidence/blind/BLIND_PASS.md#B-F-3"
    ],
    "status": "CONFIRMED"
  },
  {
    "basis": [
      "EXECUTED"
    ],
    "disposition": "REQUIRED_REPAIR",
    "id": "B-F-4",
    "impact": "docs overstated",
    "mechanism": "Docs said secondary/accent never take a status hue; with only a status-hued primary they are tints of it",
    "notes": "Check FAILED at 2fd268c ('no other color' untrue: fallback is per role); repaired in f93fbde and the PR body rewrite.",
    "severity": "LOW",
    "sources": [
      "evidence/blind/BLIND_PASS.md#B-F-4"
    ],
    "status": "CONFIRMED"
  },
  {
    "basis": [
      "SOURCE"
    ],
    "disposition": "REQUIRED_REPAIR",
    "id": "C-F-1",
    "impact": "acceptance criterion 4",
    "mechanism": "PR body described a pre-force-push head (dead commit IDs, missing round-2 commits, stale counts)",
    "notes": "Repaired: PR body rewritten for f93fbde.",
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
[
  {
    "id": "RU-1",
    "ruling": "B-F-3 required rather than follow-up: the user's working agreement makes a flaky gate the finder's to fix."
  }
]
```

## Path to READY

```json
[
  "B-F-1",
  "B-F-2",
  "B-F-3",
  "B-F-4",
  "C-F-1"
]
```

## Batched follow-ups

```json
[]
```

## Probe triage

```json
[
  {
    "disposition": "MINIMIZE_THEN_PROMOTE",
    "id": "BP-1",
    "status": "#d967a8 promoted to CASES"
  },
  {
    "disposition": "RETAIN_IN_SPECIALIZED_SUITE",
    "id": "BP-2",
    "status": "Not a suite in the repository; replayed by the checker (0 of 47,220 at 2fd268c). Batched follow-up."
  }
]
```

## Coverage matrix

```json
[]
```

## Notes

```json
[
  {
    "decision_statement": "CHANGES_REQUIRED at 2fd268c: B-F-2, B-F-4 wording and C-F-1 PR body; B-F-1 and B-F-3 verified. Repaired in 6d6d101, f93fbde and the PR body. Round 3 authorized by the user ('loop until APPROVED'); no CRITICAL or HIGH finding open. Valid only for the recorded artifacts, environment, and examined scope."
  }
]
```

Valid only for the recorded artifacts, environment, and examined scope. Reassess affected claims when these change.
