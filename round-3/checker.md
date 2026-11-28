# Decision check: theme-book PR #30, round 3

Case `2026-11-27-theme-book-pr30-r3`. Phase: decision check. Plain voice. Written 2026-11-27, about
19:10-0800.

## Reviewer basis

- Basis: FRESH_AGENT. No prior exposure to this code, the PR or the earlier cases before this check.
  I am not an author of the target or of its repairs.
- Read in this check: the checker packet; round 2's `CASE_FILE.md` and `evidence/checker/DECISION_CHECK.md`
  (and its probe scripts); round 1's `CASE_FILE.md` (findings, path to READY, probe triage); the delta
  `git diff 2fd268c..f93fbde` in full; the commit messages of `ba83d61`, `e12e58c`, `6d6d101`,
  `f93fbde`, `7b451c9`; `src/derived.ts` L80-105 and L285-345; the README derived-moods section; the
  derived-moods doc's Tables 1-2 and "How a palette becomes a theme"; `scripts/benchmark/sankey.ts`
  grouping lines; `test/book-extension.test.ts` L110-275; the PR body and comment list (read-only `gh`).
- Not read: `evidence/blind/BLIND_PASS.md` in full (I relied on round 2's case and check for its
  findings); the vendored design-book internals (excluded by scope).
- Write location: this directory only. No temp files elsewhere.
- No draft decision for round 3 was supplied to me; I check the prior findings at the new head and
  recommend a decision.

## Execution controls

macOS, bun 1.4.5, run as the user, no sandbox, no network isolation. Network: two read-only `gh pr view`
calls. Subject `f93fbdef5ef4b0b4d93601236d321d161ecff387`; `git status --short` empty before and after.
Probes write only into this directory. Load at start in `env.out`. `install.sh` was not run.

## Checks run

| ID | What | Command and oracle | Result | Artifacts |
| --- | --- | --- | --- | --- |
| K-1 | Local gate at head | `bun test`; `bun x tsc --noEmit` in the subject | 588 pass, 0 fail, 4325 expects, exit 0; tsc exit 0 | `bun-test-head.out`, `tsc-head.out` |
| K-2 | Code delta is comment-only | `git diff 2fd268c f93fbde -- src scripts bin` | only `src/derived.ts` L19-35, inside the header doc comment | (diff in this report) |
| K-3 | Status-hue fallback | round 2's `statushue.ts`, re-pointed to this subject; palettes `#dc2626`; `#16a34a #ca8a04`; `#dc2626 #2563eb`; three and four seeds; both moods | byte-identical to round 2's `statushue.out`; assessed under B-F-4 | `statushue.ts`, `statushue.out` |
| K-4 | Owl Coral counts | `theme --mood corporate|freak --audit --hex --standard wcag-aa|wcag-aaa|apca`, then `audit` on the AA file | corporate AA 36 passed / 6 advisory, exit 0; AAA 10 failed; APCA 7 failed. freak AA 36/6, exit 0; AAA 12 failed; APCA 13 failed. Standalone audit agrees (36 passed, 6 advisory) for both. The 6 advisory are `border-advisory` (border, input, sidebar-border, both modes) | `owl-*.css`, `owl-*.err`, `owl-*-audit.out` |
| K-5 | Benchmarks | `bun scripts/benchmark/{fit,score,sankey}.ts` | byte-identical to round 2's checker and blind outputs; 0.080, 0.081 leave-one-out, 0.124, 0.319 and the 1.4-16.4° range (six of seven; Gruvbox 48.5°) match the PR body | `bench-*.out` |
| K-6 | Legacy moods | round 2's `legacy-dump.ts`, `ROOT` = subject | byte-identical to round 2's `legacy-head.txt` | `legacy-dump.ts`, `legacy-head.txt` |
| K-7 | Hueless round trip | round 2's `hueless.sh` re-pointed | output identical to round 2's | `hueless.sh`, `hueless.*`, `grey.*` |
| K-8 | Random sweep (small replay) | round 2's `sweep.ts`, re-pointed, seed 20261127, n 400 | 860 builds, 0 failures, `chartsAdvisoryRuns=12`; same as round 2 at `2fd268c` | `sweep.ts`, `sweep-seed20261127-n400.out` |
| K-9 | PR body commit IDs | `git merge-base --is-ancestor <id> f93fbde` for all 14 cited IDs | all 14 on the branch | (command in this report) |
| K-10 | Rewritten commits | `git rev-parse <id>^{tree}` | `860b0b2` = `32dc0dd`, `2debc77` = `ba83d61` (trees); `183d1db` and `e12e58c` carry the same patch | (command in this report) |
| K-11 | CLI-spawning tests and limits | source read of `test/book-extension.test.ts`; grep for `spawnSync` in `test/` | see C3-F-1 | (source) |
| K-12 | PR body and comments | `gh pr view 30 --json title,headRefOid,state,isDraft,body`; `--json comments` | head `f93fbde`, open, draft | `pr-view.json`, `pr-body.md`, `pr-comments.json` |

## Per-ID results

### Round 2

**B-F-1 (MODERATE): floors met on hex lost in OKLCH output. HOLDS.**
`src/derived.ts` L103-104 `TEXT = 4.5 + MARGIN`, `MARK = 3 + MARGIN`, used at L106, L241, L264, L266,
L336. The delta does not change code (K-2). K-1 passes, including the `#d967a8` case; K-8 finds no
failure. Limit: I did not rerun round 2's full 47,220-build sweep or the red/green commits; round 2
checked those, and the code is unchanged since.

**B-F-2 (LOW): sankey said to draw recorded origins. HOLDS.**
CHANGELOG L27-29 now says "seed-to-light flows follow recorded origins; light-to-dark flows pair role
groups"; PR body Commits item 3 says the same; `src/derived.ts` L31-34 now says the seed-to-light
records are origins and "a flow view pairs light and dark by role". README L143-145 and doc L69-73
already matched. `scripts/benchmark/sankey.ts` L47-48 adds `origin -> light group` and
`light group -> dark group`, which is what the text now says.

**B-F-3 (LOW): `--book` CLI test timed out under load. HOLDS for the named test; follow-on claim fails, see C3-F-1.**
The named test (L113-121) has a 30 s limit. Round 2's record note says the follow-on hypothesis
("five more book-extension tests") was "closed by 6d6d101". That is not true of the source; see
C3-F-1.

**B-F-4 (LOW): secondary/accent said never to take a status hue. HOLDS.**
New text (doc Table 2 L113, CHANGELOG L18-20, PR body Summary, `src/derived.ts` L22-25): secondary and
accent take the next palette colors that are not red, yellow or green; a role left without one is a
tint of the primary, so with a status-hued primary it carries that hue. Code L298-299:
`actions = r.accents.slice(1).filter((a) => !statusHue(a))`, `hueSource = (i) => actions[i] ?? r.accents[0]`.
Against K-3, both moods:
- `#dc2626 #2563eb`: secondary from blue (`#dce8ff` corporate, `#2563eb` freak); accent has no
  non-status color left, so it is a red tint (`#ffc4bc` / `#733a34`, H27). Matches.
- `#16a34a #ca8a04`: yellow is excluded; neither role has a color, so both are green tints (H149;
  secondary `#d2f2d6`, accent `#b6e1bc`). Matches: the hue is carried, though `statusHue()` does not
  flag the paler secondary because its chroma is under 0.06.
- `#dc2626`: both roles are red tints. Three or four seeds: no status hue on either role. Matches.
Limits (informational, no finding): `statusHue` ignores chroma under 0.06, so a muted red/yellow/green
palette color (OKLCH C 0.04-0.06) can still be taken; and in `freak` a role whose own color cannot carry
text becomes a tint of that color, not of the primary (doc Table 1 L60 says this). Neither contradicts
the new sentence as a reader would act on it.

**C-F-1 (LOW): stale PR body. HOLDS, except the one clause in C3-F-1.**
- All 14 cited commit IDs are on the branch (K-9). The dead IDs `4856aac`, `7bf7906`, `9dbfc4d` are
  gone from the body.
- `bun test` 588 pass at `f93fbde` and tsc clean: reproduced (K-1).
- Owl Coral table: every number reproduced (K-4), and "6 advisory border pairs" is accurate.
- Benchmarks: reproduced (K-5).
- Sweeps: "47,220 builds, failed 54 at `7b451c9` and fails none at `2fd268c`" is REPORTED from round 2
  (the blind pass ran at `9dbfc4d`, which round 2 records as tree-identical to `7b451c9`). Code is
  unchanged since `2fd268c` (K-2), and K-8 corroborates on a subset.
- Placing `ba83d61` and `e12e58c` under round 1: consistent with the round-1 record (P-7 "promoted at
  `183d1db`", same patch as `e12e58c`; `2debc77`, tree-identical to `ba83d61`, sits between `9dbfc4d`
  and `183d1db`). Round 2's check had called them round-2 commits; the PR body's grouping is
  defensible and not a finding.
- "Round 2's repair followed the loop (red commit, PR comment, green commit)": a PR comment at
  02:50Z announces the red commit as `860b0b2`, which is tree-identical to `32dc0dd` (K-10), before
  the 18:53 rewrite. True; the comment's ID is pre-rewrite (informational).
- Fails: item 5 says "`6d6d101` timeouts for the remaining CLI-spawning tests". Not all remaining
  CLI-spawning tests got a limit (C3-F-1).
- Not examined: "These tests were run red at `4259148` before the fixes" (round-1 sentence, unchanged
  in substance; round 1's probe triage records RED at `4259148` for P-2, P-6, P-9, P-11). Applied to
  `ba83d61` (no new test) and `e12e58c` the sentence is loose, not shown false.

### Round 1 required repairs at `f93fbde`

Code is unchanged from `2fd268c` apart from the header comment (K-2), and round 2's check found all of
these holding there. Rechecked here:

| ID | Result | Evidence |
| --- | --- | --- |
| F-1 exact floors | HOLDS | `wcagRatioExactCss` import unchanged; K-1, K-8 |
| F-2 build/standalone audit agree; `--charts-advisory` | HOLDS | K-4, K-7 |
| F-3 hued chart bars clear 3:1 | HOLDS | K-8 (charts required except the 12 hueless runs) |
| F-4 first colored seed is primary | HOLDS | K-1; `src/derived.ts` L25-26 |
| F-5 Table 3 from `fit.ts` | HOLDS | K-5 |
| F-6 sankey links are recorded origins, not live dependencies | HOLDS | doc L69-73; see B-F-2 |
| F-8 ignored options; AAA 10 / APCA 7 | HOLDS | K-4 |
| F-10 skill seed roles | HOLDS | SKILL L42; skill CHANGELOG L23 now also says "next non-status colors" |
| F-11 freak "same in both modes" qualified | HOLDS by source | doc Table 1 L60 |
| F-12 stale references | HOLDS by source | no change in the delta reintroduces them |

## New finding

### C3-F-1: `6d6d101` misses one CLI-spawning test and labels a non-CLI test as spawning the CLI

- Status: CONFIRMED (SOURCE) for the text; the timeout itself is HYPOTHESIS (not observed failing).
- Evidence: `test/book-extension.test.ts`
  - L131-138 "the recipe command replays the --book path literally in a POSIX shell": spawns
    `sh -c printf`, not the CLI, yet `6d6d101` gave it `30_000` with the comment `// spawns the CLI`.
  - L220-232, `test.each` of three cases "%s exits 2 naming the extension and its path": each runs
    `Bun.spawnSync([CLI, "theme", ..., "--book", path])` (L228) after a library build, and still has
    bun's 5 s default. This is the exposure B-F-3 named (a cold CLI start of 1.6-5.6 s under load).
  - `6d6d101`'s message says "five more tests ... that start the CLI"; four of the five do.
- Claims affected: PR body Commits item 5 ("`6d6d101` timeouts for the remaining CLI-spawning tests");
  round 2's record note ("hypothesis ... closed by 6d6d101").
- Impact: maintainer reading the PR body → believes every CLI-spawning test has a limit → a later
  timeout under load in the `test.each` cases is a surprise; this is acceptance criterion 4 (PR body
  true of the code). Contributors reading L138 are told a test spawns the CLI when it does not.
- Severity: LOW. Origin: INTRODUCED (`6d6d101`, and the PR body rewrite). Intentionality: NO (the
  commit states the opposite intent). Disclosure: UNDISCLOSED.
- Disposition: REQUIRED_REPAIR, on criterion 4 (the same basis on which round 2 required C-F-1 and the
  B-F-2/B-F-4 PR-body wording). The test-timeout exposure alone, being a hypothesis, would be
  FOLLOW_UP; the cheapest repair fixes both.
- Repair R3-1 (TEST + PR_BODY, THIS_CHANGE, about 5 minutes): in `test/book-extension.test.ts`, give the
  L220-232 `test.each(...)("%s exits 2 naming the extension and its path", async (...) => {...}, 30_000)`
  a limit with `// spawns the CLI`, and change L138's comment to say what it does (it runs `sh`; the
  limit can stay or go). Add the commit to PR body item 5. Acceptance check: every `test(` or
  `test.each` in `test/` whose body calls `Bun.spawnSync([CLI` or `CLI_BIN` has an explicit limit,
  and every `// spawns the CLI` comment sits on a test that does; `bun test` passes. Alternative
  (PR_BODY only): replace "the remaining CLI-spawning tests" with "four more CLI-spawning tests";
  this leaves the hypothesis open as a batched follow-up.
- Proposed erratum for the round-2 record: B-F-3's note "hypothesis ... closed by 6d6d101" should
  read "partly closed by 6d6d101; three `test.each` cases at L220-232 remain at the 5 s default".

## Probe dispositions

- BP-1 / P-2 / P-6 / P-9 (promoted tests): still present and passing (K-1). No change in the delta.
- BP-2 / P-1 (the sweep, RETAIN_IN_SPECIALIZED_SUITE): still not a suite in the repository; replayed
  here on a subset (K-8). Remains PROPOSED. Not decision-critical: code is unchanged since round 2's
  full replay.

## Record consistency (for the front office)

- The round-3 header's `scope` still reads "All changes in 9eed99b..9dbfc4d"; the sealed head is
  `f93fbde`. The review basis and evidence locations are correct, so I treated scope as
  `9eed99b..f93fbde` with the delta `2fd268c..f93fbde`.
- Round 2's `followups` list is empty, but BP-2 remained open work; its batched follow-ups (the
  `src/derived.ts` header comments, the skill CHANGELOG wording) are now done by `f93fbde`.
- Round budget 2 is exceeded; the header records the user's authorization and that no CRITICAL or HIGH
  finding was open. No CRITICAL or HIGH finding is open now.

## Incomplete checks and their relevance

- `install.sh` end to end: not run (writes outside the case). Not touched by the delta.
- Full 47,220-build sweep and red/green replays: not rerun; code unchanged since round 2 ran them.
- C3-F-1's timeout under high load: not reproduced. The finding rests on the PR body's wording, which
  source inspection settles.

## Decision

- Draft decision: none supplied for round 3.
- B-F-1, B-F-2, B-F-4 and C-F-1 HOLD at `f93fbde`; B-F-3 HOLDS for the named test. All round-1
  required repairs HOLD. Gate: `bun test` 588 pass, tsc clean.
- One new LOW finding, C3-F-1, makes a PR-body claim untrue (criterion 4). No CRITICAL or HIGH finding.
- Recommendation: **CHANGES_REQUIRED**. Path to READY: R3-1 (C3-F-1) only, either the test-limit fix
  plus a PR body line, or the PR-body-only rewording. Recheck afterwards is a source check of the two
  test sites, `bun test`, and the PR body's item 5.
- Valid only for head `f93fbde`, the artifacts below, and the examined scope.

## Artifacts

All in this directory; digests with `shasum -a 256 *`.
`env.out`, `bun-test-head.out`, `tsc-head.out`, `statushue.ts`, `statushue.out`, `owl-*.css`, `owl-*.err`,
`owl-*-audit.out`, `bench-fit.out`, `bench-score.out`, `bench-sankey.out`, `legacy-dump.ts`,
`legacy-head.txt`, `hueless.sh`, `hueless.*`, `grey.*`, `sweep.ts`, `sweep-seed20261127-n400.out`,
`pr-view.json`, `pr-body.md`, `pr-comments.json`.
