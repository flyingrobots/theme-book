# Decision check: theme-book PR #30, round 4

Case `2026-11-27-theme-book-pr30-r4`. Phase: decision check. Plain voice. Written 2026-11-27, about
19:15-0800.

## Reviewer basis

- Basis: FRESH_AGENT. I had not seen this code, the PR or the earlier cases before this check. I did
  not write the target or its repairs.
- Read: the checker packet; round 3's `CASE_FILE.md` and `evidence/checker/DECISION_CHECK.md`; round 2's
  `CASE_FILE.md` (findings, rulings, probe triage); round 1's `CASE_FILE.md` (findings, probe triage);
  the delta `git diff f93fbde..e708bad` in full, with `e708bad`'s message; `6d6d101`, `ba83d61` and
  `e12e58c` in full; the file lists of every repair commit; `test/book-extension.test.ts` L105-275;
  `test/theme-book.test.ts` L215-240, L426-481, L526-548; `test/preset-rules-mutation.test.ts` L1-90;
  `vendor/README.md`; the PR body, PR comment list, issue #31 and meodai/design-book#5 (read-only `gh`).
- Not read: the vendored design-book internals (out of scope); round 2's blind pass in full.
- No draft decision for round 4 was supplied. I check C3-F-1's repair, recheck every earlier required
  finding at `e708bad`, check the PR body, and recommend a decision.

## Execution controls

macOS arm64, bun 1.4.5, run as the user. No sandbox and no network isolation. Network use: read-only
`gh` calls only. Subject `e708bade42e4ab54dc3f2ca99cc55c4eca61b9a5`; `git status --short` was empty
before and after. Probes wrote only into this directory and one `mktemp -d /tmp/bs-r4-red.*` tree
(removed afterwards). No repository was mutated: the red replay used `git archive`, not a worktree.
`install.sh` was run only by the repository's own test (into a temp prefix). Load average at start 3.75
(`env.out`).

Failed setup, kept in `failed-setup/`: my first Owl Coral run passed the seeds as one zsh word, so every
command exited 2 with `unknown option`. Not a result; rerun as `owl.sh` (K-4).

## Checks run

| ID | What | Command and oracle | Result | Artifacts |
| --- | --- | --- | --- | --- |
| K-1 | Local gate | `bun test`; `bun x tsc --noEmit` | 588 pass, 0 fail, 4325 expects, 24.8 s, exit 0; tsc exit 0 | `bun-test-head.out`, `tsc-head.out` |
| K-2 | Delta scope | `git diff --stat f93fbde e708bad`, and the same limited to `src scripts bin docs README.md CHANGELOG.md skills install.sh package.json` | one file, `test/book-extension.test.ts`, 2 lines; nothing else | (this report) |
| K-3 | Every spawn site in `test/` | `grep -rn spawn test/`, then a source read of each enclosing test | see C3-F-1 | (this report) |
| K-4 | Owl Coral | `owl.sh`: `theme` with the six seeds, `--mood corporate|freak`, `--standard wcag-aa|wcag-aaa|apca --hex --audit`, then `audit` on the AA file | corporate AA 36 passed / 6 advisory, exit 0; AAA 10 failed; APCA 7 failed. freak AA 36/6, exit 0; AAA 12 failed; APCA 13 failed. Standalone audit 36 passed, 6 advisory, exit 0, both. All six CSS files byte-identical to round 3's | `owl.sh`, `owl.out`, `owl-*` |
| K-5 | Benchmarks | `bun scripts/benchmark/{fit,score,sankey}.ts` | byte-identical to round 3 | `bench-*.out` |
| K-6 | Legacy moods | round 3's `legacy-dump.ts`, `ROOT` = this subject | byte-identical to round 3's `legacy-head.txt` | `legacy-dump.ts`, `legacy-head.txt` |
| K-7 | Hueless round trip | round 3's `hueless.sh`, re-pointed | every output file and the transcript byte-identical to round 3 | `hueless.*`, `grey.*` |
| K-8 | Status-hue fallback | round 3's `statushue.ts`, re-pointed | byte-identical to round 3 | `statushue.*` |
| K-9 | Random sweep subset | round 3's `sweep.ts`, re-pointed, seed 20261127, n 400 | 860 builds, 0 failures, 12 charts-advisory runs; same as round 3 | `sweep.ts`, `sweep-seed20261127-n400.out` |
| K-10 | Cited commit IDs | `git cat-file -e`, `git merge-base --is-ancestor <id> HEAD` | all 15 theme-book IDs are on the branch; `2d80b33` is a design-book commit (named in the vendored tarball) | (this report) |
| K-11 | Commit descriptions | `git show --stat` of each cited commit; full diffs of `ba83d61`, `6d6d101`, `e12e58c`, `e708bad`; non-comment lines of `2fd268c`/`f93fbde` code files | see C-F-1 below | (this report) |
| K-12 | "Run red at `4259148`" | `red-at-4259148.sh`: `4259148`'s tree with `test/derived-moods.test.ts` and `test/theme-book.test.ts` from `bf5dad7`, then from `7b451c9` | control (4259148's own tests) 127 pass, 0 fail. With `bf5dad7`'s tests: 17 fail. With `7b451c9`'s: 17 fail, including the first-colored-seed test `7b451c9` extended. All failures are `expect` assertions, not load or import errors | `red-at-4259148.sh`, `red-at-4259148.out` |
| K-13 | CLI test timings | `bun test test/book-extension.test.ts test/theme-book.test.ts --reporter=junit` | every CLI-spawning test 0.04-2.05 s; the seven-run test 2.05 s; install.sh matrix 0.94 s | `junit-cli.xml`, `bun-test-cli-files.out` |
| K-14 | PR body | `gh pr view 30 --json title,headRefOid,state,isDraft,body,...`; diff with round 3's copy | head `e708bad`, open, draft. Changed lines: item 4's last sentence, item 5, the `bun test` line | `pr-view.json`, `pr-body.md`, `pr-comments.txt` |

## Per-ID results

### Round 3

**C3-F-1 (LOW): a CLI-spawning test missed, an `sh` test labelled as spawning the CLI. HOLDS (repaired).**

Every spawn in `test/`, by source (K-3):

| Site | Spawns | Limit | Label |
| --- | --- | --- | --- |
| `theme-book.test.ts` L220-240, unknown flags and `eval -` | CLI twice | 30 s | "spawns the CLI twice; ..." |
| `theme-book.test.ts` L426-481, install.sh matrix | install.sh 4 times, the installed CLI once | 120 s | "runs install.sh four times; ..." |
| `theme-book.test.ts` L538-547, two derived-audit tests | CLI 2 and 3 times (build, audit) | 30 s each | none |
| `book-extension.test.ts` L113-121 | CLI twice | 30 s | "spawns the CLI twice" |
| L123-129 | CLI twice | 30 s | "spawns the CLI" |
| L131-138, recipe replayed in `sh` | `sh -c printf` only | default 5 s | none (removed by `e708bad`) |
| L197-201, L203-210 | CLI once | 30 s | "spawns the CLI" |
| L220-232, `test.each`, three cases | CLI once per case | 30 s (added by `e708bad`) | "spawns the CLI" |
| L234-250, `--book-sha256` | CLI 7 times | 30 s (from `main`, `e872a51`) | "seven CLI runs" |
| L252-263, recipe replay | CLI 3 times (one through `sh`) | 30 s (from `main`) | "three CLI runs" |
| L265-275 | CLI once | 30 s | "spawns the CLI" |
| `preset-rules-mutation.test.ts` L38 | `bun -e` (not the CLI), at module load | 60 s | none |

So every test that spawns the CLI or install.sh has an explicit limit, and each `// spawns the CLI`
label sits on a test that does. Round 3's acceptance check is met. `bun test` passes (K-1).

Adequacy: measured at load 4-5, the slowest CLI test takes 2.05 s for seven runs (K-13), about 15
times under its limit. Round 2 reported cold starts of 1.6-5.6 s at load 15-18 (REPORTED, not
reproduced). At 5.6 s a run, the seven-run test would need about 39 s, over its 30 s. That limit
comes from `main` (`e872a51`), not this PR, and no run has been seen failing. Informational; no
finding.

The PR body's item 5 now reads "`6d6d101` and `e708bad` timeouts for the remaining CLI-spawning tests
(`6d6d101`'s message says five such tests; four start the CLI, and `e708bad` moves the fifth limit to
the `test.each` that does)". `6d6d101`'s diff adds five limits (L129, L138, L201, L210, L275); L138 is
the `sh` test; `e708bad` removes it and adds the `test.each` limit. True.

Proposed erratum (repeated from round 3, for the front office): round 2's B-F-3 note "closed by
6d6d101" should read "partly closed by 6d6d101, completed by e708bad".

### Round 2

Code, scripts, docs and the skill are unchanged since `f93fbde` (K-2), and `src/` code is unchanged
since `2fd268c` apart from header comments (round 3 K-2; `f93fbde`'s `src/derived.ts` change has no
non-comment line, K-11).

- **B-F-1 (MODERATE), floors lost in OKLCH output: HOLDS.** K-1 passes, including the `#d967a8` case;
  K-9 finds no failure; K-4 output unchanged.
- **B-F-2 (LOW), sankey wording: HOLDS.** Text unchanged since round 3's HOLDS; `2fd268c`'s
  `sankey.ts` change is to its header comment only; K-5 identical.
- **B-F-3 (LOW), `--book` test timeout: HOLDS**, now for every CLI-spawning test (C3-F-1).
- **B-F-4 (LOW), secondary/accent status hue: HOLDS.** Text unchanged; K-8 byte-identical to the
  output round 3 assessed.
- **C-F-1 (LOW), PR body: HOLDS.** See the PR body section below.

### Round 1 required repairs

| ID | Result | Evidence |
| --- | --- | --- |
| F-1 exact floors | HOLDS | K-1, K-9 |
| F-2 build and standalone audit agree; `--charts-advisory` | HOLDS | K-4, K-7 |
| F-3 hued chart bars clear 3:1 | HOLDS | K-9 (charts required except the 12 hueless runs); K-1 |
| F-4 first colored seed is primary | HOLDS | K-1 |
| F-5 Table 3 from `fit.ts` | HOLDS | K-5 |
| F-6 sankey links are recorded origins | HOLDS | as B-F-2 |
| F-8 ignored options; AAA 10 / APCA 7 | HOLDS | K-4 |
| F-10 skill seed roles | HOLDS by source | skill unchanged since round 3 (K-2) |
| F-11 freak "same in both modes" qualified | HOLDS by source | doc unchanged since round 3 |
| F-12 stale references | HOLDS by source | the delta touches no doc or source |

## PR body, claim by claim

- Summary table and rules: unchanged since round 3, which checked them. Benchmark figures (1.4-16.4° in
  six of seven, 0.080, 0.081, 0.124, 0.319) reproduce (K-5). The secondary/accent sentence matches K-8.
- Item 1: `7a41cc1` adds `vendor/design-book-0.26.0+main.2d80b33.tgz` and its README; `e16f7c8` is a
  merge of `origin/main`. meodai/design-book#5 exists and asks whether a release is planned. True.
- Item 2: `57304c7` is test-only red for an earlier design (round 1 record). Not re-executed.
- Item 3: `4259148` contents, unchanged claim; consistent with the file history.
- Item 4: `bf5dad7`, `4315ecb`, `7b451c9` touch what is said (K-11). `ba83d61` adds limits to three
  tests (one in book-extension, the CLI test and the install.sh test in theme-book); `e12e58c` adds 14
  palettes × 2 moods. Both change only `test/`. "The new tests in `bf5dad7` and `7b451c9` were run red at
  `4259148` before the fixes": corroborated by K-12 (17 assertion failures against `4259148`'s source,
  control green). That shows the tests are red there; when they were first run is REPORTED. "Each shares
  a commit with its fix": `bf5dad7` and `7b451c9` both change `src/` and `test/`. True.
- Item 5: `32dc0dd` is test-only (2 lines); `cda9a0e` changes `src/derived.ts` and regenerated
  artifacts; `2fd268c` and `f93fbde` change docs and comments only; `6d6d101`/`e708bad` as under C3-F-1.
  True.
- Trailers: every commit from `bf5dad7` to `e708bad` carries `Agent-Session`/`Agent-Tool`; "trees are
  unchanged" was checked in round 3 (K-10 there). The user's approval of the force-push is REPORTED.
- Checks: 588 pass at `e708bad` and tsc clean reproduced (K-1). Owl Coral table and "36 passed, 6
  advisory border pairs" reproduced (K-4). Sweep numbers: 47,220 and 622 builds are REPORTED from rounds
  1-2; K-9 corroborates on a subset.
- Limits: issue #31 was created 02:53Z, after the PR (02:05Z), true; the PR is a draft, true; "`--standard
  wcag-aaa` or `apca` audits but does not change the colors" matches K-4. "Round 2's repair followed the
  loop" was checked in round 3.
- All 15 theme-book commit IDs cited are on the branch (K-10).

No PR body claim fails.

## Probe dispositions

- BP-1 / P-2 / P-6 / P-9 / P-11 (promoted tests): present and passing (K-1).
- BP-2 / P-1 (sweep, RETAIN_IN_SPECIALIZED_SUITE): still not a suite in the repository; remains
  PROPOSED, replayed here on a subset. Not decision-critical: no code change since round 2's full run.
- New probes in this round (`owl.sh`, `red-at-4259148.sh`): ARCHIVE. Neither needs to enter the suite.

## New findings

None. Informational only: the seven-run `--book-sha256` test's 30 s limit (from `main`) leaves under
5 s per run, below round 2's reported worst cold start; not observed failing.

## Incomplete checks and their relevance

- Full 47,220-build sweep: not rerun; code unchanged since round 2 ran it. Not decision-critical.
- Timeouts under high load (load 15+): not reproduced. The C3-F-1 repair is settled by source.
- `install.sh` beyond the repository's own test: not run. Untouched by the delta.

## Decision

- Draft decision: none supplied.
- C3-F-1 HOLDS (repaired at `e708bad` and in the PR body). B-F-1 to B-F-4 and C-F-1 HOLD. Round 1's
  F-1 to F-6, F-8, F-10, F-11, F-12 HOLD. Gate: `bun test` 588 pass, tsc clean. Every PR body claim
  checked is true or REPORTED as such. No new finding. No CRITICAL or HIGH finding open.
- Recommendation: **READY**. Issue as READY at `e708bade42e4ab54dc3f2ca99cc55c4eca61b9a5`. Valid only
  for that head, the artifacts below and the examined scope; merging still needs the maintainer's
  authorization.

## Artifacts

All in this directory; digests in `SHA256SUMS.txt` (`shasum -a 256`).
