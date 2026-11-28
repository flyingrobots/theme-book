# Moriarty testimony: case 2026-11-27-theme-book-pr30-r1, initial inquiry

Role: Moriarty (falsification and probes). Plain voice. Fresh agent context. I did not read
`evidence/holmes` or `evidence/watson`. I knew nothing about this subject before the case beyond the
packet and the workspace instructions (AGENTS.md, global CLAUDE.md).

## Execution and isolation basis

- Subject: `~/.local/state/baker-street/cases/2026-11-27-theme-book-pr30-r1/subject`,
  HEAD `4259148402f510aed7c5d5a5239fbe4ff2cc4369`, clean before and after (`git diff --quiet` held
  after the regeneration probes, which I ran in a temp copy).
- Base comparison tree: `git archive 9eed99b` extracted to `$TMPDIR/moriarty-base`, with the subject's
  `node_modules` symlinked entry by entry except `design-book`, which I copied from the local bun cache
  (`~/.bun/install/cache/design-book@0.26.0@@@1`, version `0.26.0`). No network was used.
- Mutation tree: `git archive HEAD` extracted to `$TMPDIR/moriarty-exact`, `node_modules` symlinked
  to the subject's, `src/derived.ts` patched (patch saved as `probes/exact-ratio.patch`).
- Regeneration tree: `git archive HEAD` to `$TMPDIR/moriarty-head` (the scoreboard script writes into
  `docs/`, so I did not run it in the subject).
- Runtime: macOS (Darwin 25.6.0), bun 1.4.5, TypeScript 5.9.3. No sandbox: probes ran as the user
  without network isolation. The probes are my own small scripts that import the subject's modules and
  print to stdout; they write nothing outside my write directory and `$TMPDIR`. Time limits were the
  Bash tool's timeouts. No credentials were touched.
- Probes and outputs: `evidence/moriarty/probes/` (paths below are relative to `evidence/moriarty/`).
  Each probe is run from the subject worktree as `bun ../evidence/moriarty/probes/<name>.ts`, unless
  noted.

## Gate checks executed

| Check | Command (cwd: subject) | Result | Artifact |
| --- | --- | --- | --- |
| Test suite | `bun test` | exit 0; 233 pass, 0 fail, 6 files | `bun-test.out`, `bun-test.exit` |
| Typecheck | `bun x --no-install tsc --noEmit` | exit 0, no output (tsc 5.9.3 present) | `probes/tsc.out` |

## Attempts

### M-A-1: corpus of palettes through corporate and freak (EXECUTED)

- Hypothesis: some palettes produce a derived theme that fails a required WCAG AA pair, against the
  acceptance criterion "corporate and freak themes pass WCAG AA in both modes".
- Method: `probes/corpus.ts`: 11 hand-picked edge palettes plus 300 random palettes (LCG seed 12345,
  1-6 random sRGB hex seeds each), each built with `buildThemeBook({preset: "shadcn", mood, generator:
  "oklch"})` for both moods. Oracle: the project's own audit (`pair.required && !pair.pass`).
- Outcome: CONFIRMED_FINDING (M-F-1). 11 of 622 builds fail a required pair; 0 build errors. All 11
  failures are random palettes, several with one seed (`#29da7e`, `#be66e5`, `#abf88e`), in both moods.
  `probes/status-dist.ts` (same corpus, random part only): 589 pass, 11 fail, 0 unverified.
- Artifacts: `probes/corpus.ts`, `probes/corpus.out`, `probes/status-dist.ts`, `probes/status-dist.out`.

### M-A-2: mechanism of the M-A-1 failures, with a mutation control (EXECUTED)

- Hypothesis A (rejected): the OKLCH rounding in `put()` moves a passing color below its floor.
- Hypothesis B (confirmed): `src/derived.ts` checks its floors with `wcagRatio`, which returns the ratio
  rounded to two decimals, so it accepts exact ratios in [2.995, 3) and [4.495, 4.5); the audit uses the
  exact ratio.
- Method: `probes/rounding.ts` prints the failing pairs with the audit's exact ratio beside
  `wcagRatio(fgHex, bgHex)`. Then a mutation: in a fair copy, replace `wcagRatio` in `src/derived.ts`
  with an unrounded `wcagRatioExact` wrapper (`probes/exact-ratio.patch`) and rerun the M-A-1 corpus
  (`probes/corpus-exact.ts`, run from `$TMPDIR/moriarty-exact`).
- Evidence: `#29da7e` corporate, light `sidebar-ring` `#00a159` on `sidebar` `#eef3ef`: exact 2.9961,
  `wcagRatio` 3. `#041edd…` corporate, dark `primary-foreground` on `primary`: exact 4.4988,
  `wcagRatio` 4.5. Source: `repo:src/audit.ts#L143-L148@df2bf5c88f4a48f3eb770e4855e97adc337548fb`
  (`Number(wcagRatioExact(...).toFixed(2))`); uses at
  `repo:src/derived.ts#L92,L223,L245-L248,L318@da8395a0da4975b392bb842dba93c3623d07c0c3`.
- Outcome: CONFIRMED_FINDING (M-F-1). With exact ratios: 622 builds, 0 failures (`probes/corpus-exact.out`).
  The CLI reproduces the failure with and without `--hex` (`probes/green.css`, `probes/green.err`,
  `probes/green--hex.*`: exit 1, `25 passed, 1 failed`).
- Limits: the mutation is a calibration of the mechanism, not a proposed repair. It was checked on this
  corpus only.

### M-A-3: legacy moods unchanged (EXECUTED)

- Hypothesis: the vendored design-book build or the books.ts refactor changes output for the five
  existing moods.
- Method: `probes/legacy-dump.ts <root>` builds every combination of 3 presets × 5 legacy moods × 4
  standards (default, aa, aaa, apca) × 3 generators × 7 seed sets (1260 builds) and prints every
  resolved hex in both modes plus audit status and counts. Run against base (design-book 0.26.0) and
  head. Also rendered `theme --seed #2563eb --seed #c2410c --preset shadcn --mood vivid --audit` as css,
  json and w3-tokens with both trees' CLIs.
- Outcome: NOT_REPRODUCED. `probes/legacy.diff` is empty (1260 identical rows). Rendered output differs
  only in `designBookVersion` (`0.26.0` → `0.26.0+main.2d80b33`) and `rulesVersion` (`1.0.0` →
  `1.1.0`) (`probes/cli-legacy.*.diff`). w3-tokens identical.
- Limits: seven seed sets; `svg` format and `--book` extensions on legacy moods not compared.

### M-A-4: Listing 1 and Listing 2 of the derived-moods doc (EXECUTED)

- Method: ran Listing 1 verbatim with `./bin/theme-book`.
- Outcome: NOT_REPRODUCED (no defect). Header, the listed tokens, and `Contrast Audit [PASS] (wcag-aa):
  26 passed, 0 failed, 0 unverified, 16 advisory` match (`probes/listing1.css`, `probes/listing1.err`).

### M-A-5: generation audit against the standalone `theme-book audit` (EXECUTED)

- Hypothesis: a derived theme reported as passing at generation fails when re-audited with
  `theme-book audit` (the check AGENTS.md prescribes for theme output), because the CLI audit cannot
  opt into `chartsAdvisory`.
- Method: `probes/chart-gap.ts` lists chart pairs that fail at 3:1 in builds that pass; then generate
  `--seed "#2563eb" --preset shadcn --mood corporate --audit` and run `./bin/theme-book audit` on the
  output file.
- Evidence: generation exit 0, `[PASS] ... 26 passed, 0 failed ... 16 advisory`, and the CSS header
  reads `audit=pass (wcag-aa)`. Re-audit of the same file: exit 1, `[FAIL] (wcag-aa): 33 passed, 3
  failed`: light `chart-1` `#91b7ff` on `#f4f7fc` 1.88:1, light `chart-2` 2.98:1, dark `chart-5` 2.44:1
  (`probes/blue-corp.*`, `probes/blue-corp-reaudit.out`). The audit CLI shows `--fix`,
  `--strict-borders`, `--format`, no chart option; `chartsAdvisory` appears only at
  `repo:src/books.ts#L862` and `repo:src/audit.ts#L450,L990`.
- Chart failures at generation in `probes/chart-gap.out`: every probed palette with fewer than three
  accents (one seed, two seeds, `#facc15`, black and white) fails light `chart-1` at 1.80-1.88:1, and
  freak with three accents (`#7c3aed #db2777 #0891b2`) fails dark `chart-3..5` (2.91, 2.02, 1.37).
  The six-seed Owl Coral palette has no chart failure, which is why the PR body's "audit passes 36/36"
  holds for it (`probes/reaudit-listing1.out`).
- Outcome: CONFIRMED_FINDING (M-F-2, M-F-3).

### M-A-6: book extensions under the derived moods (EXECUTED)

- Method: the README and SKILL.md example extension (`school`, `rules.ref("neutrals")`, `extends
  shadcn@1.1.0`) with `--mood editorial`, `corporate`, `freak`.
- Outcome: CONFIRMED_FINDING (M-F-7). editorial exit 0; corporate and freak exit 2: `its rules failed
  to resolve: "neutrals" names no scope to search` (`probes/ext-*.err`). The derived book has none of
  the legacy scopes by design (`test/derived-moods.test.ts` asserts it).

### M-A-7: "the first seed is always primary" (EXECUTED)

- Method: `probes/primary-first.ts`, six two-seed palettes, both moods; reads `light.primary` and the
  dependency of `palette.primary-light`.
- Outcome: CONFIRMED_FINDING (M-F-4). `#0b1f3a` (navy, OKLCH L 0.239, C 0.058) first: primary is
  `#c07a00` from `seeds.seed-1` (an amber, in the yellow status range), and the navy becomes the dark
  page. `#8a8f98` first: primary from `seeds.seed-1`. `#292c2f` first: primary from `seeds.seed-1`.
  `#dc2626`, `#1e1b4b` (L 0.257) and `#fde68a` first: primary from `seeds.seed-0`. The repository's own
  "Corporate" specimen lists `#ffffff` first and its blue fifth
  (`repo:scripts/specimen.ts#L220`). Source: primary is `r.accents[0]`, where `isAccent` requires
  C ≥ 0.04 and 0.25 < L < 0.93 (`repo:src/derived.ts#L87-L90,L260`).

### M-A-8: explicit `--standard` on derived moods (EXECUTED)

- Method: `--seed "#2563eb" --preset shadcn --mood corporate|freak --standard wcag-aaa|apca --audit`;
  controls `high-contrast --standard wcag-aaa` and `vivid --standard apca`.
- Outcome: CONFIRMED_FINDING (M-F-5). corporate/freak AAA: exit 1, 10 failed; corporate APCA: 4
  failed; freak APCA: 6 failed. Controls: exit 0, 36 passed (`probes/std-*.err`). The derived rules
  never read the standard: `derivedShadcnRules` takes no standard argument and its floors are fixed at
  3 and 4.5 (`repo:src/derived.ts#L168-L174@da8395a0da4975b392bb842dba93c3623d07c0c3`, floors at L92, L223,
  L248).

### M-A-9: destructive rules (EXECUTED)

- Method: `probes/destructive.ts`, seven palettes including red brands and hueless palettes; measures
  OKLab distance between light primary and light destructive, and between dark destructive drawn at 60%
  over the dark page and light destructive.
- Outcome: NOT_REPRODUCED. Red brands: destructive ≥ 0.122 from primary; dark at 60% lands within
  0.004-0.007 of light's red. Non-red palettes land 0.124-0.135 away at 60%, which the Limits section
  discloses ("still deeper than light's").

### M-A-10: benchmark and generated documentation (EXECUTED)

- `bun scripts/benchmark/score.ts` (`probes/score.out`): 0.152/0.152, 0.151/0.175, 0.319/0.324,
  0.124/0.114, 0.080/0.066, leave-one-out 0.081. All match Table 4 and the README/CHANGELOG/PR body.
- `bun scripts/benchmark/sankey.ts` output equals both Mermaid blocks apart from the fences.
- `scripts/benchmark/scoreboard.ts` and `scripts/specimen.ts`, run in `$TMPDIR/moriarty-head`:
  `scoreboard.svg`, `scoreboard.html` and `docs/specimen.svg` are byte-identical to the committed files.
- Recipe replay: the header command of a freak build, rerun, gives a byte-identical file
  (`probes/replay-*.css`).
- Outcome: NOT_REPRODUCED for these, with one qualification on leave-one-out (M-F-9).

### M-A-11: docs Table 3 (EXECUTED)

- Hypothesis: Table 3's fits come from the repository's benchmark data.
- Method: no script in `scripts/benchmark/` computes slopes, R², lifts or chroma factors (searched
  `scripts/` for slope/R²). I recomputed from `FAMOUS_THEMES` by ordinary least squares of dark L on
  light L, with two readings of "accents": primary plus accents (`probes/table3.ts`) and accents only
  (`probes/table3-accents-only.ts`); chroma factor as mean of ratios and as ratio of means.
- Evidence (doc value → recomputed, both methods):

  | Theme | Cell | Doc | Primary + accents | Accents only |
  | --- | --- | --- | --- | --- |
  | Gruvbox | chroma × | 1.25 | 1.07 / 1.08 | 1.18 / 1.16 |
  | Tokyo | chroma × | 0.99 | 0.92 / 0.83 | 0.96 / 0.85 |
  | One | slope, R² | 0.60, 0.29 | 0.57, 0.24 | 0.57, 0.24 |
  | One | chroma × | 0.78 | 0.73 | 0.75 |
  | GitHub | slope | −0.17 | +0.23 | −0.37 |

  Solarized, Gruvbox (slope/offset), Catppuccin, Tokyo (slope, R², lift) and Rosé Pine slopes match
  within 0.02 under one method or the other.
- Outcome: CONFIRMED_FINDING (M-F-6) for the narrow claim "Table 3 does not reproduce from the
  repository under these two methods, and no script generates it". The author may have used another
  method or earlier data; that is UNKNOWN.

### M-A-12: "within 2-16° in six of the seven" (EXECUTED)

- Method: `probes/inkhue.ts`, hue gap between each light ink and dark page.
- Outcome: gaps 2.1, 16.4, 10.2, 4.6, 1.4, 4.3; Gruvbox's dark page is achromatic (no hue). The claim
  holds in substance (six themes, all within about 16°); the stated range is loose (1.4 and 16.4).
  Recorded under M-F-8 as INFORMATIONAL.

### M-A-13: vendored tarball identity (EXECUTED, partial)

- `bun.lock` sha512 equals `openssl dgst -sha512` of
  `vendor/design-book-0.26.0+main.2d80b33.tgz` (SHA-256
  `ae2c7a352780aa11b3d68a0dc8ff75b4c61602c0f74e77aa53ea3ab757c4a26d`). The tarball's `package.json` says
  `0.26.0+main.2d80b33`, `AGPL-3.0-only`, and it ships `package/LICENSE`. theme-book is itself
  `AGPL-3.0-only`, so vendoring does not cross the AGPL boundary in AGENTS.md.
- Outcome: NOT_REPRODUCED (no defect). Whether the tarball is an unmodified build of upstream
  `2d80b33` is NOT_ATTEMPTED (needs network and an upstream build).

### M-A-14: `install.sh` with the vendored dependency (NOT_ATTEMPTED)

- Not run: it writes `~/.theme-book` and `~/.local/bin` by default and runs `bun install`, which could
  reach the network. Source only: `vendor/` is copied into the stage (line 155) before `bun install
  --production --frozen-lockfile` (line 159), and the lockfile's `./vendor/...` path is relative to the
  stage, so the order is right. A run with `THEME_BOOK_HOME`/`BIN_DIR` under `$TMPDIR` is the next check.

## Findings

### M-F-1: derived-mood contrast floors use a rounded ratio; about 2% of palettes fail their own audit

- Related: acceptance criterion "corporate and freak themes pass WCAG AA in both modes"; docs Table 2
  "Contrast is a floor in each mode"; README "auditing contrast at full floating-point precision".
- Status: CONFIRMED. Basis: SOURCE, EXECUTED (M-A-1, M-A-2, mutation control).
- Evidence: `repo:src/audit.ts#L143-L148@df2bf5c88f4a48f3eb770e4855e97adc337548fb`;
  `repo:src/derived.ts#L32,L92,L223,L245-L248,L318@da8395a0da4975b392bb842dba93c3623d07c0c3`;
  `probes/corpus.out`, `probes/rounding.out`, `probes/exact-ratio.patch`, `probes/corpus-exact.out`.
- Impact: a palette whose chosen color lands at an exact ratio within 0.005 below a floor → a CLI user
  or agent gets a theme whose `--audit` fails (exit 1), usually on `ring`/`sidebar-ring` against the
  sidebar or `primary-foreground` on `primary` → the documented guarantee does not hold, and the user
  has no flag to fix it. The failure is loud, not silent.
- Severity: MODERATE (bounded impairment of the main intended use; 11 of 622 random builds, including
  single-seed palettes).
- Prevalence: 11/622 builds in this corpus (1.8%); random palettes, not a sample of real brands.
- Origin: INTRODUCED. Intentionality: NO (the code intends a floor). Disclosure: UNDISCLOSED.
- Disposition: REQUIRED_REPAIR (violates a recorded acceptance criterion).
- Next check: rerun `probes/corpus.ts` after a repair; promote a minimal case such as `["#29da7e"]`
  corporate.

### M-F-2: `audit=pass` at generation, FAIL from `theme-book audit` on the same file

- Related: acceptance "corporate and freak themes pass WCAG AA in both modes (charts advisory, as
  documented)"; AGENTS.md "also check a real theme: `theme-book audit path/to/tokens.css`"; docs Limits
  "Chart bars are advisory in the audit for these moods".
- Status: CONFIRMED. Basis: SOURCE, EXECUTED (M-A-5).
- Evidence: `probes/blue-corp.css` (header `audit=pass (wcag-aa)`), `probes/blue-corp.err`,
  `probes/blue-corp-reaudit.out`, `probes/chart-gap.out`; `repo:src/books.ts#L862`,
  `repo:src/audit.ts#L990`; no CLI flag in `repo:src/cli.ts@2e615987e44dc64201456040fb2a28509a0598e4`.
- Impact: a user or agent re-audits a generated derived theme with one or two seeds, as AGENTS.md and
  the skill direct → exit 1 with chart failures → they either distrust a theme labelled `audit=pass` or
  cannot gate on the standalone audit at all. The file's own header and the standalone audit disagree.
- Severity: MODERATE. Prevalence: every probed palette with fewer than three accents, and some with
  three (freak).
- Origin: INTRODUCED. Intentionality: YES for advisory charts at generation; NO evidence that the
  standalone mismatch was intended. Disclosure: advisory charts DISCLOSED in docs and CHANGELOG; the
  standalone-audit mismatch UNDISCLOSED to CLI users and agents.
- Disposition: REQUIRED_REPAIR (a CLI user takes a wrong action on a contradictory label), or
  documentation plus a CLI opt-in; the choice belongs to the repair phase.

### M-F-3: the stated reason for advisory charts is not what the code does

- Status: CONFIRMED. Basis: SOURCE, EXECUTED.
- Evidence: comments at `repo:src/books.ts#L861` ("Derived moods use stock shadcn's chart colors: one
  set for both modes") and `repo:src/audit.ts#L446-L449`; docs Limits line 154 ("one shared lightness
  spread cannot clear 3:1 on both pages for every bar"). In the code, only hueless palettes share one
  chart set; otherwise dark charts are derived separately (`darkOf(hex, chartSet, () => true)`,
  `repo:src/derived.ts#L347`), with the floor switched off, and the light step charts for palettes with
  fewer than three accents start at OKLCH L 0.78 with no floor (`#L335-L337`), so light `chart-1` sits
  at 1.80-1.88:1 on the light page by construction.
- Impact: a maintainer or reader → accepts "cannot" as a constraint, when in this design the bars are
  set per mode and could be floored per mode → near-invisible light chart-1 bars ship as accepted.
- Severity: LOW. Origin: INTRODUCED. Intentionality: UNKNOWN. Disclosure: rationale DISCLOSED, but
  inaccurate.
- Disposition: FOLLOW_UP (correct the rationale or floor the bars).

### M-F-4: "the first seed is always primary" is false for dark, pale or low-chroma first seeds

- Related: docs line 12 and Table 2 line 96; `src/derived.ts` L24; SKILL.md L44 ("primary first");
  acceptance criterion on doc claims.
- Status: CONFIRMED. Basis: SOURCE, EXECUTED (M-A-7).
- Evidence: `probes/primary-first.out`; `repo:src/derived.ts#L87-L90,L260`; `repo:scripts/specimen.ts#L220`.
- Impact: a user with a deep navy brand (OKLCH L ≤ 0.25, common for corporate brands) passes it first,
  as the docs say → primary becomes the next accent (an amber in the probe), and the brand becomes the
  dark page → a theme with the wrong primary, with the audit passing.
- Severity: LOW. Prevalence: any first seed with C < 0.04, L ≤ 0.25 or L ≥ 0.93. Origin: INTRODUCED.
  Intentionality: UNKNOWN (the specimen relies on the actual behaviour, the docs say otherwise).
  Disclosure: UNDISCLOSED (docs say the near-grey rule, not the lightness bounds).
- Disposition: REQUIRED_REPAIR under the doc-truth acceptance criterion (fix the text or the code).

### M-F-5: `--standard wcag-aaa` and `--standard apca` are accepted for derived moods but never met

- Status: CONFIRMED. Basis: SOURCE, EXECUTED (M-A-8).
- Evidence: `probes/std-*.err`; `derivedShadcnRules` has no standard parameter; floors fixed at 3 and
  4.5. The fingerprint enumerates `corporate|freak × wcag-aaa|apca` configurations
  (`test/book-extension.test.ts`, 63 configs).
- Impact: an agent following SKILL.md, which lists `--standard wcag-aa|wcag-aaa|apca` for every mood,
  asks for APCA or AAA → every probed build fails (exit 1) with no message that the mood does not solve
  for that standard.
- Severity: LOW (loud failure, no silent wrongness). Origin: INTRODUCED. Intentionality: YES ("these
  moods target AA" in the PR body). Disclosure: DISCLOSED to the maintainer for AAA in the PR body;
  UNDISCLOSED for APCA, and in the docs, skill and `--help` for both.
- Disposition: FOLLOW_UP (refuse the combination or document it).

### M-F-6: docs Table 3 does not reproduce from the repository

- Related: acceptance "claims in docs/topics/derived-moods ... are true of the code and of observed
  output"; "benchmark numbers stated in docs reproduce from scripts/benchmark"; AGENTS.md "Do not
  fabricate example output".
- Status: CONFIRMED for the scoped claim in M-A-11. Basis: SOURCE, EXECUTED.
- Evidence: `probes/table3.out`, `probes/table3-accents-only.out`; no generator in `scripts/benchmark/`.
- Impact: a reader → takes Gruvbox's chroma factor as 1.25 (repository data gives 1.07-1.18) and
  GitHub's slope as −0.17 (gives +0.23 or −0.37) → misreads the evidence for the `k` and `b` levers.
- Severity: LOW. Origin: INTRODUCED. Intentionality: UNKNOWN. Disclosure: UNDISCLOSED.
- Disposition: REQUIRED_REPAIR under the doc-truth criterion (add the script that computes Table 3
  and print its output, or correct the cells).

### M-F-7: the documented extension example fails under the derived moods

- Status: CONFIRMED. Basis: EXECUTED (M-A-6), SOURCE.
- Impact: an extension author naming `shadcn@1.1.0` (the version bumped for these moods) and reading
  `rules.ref("neutrals")`, as the README and skill show → exit 2 with `--mood corporate|freak`. The error
  is clear; neither the extension section nor the derived-moods doc says that derived moods have no
  pool scopes.
- Severity: LOW. Origin: INTRODUCED. Intentionality: YES for the scopes (tested); the documentation
  gap NO evidence. Disclosure: UNDISCLOSED to extension authors.
- Disposition: FOLLOW_UP (one sentence in the extension section).

### M-F-8: dangling references and loose wording (INFORMATIONAL)

- `repo:src/derived.ts#L5` points to `docs/topics/light-dark-derivation`, which does not exist (the
  directory is `derived-moods`). `repo:src/books.ts#L294` points to `src/freak.ts`, which does not exist,
  and the new comment was inserted between `FINGERPRINT_SEEDS`'s doc comment and its declaration, so
  `presetMoods` now carries two doc comments and `FINGERPRINT_SEEDS` none.
- "within 2-16°" is 1.4-16.4° in the data (M-A-12).
- Basis: SOURCE, EXECUTED. Origin: INTRODUCED. Disposition: FOLLOW_UP.

### M-F-9: leave-one-out does not refit the fitted band constants (INFORMATIONAL)

- `leaveOneOut()` refits only (s, b, k) (`scripts/benchmark/score.ts`); `BAND_L` 0.76 and
  `BAND_L_LIGHT` 0.58, both marked "fitted" in `src/derived.ts`, stay fixed at values fitted with all
  seven themes. The docs' "so it is not memorising the themes it was fitted to" is therefore slightly
  stronger than the test. The 0.081 figure itself reproduces.
- Basis: SOURCE. Severity: INFORMATIONAL. Disposition: FOLLOW_UP (state it, or refit the bands in the
  loop).

## Safeguards that held

- Legacy moods: 1260 builds identical between base and head; rendered output differs only in version
  strings (M-A-3). No regression for callers that do not opt into `chartsAdvisory`.
- Derived moods refuse non-shadcn presets in the library and the CLI (tested in the suite).
- Listing 2, Table 4, the leave-one-out figure, both sankey blocks, the scoreboard files, the specimen
  SVG and recipe replay all reproduce (M-A-4, M-A-10).
- The lockfile pins the vendored tarball's actual sha512; licences are compatible (M-A-13).
- No unverified (out-of-gamut) required pair in 600 random derived builds.

## Faulty-probe corrections

- My first reading of M-A-2 suspected the OKLCH rounding in `put()`. The `--hex` CLI run failed
  identically and `wcagRatio` showed exactly 3 for a pair whose exact ratio is 2.9961, so I rejected
  that hypothesis. The rounding probe is kept (`probes/rounding.ts`); its output is correct, only my
  first explanation was wrong.
- `probes/rounding.ts` prints a truncated `expression` field that is not useful; ignore those lines.

## Limits and untried vectors

- Not attempted: running `install.sh` (M-A-14); checking the tarball against an upstream build of
  `2d80b33`; the `svg` and `w3-tokens` formats for derived moods; `--book` extensions that override
  light only under derived moods (dark no longer extends light, so light overrides do not reach dark;
  observed once in `probes/ext2.*`, not analysed); `suggest --mood corporate|freak` beyond one run that
  succeeded, whose profile descriptions ("cream page, hard outlines") do not describe what `suggest`
  does; performance; the installed skill copy.
- The corpus is random sRGB, not real brand palettes; prevalence figures apply to that corpus only.
- Negative results certify only the stated inputs.
- Temp trees `$TMPDIR/moriarty-base`, `$TMPDIR/moriarty-exact` and `$TMPDIR/moriarty-head` were left
  in place for replay; they hold copies of the source, nothing secret.
