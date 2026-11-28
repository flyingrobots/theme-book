# Decision check: theme-book PR #30, round 2

Case `2026-11-27-theme-book-pr30-r2`. Phase: decision check. Plain voice. Written 2026-11-27, about
19:00-0800.

## Reviewer basis

- Basis: FRESH_AGENT. I had not seen this code, the PR, the blind pass or either case before this
  check. I am not an author of the target or of its repairs.
- Exposure in this check: I read the checker packet, `case.json`, the papers (`CASE_FILE.md`,
  `ERRATA.md`, `FINDINGS_PROVISIONAL.md`), `evidence/blind/BLIND_PASS.md` and its probe scripts, the
  round-1 `CASE_FILE.md` (findings, path to READY, probe triage), the full delta `7b451c9..2fd268c`,
  the commit messages of `ba83d61`, `e12e58c`, `32dc0dd`, `cda9a0e` and `2fd268c`, the derived-moods
  doc at head, the root CHANGELOG's Unreleased section, the skill and its CHANGELOG (derived-mood
  lines), the head of `src/derived.ts`, and the PR body.
- Write location: the caller assigned `evidence/checker/`. The header's `write_directory` still names
  `evidence/blind/`. I wrote only to `evidence/checker/` and the OS temp dir (removed afterwards).
- Draft decision checked: `case.json` records `decision: CHANGES_REQUIRED` with path to READY
  B-F-1..B-F-4, and a note proposing READY after the repairs are verified at `2fd268c`.

## Execution controls

macOS, bun 1.4.5, run as the user, no sandbox, no network isolation. Network use: two read-only
`gh` calls (`gh pr view 30`, `gh issue view 31`). Subject at
`2fd268c609fcb66e80f3df1586db6170bbd9351f`, `git status --short` empty before and after. The red and
green commits and the regeneration of generated files were run in `git archive` copies under
`$TMPDIR` with `node_modules` symlinked to the subject's; the copies were deleted after the runs.
Load average at the start: 4.75 / 6.98 / 9.37 (`env.out`). `install.sh` was not run.

## Checks run

| ID | What | Command and oracle | Result | Artifacts |
| --- | --- | --- | --- | --- |
| K-1 | Local gate at head | `bun test`; `bun x tsc --noEmit` in the subject | 588 pass, 0 fail, exit 0; tsc exit 0 | `bun-test-head.out`, `tsc-head.out` |
| K-2 | Red commit | `bun test test/derived-moods.test.ts` in an archive of `32dc0dd` | exit 1; one failure: `rounding edge, OKLCH output (corporate) > conforms to WCAG AA in both modes`, received `["light sidebar-ring/sidebar"]` against `[]`. 455 pass. This is the stated reason | `derived-32dc0dd.out` |
| K-3 | Green commit | same, archive of `cda9a0e` | exit 0, 456 pass, 0 fail | `derived-cda9a0e.out` |
| K-4 | Blind sweep replayed at head | `probe/sweep.ts` (SHA-256 `227559a1...27bf7`, identical to the blind copy) with the blind seeds: 20261127 n=400, 7 n=3000, 1-5 n=4000 each. Oracle: the build's own `evaluateAudit` | 47,220 builds over 23,610 palettes: 0 failures, 0 exceptions (blind at `9dbfc4d`: 54 failing builds). Control `STD=wcag-aaa`, n=20: 100 of 100 flagged, so the filter detects failures | `sweep-*.out`, `sweep-control-aaa.out`, `sweep.ts` |
| K-5 | CLI, default format | blind `case1-cli.sh` (paths re-pointed); `theme --seed X --mood corporate|freak --audit` for `#b18cec #2fe32e #b97fae #d967a8` | all exit 0, `36 passed, 0 failed, 0 unverified, 6 advisory`; default, `--hex` and standalone `audit` agree. `--native` audit is `INCOMPLETE ... 20 unverified`, as the blind pass found (informational, not in the delta) | `case1-cli.*`, `single-seeds.out` |
| K-6 | Docs Listing 1/2 and counts | blind `listing1.sh` re-pointed; freak with the same seeds at each standard | Every Listing 2 line matches; `36 passed ... 6 advisory` from build and from `audit`; AAA 10 failed, APCA 7 failed; semantic exit 2; freak AAA 12, APCA 13. Against the blind run, only dark `--muted-foreground` changed (`#a7abaf` to `#aaaeb2`), which Listing 2 does not show | `listing1.*`, `freak-standards.out` |
| K-7 | Benchmarks | `bun scripts/benchmark/{fit,score,sankey}.ts` | byte-identical to the blind outputs; Table 3, Table 4, 0.081 and both sankey blocks (README and docs) match | `bench-*.out` |
| K-8 | Generated files | `scripts/specimen.ts`, `scripts/benchmark/scoreboard.ts` in an archive of head; `cmp` | `docs/specimen.svg`, `scoreboard.svg`, `scoreboard.html` identical to the committed files | `regen-*.out` |
| K-9 | Legacy moods | blind `probe/legacy-dump.ts` with `ROOT` = subject | 2,610 lines, byte-identical to the blind's base and head dumps | `legacy-head.txt` |
| K-10 | Hueless round trip | blind `hueless.sh` re-pointed | unchanged: build 26/0/0/16 with `charts advisory`; plain `audit` 4 failed, exit 1; `--charts-advisory` 26/0/0/16, exit 0; JSON `chartsAdvisory` true/false/true | `hueless.*`, `grey.*` |
| K-11 | Status hue of secondary and accent | blind `probe/statushue.ts` with palettes `#dc2626`; `#16a34a #ca8a04`; `#dc2626 #2563eb`; plus three and four seeds | see B-F-4 below | `statushue.ts`, `statushue.out` |
| K-12 | PR body | `gh pr view 30 --json title,headRefOid,body,state,isDraft` | head `2fd268c`, open, draft. Content assessed under C-F-1 | `pr-view.json`, `pr-body.md` |
| K-13 | Rules version | `git show v0.4.0:test/fixtures/preset-rules.json`; ancestry | released shadcn rules were 1.0.0; 1.1.0 is unreleased, so re-recording its fingerprint in `cda9a0e` moves no published version | (command output) |

## Per-ID results

### B-F-1 (MODERATE, REQUIRED_REPAIR): floors met on hex lost in OKLCH output. HOLDS

- Adverse consequence: CONFIRMED by the blind pass and by K-2 (the red test reproduces the exact
  failure). It violated acceptance criterion 3. Meets the rule.
- Repair `cda9a0e`: `src/derived.ts` introduces `TEXT = 4.51` and `MARK = 3.01` and uses them in
  `holdsText`, muted ink, `inkFor`, `markOn` and the destructive red search. A search for other
  bare `3` / `4.5` thresholds in `src/derived.ts` finds none.
- RED/GREEN: K-2 and K-3. Surrounding checks: K-1, K-4, K-5. Collateral: K-6 to K-9 show only the
  expected colour shifts in derived output; legacy moods unchanged; the fingerprint change is to an
  unreleased version (K-13).
- Limit: the 0.01 margin is ten times the largest observed rounding loss (0.0007); I did not derive
  a worst-case bound for 4-decimal OKLCH. The sweep is random sRGB hex only.

### B-F-2 (LOW, REQUIRED_REPAIR): sankey said to draw recorded origins. FAILS (incomplete)

- Adverse consequence: CONFIRMED by source (`scripts/benchmark/sankey.ts` pairs light and dark
  groups unconditionally). It violates acceptance criterion 4. Meets the rule.
- Holds where the blind pass named it: README L141-145 and docs L71-73 now say seed-to-light flows
  follow records and each light group flows to its dark counterpart; README's "Every color records
  an origin" is gone; the script's doc comment is corrected.
- Fails elsewhere in the acceptance scope: root `CHANGELOG.md` L25-26 still says "a Mermaid sankey
  drawn from a built book's recorded origins", and the PR body (Commits item 3) says "a Mermaid
  sankey drawn from a built book's recorded origins". Both are the same overstatement for the same
  readers.
- Not in the acceptance list, for follow-up: `src/derived.ts` L32-33 says a flow view "reads seeds
  -> light -> dark as recorded origins"; the dark base ramp records its seed, not a light entry.

### B-F-3 (LOW, REQUIRED_REPAIR under RU-1): `--book` CLI test timed out under load. HOLDS (scoped)

- Adverse consequence: CONFIRMED once by the blind pass. RU-1 cites the user's working agreement
  ("a failing, flaky or order-dependent test ... is yours to fix"), which is a repository-level
  rule under criterion 7. Meets the rule.
- Repair `ba83d61`: explicit limits on `the CLI builds with --book...` (30 s), the theme-book
  unknown-flag/eval test (30 s) and the install matrix (120 s). No assertions changed (diff read).
- Verification: K-1 passed at load about 5-9. I could not reproduce the blind's load of 14, so this
  is not a demonstration that the flake is gone; it is a source check that the cause named in the
  finding (the 5 s default on that test) is removed.
- New hypothesis, returned for investigation, not established: `test/book-extension.test.ts` L123
  (`the CLI refuses an empty --book and a leading-zero version`) also spawns the CLI twice under the
  5 s default, and five more tests spawn it once. The blind pass measured single spawns of 1.6-2.8 s
  and one of 5.6 s at load 14, so these have the same exposure. Not observed failing. Next check:
  run the file at high load, or give every CLI-spawning test an explicit limit.

### B-F-4 (LOW, REQUIRED_REPAIR): secondary/accent said never to take a status hue. FAILS

- Adverse consequence: CONFIRMED (blind pass; K-11). It violates acceptance criterion 4, and an
  agent following the docs gives a user a wrong promise. Meets the rule.
- The repair text is itself untrue. Docs Table 2 now says "when the palette has no other color,
  secondary and accent are tints of that primary"; the CHANGELOG says "(with no other color, they
  tint a status-hued primary)". The code (`src/derived.ts` L296-297) is
  `actions = r.accents.slice(1).filter((a) => !statusHue(a))` and
  `hueSource = (i) => actions[i] ?? r.accents[0]`: each of secondary and accent that has no
  non-status palette color of its own falls back to a tint of the primary. K-11 at head:
  - `#dc2626 #2563eb` (a red brand and one other color), both moods: secondary is blue, accent is
    `#ffc4bc` light / `#733a34` dark, classified red by the project's `statusHue()`. The palette
    has another color, so the repaired sentence does not cover this, and the main clause is still
    read as "no red accent".
  - `#16a34a #ca8a04` (green brand, yellow second), both moods: accent `#b6e1bc` / `#2c5935`,
    classified green. The palette has another color (a status one), so "no other color" is the
    wrong trigger.
  - With two or more non-status colors besides the primary (`#dc2626 #2563eb #9333ea`), neither
    role is status-hued, as documented.
- The PR body still says "secondary and accent never take a red, yellow or green palette color"
  with no exception; the blind pass named the PR body in this finding's evidence.
- Not in the acceptance list, for follow-up: `src/derived.ts` L22-23 says "a non-status role never
  takes a palette color in the red, yellow or green ranges", which is also contradicted by the
  same outputs.

### C-F-1 (new, checker): the PR body is stale against head `2fd268c`. CONFIRMED, LOW, REQUIRED_REPAIR

- Evidence (SOURCE, `pr-body.md`; EXECUTED, ancestry check):
  - Commits item 4 cites `4856aac`, `7bf7906`, `9dbfc4d`; none is an ancestor of `2fd268c` (the
    force-push rewrote them to `bf5dad7`, `4315ecb`, `7b451c9`). The round-2 commits `ba83d61`,
    `e12e58c`, `32dc0dd`, `cda9a0e`, `2fd268c` are not listed.
  - Checks reports `bun test: 298 pass, 0 fail (local, at 9dbfc4d)` and an unexplained earlier
    failure; at head the suite is 588 tests (K-1), and the earlier failure is now identified and
    repaired (B-F-3).
  - "The review's random sweep (622 builds, both moods) fails none" is a round-1 result; the
    round-2 sweep found 54 failures at `9dbfc4d` and none at `2fd268c` (K-4). The body does not
    mention the rounding defect or its margin repair.
  - Two untrue claims carried over: B-F-2 (sankey "drawn from ... recorded origins") and B-F-4
    (status hues).
- Impact: the maintainer who merges reads commit IDs that are not on the branch, test counts and a
  sweep result for an older head, and two claims the code contradicts → may merge on a description
  that does not describe the change. Violates acceptance criterion 4 (the PR body is named).
- Severity LOW. Origin INTRODUCED (by the force-push and later commits without a body update).
  Intentionality UNKNOWN; the draft note says the PR was "drafted per delivery loop", so an update
  may be planned, but at this check the body is untrue.

### Round-1 required repairs at `2fd268c`

| Round-1 ID | Repair | Result | Evidence |
| --- | --- | --- | --- |
| F-1 | exact-ratio floors | HOLDS | `src/derived.ts` L37 imports `wcagRatioExactCss as wcagRatio`; K-4 |
| F-2 | build and standalone audit agree; `--charts-advisory` | HOLDS | K-5, K-6, K-10 |
| F-3 | every hued chart bar clears 3:1; rationale scoped to hueless | HOLDS | K-4 (charts required for every non-hueless palette; `chartsAdvisoryRuns=12` per run, the six hueless fixed palettes times two moods); docs Limits |
| F-4 | first colored seed is primary | HOLDS | test at `test/derived-moods.test.ts` L145-158 passes (K-1); docs L12-13; skill L42-44 |
| F-5 | Table 3 from `fit.ts` | HOLDS | K-7 |
| F-6 | sankey links are recorded origins, not live dependencies | HOLDS for that wording (docs L70-71); see B-F-2 for the further overstatement |
| F-8 | ignored options documented; AAA 10 / APCA 7 | HOLDS | docs L45-53; K-6 |
| F-10 | skill seed roles | HOLDS | skill L42 ("the next non-status colors fill `--secondary`, then `--accent`") |
| F-11 | freak "same in both modes" qualified | HOLDS by source | docs Table 1; skill L44 |
| F-12 | stale references | HOLDS | no match for `freak.ts`, `light-dark-derivation`, `0.125`, `2-16`, "lands on the same red" in tracked `.ts`/`.md` |

### Probe dispositions

- BP-1, MINIMIZE_THEN_PROMOTE (`#d967a8` in CASES): HOLDS. The extracted test, not only the probe,
  was shown to detect the defect (K-2) and pass with the repair (K-3). Limit: it pins one palette at
  the rounding edge; a later rule change could move it off the edge and leave it passing
  trivially. The blind's other three single-seed failures (`#b18cec #2fe32e #b97fae`) were not
  promoted; K-5 shows they pass at head.
- BP-2, RETAIN_IN_SPECIALIZED_SUITE (the sweep): UNRESOLVED as recorded, not blocking. I replayed it
  (K-4), but no specialized suite exists in the repository, and the record names no destination,
  budget or seed policy. It stays PROPOSED. The decision does not depend on it (K-4 is the
  evidence for B-F-1). Recommend recording it as PROPOSED with a destination, or as a batched
  follow-up, so `followups` is not empty while work remains. Round 1's P-1 was the same sweep and
  the same unextracted state (FOLLOW_UP R-F1).

### Record consistency (for the front office, not product findings)

- B-F-3: the blind pass recorded origin PRE_EXISTING and disposition FOLLOW_UP; the record makes it
  REQUIRED_REPAIR via RU-1. The ruling is explicit and its basis is a repository-level rule; it
  holds.
- B-F-1 `basis` lists EXECUTED only; the blind testimony gives EXECUTED and SOURCE. Minor.
- `followups` is empty, but BP-2 and the three source-comment items above (B-F-2, B-F-4, B-F-3
  hypothesis) are open follow-up work.
- The header `write_directory` for the checker still reads `evidence/blind/`.

## Incomplete checks and their relevance

- `install.sh` end to end and the CLI from an installed copy: not run (writes outside the case).
  Not decision-critical for the delta, which does not touch `install.sh`.
- The design-book engine change against the npm 0.26.0 release: not compared (needs a fetch).
  Excluded by scope beyond integration.
- Mutation calibration of the derived-moods suite beyond K-2: not run. Not required by the decision.
- B-F-3 under the blind's load level: not reproduced. The source repair is checked; residual risk
  is the hypothesis above.

## Decision

- Draft decision in the record: CHANGES_REQUIRED, path to READY B-F-1..B-F-4, with a note proposing
  READY.
- READY is not supported: B-F-2 and B-F-4 fail, and C-F-1 is a confirmed violation of acceptance
  criterion 4. No finding is CRITICAL or HIGH.
- Recommendation: **CHANGES_REQUIRED**. Revise and recheck. Path to READY, all DOC / PR_BODY, scope
  THIS_CHANGE:
  1. **B-F-4**: replace the exception in docs Table 2 ("Status hues stay off actions") and in the
     root CHANGELOG with wording that matches `hueSource`, for example: "secondary and accent take
     the palette's next colors that are not red, yellow or green; a role left without one is a tint
     of the primary, so with a red, yellow or green primary it carries that hue." Check the new text
     against `#dc2626 #2563eb` and `#16a34a #ca8a04` in both moods. Put the same wording in the PR
     body.
  2. **B-F-2**: in the root CHANGELOG (L25-26) and the PR body (Commits item 3), say the sankey's
     seed-to-light flows follow recorded origins and its light-to-dark flows pair role groups.
  3. **C-F-1**: rewrite the PR body for head `2fd268c`: current commit list (no `4856aac`,
     `7bf7906`, `9dbfc4d`), the round-2 repairs (CLI test limits, edge-palette suite, the 0.01
     floor margin with its red and green commits), `bun test` 588 pass at `2fd268c`, and the round-2
     sweep (54 of 47,220 failing builds at `9dbfc4d`, 0 at `2fd268c`) in place of or beside the
     622-build round-1 result.
- Batched follow-ups (do not affect the decision): correct the `src/derived.ts` header comments at
  L22-23 and L32-33; the B-F-3 hypothesis about the remaining CLI-spawning tests; BP-2's
  destination; the skill CHANGELOG says "the next colors fill secondary then accent" where the skill
  itself says "next non-status colors".
- Valid only for head `2fd268c`, the artifacts listed below, and the examined scope.

## Artifacts

All in this directory. SHA-256 taken at the end of the check.

| File | SHA-256 |
| --- | --- |
| `bun-test-head.out` | e2a0d2a0e366255340a82e4e1de999e55fac044e7315dd546af80d0ace191a4b |
| `tsc-head.out` | 19eaf43821a7660ec323a87c8457bf74823beb296c39f5e01aa8a683aa50f061 |
| `derived-32dc0dd.out` | f2381bce60e9f4f7534ca6e8bb809e6a0cb07a9a492c08310694052ae503de72 |
| `derived-cda9a0e.out` | 4de7d2fb6d9092698fcbe7c8571336d92492f04f1bd861e5d9f4bd3ebcf22a28 |
| `sweep.ts` | 227559a16f41270434487df01c8b98a1462ac94a55f569fe850145fad2c27bf7 |
| `sweep-seed20261127-n400.out` | 613ed2281691ac942e98bfca63e597f8e96fd3dab795a6c3a704bb9e91edac0a |
| `sweep-seed7-n3000.out` | 33a4f9850de668cba228f336b9937290531ca28ef15d7425f38edd46014f4e81 |
| `sweep-seed1-n4000.out` | 9f965c0ee7939da9c3dd5a9c8e273a502eeb922f8bb200a73e3c761f0370741d |
| `sweep-seed2-n4000.out` | 29d44a370e28bf3b56666b1d88d179a85a665b09ad94b6f9d3acf160b5ea6acf |
| `sweep-seed3-n4000.out` | f7d025d3ac992a480c06282a209c3c734aaf5f09deb46f802c019e926a5a14f5 |
| `sweep-seed4-n4000.out` | e6079a5a30cdb5da931de60182b13f3f7dd24ca8ed3e575cdc1f7ddb4c1f5933 |
| `sweep-seed5-n4000.out` | 3fe21d22db97e0f06217706db25e20cc381475c3d7726939ba24a0defaa3109d |
| `sweep-control-aaa.out` | 724f81dfeafe21779a247ba4255aaf506f732fdf8d59ec7409aad16f1d02d987 |
| `single-seeds.out` | da9efc5073b55d73017ae1e86b69cd204531621d6e57b49549a81a4e5c58b2ce |
| `case1-cli.sh` / `case1-cli.out` | c979d93a...c0d1 / d38cf8008a3623348abca4a8a49794a52ce7b9bb288780dd908009366ceed0e5 |
| `listing1.sh` / `listing1.out` / `listing1.css` | 1b59ed1a1b21e10a267becc8db5f46c7a4a83648584342af16c59b0f09f53033 / b42377bffd74bb51f05d600418d32361339bcd37c3d69721ea5dab9fa3d3cda4 / 0ce3b9f89fd7c5e2405732d4247b2441fcb8c35e1aecb7a286c5b7b10bddfb4b |
| `freak-standards.out` | edf00a8d14fcd7cfe86a70790d19ae12d797176f89e74c5282789740f46181d7 |
| `bench-fit.out`, `bench-score.out`, `bench-sankey.out` | 848a240e...63f2, 12ba7f86...b0a8, 558220b7...ca7e |
| `regen-specimen.out`, `regen-scoreboard.out` | 6b8b8cc6...1343, 84d1bef3...83 |
| `legacy-dump.ts` / `legacy-head.txt` | 5c90c35ac0f9fbe525282afc08e736890336b99b5d5fad549bbc0f026a0fb3cb / a3be9d9cce8a38aeb1c4a7445f9b647a07ec328b89650728cfc55616cf79be9d |
| `hueless.sh` / `hueless.out` | d83c2676...a610a676 / 9fd1180686dc730cf20121f0d92c26463adaa7c09ed526c82e0f411adade26f9 |
| `statushue.ts` / `statushue.out` | 7dc684d33baa9288274ebad5f1bbc2913197dc7a25e9b587025e8031dd3d2c63 / c1e704092826e7b571d5c83a25f2ff24d8b7e42a649801ecc14f9fc5eba26953 |
| `pr-view.json` / `pr-body.md` | 111ca74f7686649537465aee5b264a32e5a8579cdbcf14f4fcdd23073de5192f / fa270008458b74704531899f8e6ddf371b9ff2e7d625c4bf8ebb887269f4c182 |
| `env.out` | e3f52fafa5cba5f66b2447d4ca5e76537a10af9a77dabd68677ae8ec480dc38b |

Full digests of every file: `shasum -a 256 *` in this directory. `tmpdir.txt` names the temp
directory used for the archive copies, which was deleted.
