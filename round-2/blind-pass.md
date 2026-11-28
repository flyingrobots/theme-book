# Blind pass: theme-book PR #30, round 2

Case `2026-11-27-theme-book-pr30-r2`. Phase: fresh blind code pass, one agent doing the Holmes brief
(what does the evidence establish?) and the Moriarty brief (falsification). Plain voice. Written
2026-11-27T18:47-0800.

## Basis and separation

- Candidate: `~/.local/state/baker-street/cases/2026-11-27-theme-book-pr30-r2/subject`,
  detached at `9dbfc4dffa826490c86ab6a800374b4842056b4f`. `git status --short` was empty before
  and after my work. Base `9eed99b79485fe7964c1d855d4c9f488d07b7170`.
- Read: both packets (`holmes-v2.md`, `moriarty-v2.md`; shared sections are byte-identical, lines
  1-537), the subject's `AGENTS.md`, the full diff `9eed99b..9dbfc4d` for `src/`, `test/`,
  `package.json`, `bun.lock`, `install.sh`, `README.md`, `CHANGELOG.md`, `skills/theme-book/`,
  `vendor/README.md`, all of `src/derived.ts`, `docs/topics/derived-moods/README.md`,
  `test/derived-moods.test.ts`, `scripts/benchmark/sankey.ts` and `score.ts`, and parts of
  `src/audit.ts`, `src/books.ts`, `scripts/specimen.ts`.
- PR body: read with `gh pr view 30 --json body,headRefOid,title` (saved as `pr-body.md`;
  head there is `9dbfc4d`). I did not read comments or reviews. **Exposure disclosed:** the body
  summarises the round-1 repairs (exact-ratio floors, chart floors, first colored seed). So I knew,
  before writing B-F-1, that round 1 had found a floor-rounding defect. I did not open the prior
  case or any other file under the Baker Street state directory.
- I did not know this code before the case.
- Not given: the stateful code review reference. The code in scope has no polling, retries or
  generated recovery commands; the nearest thing is the extension rules-version check, which I
  probed directly (A-8). I note the omission as a setup limit of small relevance.

## Execution controls

macOS, bun 1.4.5, run as the user. No sandbox, no network isolation. The only network call was the
read-only `gh pr view` above. Probes wrote only under this directory. Scripts that write into
`docs/` (`scripts/specimen.ts`, `scripts/benchmark/scoreboard.ts`) were run in a `git archive`
copy (`copy/`, with `node_modules` symlinked to the subject's). A base-source copy (`base-copy/`,
`git archive 9eed99b`, same symlinked `node_modules`) was used for the legacy comparison. Host load
averages were 9 to 15 throughout (other agents were running), which matters for A-1. `install.sh`
was not run (it writes into `~/.theme-book` and runs `bun install`, which can reach the network).

## Attempts

| ID | Hypothesis / contract | Method and oracle | Outcome | Artifacts |
| --- | --- | --- | --- | --- |
| B-A-1 | The local gate passes (`bun test`, `tsc`) | `bun test` twice in the subject; `bun test test/book-extension.test.ts` alone; `bun x tsc --noEmit` | Run 1: 297 pass, 1 fail (`the CLI builds with --book, and refuses a stale parent with exit 2`, timed out at 5000 ms). The file alone: 42 pass. Run 2: 298 pass, 0 fail. tsc exit 0. See B-F-3 | `bun-test.out`, `bun-test-book-ext.out`, `bun-test-run2.out`, `tsc.out`, `cli-timing.out` |
| B-A-2 | Docs Listing 1/2 is real output; standalone audit agrees; AAA fails 10 and APCA 7; `--generator` has no effect; non-shadcn preset exits 2 | `listing1.sh`: ran the listing; compared shown lines; `theme-book audit` on the saved file; reran with each standard, with `--generator poline`, and with `--preset semantic` | NOT_REPRODUCED (no defect). Every shown line matches; `36 passed, 0 failed, 0 unverified, 6 advisory` both from the build and from `audit`; AAA 10 failed, APCA 7 failed; poline output identical apart from the header comments; semantic exit 2 with the stated message. PR body's freak row (AAA 12, APCA 13) also reproduces | `listing1.*`, `freak-standards.out` |
| B-A-3 | "corporate and freak themes pass WCAG AA in both modes" holds for palettes in general | `probe/sweep.ts`: LCG-seeded random palettes of 1-7 hex seeds plus 30 fixed edge palettes, both moods, default build (OKLCH serialization, as the CLI emits by default). Oracle: the project's own `evaluateAudit` result inside `buildThemeBook` (any `required && !pass` pair, or status not `pass`). Control: the same sweep at `STD=wcag-aaa` flags 100 of 100 builds, so the filter detects failures | CONFIRMED_FINDING B-F-1. 47,220 builds over 23,610 palettes (seeds 20261127 n=400, 7 n=3000, 1-5 n=4000 each): 54 builds fail, 29 distinct palettes (about 0.12%). No exceptions thrown | `sweep*.out`, `sweep-control-aaa.out`, `probe/sweep.ts` |
| B-A-4 | The failures are a serialization-rounding defect, not a rule gap | `probe/rounding.ts`: rebuild each failing palette with the default output and with `hexOutput: true`; print the failing pairs' exact ratio | CONFIRMED_FINDING B-F-1. All 54 failing builds pass with hex output. Every failing pair is 2.9993-2.99999 against 3, or 4.4990-4.49995 against 4.5. Roles: `sidebar-ring`/`sidebar` (most), `primary-foreground`/`primary`, `muted-foreground`/`muted`, `secondary-foreground`/`secondary` | `rounding.out`, `case1.out` |
| B-A-5 | The CLI user sees it | `case1-cli.sh`, `single-d967a8-*.err`: `theme --seed "#d967a8" --mood corporate --audit` (and freak); palette `#b09551 #a58f24 #59193b` in default, `--hex`, `--native` | CONFIRMED_FINDING B-F-1. Default and `--native`: `audit=fail (wcag-aa)`, `35 passed, 1 failed`, exit 1, `sidebar-ring (#d664a5) on sidebar (#f6f0f3) — WCAG 3:1 (exact 2.9996)`. `--hex`: pass, exit 0. Standalone `audit` agrees with each file | `case1-cli.out`, `case1-cli*.css/.err`, `single-d967a8-*.err` |
| B-A-6 | Legacy moods and presets behave as before (acceptance criterion 2), separating source changes from the engine change | `probe/legacy-dump.ts` against `base-copy/` (base source) and the subject (head source), both on the head's vendored design-book: 5 legacy moods x 3 presets x 3 generators over 65 palettes (oklch) / 8 palettes (poline, rampensau), all tokens both modes as hex plus audit counts, plus every shadcn `presetRulesLines` line not for freak/corporate | NOT_REPRODUCED (no difference). 2,610 lines, byte-identical. Limit: the design-book version change itself (npm 0.26.0 to the vendored main build) was not compared; that needs the npm tarball, which I did not fetch | `legacy-base.txt`, `legacy-head.txt` |
| B-A-7 | No audit regression for callers that do not opt into `chartsAdvisory`; the hueless round trip works as documented | Source: `src/audit.ts` L1001-1002 reduces to the old expression when `chartsAdvisory` is false. Execution: `hueless.sh` on `#ffffff #000000` corporate; `audit` without and with `--charts-advisory`; JSON field | NOT_REPRODUCED (no defect). Header reads `audit=pass (wcag-aa, charts advisory)`; plain `audit` fails 4 chart pairs (exit 1); `--charts-advisory` gives the build's exact counts (26/0/0/16, exit 0); JSON `chartsAdvisory` true/false as expected. A low-chroma grey (`#6b7280`) keeps charts required and passes | `hueless*.out`, `hueless*.json` |
| B-A-8 | Extension behaviour under the new moods matches README/SKILL; 1.0.0 pins are refused | `ext/`: README's `school` extension under editorial, corporate, freak; a `shadcn@1.0.0` pin; a light-only extension under editorial and corporate | NOT_REPRODUCED. `school` exits 2 under both derived moods with `"neutrals" names no scope to search`, as documented; stale pin exits 2 with the stale message; light-only change behaves alike in both families (dark sets its own value in each) | `ext/ext.out` |
| B-A-9 | Benchmark numbers in README, docs, CHANGELOG and PR body reproduce | Ran `scripts/benchmark/fit.ts`, `score.ts`, `sankey.ts` in the subject (they only print) | NOT_REPRODUCED. Table 3 matches cell for cell; Table 4 matches (0.080/0.066, 0.124/0.114, 0.151/0.175, 0.152/0.152, 0.319/0.324); leave-one-out 0.081; sankey block matches both README and docs | `bench-*.out` |
| B-A-10 | Committed generated files are the generators' output | Ran `scripts/specimen.ts` and `scripts/benchmark/scoreboard.ts` in `copy/`; `cmp` against the subject | NOT_REPRODUCED. `docs/specimen.svg`, `scoreboard.svg`, `scoreboard.html` byte-identical | `regen-*.out` |
| B-A-11 | The sankey and "every color records an origin" claims are true of the recorded origins | Source: `scripts/benchmark/sankey.ts` L46-49. Execution: `probe/origins.ts` prints `book.inspect(...).dependencies` for palette entries | CONFIRMED_FINDING B-F-2 | `origins.out` |
| B-A-12 | "secondary and accent never take a red, yellow or green palette color" | `probe/statushue.ts`: status-hued brands alone and with one other seed; classified with the project's own `statusHue()` | CONFIRMED_FINDING B-F-4 | `statushue.out` |
| B-A-13 | Vendored engine integration: lockfile pins the tarball; install stages it; AGPL boundary | `openssl dgst -sha512` of the tarball against `bun.lock`; tarball listing and `package.json`; `install.sh` L147-159 by source; root `package.json` licence | NOT_REPRODUCED. sha512 matches `bun.lock`; tarball holds `LICENSE` and `"license": "AGPL-3.0-only"`, version `0.26.0+main.2d80b33` (the installed `node_modules` copy too); `install.sh` copies `vendor/` before `bun install --frozen-lockfile`. theme-book is itself `AGPL-3.0-only`, so vendoring breaks no stated boundary. Tarball SHA-256 `ae2c7a352780aa11b3d68a0dc8ff75b4c61602c0f74e77aa53ea3ab757c4a26d` | (command output in session; values above) |
| B-A-14 | Other CLI surfaces with the new moods | `misc.sh`: `--format json/w3-tokens/svg`, `suggest --mood corporate/freak`, default preset, `--preset slide-deck`, `--native` then `audit` | NOT_REPRODUCED for defects. All exit 0 except slide-deck (exit 2, stated message). `audit` of a derived `--native` file reports `INCOMPLETE ... 0 passed, 20 unverified`, against `12 passed, 6 unverified` for editorial native: every derived token is a `var()` to a palette variable. Informational; native files were already partly unverifiable | `misc.out` |
| B-A-15 | `install.sh` run end to end | Not run (writes outside the write directory; may fetch) | NOT_ATTEMPTED | |
| B-A-16 | Mutation calibration of the derived-moods tests | Not run | NOT_ATTEMPTED | |

## Claims

| ID | Proposition (scoped) | Source | Assessment | Basis | Evidence |
| --- | --- | --- | --- | --- | --- |
| B-C-1 | corporate and freak builds pass WCAG AA in both modes | acceptance criterion 3; CHANGELOG ("contrast is a floor in each mode"); PR body | REFUTED as a general statement; SUPPORTED for the documented examples and about 99.9% of random palettes | EXECUTED | B-A-3, B-A-4, B-A-5 |
| B-C-2 | Docs Listing 2, the AAA/APCA counts and the PR body's freak counts are observed output | docs, PR body | SUPPORTED | EXECUTED | B-A-2 |
| B-C-3 | Tables 3 and 4, leave-one-out 0.081, and the sankey block are the scripts' output | docs, README, CHANGELOG, PR body | SUPPORTED | EXECUTED | B-A-9 |
| B-C-4 | The specimen and scoreboard files are generated, not hand-edited | README, docs | SUPPORTED | EXECUTED | B-A-10 |
| B-C-5 | Legacy moods' rules and outputs are unchanged by the source changes | CHANGELOG ("every other mood's rules are unchanged") | SUPPORTED for the sampled corpus on one engine build; the engine change was not compared | EXECUTED | B-A-6 |
| B-C-6 | Audits that do not opt in still require chart bars | acceptance criterion 6 | SUPPORTED | SOURCE, EXECUTED | B-A-7 |
| B-C-7 | `audit --charts-advisory` reproduces a hueless theme's verdict | CHANGELOG, docs Limits | SUPPORTED (one palette) | EXECUTED | B-A-7 |
| B-C-8 | An extension that refers to `neutrals` exits 2 under the derived moods; a 1.0.0 pin is refused | README, SKILL, CHANGELOG | SUPPORTED | EXECUTED | B-A-8 |
| B-C-9 | `--generator` has no effect on the derived moods | docs, SKILL, CHANGELOG | SUPPORTED (one palette, poline vs oklch) | EXECUTED | B-A-2 |
| B-C-10 | The sankey is "drawn from the records", and "every color records an origin" | README L141-143, docs L70-72 | REFUTED in part | SOURCE, EXECUTED | B-F-2 |
| B-C-11 | Secondary and accent never take a red, yellow or green palette color | docs Table 2, CHANGELOG, PR body | REFUTED when the brand is a status hue and no second non-status accent exists | EXECUTED | B-F-4 |
| B-C-12 | Vendored tarball is pinned by sha512 and staged by `install.sh` | vendor/README, CHANGELOG | SUPPORTED (pin by execution, staging by source) | EXECUTED, SOURCE | B-A-13 |
| B-C-13 | `bun test` passes | acceptance criterion 1, PR body | SUPPORTED with a load-dependent flake | EXECUTED | B-A-1, B-F-3 |

## Findings

### B-F-1: Floors are measured on hex, but the default output is audited as 4-decimal OKLCH, so some builds fail their own audit

- Status: CONFIRMED. Basis: EXECUTED, SOURCE.
- Mechanism: `src/derived.ts` sets every floor with `wcagRatioExactCss` on hex strings (L97
  `holdsText`, L232 muted text, L257-258 `markOn`/`fillOn`, L255 `inkFor`). `src/books.ts`
  L855-856 serialize each token as `resolved.oklch` unless `--hex`, and L858-860 audit that
  serialization. The round-trip through 4-decimal OKLCH can move a value that sits exactly on a
  floor to just under it. Example: `#a38945` on `#f6f0f2` measures 3.0000 as hex and 2.9995 as
  `oklch(0.6397 0.0928 88.71)` on `oklch(0.9603 0.0069 354.8)`.
- Evidence: `rounding.out` (54 of 54 failing builds pass with hex), `case1-cli.out`,
  `single-d967a8-*.err`.
- Impact: a user runs `theme-book theme --seed "#d967a8" --mood corporate --audit` (default
  format) → gets `audit=fail (wcag-aa)` and exit 1 → the generated theme does not meet the
  contract the mood states, and the user must notice and retry with `--hex` or another palette.
  Not silent: the audit reports it correctly, and the margin is under 0.001 of a ratio, so it is
  not a perceptible contrast loss.
- Severity: MODERATE. It violates acceptance criterion 3 and the CHANGELOG/PR claim that contrast
  is a floor in each mode, for the default output format; the effect is a failed build, not
  inaccessible output shipped under a pass.
- Prevalence: 29 of 23,610 random palettes (0.12%), 54 of 47,220 builds; 4 of them single-seed
  brand colors (`#b18cec`, `#2fe32e`, `#b97fae`, `#d967a8`). None of the documented examples.
  The PR body's 622-build sweep would expect under one failure at this rate, so it does not
  contradict the body's count; it does contradict the general claim.
- Origin: INTRODUCED (the derived floors are new). Intentionality: NO (the code and PR body state
  exact-ratio floors as the intent). Disclosure: UNDISCLOSED to CLI users and doc readers.
- Disposition: REQUIRED_REPAIR (CONFIRMED, violates a recorded acceptance criterion).
- Next check: a floor test that measures each candidate as the audit will serialize it (or the
  serialized OKLCH string), plus a regression that builds the four single-seed palettes above in
  default format and expects `audit.status === "pass"`.

### B-F-2: The sankey's light-to-dark flows are not recorded origins, and "every color records an origin" is false

- Status: CONFIRMED. Basis: SOURCE, EXECUTED.
- Evidence: `scripts/benchmark/sankey.ts` L46-49 adds a `light <group> → dark <group>` edge for
  every token unconditionally; only the seed→light edges come from `book.inspect`. `origins.out`:
  `palette.dark-page`, `dark-ink`, `dark-muted`, `dark-border`, `dark-on-primary` record
  `seeds.seed-5`, not a light entry; `palette.destructive-light` records none. So the diagram's
  `light surfaces → dark surfaces 4`, `light text → dark text 10` and `light lines → dark lines 5`
  are drawn by grouping, not from records. README L141 says "Every color records an origin (a seed,
  or for a dark accent its light version), and this diagram draws those records ... not by hand";
  docs L70-72 say the diagram "draws those records". `src/derived.ts` L30 and docs L68 correctly say
  "most colors".
- Impact: a reader of README or the docs takes the base ramp's dark side to be derived from its
  light side in the book, and the whole diagram to be record-backed → wrong model of the book's
  dependency graph (for example when writing an extension against `palette.dark-*`).
- Severity: LOW. Origin: INTRODUCED. Intentionality: UNKNOWN. Disclosure: UNDISCLOSED.
- Disposition: REQUIRED_REPAIR under acceptance criterion 4 (claims in README/docs true of the
  code), scope small: say the light→dark edges pair groups, and change README's "Every" to "Most".
  If the front office rules doc-precision misses of this size below the bar, FOLLOW_UP.

### B-F-3: `bun test` has a load-dependent timeout in the `--book` CLI test

- Status: CONFIRMED (observed once in two full runs). Basis: EXECUTED.
- Evidence: `bun-test.out` run 1: `(fail) the CLI builds with --book, and refuses a stale parent
  with exit 2 [5007.40ms] ^ this test timed out after 5000ms`, `Expected: 2 Received: null`.
  The test spawns the CLI twice under bun's default 5 s timeout; each spawn took 1.6-2.8 s (one at
  5.6 s) at load average about 14 (`cli-timing.out`), with no slowdown from base to head. File
  alone and run 2: all pass.
- Impact: under host load, the local gate and CI can go red without a code defect → a maintainer
  or agent reruns or chases a phantom.
- Severity: LOW. Origin: PRE_EXISTING (test and its two-spawn shape exist at base; timing shows no
  regression). Disclosure: DISCLOSED in the PR body ("one earlier run ... did not recur").
- Disposition: FOLLOW_UP (repository rules make a found flake ours to fix, in its own commit: give
  the CLI tests an explicit timeout).

### B-F-4: Secondary and accent do take a status hue when the brand is one

- Status: CONFIRMED. Basis: EXECUTED, SOURCE.
- Evidence: `src/derived.ts` L290 `hueSource = (i) => actions[i] ?? r.accents[0]` falls back to
  the primary. `statushue.out`, classified with the project's own `statusHue()`: `#dc2626` alone
  gives light accent `#ffc4bc` (red) and dark secondary/accent red; `#16a34a` gives accent
  `#b6e1bc` (green); `#ca8a04` gives dark secondary/accent yellow; `#dc2626 #2563eb` in freak gives
  a red accent. The test suite permits this (test L99-103 allow a status hue within 10° of the
  primary), so the behaviour is designed; the docs, CHANGELOG and PR body state the rule without
  the exception ("the primary may" covers primary only).
- Impact: an agent following the docs or SKILL promises a user with a red or green brand that no
  secondary or accent will read as error or success → the output contradicts that promise.
- Severity: LOW. Origin: INTRODUCED. Intentionality: YES for the code (test encodes it); the doc
  omission UNKNOWN. Disclosure: UNDISCLOSED to doc readers.
- Disposition: REQUIRED_REPAIR (DOC) under acceptance criterion 4, or FOLLOW_UP at the front
  office's judgement: add "unless the palette has no other non-status color, when they are tints
  of the primary".

## Not examined, and limits

- The design-book engine change (npm 0.26.0 to the vendored main build) against legacy outputs: not
  compared (needs the npm tarball; no fetch). B-A-6 isolates theme-book's source only.
- `install.sh` end to end, and the CLI from an installed copy: not run.
- Mutation calibration of `test/derived-moods.test.ts`: not run.
- Aesthetic outcomes (excluded). One structural oddity I did not pursue: when a palette has no
  dark base seed, `readPalette` takes the darkest seed overall as `deep`
  (`src/derived.ts` L167), so a dark non-primary accent with OKLCH L in (0.25, 0.32] would become
  the dark page itself. It audited clean in the sweep; it is a taste question.
- The sweep is random sRGB hex; it says nothing about palettes outside that distribution, and
  "no failure" for other roles is bounded by 47,220 builds.
- `sweep.out` (first run) was produced before I added the optional `STD` override to
  `probe/sweep.ts`; the override defaults to unset, so the hashed script reproduces it.

## Evidence manifest

All paths are relative to this directory. SHA-256 values were taken at 2026-11-27T18:46-0800.

| File | SHA-256 |
| --- | --- |
| `bun-test.out` | c548b752fa936b06f916a3e8dea2d33d7dc01eb406fda687f883ff6da828d1a9 |
| `bun-test-run2.out` | bf89b6516b58533d2031c64b84b7cd4b3d3d5288652e98d52d0255e1cb906647 |
| `bun-test-book-ext.out` | f02caf3e059723cf4413f8172b23bf500a51215f62a570f0d675da4a8962e302 |
| `tsc.out` | 28d3b9e880a77975493dc7e359144c0295a4f694cfe0af4f928c22307bc5c320 |
| `probe/sweep.ts` | 227559a16f41270434487df01c8b98a1462ac94a55f569fe850145fad2c27bf7 |
| `probe/rounding.ts` | 80e0ce189e91cd8606a8cd0a1c76a88f8e12b5d7af0496648b979333861c9e30 |
| `rounding.out` | 28e0230e00887e43dba7a3733706293d4f0748534964e2125062d11dfd34461f |
| `case1-cli.sh` / `case1-cli.out` | 62db55b2...c5c320 / 91eb96d77fd510ed1c5eeb34bd3791e41d24dca283da575c067a19b64edcba73 |
| `sweep-seed1..5-n4000.out`, `sweep-seed7-n3000.out`, `sweep.out`, `sweep-control-aaa.out` | see `shasum -a 256` in this directory |
| `probe/legacy-dump.ts` | 5c90c35ac0f9fbe525282afc08e736890336b99b5d5fad549bbc0f026a0fb3cb |
| `probe/origins.ts` / `origins.out` | a30b1256...8324ac / c2250b448ade72a6026e4522926c24564b15fa265282ccdd2b522e3dbe9620dc |
| `probe/statushue.ts` / `statushue.out` | 1d29ff45...c23b / 26d7d343fa2e59ccd9d9ac4d613ce18d4313ffdf1b69bcb9e7fd4467482c9b13 |
| `bench-fit.out`, `bench-score.out`, `bench-sankey.out` | 848a240e...e302, 12ba7f86...a8b0a8, 558220b7...ca7e |
| `listing1.sh`, `hueless.sh`, `misc.sh` | 49699919...aafb5, d86f97fb...a23b, 7f5d5353...9d7c |
| `pr-body.md` | PR title, head OID and body only, fetched 2026-11-27 |

Commands were run with working directory the subject root unless the script says otherwise; every
probe script names its absolute paths. Exit statuses are in the `.out` files.
