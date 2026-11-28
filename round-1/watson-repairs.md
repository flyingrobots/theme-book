# Watson recall: repairs and probe triage

Case 2026-11-27-theme-book-pr30-r1, recall phase. Plain voice. I'm the same Watson context that wrote
WATSON_FIRST.md, which stays frozen and unchanged.

## Basis

- Read: evidence/holmes/HOLMES.md, evidence/moriarty/MORIARTY.md, papers/FINDINGS_PROVISIONAL.md,
  and case.json rulings RU-1 and RU-2. From the evidence I read probe-stress.summary,
  primary-first.out, exact-ratio.patch and the head of rounding.out. From the subject I read
  src/audit.ts L143-148, src/derived.ts L330-350, scripts/specimen.ts SPECIMEN_THEMES and
  src/render.ts L24.
- Ran nothing in this phase. Every repair and every proposed test is PROPOSED. Where I say "RED on
  the current head", I'm relying on the cited probe outputs, which Holmes and Moriarty ran. I have not
  run the extracted tests themselves.
- I take the provisional global IDs F-1 to F-14 as given. Source IDs are mapped in the provisional
  file.

## Repair Menu

The order is by impact and by what the decision needs. R-1 to R-4 are code fixes, each paired with a
regression test. R-5 onward are text fixes. Several of those depend on the code fixes, because the
code changes what the docs must say.

### R-1 (F-1): CODE + TEST. Use exact contrast ratios for the floors in the derived moods

- Edit: in `src/derived.ts`, stop importing the display-rounded `wcagRatio`. Add an exact wrapper
  next to it in `src/audit.ts` and export it:
  `export function wcagRatioExactCss(a: string, b: string): number { const x = parseCssColorExact(a), y = parseCssColorExact(b); return x.ok && y.ok ? wcagRatioExact(x.rgb, y.rgb) : 1; }`.
  Then use it in `holdsText`, `inkFor`, `markOn`, the muted-ink floor and the destructive search.
  This is the same change as Moriarty's calibration patch (`probes/exact-ratio.patch`). Put it in
  audit.ts, not inline, so the generator and the audit share one definition.
- Test (test/derived-moods.test.ts): add these to `CASES`:
  `{ name: "rounding edge, light ring", seeds: ["#29da7e"], mood: "corporate" }`,
  `{ seeds: ["#be66e5"], mood: "freak" }` and the six-seed palette
  `["#041edd","#a8caf8","#27f51b","#8de542","#33822b","#32fdd9"]` corporate. The existing
  "conforms to WCAG AA" test then covers them. Also change the destructive test's
  `wcagRatio("#ffffff", …) >= 4.5` to the exact function, since the rounded version can't detect
  this class of defect.
- Expected result: RED on the current head (the audit's exact ratios are 2.9961 and 4.4988;
  `probes/rounding.out`, `probes/corpus.out`). GREEN after the change (`probes/corpus-exact.out`:
  0 of 622 builds fail).
- Audience: CLI users and agents. Rationale: this is acceptance criterion 3, and the theme exits 1
  for about 2% of the random palettes.
- Effort: 0.5–1 h. Assumes the specimen and the shadcn fingerprint may change.
- Dependencies: regenerate `docs/specimen.svg`. Rerun the fingerprint test. If the rule text
  changed, update the shadcn fingerprint in `test/fixtures/preset-rules.json` while staying at
  1.1.0, since 1.1.0 is unreleased. Rerun Listing 1 and update Listing 2 if any value moved.
- Acceptance: `bun test` green; `probes/corpus.ts` gives 0 required failures; Listing 2 is
  regenerated from real output.
- Disposition REQUIRED_REPAIR, scope THIS_CHANGE.

### R-2 (F-3): CODE + TEST. Put a contrast floor on chart bars for palettes with any hue

- Edit, in `src/derived.ts` in the non-hueless chart branch:
  1. Light steps: build the primary-hue steps inside the lightness range that clears 3:1 on every
     light page surface, instead of starting at a fixed L 0.78. Find `lMax`, the highest L at
     `p0.c, p0.h` that passes `markOn("light")`, by the same 0.01 search `nearestPassing` uses. Then
     space the five steps evenly from `lMax` down to `max(0.3, lMax − 0.4)`. Accent-sourced bars
     already go through `nearestPassing(s, markOn("light"))`; keep that.
  2. Dark: replace `darkOf(hex, chartSet, () => true)` with `darkOf(hex, chartSet, markOn("dark"))`.
     Dark bars are then lifted until they clear 3:1 on the dark page, card and sidebar, the same
     rule primary already follows.
  3. Leave the hueless branch alone (RU-1). It keeps stock shadcn's greys, the same in both modes.
- Test (test/derived-moods.test.ts), inside the per-case describe: "chart bars clear 3:1 on every
  page in both modes, unless the palette has no hue". For non-hueless cases, check every
  `chart-n` against `background`, `card` and `sidebar` in each mode with the exact ratio. Also
  check that the five bars stay apart: minimum pairwise OKLab distance at or above a threshold the
  repairer sets from the current specimen values, so lifted dark bars cannot merge. Add Holmes's
  stress palettes to `CASES` (see Probe Triage).
- Expected result: RED on the current head. `probe-stress.summary`: light chart-1 is 1.77–1.95:1
  for every 1–2-accent palette, and freak Solarized's dark chart-5 is 1.00:1. `chart-gap.out`
  shows freak `#7c3aed #db2777 #0891b2` at dark chart-3..5 of 2.91, 2.02 and 1.37. GREEN after.
- Risk to check: lifting the dark bars can bunch them near the top of the lightness range. The
  separation assertion exists to catch that. If it fails, spread the dark bars over the range that
  passes, instead of lifting each one independently.
- Audience: people reading charts, CLI users. Rationale: a series that is invisible on its own
  page (1.00:1) violates the rule the docs state ("contrast is a floor in each mode"). WCAG 1.4.11
  covers graphical objects.
- Effort: 2–4 h, including tuning the separation threshold and regenerating the specimen.
- Dependencies: R-1 first, so the floors use exact ratios. Then specimen regeneration and the
  fingerprint fixture, as in R-1.
- Disposition REQUIRED_REPAIR, scope THIS_CHANGE.

### R-3 (F-2): CODE + TEST. Make the build's verdict agree with `theme-book audit`

- Depends on R-2. After R-2, only hueless palettes have advisory charts.
- Edit:
  1. `src/books.ts` L862: pass `chartsAdvisory: isDerived(opts.mood) && readPalette(opts.seeds).hueless`.
     Export `readPalette`, or have `derivedShadcnRules` return the reading. Fix the L861 comment
     to say that only the hueless branch uses stock shadcn's shared greys.
  2. `src/cli.ts`: add a boolean `--charts-advisory` to `audit`. Add it to `boolFlags`, pass it
     into `evaluateAudit`, and list it in usage next to `--strict-borders`.
  3. `src/render.ts` L24: when charts were advisory, the header reads
     `audit=pass (wcag-aa, charts advisory)`, so the file says how its verdict was reached.
- Tests (test/theme-book.test.ts, which already spawns the CLI):
  - (a) Build `--seed #2563eb --preset shadcn --mood corporate --audit`, write the CSS to a temp
    file, run `theme-book audit <file> --standard wcag-aa`, expect exit 0. This is RED on the
    current head (`probes/blue-corp-reaudit.out`: exit 1, 3 failed) and GREEN after R-2 and R-3.
  - (b) Build the same with `--seed #ffffff --seed #000000`. Expect the header to contain
    `charts advisory`. Expect `theme-book audit` to exit 1 without the flag and 0 with
    `--charts-advisory`. This is RED on the current head (no flag, no header wording).
  - (c) Unit test: `evaluateAudit` with `chartsAdvisory` omitted still requires the chart pairs, so
    behavior is unchanged for callers who don't opt in (acceptance criterion 6).
- Audience: CLI users, CI jobs, agents following AGENTS.md. Rationale: one tool currently gives two
  contradictory verdicts on one file.
- Effort: 1–2 h.
- Disposition REQUIRED_REPAIR, scope THIS_CHANGE.

### R-4 (F-4): CODE + DOC + TEST. The first colored seed is primary, whatever its lightness

- The decision between fixing the code and changing only the text is the front office's. I
  recommend the code fix with the narrower wording below, because it does what the user meant, and
  the repository's own "Corporate" specimen (`#ffffff` first, blue fifth) depends on grey first
  seeds being skipped.
- Edit (`src/derived.ts`, `readPalette`): let `first` be the first seed with OKLCH C ≥ 0.04,
  regardless of L. If it exists and fails `isAccent` because of its lightness, put it at the front
  of `accents` and leave it out of `base`, so it can't become `pale` or `deep`. Seeds after the
  first keep the current classification, so dark or pale non-first seeds still serve as page and
  ink. Primary then goes through `nearestPassing(seed, fillOn("light"))` as it does now. That moves
  a yellow `#ffff00` to a legible olive and keeps a navy `#0b1f3a` as is, since it already holds
  white text.
- Doc edit, same repair: replace "the first seed is always primary, a red brand included" in
  docs/topics/derived-moods Table 2 and in the src/derived.ts header with "the first colored seed
  (OKLCH chroma 0.04 or more) is primary, a red brand included; grey seeds before it are base
  material". In SKILL.md, change "primary first" to "primary first (a grey seed is read as page or
  ink, not as primary)".
- Test (test/derived-moods.test.ts), "the first colored seed is primary":
  - `["#0b1f3a", "#f59e0b"]` corporate and freak: `t.book.inspect("palette.primary-light").dependencies`
    contains `seeds.seed-0`. RED on the current head (`primary-first.out`: it depends on
    `seeds.seed-1`, and the primary is amber `#c07a00`).
  - `["#ffff00", "#2563eb"]` corporate: the same dependency check, and light `background` has OKLCH
    C < 0.03. RED on the current head (`probe-edge-palettes.out`: `--background: #ffff01`).
  - Controls that must stay GREEN: `["#8a8f98", "#2563eb"]` and `["#292c2f", "#e88e8d"]` give
    primary from `seeds.seed-1` (a grey first seed is skipped), and `["#dc2626", "#2563eb"]` gives
    primary from seed-0.
- Audience: CLI users with dark or bright brand colors, skill agents.
- Effort: 1–2 h.
- Dependencies: regenerate the specimen and check that its nine rows are unchanged. All their
  first seeds look like either accents or greys, but I did not compute this. The specimen equality
  test will show it.
- Disposition REQUIRED_REPAIR, scope THIS_CHANGE.

### R-5 (F-3, F-2, F-11, F-12 destructive wording): DOC + CHANGELOG. Rewrite the contrast and chart claims to match R-1 to R-3

- Edit: in the docs Limits, replace "Chart bars are advisory in the audit for these moods ... one
  shared lightness spread cannot clear 3:1" with: chart bars clear 3:1 on every page in both modes;
  a palette with no hue uses stock shadcn's greys, which are advisory; `theme --audit` marks them
  so in the header, and `theme-book audit --charts-advisory` reproduces that verdict. Make the same
  change in the CHANGELOG `chartsAdvisory` and moods entries, and document `--charts-advisory`
  under Added. In Table 2, change "in dark is set so that shadcn's 60% over the page lands on the
  same red" to "lands as near light's red as sRGB allows (see Limits)". In Table 1 and the SKILL,
  qualify freak's "the same in both modes": it holds for seeds that carry text; others become
  tints, and primary is lifted in dark when it would fall below the floor (F-11).
- Audience: docs readers, CLI users, agents. Acceptance criterion 4.
- Effort: 0.5 h. Dependencies: R-1, R-2 and R-3 merged first, so the text describes the final
  code. Acceptance: every sentence matches a probe rerun at the repaired head.
- Disposition REQUIRED_REPAIR, scope THIS_CHANGE.

### R-6 (F-8): DOC. Say what the derived moods ignore

- Edit: add a line to the docs' "Use it" section and to the SKILL's `--mood` entry:
  "`--generator` has no effect on these moods. They are built for WCAG AA, and
  `--standard wcag-aaa` or `apca` will audit but not solve, so expect failures."
  Rewrite the `MOOD_PROFILES` descriptions of `corporate` and `freak` in src/palette.ts to describe
  the derived rules. State what `suggest --mood corporate|freak` does (it uses those chroma
  profiles), or drop the two moods from `suggest`'s usage line.
- An alternative CODE repair, which I'd prefer if cheap: refuse `--standard wcag-aaa|apca` with
  derived moods (exit 2), as non-shadcn presets already are. That is a behavior change, so it
  needs a CHANGELOG line and a test. It is for the front office to choose. The DOC version meets
  the acceptance criteria.
- Audience: CLI users and skill agents, who would otherwise choose a flag that silently does
  nothing.
- Effort: 0.5 h. Disposition REQUIRED_REPAIR, scope THIS_CHANGE.

### R-7 (F-5): CODE (script) + DOC. Generate docs Table 3

- Edit: add a `fit` section to `scripts/benchmark/score.ts`, or a new `scripts/benchmark/fit.ts`.
  For each famous theme it should print the OLS slope, offset and R² of dark L against light L,
  the mean lift and the chroma factor. The docs must say which accents are included and how the
  chroma factor is defined. Replace Table 3 with the script's output and label it "Observed output
  of `bun scripts/benchmark/fit.ts`".
- Audience: docs readers. Acceptance criterion 5. This also follows AGENTS.md: never fabricate
  example output.
- Acceptance: every Table 3 cell equals the script's output. The Gruvbox chroma and GitHub slope
  values will change from what's there now.
- Effort: 1 h. Disposition REQUIRED_REPAIR, scope THIS_CHANGE.

### R-8 (F-6): DOC. Say what the sankey shows

- Edit: in README L140-142, the docs L54-56 and the comments in `sankey.ts` L5 and `derived.ts`
  L26, replace "shows what the engine did, not what we say it does" and "every color is a rule on
  where it came from" with: each color records the seed or light color it was derived from, and
  the diagram draws those records; the values themselves are computed in TypeScript and stored
  fixed. Optionally move `muted` from "secondary and accent" to surfaces in `sankey.ts` and
  regenerate both blocks.
- Audience: README and docs readers. Criterion 4. Effort: 0.5 h. Disposition REQUIRED_REPAIR,
  scope THIS_CHANGE.

### R-9 (F-13): DOC + TEST

- DOC: in the docs, after the leave-one-out sentence, say: "(s, b, k) are refitted on each six;
  the band lightnesses 0.76 and 0.58 were fitted on all seven and stay fixed, so this is not a
  fully held-out test." Also say that the dark → light column uses
  `(1 − b)(L − s) + b · 0.58` and `C / k`. Change "so it is not memorising" to "so (s, b, k) are
  not memorising".
- TEST: the coverage gap in F-13 is closed by the tests in R-1 to R-4. No separate test.
- Audience: docs readers, maintainers. Effort: 0.25 h. Disposition REQUIRED_REPAIR (DOC part),
  scope THIS_CHANGE.

### R-10 (F-7): DOC. Extensions and the derived moods

- Edit: one sentence in the README extension section and in the SKILL: "The `corporate` and
  `freak` moods build only `seeds` and `palette` helper scopes, and their `dark` does not extend
  `light`. An extension that refers to `neutrals` or other pool scopes fails with exit 2 under
  those moods."
- Audience: extension authors. Effort: 0.25 h. Disposition: see Disagreements D-1. Proposed scope
  THIS_CHANGE either way, since the cost is small.

### R-11 (F-10): DOC. The SKILL's seed-role line

- Edit: SKILL.md `--seed` option: "`seed-1` tints `--accent` (the existing moods); in `corporate`
  and `freak` the first colored seed is primary, and the next non-status colors fill `--secondary`
  and then `--accent`."
- Note the change in skills/theme-book/CHANGELOG.md.
- Audience: agents. Effort: 0.1 h. Disposition REQUIRED_REPAIR, scope THIS_CHANGE.

### R-12 (F-12): DOC + code comments. Fix the stale references

- Edits: books.ts L294 becomes "the derived moods (corporate, freak) have rules for shadcn only
  (see src/derived.ts)". Move that comment below `FINGERPRINT_SEEDS`'s doc comment so each
  declaration has its own. derived.ts L5 becomes `docs/topics/derived-moods`. Change derived.ts L13
  from 0.125 to 0.124 and from 0.32 to 0.319. Change "2-16°" to "1-16°", or "within about 16°",
  in the README, docs, CHANGELOG and PR body. Rename the test "destructive is the fixed red, holds
  white text, and stands apart from primary", or add the check: OKLab distance from light primary
  of at least 0.12 when the primary is red. Adding the check is better, since Holmes measured at
  least 0.122.
- Audience: maintainers, docs readers. Effort: 0.5 h. Disposition: see D-2. Scope THIS_CHANGE.

### R-13 (F-9 and all count changes): PR_BODY

- Edit: after R-1 to R-4, rerun and restate the counts in the PR body: `bun test`, the in-build
  audit of Listing 1, and `theme-book audit` of the same file. Say that the two counts measure
  different pair sets: the in-build audit lists 26 required and 16 advisory, and the standalone
  audit 36. Update the AAA failure count, and add APCA (4 corporate, 6 freak at the sealed head),
  or point to R-6 if those standards are refused. List the new tests. Say that R-1 to R-4 were
  written test-first, if they are.
- Audience: the maintainer merging. Effort: 0.25 h. Dependencies: everything else.
  Disposition REQUIRED_REPAIR, scope THIS_CHANGE.

### Batched follow-ups (not required for this change)

- R-F1 (RETAIN_IN_SPECIALIZED_SUITE): a seeded random-palette sweep (see P-1), run on demand or
  in CI under a flag.
- R-F2: a base-against-head value-parity check for the existing moods across design-book 0.26.0
  and 2d80b33. Moriarty did this once (`legacy.diff` empty), but it needs 0.26.0 from the bun
  cache, so it can't be a normal test. Archive it with the vendoring notes.

## Probe Triage

Each extracted test's oracle is the project's audit with exact ratios, or `wcagRatioExact` against
the page. That is independent of the derived rules' own floors, which is what F-1 is about. Every
disposition below is PROPOSED: no extracted test has been run RED and then GREEN yet.

| ID | Probe | Bears on | Disposition | Rationale and remaining work |
| --- | --- | --- | --- | --- |
| P-1 | moriarty `probes/corpus.ts` (622 builds, LCG seed 12345) | F-1 | RETAIN_IN_SPECIALIZED_SUITE | Too large for the default gate. Keep it as `scripts/benchmark/sweep.ts` or a test that runs only with `THEME_BOOK_SWEEP=1`. Record the seed and the count. Its 11 failures are the RED evidence. |
| P-2 | moriarty `corpus.out` failing palettes (`#29da7e`, `#be66e5`, six-seed `#041edd…`) | F-1 | MINIMIZE_THEN_PROMOTE | These become the R-1 `CASES` entries. Validate them RED at 4259148 and GREEN after R-1. |
| P-3 | moriarty `probes/exact-ratio.patch` + `corpus-exact.out` | F-1 | ARCHIVE | Mutation calibration of the mechanism, not a maintained test. It is the basis for R-1's edit. |
| P-4 | moriarty `probes/rounding.ts` / `rounding.out` | F-1 | ARCHIVE | Diagnostic. The first hypothesis was corrected (put() rounding rejected), and its `expression` field is truncated. Keep it with the correction note. |
| P-5 | moriarty `probes/status-dist.ts` | F-1 | ARCHIVE | Prevalence count only. |
| P-6 | moriarty `probes/chart-gap.ts` / `chart-gap.out` | F-3 | MINIMIZE_THEN_PROMOTE | Becomes the R-2 per-case chart-floor assertion. The freak `#7c3aed #db2777 #0891b2` palette joins `CASES` as the three-accent dark case. |
| P-7 | holmes `probe-stress.ts` (15 palettes × 2 moods) | F-1, F-3, F-4 | MINIMIZE_THEN_PROMOTE | Add its 15 named palettes (singleTeal, grey, yellowOnly, paleFirst, deepNavyBrand, neonLime, creamInk and so on) to `CASES`. That is 30 builds, which is cheap, and the existing and R-2 assertions then apply. |
| P-8 | holmes `summarize.ts`, `probe-stress.summary` | F-3 | ARCHIVE | Reporting aid. |
| P-9 | moriarty `blue-corp.*` + `blue-corp-reaudit.out`; holmes `probe-standalone-audit.out`, `aud-*.css(.audit)` | F-2 | MINIMIZE_THEN_PROMOTE | Becomes R-3 tests (a) and (b). Use `#2563eb` corporate as the hued case and `#ffffff #000000` as the hueless case. The other three Holmes palettes can go in a parametrised list if the CLI spawn is fast enough. |
| P-10 | moriarty `reaudit-listing1.out`, holmes `listing1-audit.out` | F-2, F-9 | ARCHIVE | The control showing Owl Coral passes both audits. Rerun it for R-13's counts. |
| P-11 | moriarty `probes/primary-first.ts` / `.out` | F-4 | MINIMIZE_THEN_PROMOTE | Becomes the R-4 test: `#0b1f3a` is RED, and the grey-first and red-first rows are GREEN controls. |
| P-12 | holmes `probe-edge-palettes.out` (`#ffff00`, `#ccff00`, Solarized) | F-4 | MINIMIZE_THEN_PROMOTE | `#ffff00 #2563eb` joins the R-4 test. The Solarized palette joins `CASES` through P-7 (creamInk), so the base03 accent reading is covered. |
| P-13 | holmes `probe-standards.out`, moriarty `std-*.err` | F-8 (context for F-1/F-13) | PROMOTE if R-6 takes the CODE option (a refusal test, exit 2); else ARCHIVE | Depends on the choice in R-6. |
| P-14 | F-13 coverage (holmes H-F-10, moriarty M-F-9) | F-13 | N/A: there are no probes | Source findings. The coverage gap closes through P-2, P-6, P-9 and P-11. The leave-one-out qualification is DOC only (R-9). |
| P-15 | holmes `dump-existing.ts`, moriarty `legacy-dump.ts` | acceptance criterion 2 | ARCHIVE | Strong evidence of no regression, but it needs the 0.26.0 engine from the cache. See R-F2. |

## Disagreements with the provisional findings

- D-1 (F-7, REQUIRED_REPAIR). I would make it FOLLOW_UP. No statement in the README or docs says
  extensions work with the derived moods, so acceptance criterion 4 isn't violated. The failure is
  a clean exit 2 that names the missing scope, so an author isn't led to a wrong action. Holmes and
  Moriarty both proposed FOLLOW_UP. Under the adverse-consequence rule I can't name the required
  chain. R-10 is cheap enough to do in this change anyway.
- D-2 (F-12, one REQUIRED_REPAIR bundle). Under the adverse-consequence rule this bundle splits.
  The doc-claim items are REQUIRED under criterion 4: "lands on the same red", which contradicts the
  doc's own Limits, and "2-16°" where the data is 1.4–16.4°. I've moved the red wording into R-5.
  The code-comment items (dangling `src/freak.ts` and `light-dark-derivation`, 0.125, the misplaced
  doc comment) touch no recorded contract and lead to no wrong action beyond a wasted lookup, so
  they are FOLLOW_UP. The test name that promises an unmade check is the exception I'd keep
  REQUIRED: it is a false reassurance to maintainers about what CI covers. R-12 does all of it in
  one commit either way.
- D-3 (F-4, MODERATE). I agree with MODERATE, against Moriarty's LOW. If triggered, the user's
  brand is not the primary and becomes the page, and the audit passes, so nothing warns them. That
  is a meaningful bounded impairment of the main intended use. My first deposition said
  LOW–MODERATE before the probes showed `#ffff00` becoming the page.
- D-4 (F-8, REQUIRED_REPAIR). I agree, against Holmes's and Moriarty's FOLLOW_UP. `--generator` is
  silently ignored, which is a wrong action with no signal, and the SKILL lists every `--standard`
  for every mood, so an agent following it builds a theme that fails. That meets clause (b).
- No disagreement with F-1, F-2, F-3, F-5, F-6, F-9, F-10, F-11, F-13 or with the withdrawal of
  F-14.
- One ruling note on RU-1: once R-2 lands, "charts advisory" applies only to hueless palettes. The
  docs' remaining rationale ("one set for both modes") is then true for exactly those, so R-5's
  wording depends on R-2 landing as described.

## Limits

- None of the proposed code or tests has been written or run. The RED claims rest on Holmes's and
  Moriarty's executed probes at 4259148. GREEN rests on Moriarty's mutation for R-1 only. For R-2,
  R-3 and R-4, GREEN is an expectation.
- I did not check whether R-2's lifted dark bars stay distinguishable, or whether R-4 changes any
  specimen row. Both are named as dependencies.
- The effort figures are estimates by one reader.
