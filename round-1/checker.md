# Decision check: case 2026-11-27-theme-book-pr30-r1

Role: decision checker. Plain voice.

## Basis

- Reviewer basis: FRESH_AGENT. I had not seen this subject, its PR or this case before. I did not
  write the target change, the testimony or the repairs. I had the global and project instructions
  (CLAUDE.md, theme-book AGENTS.md) in context.
- Draft checked: `case.json` at canonical SHA-256
  `51e882222fd87e9ee5879720c3a1b26119a512f03446885f280a9d2ffa8eae30` (I recomputed the digest; it
  matches `papers/manifest.json` and the digest stamped in all three papers). I also diffed it
  against the earlier edition `2c7dd424...`: the changes are F-7 moved to FOLLOW_UP, notes on F-7
  and F-12, RU-3 to RU-5 added, F-7 dropped from `path_to_ready`, and the header phase.
- Read: the checker packet; `case.json`; `papers/CASE_FILE.md`, `FINDINGS_PROVISIONAL.md`,
  `ERRATA.md`; `evidence/holmes/HOLMES.md`; `evidence/moriarty/MORIARTY.md`;
  `evidence/watson/WATSON_FIRST.md` and `WATSON_REPAIRS.md`. From the probes: Moriarty's
  `exact-ratio.patch`, `corpus.out`, `corpus-exact.out`, `rounding.out`, `primary-first.out`,
  `pr-body.txt`, `std-*.err`, `legacy.diff`, `legacy-*.tsv`, `cli-legacy.css.diff`,
  `darken.book.ts`, `ext2.*`; Holmes's `probe-stress.summary`, `probe-standards.out`, `owl-*.err`,
  `listing1-audit.out`, `listing1.err`, `aud-corporate-ffffff000000.css.audit`,
  `probe-provenance.out`, `probe-generator.out`, `score.out`, `dump-*.txt` (compared).
- Subject read at `4259148402f510aed7c5d5a5239fbe4ff2cc4369` (`git rev-parse HEAD` confirmed;
  `git status --short` empty before and after): all of `src/derived.ts`; `src/audit.ts` L135-150,
  L440-455, L980-995; `src/books.ts` L285-305, L500-530, L845-870; `src/render.ts` L15-35; the
  `src/cli.ts` audit flags; the `src/palette.ts` and `src/cli.ts` diffs; `scripts/specimen.ts`
  `SPECIMEN_THEMES`; `scripts/benchmark/score.ts` L1-60 and `sankey.ts` L1-40;
  `test/derived-moods.test.ts` L55-80; `docs/topics/derived-moods/README.md` in full; the
  README, CHANGELOG and skill CHANGELOG diffs; `skills/theme-book/SKILL.md` (grep of the
  relevant lines); `git grep` for repeated claims.
- Ran (cwd: subject, bun 1.4.5, macOS, no sandbox, no network, writes only to this directory):
  - `bun test`: exit 0, 233 pass, 0 fail (`bun-test.out`, `bun-test.exit`).
  - `bun ../evidence/checker/first-seeds.ts` (`first-seeds.ts`, `first-seeds.out`): OKLCH and the
    `isAccent` reading of every specimen palette and of the R-4 test palettes.
  - `bun ../evidence/checker/freak-fills.ts` (`freak-fills.ts`, `freak-fills.out`): when freak's
    secondary and accent are flat seeds and when they are tints, and whether primary equals its seed.
  - Arithmetic only: hsl(35, 99%, 40%) is `#cb7701` and hsl(39, 67%, 69%) is `#e5c07b`.
- Not done: no network fetch; I did not run `install.sh`; no repair was implemented; I did not
  check the vendored tarball against upstream. Cross-examination sampling was not assigned, so I
  sampled no extra SUPPORTED claims.

## Exact draft decision

`decision: CHANGES_REQUIRED`. Statement (case.json `notes`): "Draft: established REQUIRED_REPAIR
findings F-1..F-13; none CRITICAL or HIGH. Pending Watson repair menu and decision check."
`path_to_ready`: F-1, F-2, F-3, F-4, F-5, F-6, F-8, F-9, F-10, F-11, F-12, F-13. `followups`: derived
(F-7). `probe_triage`: empty. `coverage_matrix`: empty.

## Per-ID results

### Findings

| ID | Result | Evidence and reasoning |
| --- | --- | --- |
| F-1 | HOLDS | `wcagRatio` returns `Number(...toFixed(2))` (`src/audit.ts` L143-148); `derived.ts` uses it in `holdsText`, `inkFor`, `markOn`, the muted floor and the destructive search. `corpus.out`: 11 failing builds, every failure printed as 3.00 or 4.50; `corpus-exact.out` with the unrounded patch: 0 of 622. This violates acceptance criterion 3, so REQUIRED_REPAIR meets clause (a). MODERATE is supported. One wording correction: the impact says "11/622 random"; the 11 failures are among the 600 random builds, and the 22 edge builds all pass. |
| F-2 | HOLDS | Moriarty `blue-corp-reaudit.out`, Holmes `aud-*.css.audit`: the header says `audit=pass`, and `theme-book audit` on the same file exits 1. `chartsAdvisory` is set only at `books.ts` L862, and the audit CLI has no flag for it (`cli.ts` L85). CLI users and agents get two contradictory verdicts on one file, which is clause (b). MODERATE is supported. |
| F-3 | HOLDS (finding); repair choice UNRESOLVED | Source: the light steps start at L 0.78 with no floor, and the dark bars use `darkOf(hex, chartSet, () => true)` (`derived.ts` L336-347). The doc's rationale (L154) and the `books.ts` L861 comment are false for hued palettes. The doc-truth part meets criterion 4. MODERATE is supported by the 1.00:1 dark bar (freak creamInk). Two qualifications. (1) The 26/30 count includes four hueless builds (grey and blackWhite, both moods) that stay advisory under RU-1; for hued palettes the count is 22/26. (2) Acceptance criterion 3 accepts advisory charts "as documented", so the criteria require only a true account of the charts. A code floor (R-2) is a front-office choice, and the case records no ruling that makes R-2 rather than a DOC repair the path to READY. RU-1 assumes R-2 without saying so. |
| F-4 | HOLDS (finding) | `isAccent` needs `c >= 0.04 && 0.25 < l < 0.93`, and primary is `r.accents[0]` (`derived.ts` L87-90, L261). `primary-first.out`: with `#0b1f3a` first, primary comes from seed-1. Holmes: `#ffff00` becomes the page. The doc (L12, L96), the derived.ts header and SKILL L44 are false, which is criterion 4. MODERATE over Moriarty's LOW (Watson D-3) is reasonable, but no ruling records it. The consolidation does not carry H-C-14 (Table 2 L91, "a colored seed is an accent"), which is also refuted, and no repair covers it (see R-4). |
| F-5 | HOLDS | `scripts/benchmark/` holds no fit code (`git ls-tree`; no slope or R² in `scripts/`). Holmes and Moriarty recomputed independently from the same data, and both disagree with the doc's GitHub slope and Gruvbox chroma. Meets criterion 5. |
| F-6 | HOLDS | `put()` stores literal L, C and h under `relativeTo(ref(from), ...)` (`derived.ts` L183-190). In `probe-provenance.out`, changing a seed changes no value, and the control does follow its seed. `sankey.ts` L5 and doc L54-56 claim more than this. Meets criterion 4. |
| F-7 | HOLDS | FOLLOW_UP under RU-3. Executed exit 2 (`ext-*.err`). No document promises extensions under these moods. |
| F-8 | HOLDS | SKILL L45 says `--generator` "drives chart-1..5", and L46 lists every standard for every mood. `probe-generator.out`: three identical hashes. `std-*.err`: AAA and APCA builds fail. An agent following SKILL makes a choice that does nothing or fails, which is clause (b); SKILL is also a criterion-4 document. REQUIRED (Watson D-4) is sound, but no ruling records it. Correction to the mechanism: "AAA 10 pairs, APCA 4-6" holds for `#2563eb` only. Owl Coral gives corporate AAA 10 and APCA 6, and freak AAA 12 and APCA 12 (`owl-*.err`). |
| F-9 | FAILS | The adverse-consequence rule is not met. Both counts are true of observed output: H-C-3 (Listing 2: 26 passed, 16 advisory) and H-C-4 (`theme-book audit`: 36/36). The impact names confusion, not a wrong action or a false claim. By the records rule it is FOLLOW_UP, or ACCEPTED with a basis. The PR-body repair R-13 is still needed, but for other findings: the PR body repeats "Contrast is a floor in each mode" (F-3), "within 2-16°" (F-12) and "At WCAG AAA a generated theme fails 10 pairs", which is corporate-only (F-8). |
| F-10 | HOLDS | SKILL L42 and L32 say "`seed-1` tints `--accent`". In the derived moods, secondary is `actions[0]` and accent is `actions[1]` (`derived.ts` L280-299). Agents would set the wrong role, which is clause (b). LOW, origin EXPOSED. |
| F-11 | HOLDS (status); mechanism needs correction | The claim is false: in `freak-fills.out`, freak `["#0f766e"]` has secondary `#cff0eb` in light and `#1e3f3b` in dark, and primary `#2563eb` becomes `#2e6df6` in dark. But the recorded mechanism ("fills fall back to tints ... when a seed fails the text or page floors") is wrong as the main cause. Every probed seed held text. Tints appear when no non-status accent seed is left for the role: a single seed, or green and yellow seeds (`["#2563eb", "#16a34a", "#eab308"]`). Flat fills have no page-floor check. Primary also moves off its seed in light (`#e88e8d` becomes `#c97272`). |
| F-12 | HOLDS (substance); record FAILS | Each item is confirmed: `src/freak.ts` and `light-dark-derivation` do not exist (`books.ts` L294, `derived.ts` L5); L13 says 0.125 and 0.32, against 0.124 and 0.319 in `score.out`; the misplaced doc comment (`books.ts` L293-294); the test name at L66 is not matched by any primary assertion; doc L95 against L152-153. RU-4 split this bundle, but the record keeps one REQUIRED_REPAIR finding. The FOLLOW_UP items are not recorded separately and do not appear under "Batched follow-ups". The note "All applied in this change" reads as if repairs had been made; none has. |
| F-13 | UNRESOLVED (return for adjudication) | Both sources rated this INFORMATIONAL and FOLLOW_UP (H-F-10, M-F-9). The case raises it to LOW and REQUIRED_REPAIR with no ruling. It is compound. (a) "So it is not memorising" (doc L134) is stronger than the test, because `leaveOneOut` refits only (s, b, k) (`score.ts` L37-50). That can meet criterion 4 if the front office says so. (b) The "dark-to-light formula" item is the `accentMove` code comment ("runs it backwards"); the doc states no dark-to-light formula. Under RU-4's own logic that makes it a code-comment item and FOLLOW_UP. (c) The test-coverage gap has no adverse consequence of its own, and R-9 says R-1 to R-4 close it. |
| F-14 | HOLDS (withdrawal); provenance UNRESOLVED | My arithmetic agrees with the quoted HSL values, so `#cb7701` and `#e5c07b` follow. But the fetched excerpt, URL and retrieval time are not saved anywhere in the case (grep for `hue-6-2` finds only the case papers). The case header says "do not fetch", so the fetch should be recorded as a handling event and the excerpt saved. This has no bearing on the decision. |

### Rulings

| ID | Result | Evidence and reasoning |
| --- | --- | --- |
| RU-1 | HOLDS, with a caveat | Correct for the code as it stands. After R-2, hued bars agree only if every bar clears 3:1. `darkOf` gives up after a lift of 0.5 and returns the unfloored colour (`derived.ts` L129-133), so R-2's test must assert the floor and not assume it. |
| RU-2 | UNRESOLVED | See F-14: the evidence for the withdrawal is not preserved. |
| RU-3 | HOLDS | F-7 does not meet the adverse-consequence rule. R-10 is optional. |
| RU-4 | HOLDS (ruling); FAILS (implementation in the record) | See F-12. |
| RU-5 | HOLDS | Consistent with criterion 4. Its consequence for P-13 (ARCHIVE, not PROMOTE) is not recorded. |
| (missing) | FAILS | No ruling records D-3 (F-4 MODERATE), D-4 (F-8 REQUIRED), or the choice of code over doc for F-3 (R-2) and F-4 (R-4). The record follows Watson on these without a ruling. |

### Repairs (new factual claims checked)

| ID | Result | Evidence and reasoning |
| --- | --- | --- |
| R-1 | HOLDS (PROPOSED) | The wrapper is the same change as `exact-ratio.patch` (GREEN 0/622). `parseCssColorExact` and `wcagRatioExact` exist in audit.ts. The destructive test does use the rounded `wcagRatio` (test L68). "1.1.0 is unreleased" is true: the entry is under `[Unreleased]`, and tags stop at v0.4.0. Condition: validate the minimized cases at the final head by mutation (put the rounded ratio back and see RED), because R-2 to R-4 change the colours around them. |
| R-2 | HOLDS (PROPOSED), subject to a ruling | Claims checked: accent-sourced light bars do use `nearestPassing(s, markOn("light"))`; dark bars use `() => true`; primary's dark rule is `fillOn` (markOn plus holdsText), a superset of what R-2 asks. Risks: lifted bars may bunch together (named in R-2), and the 0.5 give-up (RU-1) could make a theme fail criterion 3. Whether code is required is UNRESOLVED (F-3). |
| R-3 | FAILS (minor; fix the wording) | `readPalette` is already exported (`derived.ts` L153). The input must be `pools.seedHexes`, which is what `derivedShadcnRules` receives (`books.ts` L530), not `opts.seeds`. The other claims hold: `boolFlags` at `cli.ts` L85, `evaluateAudit` at L342-345, the header at `render.ts` L24, and `test/theme-book.test.ts` already spawns the CLI. Test (b)'s RED holds: the hueless audit has 4 chart failures (`aud-corporate-ffffff000000.css.audit`). |
| R-4 | FAILS | (1) It leaves Table 2 L91 ("a colored seed is an accent") false: colored seeds after the first, outside 0.25 < L < 0.93, stay base. (2) The test's oracle is `inspect(...).dependencies` containing `seeds.seed-0`. That is the nominal provenance label from F-6, set by the same code (`seedKey(r.accents[0])`), so it is not independent of the implementation. Compare the hue of light primary with seed-0's hue, or the hex with `nearestPassing(seed-0)`, instead. (3) The SKILL edit needs a skill CHANGELOG entry (AGENTS.md, two changelogs). Checked and holding: the "Corporate" specimen is `#ffffff` first with the blue fifth, and none of the nine specimen first seeds is colored but outside the accent window (`first-seeds.out`), so R-4 leaves the specimen's primaries unchanged. The P-12 claim that P-7 "covers" the Solarized base03 reading is unsupported: no proposed assertion targets it. |
| R-5 | FAILS | The F-11 replacement, "it holds for seeds that carry text; others become tints", is misleading: every probed seed carried text, and tints come from having no non-status accent seed for the role (`freak-fills.out`). The text should also say that primary moves to the nearest passing lightness in light (`#e88e8d` becomes `#c97272`) and may differ in dark. The destructive wording, "as near light's red as sRGB allows", HOLDS: `underSixty` clamps each sRGB channel (`derived.ts` L137-144), and the code comment says the same. R-5 should also list the other "Contrast is a floor" lines: README L176, CHANGELOG L17, `derived.ts` L15 and the PR body. |
| R-6 | HOLDS (PROPOSED) | "`--generator` has no effect" is true of the colours (`probe-generator.out`); the recipe header still records the flag. The AAA and APCA wording agrees with RU-5. It needs a skill CHANGELOG entry. |
| R-7 | HOLDS (PROPOSED) | It predicts that the Gruvbox and GitHub cells will change, which agrees with both recomputations. |
| R-8 | FAILS (minor) | "Each color records the seed or light color it was derived from" overstates again. `palette.light-on-primary` (`#000000`) records the charcoal seed-5 (`probe-provenance.out`), and `destructive-light` and the hueless chart colours record no source at all. Write "names the seed or light color the code attributes it to; fixed colours name none". |
| R-9 | HOLDS | `leaveOneOut` refits only (s, b, k) (`score.ts` L37-50). The `accentMove` dark-to-light branch is `(1 − b)(L − s) + b · 0.58` and `C / k` (`derived.ts` L118). |
| R-10 | HOLDS | Derived books skip the legacy scopes (`books.ts` L485), and dark is `{}` rather than extending light (L516). Exit 2 is observed. Needs a skill CHANGELOG entry. |
| R-11 | HOLDS, conditional on R-4 | "The first colored seed is primary" is true only after R-4. Suggested precision: "the next non-status accent seeds fill `--secondary` and then `--accent` (as soft tints in `corporate`; tints of primary's hue when none are left)". |
| R-12 | FAILS (minor) | "1-16°" repeats the defect at the top of the range, because the data reach 16.4° (`page-hue.out`, `inkhue.out`); use "1.4-16.4°" or "within about 16°". The edit list names CHANGELOG, which has no "2-16", and misses `derived.ts` L8, which does. The rest holds: `books.ts` L294, `derived.ts` L5, and the L13 values against `score.out`. |
| R-13 | FAILS | "Add APCA (4 corporate, 6 freak at the sealed head)" gives the `#2563eb` counts. For Owl Coral, the PR body's own example, the counts are corporate APCA 6 and freak APCA 12, and freak AAA is 12, not 10 (`owl-*.err`). The PR body must name the palette and the mood for each count. Also tie R-13 to F-3, F-8 and F-12, whose claims the PR body repeats, rather than only to F-9. The 36 against 26 + 16 explanation holds (`listing1-audit.out`: 36 passed, 6 advisory; in-build: 26 passed, 16 advisory, 10 of them charts). |

### Probe dispositions

The case record's `probe_triage` is empty, although WATSON_REPAIRS.md proposes P-1 to P-15. **FAILS**:
the dispositions must be adopted into the record. Every row below is PROPOSED; none is validated.

| ID | Result | Note |
| --- | --- | --- |
| P-1 | HOLDS | RETAIN_IN_SPECIALIZED_SUITE. Record the LCG seed 12345, the 300 random and 11 edge palettes, and the bun version. The oracle (the project audit at exact ratios) is independent of the derived floors. |
| P-2 | HOLDS | MINIMIZE_THEN_PROMOTE. Add mutation calibration at the final head (see R-1). |
| P-3, P-4, P-5, P-8, P-10, P-15 | HOLDS | ARCHIVE is appropriate. P-4 carries its correction note. |
| P-6, P-9 | HOLDS | The oracles are `wcagRatioExact` against the pages and the standalone audit, both independent. |
| P-7 | HOLDS, with a note | Adding 15 palettes to `CASES` runs every existing per-case assertion on them, which has not been checked. The chart-floor assertion must skip the hueless cases (grey, blackWhite). |
| P-11 | FAILS | The oracle is the dependency label (see R-4), so it fails the independence gate. |
| P-12 | UNRESOLVED | The `#ffff00` page-chroma assertion is independent and holds. The "Solarized base03 covered" claim is unsupported (see R-4). |
| P-13 | Needs recording | RU-5 chose DOC, so the disposition resolves to ARCHIVE. The record does not say so. |
| P-14 | HOLDS | N/A, with a reason. |

### Material reassurances

| Reassurance | Result | Evidence |
| --- | --- | --- |
| Existing moods and presets unchanged (criteria 2 and 6) | HOLDS for the enumerated scope | `legacy.diff` is empty (1260 rows, base with design-book 0.26.0 against head). `dump-head.txt` and `dump-7a41cc1.txt` are byte-identical. The CLI diffs are version strings only. `chartsAdvisory` defaults to false (`audit.ts` L990). Not covered: svg output, and `--book` extensions on the legacy moods. |
| Gate (criterion 1) | HOLDS | My rerun: 233 pass, 0 fail, exit 0. |
| AGPL boundary (criterion 7) | HOLDS (REPORTED) | Holmes and Moriarty: tarball sha512 equals bun.lock, and the package is AGPL-3.0-only, the same as theme-book. |

### Decision

| Item | Result | Reasoning |
| --- | --- | --- |
| Decision value CHANGES_REQUIRED | HOLDS | No CRITICAL or HIGH finding is open, and no acceptance criterion is marked non-negotiable. F-1 fails loudly (exit 1) in about 2% of random palettes, which is a repairable defect, not a disqualifier, so BLOCKED does not apply. No missing evidence is critical to the decision: the base-parity question in H-C-21 was settled by Moriarty's M-A-3. Established REQUIRED_REPAIR findings remain (F-1, F-2, F-3, F-4, F-5, F-6, F-8, F-10, F-11, F-12). |
| Decision statement | FAILS | (1) It says F-1..F-13 are REQUIRED_REPAIR, but F-7 is FOLLOW_UP (RU-3). (2) "Pending Watson repair menu" is stale. (3) It names no repair IDs; the rules require the exact minimal set of repairs, each tied to its findings. (4) It does not show the material missing coverage: `install.sh` with the vendored tarball was NOT_ATTEMPTED by both investigators, and the change edits `install.sh`, the path by which the live CLI is installed; the tarball was not checked against upstream `2d80b33`; the `svg`, `json`, `w3-tokens` and `--native` outputs of the derived moods were not checked; the CI workflow was not read; the famous-theme palettes were not fetched, apart from the unsaved One Light check. |
| `path_to_ready` | FAILS, pending adjudication | It includes F-9, which fails the adverse-consequence rule, and F-13, which is unresolved. Moving F-9 to FOLLOW_UP would put it in the batched follow-ups. |

## A new hypothesis, for investigation and not promoted

Under the derived moods, an extension that overrides only `light.primary` leaves `dark.primary`
unchanged, and the build then fails 4 pairs (Moriarty `darken.book.ts` and `ext2.css`: light
primary is `#a0a0ff`, dark primary stays teal). Moriarty listed this as untried; the case does
not record it. R-10's sentence that dark "does not extend light" may be enough. That is for the
front office to decide.

## Proposed errata, for the front office to enter; I edited nothing

1. F-1 impact: "11/622 random" becomes "11 of 622 builds, all from the 600 random-palette builds".
2. F-3 impact: add "22 of 26 hued builds; the 4 hueless builds stay advisory under RU-1".
3. F-8 mechanism: AAA and APCA counts depend on the palette; Owl Coral gives freak AAA 12 and APCA 12.
4. F-11 mechanism: tints occur when no non-status accent seed is left for the role. Primary moves
   to the nearest passing lightness in light and can be lifted further in dark.
5. F-12 note: "All applied in this change" becomes "All scheduled for this change (R-12)". Record
   the code-comment items as a separate FOLLOW_UP finding under RU-4.
6. F-14 and RU-2: save the fetched excerpt with its URL and retrieval time, and record the fetch
   as a handling event against the header's network limit.

## Recommendation

**Revise and recheck.** The decision value CHANGES_REQUIRED should stand. Before it is issued, the
front office should:

1. Adjudicate the following and record each ruling:
   - F-9: FOLLOW_UP, or ACCEPTED with a basis. Retie R-13 to F-3, F-8 and F-12.
   - F-13: its severity and disposition. Split the doc claim from the code-comment and coverage parts.
   - D-3 and D-4.
   - Code or DOC for F-3 (R-2) and for F-4 (R-4).
2. Record the RU-4 split of F-12, and enter the errata.
3. Correct the repair wording in R-3, R-4, R-5, R-8, R-12 and R-13. For R-4, also correct the
   Table 2 L91 claim and use an independent oracle for the test. Add skill CHANGELOG entries for
   R-4, R-6 and R-10.
4. Put Watson's P-1 to P-15 into `probe_triage`, with P-11's oracle fixed and P-13 resolved to ARCHIVE.
5. Rewrite the decision statement. It should name the minimal repair set by finding, and list the
   coverage gaps above.

The minimal set on the current rulings: F-1 R-1; F-2 R-3 and part of R-5; F-3 R-2 (or a DOC-only
R-5, if the ruling allows it); F-4 R-4 (revised); F-5 R-7; F-6 R-8 (revised); F-8 R-6; F-10 R-11;
F-11 part of R-5 (revised); F-12 R-12 (revised) and R-5's red wording; F-13 R-9 (if upheld); and
R-13 (revised) for the PR-body claims.
