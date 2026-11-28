<!-- case-input-sha256: 5ae263ff2937ff8b10b4741e8a6a580ed6aaadceeabb2ab9bc9fa87a2003b5b9 -->

# Case 2026-11-27-theme-book-pr30-r1

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
  "case_id": "2026-11-27-theme-book-pr30-r1",
  "evidence_locations": [
    "subject worktree path in sealed_basis",
    "git -C <subject> diff 9eed99b79485fe7964c1d855d4c9f488d07b7170..4259148402f510aed7c5d5a5239fbe4ff2cc4369",
    "PR body: gh pr view 30 -R flyingrobots/theme-book (read-only)"
  ],
  "execution": "Local macOS, bun 1.4.5, node not required. No sandbox: probes run as the user without network isolation; keep probes to running the project's own tests, CLI and small scripts that write only inside the write directory or the OS temp dir. Network: not needed; do not fetch.",
  "phase": "issued (historical: repairs applied, decision for the repaired candidate is round 2)",
  "plain": true,
  "prior_case": "NONE",
  "requested_decision": "Is PR #30 ready to merge to main (READY), or what bounded repairs are required? Loop with repairs until READY.",
  "review_basis": "FULL",
  "review_series": "github:flyingrobots/theme-book/pull/30",
  "reviewer_basis": "FRESH_AGENT",
  "reviewer_exposure": "no prior exposure; did not author the target or the repairs",
  "round": 1,
  "round_budget": 2,
  "scope": "All changes in origin/main..head (git diff 9eed99b..4259148). Exclusions: the internal correctness of the vendored design-book tarball beyond its integration; colour aesthetics as a matter of taste.",
  "sealed_basis": {
    "base": "9eed99b79485fe7964c1d855d4c9f488d07b7170",
    "head": "4259148402f510aed7c5d5a5239fbe4ff2cc4369",
    "merge_base": "9eed99b79485fe7964c1d855d4c9f488d07b7170",
    "repository": "github.com/flyingrobots/theme-book",
    "subject_worktree": "~/.local/state/baker-street/cases/2026-11-27-theme-book-pr30-r1/subject (detached at head, bun install --frozen-lockfile done)",
    "working_tree": "clean at seal time"
  },
  "separation": "Each investigator is a fresh agent context with its own write directory; siblings' directories are not to be read. Concurrency: run in parallel. The front office authored the target change (author overlap disclosed).",
  "target": "github:flyingrobots/theme-book/pull/30 (branch derived-moods): add derived shadcn moods corporate and freak (src/derived.ts), wire them into src/books.ts, chartsAdvisory audit option (src/audit.ts), benchmark scripts (scripts/benchmark/), docs (docs/topics/derived-moods/, README section, CHANGELOGs, skill), specimen (scripts/specimen.ts, docs/specimen.svg), tests, vendored design-book main build (vendor/, package.json, bun.lock, install.sh), shadcn rules version 1.1.0",
  "tier": "standard",
  "write_directory": "~/.local/state/baker-street/cases/2026-11-27-theme-book-pr30-r1/evidence/<role>/"
}
```

## Findings reckoning

- CRITICAL: 0
- HIGH: 0
- MODERATE: 4
- LOW: 9
- INFORMATIONAL: 1
- UNKNOWN: 0

## Why READY is withheld

```json
[
  "F-1",
  "F-2",
  "F-3",
  "F-4",
  "F-5",
  "F-6",
  "F-8",
  "F-10",
  "F-11",
  "F-12"
]
```

## Findings

```json
[
  {
    "basis": [
      "EXECUTED",
      "SOURCE"
    ],
    "disposition": "REQUIRED_REPAIR",
    "id": "F-1",
    "impact": "theme --mood corporate|freak with an affected palette (11/622 random) -> CLI user -> theme exits 1 / fails the acceptance criterion that derived themes pass WCAG AA",
    "mechanism": "Contrast floors in src/derived.ts use wcagRatio, which rounds to two decimals, so ratios just under 3:1 or 4.5:1 pass the generator's checks and fail the exact-precision audit",
    "notes": "",
    "severity": "MODERATE",
    "sources": [
      "M-F-1",
      "M-A-1",
      "M-A-2"
    ],
    "status": "CONFIRMED"
  },
  {
    "basis": [
      "EXECUTED"
    ],
    "disposition": "REQUIRED_REPAIR",
    "id": "F-2",
    "impact": "user follows AGENTS.md and audits the generated CSS -> CLI users, agents -> contradictory verdicts on one file",
    "mechanism": "Derived themes stamp audit=pass in the CSS header (charts advisory inside theme --audit) while theme-book audit on the same file exits 1 on chart bars; audit has no way to mark charts advisory",
    "notes": "",
    "severity": "MODERATE",
    "sources": [
      "H-F-1",
      "M-F-2",
      "W-F-1"
    ],
    "status": "CONFIRMED"
  },
  {
    "basis": [
      "EXECUTED",
      "SOURCE"
    ],
    "disposition": "REQUIRED_REPAIR",
    "id": "F-3",
    "impact": "26/30 builds have a bar under 3:1; Solarized freak has a dark bar at 1.00:1 -> chart readers, docs readers -> invisible data series; false rationale",
    "mechanism": "Chart colors for hued palettes have no contrast floor (dark charts never floored; light steps start at OKLCH L 0.78), and the documented rationale for advisory charts ('one set for both modes') is true only for hueless palettes",
    "notes": "",
    "severity": "MODERATE",
    "sources": [
      "H-F-2",
      "M-F-3"
    ],
    "status": "CONFIRMED"
  },
  {
    "basis": [
      "EXECUTED",
      "SOURCE"
    ],
    "disposition": "REQUIRED_REPAIR",
    "id": "F-4",
    "impact": "user passes a brand color first as documented -> CLI users, skill agents -> wrong primary, page in the brand color; doc/SKILL claim false",
    "mechanism": "'The first seed is always primary' is false: a very dark, very pale or near-grey first seed is read as base (#ffff00 becomes the light page; a navy brand becomes the dark page)",
    "notes": "",
    "severity": "MODERATE",
    "sources": [
      "H-F-3",
      "M-F-4",
      "W-F-4"
    ],
    "status": "CONFIRMED"
  },
  {
    "basis": [
      "EXECUTED"
    ],
    "disposition": "REQUIRED_REPAIR",
    "id": "F-5",
    "impact": "docs readers -> acceptance criterion: benchmark numbers in docs reproduce",
    "mechanism": "docs Table 3 (per-theme fit) does not reproduce from scripts/benchmark/famous-themes.ts and no script produces it (GitHub slope sign, five chroma ratios differ)",
    "notes": "",
    "severity": "LOW",
    "sources": [
      "H-F-4",
      "M-F-6"
    ],
    "status": "CONFIRMED"
  },
  {
    "basis": [
      "EXECUTED"
    ],
    "disposition": "REQUIRED_REPAIR",
    "id": "F-6",
    "impact": "README/docs readers -> overstated claim about the diagram",
    "mechanism": "sankey.ts and docs claim the diagram shows what the engine did; colors are stored as fixed values with provenance labels, so the links are the engine's recorded attribution, not a live dependency (changing a seed changes nothing)",
    "notes": "",
    "severity": "LOW",
    "sources": [
      "H-F-5"
    ],
    "status": "CONFIRMED"
  },
  {
    "basis": [
      "EXECUTED"
    ],
    "disposition": "FOLLOW_UP",
    "id": "F-7",
    "impact": "extension authors -> try an extension with the new moods and get exit 2 with no documented reason",
    "mechanism": "--book extensions (README example uses rules.ref('neutrals')) exit 2 under corporate/freak; undocumented",
    "notes": "D-1 accepted: no doc promises extensions under these moods; exit 2 names the missing scope. Doc note R-10 still applied.",
    "severity": "LOW",
    "sources": [
      "H-F-6",
      "M-F-7",
      "W-F-5"
    ],
    "status": "CONFIRMED"
  },
  {
    "basis": [
      "EXECUTED"
    ],
    "disposition": "REQUIRED_REPAIR",
    "id": "F-8",
    "impact": "CLI users and agents -> choose an option that silently does nothing or yields a failing theme",
    "mechanism": "Under corporate/freak, --generator has no effect, --standard wcag-aaa/apca do not change colors (so such builds fail their audit: AAA 10 pairs, APCA 4-6), and suggest --mood corporate|freak uses unrelated chroma profiles; none of this is documented outside the PR body",
    "notes": "",
    "severity": "LOW",
    "sources": [
      "H-F-7",
      "M-F-5",
      "W-F-3",
      "W-F-7"
    ],
    "status": "CONFIRMED"
  },
  {
    "basis": [
      "SOURCE",
      "EXECUTED"
    ],
    "disposition": "FOLLOW_UP",
    "id": "F-9",
    "impact": "PR and docs readers -> apparent contradiction",
    "mechanism": "PR body says 36/36 for Owl Coral; docs Listing 2 shows 26 passed / 16 advisory (theme --audit with charts advisory) without explaining the two counts",
    "notes": "RU-6: both counts were true of observed output (in-build 26+16 advisory charts; standalone 36). PR body nonetheless rewritten under R-13; after R-2/R-3 both audits read 36 passed, 6 advisory.",
    "severity": "LOW",
    "sources": [
      "W-F-2"
    ],
    "status": "CONFIRMED"
  },
  {
    "basis": [
      "SOURCE"
    ],
    "disposition": "REQUIRED_REPAIR",
    "id": "F-10",
    "impact": "agents following SKILL.md -> wrong expectation about roles",
    "mechanism": "SKILL says seed-1 tints --accent; under the derived moods the second non-status accent becomes --secondary",
    "notes": "",
    "severity": "LOW",
    "sources": [
      "W-F-8"
    ],
    "status": "CONFIRMED"
  },
  {
    "basis": [
      "SOURCE"
    ],
    "disposition": "REQUIRED_REPAIR",
    "id": "F-11",
    "impact": "docs readers -> overstated guarantee",
    "mechanism": "freak is documented as 'the same in both modes', but fills fall back to tints and primary can differ between modes when a seed fails the text or page floors",
    "notes": "",
    "severity": "LOW",
    "sources": [
      "W-F-9"
    ],
    "status": "CONFIRMED"
  },
  {
    "basis": [
      "SOURCE",
      "EXECUTED"
    ],
    "disposition": "REQUIRED_REPAIR",
    "id": "F-12",
    "impact": "contributors and docs readers -> wrong pointers and claims",
    "mechanism": "Stale or wrong references: src/freak.ts and docs/topics/light-dark-derivation do not exist; derived.ts says Material 0.125 (measured 0.124); '2-16°' is 1.4-16.4°; a new doc comment displaced FINGERPRINT_SEEDS's; docs say dark destructive 'lands on the same red' while Limits contradicts; a test name promises a primary-separation check it does not make; palette.ts mood descriptions describe fixed looks",
    "notes": "RU-4 split: F-12 doc claims (dangling doc path, 0.125, 2-16°, 'lands on the same red', misleading test name) REQUIRED_REPAIR; pure code-comment items (src/freak.ts pointer, displaced FINGERPRINT_SEEDS comment) FOLLOW_UP. Both repaired in 7bf7906/9dbfc4d.",
    "severity": "LOW",
    "sources": [
      "W-F-6",
      "M-F-8",
      "H-F-8"
    ],
    "status": "CONFIRMED"
  },
  {
    "basis": [
      "SOURCE"
    ],
    "disposition": "FOLLOW_UP",
    "id": "F-13",
    "impact": "docs readers -> 'not memorising' claims more than shown; maintainers -> F-1..F-4 passed CI",
    "mechanism": "Leave-one-out refits (s, b, k) but keeps BAND_L / BAND_L_LIGHT fitted on all seven; the dark-to-light column uses a formula different from the documented one; no tests cover chart contrast, primary choice, or agreement between theme --audit and audit",
    "notes": "RU-7: informational, except the doc claim 'not memorising', which overstated and was repaired (R-9). The coverage gap closed through R-1..R-4 tests.",
    "severity": "INFORMATIONAL",
    "sources": [
      "M-F-9",
      "H-F-10"
    ],
    "status": "CONFIRMED"
  },
  {
    "basis": [
      "REPORTED"
    ],
    "disposition": "ACCEPTED",
    "id": "F-14",
    "impact": "none",
    "mechanism": "One Light yellow #cb7701 may not match Atom's source (recalled as #c18401)",
    "notes": "Withdrawn: fetched one-light-syntax colors.less: '@hue-6-2: hsl(35, 99%, 40%); // <-orange 2' -> #cb7701; One Dark '@hue-6-2: hsl( 39, 67%, 69%)' -> #e5c07b, its pair. Excerpt preserved at evidence/front-office/one-light-source.txt; the fetch was a front-office action outside the investigators' no-network header, disclosed there.",
    "severity": "LOW",
    "sources": [
      "H-F-9"
    ],
    "status": "WITHDRAWN"
  }
]
```

## Rulings

```json
[
  {
    "id": "RU-1",
    "ruling": "F-2 and F-3 are related: flooring hued charts (F-3) removes the mismatch for hued palettes; hueless stock greys remain advisory and need an explicit audit option and header wording (F-2)."
  },
  {
    "id": "RU-2",
    "ruling": "F-14 withdrawn on fetched source evidence."
  },
  {
    "id": "RU-3",
    "ruling": "D-1 accepted: F-7 FOLLOW_UP."
  },
  {
    "id": "RU-4",
    "ruling": "D-2 accepted: F-12 split; doc claims required."
  },
  {
    "id": "RU-5",
    "ruling": "R-6: document (standard sets the audit target, not the solver) rather than refuse AAA/APCA."
  },
  {
    "id": "RU-6",
    "ruling": "F-9 FOLLOW_UP under the adverse-consequence rule (checker)."
  },
  {
    "id": "RU-7",
    "ruling": "F-13 INFORMATIONAL; its doc claim repaired (checker)."
  },
  {
    "id": "RU-8",
    "ruling": "D-3 accepted (F-4 MODERATE); D-4 accepted (F-8 REQUIRED_REPAIR)."
  },
  {
    "id": "RU-9",
    "ruling": "Code repair over doc repair for F-3 and F-4. F-3: the docs' own stated rule is 'contrast is a floor in each mode', and a bar at 1.00:1 on its page is an invisible series (WCAG 1.4.11); acceptance criterion 3's 'as documented' relied on a rationale that was false for hued palettes. F-4: the documented and intended contract was brand-first; the code broke it for dark/pale brands."
  }
]
```

## Path to READY

```json
[
  "F-1",
  "F-2",
  "F-3",
  "F-4",
  "F-5",
  "F-6",
  "F-8",
  "F-10",
  "F-11",
  "F-12"
]
```

## Batched follow-ups

```json
[
  "F-7",
  "F-9",
  "F-13"
]
```

## Probe triage

```json
[
  {
    "disposition": "RETAIN_IN_SPECIALIZED_SUITE",
    "id": "P-1",
    "status": "not yet extracted; FOLLOW_UP R-F1. Replayed at 7bf7906: 0 of 622 builds fail with chart bars required."
  },
  {
    "disposition": "MINIMIZE_THEN_PROMOTE",
    "id": "P-2",
    "status": "promoted: three rounding-edge CASES; RED at 4259148, GREEN at 4856aac."
  },
  {
    "disposition": "ARCHIVE",
    "id": "P-3"
  },
  {
    "disposition": "ARCHIVE",
    "id": "P-4"
  },
  {
    "disposition": "ARCHIVE",
    "id": "P-5"
  },
  {
    "disposition": "MINIMIZE_THEN_PROMOTE",
    "id": "P-6",
    "status": "promoted: per-case chart-floor and separation test; violet/pink/cyan freak in CASES; RED at 4259148."
  },
  {
    "disposition": "MINIMIZE_THEN_PROMOTE",
    "id": "P-7",
    "status": "promoted at 183d1db: 14 stress palettes x 2 moods in CASES (owlCoral already covered by the specimen)."
  },
  {
    "disposition": "ARCHIVE",
    "id": "P-8"
  },
  {
    "disposition": "MINIMIZE_THEN_PROMOTE",
    "id": "P-9",
    "status": "promoted: CLI tests (a) hued passes standalone audit, (b) hueless header + --charts-advisory; unit test (c) default still requires charts. RED at 4259148."
  },
  {
    "disposition": "ARCHIVE",
    "id": "P-10",
    "status": "rerun for R-13 counts."
  },
  {
    "disposition": "MINIMIZE_THEN_PROMOTE",
    "id": "P-11",
    "status": "promoted with an origin-independent hue assertion (checker); RED at 4259148 (navy->amber, yellow->blue), GREEN at 9dbfc4d."
  },
  {
    "disposition": "MINIMIZE_THEN_PROMOTE",
    "id": "P-12",
    "status": "#ffff00 in the primary test; Solarized base03 case covered by 'stress: cream and ink' and 'Solarized, freak' CASES with the full per-case assertions."
  },
  {
    "disposition": "ARCHIVE",
    "id": "P-13",
    "status": "RU-5 chose DOC for R-6."
  },
  {
    "disposition": "N/A",
    "id": "P-14"
  },
  {
    "disposition": "ARCHIVE",
    "id": "P-15",
    "status": "FOLLOW_UP R-F2."
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
    "decision_statement": "CHANGES_REQUIRED at 4259148: required repairs for F-1 (exact floors), F-2 (audit agreement), F-3 (chart floors), F-4 (primary choice), F-5 (Table 3), F-6 (sankey wording), F-8 (ignored options), F-10 (skill seed roles), F-11 (freak wording), F-12 doc claims; none CRITICAL or HIGH. Applied as R-1..R-13 with errata E-1..E-6 in 4856aac, 7bf7906, 9dbfc4d, 183d1db. Coverage gaps FU-2. Valid only for the recorded artifacts, environment, and examined scope."
  },
  {
    "followup_items": [
      {
        "id": "R-F1",
        "item": "Random-palette sweep as an opt-in suite (P-1)."
      },
      {
        "id": "R-F2",
        "item": "Value-parity check of existing moods across design-book 0.26.0 and 2d80b33 (P-15)."
      },
      {
        "id": "FU-1",
        "item": "Checker hypothesis (not promoted): an extension overriding only light primary under a derived mood leaves dark primary unchanged (dark does not extend light); the build then fails 4 pairs. Documented that dark does not extend light; behavior not changed."
      },
      {
        "id": "FU-2",
        "item": "Coverage gaps: install.sh not run with the vendored tarball in review; tarball not compared with an upstream 2d80b33 build; svg/json/w3-tokens/native outputs of the new moods not examined."
      }
    ]
  }
]
```

Valid only for the recorded artifacts, environment, and examined scope. Reassess affected claims when these change.
