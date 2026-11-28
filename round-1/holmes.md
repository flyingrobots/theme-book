# HOLMES — case 2026-11-27-theme-book-pr30-r1, initial inquiry

Role: Holmes (initial investigator, fresh agent context). Plain voice. I did not read
`evidence/watson` or `evidence/moriarty`.

## 1. Basis

- Target: github:flyingrobots/theme-book/pull/30, sealed head
  `4259148402f510aed7c5d5a5239fbe4ff2cc4369`, base and merge-base
  `9eed99b79485fe7964c1d855d4c9f488d07b7170`.
- Subject worktree: `~/.local/state/baker-street/cases/2026-11-27-theme-book-pr30-r1/subject`,
  `git rev-parse HEAD` = head, `git status --short` empty at start.
- Read (SOURCE): the full diff 9eed99b..4259148 for `src/` (all of `src/derived.ts`), `package.json`,
  `bun.lock`, `install.sh`, `README.md`, `CHANGELOG.md`, `docs/README.md`,
  `docs/topics/derived-moods/README.md`, `skills/theme-book/SKILL.md` and its CHANGELOG,
  `vendor/README.md`, the test diffs, all of `test/derived-moods.test.ts`,
  `scripts/benchmark/{score,sankey,famous-themes}.ts`, the top of `scoreboard.ts`, the
  `SPECIMEN_THEMES` table of `scripts/specimen.ts`, and the PR body (`gh pr view 30`, read-only).
- Not read: `docs/specimen.svg` and `scoreboard.{svg,html}` contents (regenerated and compared
  byte-for-byte instead), the vendored design-book internals (excluded by scope), CI workflow.
- Execution: local macOS, bun 1.4.5, as the user, no sandbox, no network used. Every probe wrote
  only under this directory. `timeout(1)` is absent on this host; bounded by the Bash tool's
  timeout. Two archive extracts (`tree-head/`, `tree-7a41cc1/`, from `git archive`) symlink
  `node_modules` to the subject's; scoreboard.ts was run only in `tree-head/` because it writes
  into `docs/` relative to its own location.
- Prior knowledge used: published palettes of Solarized, Gruvbox, Catppuccin, Rosé Pine, Tokyo
  Night and Atom One (used only for H-F-9, labelled INFERENCE).
- Author overlap: the header says the front office wrote the change. I had no part in it.

## 2. Evidence manifest

Repository bytes at head (object IDs from `git rev-parse HEAD:<path>`):

| Path | Object |
| --- | --- |
| src/derived.ts | da8395a0da4975b392bb842dba93c3623d07c0c3 |
| src/books.ts | 20bb3e1c53ffbb1f0e1d5d21cc79fa6fae15d617 |
| src/audit.ts | df2bf5c88f4a48f3eb770e4855e97adc337548fb |
| src/cli.ts | 2e615987e44dc64201456040fb2a28509a0598e4 |
| src/palette.ts | b9c1cd382e01528a9d3f21279e9021fe383989dd |
| README.md | f6d2efa629b861f28fa9f18a232dc5bedb80f878 |
| CHANGELOG.md | bbd5a2ffbcac241532b8be921645ad2bb3d926d1 |
| docs/topics/derived-moods/README.md | 386a0db18eec64a0d958e3b881cf410a9b5e9602 |
| skills/theme-book/SKILL.md | df822e0c9223a04def86681dfed6f9f71caee0ba |
| scripts/benchmark/score.ts | ed4203e7a7a95aa2387def7518773bba63a1f9ab |
| scripts/benchmark/sankey.ts | 4979de5dca28c2d1c4454afd663de1853b843ce7 |
| scripts/benchmark/famous-themes.ts | 93394f041feaf49112d382701b068e882bb7d70b |
| test/derived-moods.test.ts | 5c42f51769481d277e3260400e775ebc81b3a2ce |
| install.sh | 4d94ce6e3974a3c895938b7f80a5e744cc7229ac |
| vendor/design-book-0.26.0+main.2d80b33.tgz | sha256 ae2c7a352780aa11b3d68a0dc8ff75b4c61602c0f74e77aa53ea3ab757c4a26d |

Case evidence (SHA-256 of every probe, input and output: `MANIFEST.sha256` in this directory).
The main files:

| File | What |
| --- | --- |
| bun-test.out, tsc.out | `bun test`, `bun x tsc --noEmit` at head (cwd subject) |
| bun-test-7a41cc1.out | `bun test` in `tree-7a41cc1/` (vendoring commit, same deps) |
| listing1.css/.err, listing1-audit.out | Listing 1 of the derived-moods doc, and standalone audit of it |
| probe-stress.ts/.out/.summary, summarize.ts | 15 palettes x 2 moods: audit, chart pairs below 3:1, roles |
| probe-edge-palettes.out | CLI output for lime, yellow and Solarized palettes |
| probe-standalone-audit.out, aud-*.css(.audit) | in-build verdict vs `theme-book audit` on the same CSS |
| probe-provenance.ts/.out | whether palette rules depend on the seeds they reference, with controls |
| probe-extension.out, ext-*.err, school.book.ts | README extension example with derived moods |
| probe-generator.out, probe-standards.out, owl-*.err | `--generator` and `--standard` with derived moods |
| probe-destructive.ts/.out | destructive red claims |
| score.out, sankey.out, sankey-doc.txt, sankey-readme.txt | benchmark scorer and sankey vs docs |
| scoreboard-run.out | scoreboard regenerated in `tree-head/`, compared with committed files |
| table3.ts/.out, table3-accents-only.ts/.out | recomputation of doc Table 3 |
| page-hue.ts/.out | dark-page hue vs light-ink hue claim |
| dump-existing.ts, dump-head.txt, dump-7a41cc1.txt | existing moods' resolved output, head vs 7a41cc1 |

## 3. Claims

| ID | Proposition (scoped) | Source | Assessment | Basis | Evidence and reasoning | Limits |
| --- | --- | --- | --- | --- | --- | --- |
| H-C-1 | `bun test` at head: 233 pass, 0 fail | PR body | SUPPORTED | EXECUTED | bun-test.out: 233 pass, 0 fail, 6 files, exit 0 | one run, this host |
| H-C-2 | `bun x tsc --noEmit` is clean | PR body | SUPPORTED | EXECUTED | tsc.out: exit 0, no output | |
| H-C-3 | Listing 2 is observed output of Listing 1 | derived-moods doc L22-40 | SUPPORTED | EXECUTED | listing1.css/.err: every shown line matches, including `26 passed, 0 failed, 0 unverified, 16 advisory` | abridged listing |
| H-C-4 | Owl Coral theme passes `theme-book audit --standard wcag-aa` 36/36 | PR body | SUPPORTED | EXECUTED | listing1-audit.out: `36 passed, 0 failed`, exit 0 | holds for this palette only; see H-F-1 |
| H-C-5 | Table 4 and the leave-one-out 0.081 are the output of `score.ts` | doc Table 4, L134 | SUPPORTED | EXECUTED | score.out matches every cell and `0.081` | |
| H-C-6 | Table 3 (slopes, R², lifts, chroma ratios) is measured from the seven themes | doc Table 3 | REFUTED (partly) | EXECUTED, SOURCE | No repository script produces it. Recomputed from `famous-themes.ts` (OLS, OKLCH): GitHub slope 0.23 (doc −0.17); One slope 0.57, R² 0.24 (doc 0.60, 0.29); chroma × Gruvbox 1.08 (doc 1.25), Tokyo 0.83-0.92 (0.99), Rosé Pine 0.95-0.98 (1.03). Solarized, Gruvbox, Tokyo, Catppuccin slopes and all lifts match. A primary-excluded variant does not match either | my method may differ from the author's undisclosed one; that is the defect |
| H-C-7 | The dark page's hue is within 2-16° of the light ink's in six of seven; dark page L about 0.24 | doc, README, PR body | SUPPORTED | EXECUTED | page-hue.out: gaps 2.1, 16.4, 10.2, 4.6, 1.4, 4.3; Gruvbox page achromatic; dark-page L 0.18-0.29 | "2-16" rounds 1.4 and 16.4 |
| H-C-8 | The sankey in README and doc is the output of `sankey.ts` | README, doc L56 | SUPPORTED | EXECUTED | sankey.out identical to both blocks | |
| H-C-9 | The sankey "shows what the engine did, not what we say it does"; "every color is a rule on where it came from" | sankey.ts L5, README L141, doc L54, derived.ts L26 | REFUTED | EXECUTED, SOURCE | derived.ts L183-190 stores each palette color as `relativeTo(ref(from), "oklch", [l, c, h])` with all three channels as literals. probe-provenance.out: after replacing every seed with #00ff00, every palette and role value is unchanged; control `relativeTo(seed, oklch, [0.5, 0.1, null])` does follow the seed. The references are labels the TypeScript assigns (e.g. black `#000000` primary-foreground is attributed to the charcoal seed) | |
| H-C-10 | Both moods are shadcn-only; another preset exits 2 | doc L12-13, CHANGELOG | SUPPORTED | EXECUTED, SOURCE | semantic and slide-deck: exit 2 with message; `buildThemeBook` throws (books.ts) | |
| H-C-11 | Derived moods audit with WCAG AA by default | doc, CHANGELOG | SUPPORTED | SOURCE, EXECUTED | `resolveEffectiveStandard` returns wcag-aa; header `audit=pass (wcag-aa)` | |
| H-C-12 | Corporate and freak pass WCAG AA in both modes, charts advisory | acceptance criterion 3, tests | SUPPORTED (in-build audit) | EXECUTED | probe-stress: 30 builds (15 palettes x 2 moods), 0 required failures each | finite palette set; standalone audit disagrees (H-F-1) |
| H-C-13 | Contrast is a floor in each mode | README, CHANGELOG, doc, derived.ts | REFUTED for charts; SUPPORTED for text and primary | SOURCE, EXECUTED | derived.ts L337 floors light charts only for accent sources; steps are unfloored; L347 `darkOf(hex, chartSet, () => true)` floors no dark chart. probe-stress: light chart-1 1.77-1.95:1 for every 1-2-accent palette; freak Solarized dark chart-5 1.00:1 | |
| H-C-14 | The palette is read by role: "a near-grey seed is base material ... a colored seed is an accent" | doc Table 2 | REFUTED | SOURCE, EXECUTED | `isAccent` (derived.ts L87-90) needs 0.25 < L < 0.93; `pale` takes any non-accent with L ≥ 0.85 (L157). `#ffff00` (L 0.968, C 0.211) and `#ccff00` (L 0.931, C 0.229) become the light page; `#002b36` (L 0.267, C 0.049) becomes an accent and primary | |
| H-C-15 | "The first seed is always primary, a red brand included" | doc Table 2, derived.ts L24; SKILL "primary first" | REFUTED as worded | SOURCE, EXECUTED | primary is `r.accents[0]` (L260), the first seed that passes `isAccent`. `--seed #ccff00 --seed #ff00ff` gives `--background: #ccff00`, `--primary: #e700e7`. For a red brand it does hold (`#d32f2f` primary) | |
| H-C-16 | Secondary and accent never take a red, yellow or green palette color | doc, CHANGELOG | SUPPORTED as literally scoped | SOURCE, EXECUTED | `actions` excludes status hues (L280). When no non-status accent exists, the tint falls back to the primary's hue (L281), so a red or yellow brand gets red or yellow secondary/accent tints (probe-stress singleRed, yellowOnly); the test allows this (test L74) | intentional per test; not a finding |
| H-C-17 | Destructive holds white text, stands apart from a red primary, and in dark lands on the same red at 60% | doc Table 2 | SUPPORTED for the first two; REFUTED as worded for the third | EXECUTED | probe-destructive.out: white ≥ 4.79:1; OKLab distance to primary ≥ 0.122; 60% composite is OKLab 0.112-0.146 from light red for typical palettes (0.005 for a red brand). The doc's own Limits says "still deeper" | |
| H-C-18 | Chart bars are advisory "as stock shadcn's would be: one shared lightness spread cannot clear 3:1 on both pages" | doc L154; books.ts L861 "Derived moods use stock shadcn's chart colors: one set for both modes" | REFUTED except for hueless palettes | SOURCE, EXECUTED | Non-hueless derived charts are palette accents or primary-hue steps, and corporate's dark charts differ from light's (listing1.css). Only the hueless branch (L327-332) is a shared stock set | |
| H-C-19 | `chartsAdvisory` defaults off; callers that do not opt in are unaffected | CHANGELOG, audit.ts | SUPPORTED | SOURCE | audit.ts L989-990: `required` is unchanged unless `opts.chartsAdvisory` is true; only books.ts L862 passes it, for derived moods | no execution of every caller |
| H-C-20 | Existing moods' output is unchanged by this PR's `books.ts` refactor | CHANGELOG, criterion 2 | SUPPORTED | EXECUTED | dump-head.txt vs dump-7a41cc1.txt identical: 225 configs (3 presets x 5 moods x 3 standards x 5 seed sets), every token's light/dark hex, audit status and chart diagnostics | same vendored engine in both trees |
| H-C-21 | Existing behaviour is unchanged by the engine swap to design-book main 2d80b33 | commit 7a41cc1 message | UNRESOLVED (partial support) | EXECUTED, REPORTED | `bun test` at 7a41cc1 with the vendored engine: 93 pass, 0 fail, including golden hex tests and the specimen SVG equality test written against 0.26.0 output. Fingerprints hash rule text, not resolved values, so they do not show value parity. design-book 0.26.0 is not installed or cached here, and no network was used, so a value diff against base was not run | |
| H-C-22 | `bun.lock` pins the tarball by sha512; installed version is `0.26.0+main.2d80b33`; licence ships inside | vendor/README.md | SUPPORTED | EXECUTED | computed sha512 equals bun.lock; tarball holds `package/LICENSE` and `"license": "AGPL-3.0-only"`; node_modules version matches | "unmodified build of 2d80b33" not checked (excluded scope, no network) |
| H-C-23 | `install.sh` stages `vendor/` so the `file:` dependency resolves in the stage dir | CHANGELOG | SUPPORTED (source) | SOURCE | install.sh copies package.json, bun.lock and vendor/ into the stage dir, then `bun install --production --frozen-lockfile` there | NOT_ATTEMPTED: running install would touch `~/.theme-book` or need the network |
| H-C-24 | The test suite fails if the move gets worse than 0.085 / 0.07 or worse than Material | doc L135, CHANGELOG | SUPPORTED | SOURCE | test/derived-moods.test.ts L115-122 | no mutation run |
| H-C-25 | Shadcn rules version 1.1.0; every other mood's rules unchanged; extension naming 1.0.0 refused | CHANGELOG | SUPPORTED | SOURCE, EXECUTED | fixture changes only shadcn; semantic and slide-deck fingerprints unchanged; H-C-20 | |
| H-C-26 | The scoreboard SVG and HTML are the output of `scoreboard.ts` | doc Figure 2 | SUPPORTED | EXECUTED | regenerated in tree-head/: both files byte-identical to committed | |
| H-C-27 | The README specimen shows nine themes as light/dark pairs and is generated | README alt text, CHANGELOG | SUPPORTED | SOURCE, EXECUTED | `SPECIMEN_THEMES` has 9 entries; the on-disk-equals-generated test passed in H-C-1 | |
| H-C-28 | At WCAG AAA a generated theme fails 10 pairs | PR body | SUPPORTED for Owl Coral corporate | EXECUTED | probe-standards.out: corporate 10 failures; freak 12 | |
| H-C-29 | The famous-theme palettes match each project's source | famous-themes.ts L5, doc | UNRESOLVED | INFERENCE | Solarized, Gruvbox, Tokyo, Catppuccin, Rosé Pine and GitHub light values agree with my prior knowledge; One Light's yellow may not (H-F-9). No network fetch | |

## 4. Findings

### H-F-1 — The build's audit verdict and `theme-book audit` disagree on the same derived theme

- Claims: H-C-4, H-C-12, H-C-18. Status CONFIRMED. Basis EXECUTED, SOURCE.
- Evidence: probe-standalone-audit.out. For `corporate #2563eb`, `freak #0f766e #c2410c`,
  `freak` Solarized and `corporate #ffffff #000000`, the emitted CSS header says
  `audit=pass (wcag-aa)`, and `theme-book audit <that file> --standard wcag-aa` exits 1 with 2-4
  chart failures (chart-5 at 1:1 in the Solarized case). `chartsAdvisory` reaches the audit only
  through books.ts L862; `theme-book audit --help` offers no flag for it.
- Impact: a user, CI job or agent that checks a generated theme with `theme-book audit` (as
  AGENTS.md prescribes for theme output) gets a failure for a theme the generator declared
  passing, and cannot reproduce the pass. The PR body's 36/36 example uses one of the palettes
  where charts happen to clear 3:1.
- Severity MODERATE: two contradictory conformance verdicts from one tool for one artifact;
  bounded to chart pairs. Prevalence: all 4 probed palettes besides Owl Coral; every 1-2-accent
  palette in probe-stress has a sub-3:1 chart pair.
- Origin INTRODUCED. Intentionality UNKNOWN. Disclosure: UNDISCLOSED to CLI users (docs say
  "chart bars advisory" without saying the standalone audit will fail).
- Disposition REQUIRED_REPAIR (criterion 4: claims true of observed output; audience: CLI users
  and agents take a wrong action). Repair options: floor chart bars (see H-F-2) so both verdicts
  agree; or add an audit flag and record the advisory in the emitted file; or at minimum
  document that `theme-book audit` holds charts to 3:1 and will fail these themes.
- Next check: after repair, run the standalone audit over the probe-stress palettes.

### H-F-2 — Derived chart colors have no contrast floor, and the stated reason for exempting them is false for these moods

- Claims: H-C-13, H-C-18. Status CONFIRMED. Basis SOURCE, EXECUTED.
- Evidence: derived.ts L336-348: primary-hue steps are not floored in light; every dark chart is
  `darkOf(hex, chartSet, () => true)`. books.ts L861 says derived moods "use stock shadcn's chart
  colors: one set for both modes", but listing1.css shows distinct light and dark chart sets.
  probe-stress.summary: every one- or two-accent palette has light chart-1 at 1.77-1.95:1;
  freak with Solarized's palette has dark chart-5 `#002b36` on page `#002b36` (1.00:1) and
  chart-4 at 1.40:1.
- Impact: a chart bar can be invisible against its page while the docs say contrast is a floor
  in each mode and that bars are exempt only because one shared spread cannot clear both pages.
  The code already floors light accent-sourced bars (`markOn("light")`) and could floor dark
  bars the same way, so the shared-spread rationale does not apply to corporate.
- Severity MODERATE (a data mark can be unreadable; WCAG 1.4.11 applies to graphical objects).
  Prevalence: 26 of 30 probe builds have at least one sub-3:1 bar (probe-stress.summary).
- Origin INTRODUCED. Intentionality: the exemption is intended; the false rationale is NO by
  stated intent. Disclosure: exemption DISCLOSED; the 1:1 case and the unfloored dark charts
  UNDISCLOSED.
- Disposition REQUIRED_REPAIR at least for the text (books.ts L861 comment, doc Limits L154,
  "Contrast is a floor" in README/CHANGELOG/doc). The code repair (floor light steps and dark
  bars with `markOn`) would also close H-F-1. Choosing between them is for the front office.

### H-F-3 — A bright yellow or lime seed is read as the page, not as a color; a dark teal page seed is read as primary

- Claims: H-C-14, H-C-15. Status CONFIRMED. Basis SOURCE, EXECUTED.
- Evidence: derived.ts L87-90, L157, L201. probe-edge-palettes.out: `--seed #ffff00 --seed
  #2563eb --mood corporate` emits `--background: #ffff01`; `--seed #ccff00 --seed #ff00ff
  --seed #00ffff` emits `--background: #ccff00`, `--muted: #bfef00`, `--border: #afdb01`, and
  primary magenta. With Solarized's own palette (`#fdf6e3 #002b36 #268bd2 #d33682 #859900`),
  base03 `#002b36` (C 0.049 ≥ 0.04) is an accent, so it becomes light primary and chart-5, and
  the dark page too.
- Impact: CLI users and agents following SKILL ("primary first") or the doc ("the first seed is
  always primary"; "a near-grey seed is base material") with a yellow or lime brand get a
  saturated yellow page and no brand primary. The audit passes, so nothing flags it.
- Severity MODERATE (the theme misuses the user's primary color; contrast still holds).
  Prevalence: seeds with L ≥ 0.93 and high chroma (pure yellows, limes); dark seeds with
  C ≥ 0.04 and L just above 0.25.
- Origin INTRODUCED. Intentionality UNKNOWN. Disclosure UNDISCLOSED.
- Disposition REQUIRED_REPAIR (criterion 4). Options: treat a seed as base only when chroma is
  low (as the doc says), or keep the first chromatic seed as primary whatever its lightness and
  floor it; or correct the doc and SKILL to state the actual L and C thresholds.
- Next check: add a test with `#ffff00` first and with Solarized's palette.

### H-F-4 — Table 3 of the derived-moods doc does not reproduce and has no generating script

- Claims: H-C-6. Status CONFIRMED. Basis EXECUTED, SOURCE.
- Evidence: table3.out, table3-accents-only.out against doc L108-116. GitHub's slope has the
  opposite sign (0.23 vs −0.17); One's slope and R², and five of seven chroma ratios differ
  (Gruvbox 1.08 vs 1.25). `scripts/benchmark/` holds no fit code.
- Impact: readers of the docs and the maintainer get numbers that the repository cannot
  regenerate; Gruvbox's 1.25 suggests a "vivid" k that the data does not show.
- Severity LOW. Origin INTRODUCED. Disclosure: the doc is labelled not human-reviewed.
- Disposition REQUIRED_REPAIR (acceptance criterion 5: benchmark numbers in docs reproduce
  from scripts/benchmark). Repair: add the fit to `score.ts` (or a new script), print Table 3,
  and replace the table with its output, saying how chroma × is defined.

### H-F-5 — The book's provenance is nominal, but the docs present the sankey as evidence of what the engine did

- Claims: H-C-9. Status CONFIRMED. Basis EXECUTED, SOURCE.
- Evidence: probe-provenance.out (with controls). sankey.ts L5; README L140-142; doc L54-56;
  derived.ts L26-28. sankey.ts groups `muted` under "secondary and accent" and `ring`,
  `sidebar-ring` under "lines", which is why "seed charcoal → light secondary and accent" and
  "seed coral → light lines" appear.
- Impact: readers infer that dark colors are computed from light ones inside the book and that
  the figure independently verifies the derivation. They are fixed literals with a reference
  label chosen by the same code; the figure shows the labels.
- Severity LOW. Origin INTRODUCED. Disclosure UNDISCLOSED.
- Disposition REQUIRED_REPAIR (criterion 4), DOC: say the references record origin, not the
  computation, and drop "shows what the engine did, not what we say it does"; optionally
  rename the "secondary and accent" group or move `muted` to surfaces.

### H-F-6 — The README's extension example fails with the derived moods

- Status CONFIRMED. Basis EXECUTED.
- Evidence: probe-extension.out, ext-corporate.err: `school.book.ts` (README, extends
  shadcn@1.1.0) with `--mood corporate` or `freak` exits 2: `"neutrals" names no scope to
  search`. Derived books have only `seeds` and `palette` helper scopes, and `dark` does not
  extend `light` (books.ts L515-516); nothing tells extension authors.
- Impact: an extension author targeting shadcn@1.1.0 finds helper scopes that differ by mood.
  The error is clean and names the scope.
- Severity LOW. Origin INTRODUCED. Disclosure UNDISCLOSED.
- Disposition FOLLOW_UP (could be REQUIRED_REPAIR if the front office counts extension authors
  as misled by the README). Repair: one README line on which scopes the derived moods have.

### H-F-7 — `--generator` is ignored and `--standard` is not solved for derived moods; the docs do not say so

- Status CONFIRMED. Basis EXECUTED, SOURCE.
- Evidence: probe-generator.out: corporate output is byte-identical under oklch, poline and
  rampensau; vivid output differs. probe-standards.out: `--standard wcag-aaa` and `apca` build
  the same AA-targeted colors and fail the audit (exit 1). `derivedShadcnRules` takes no
  standard or generator. `suggest --mood corporate|freak` (listed in usage) uses the
  `MOOD_PROFILES` entries whose descriptions ("cream page, hard outlines"; "one blue doing the
  work") describe no derived rule.
- Impact: a user who asks for AAA or a generator gets neither, with only an audit failure as a
  hint. The PR body says "these moods target AA"; the doc and SKILL do not.
- Severity LOW. Disposition FOLLOW_UP: document, or refuse those flags for derived moods.

### H-F-8 — Stale and inaccurate internal references

- Status CONFIRMED. Basis SOURCE, EXECUTED.
- Evidence: books.ts L294 cites `src/freak.ts` (does not exist); derived.ts L5 cites
  `docs/topics/light-dark-derivation` (does not exist; the doc is `docs/topics/derived-moods`);
  derived.ts L13 says 0.125 for Material (measured 0.124, score.out); doc Table 2 L95 says the
  60% composite "lands on the same red", which its own Limits and probe-destructive.out
  (OKLab 0.112 for Owl Coral) contradict; the `test/derived-moods.test.ts` L66 test name says
  "stands apart from primary" but asserts nothing about primary.
- Severity LOW. Disposition FOLLOW_UP (the doc Table 2 wording could join H-F-5's DOC repair).

### H-F-9 — One Light's yellow accent may not match its source

- Status HYPOTHESIS. Basis INFERENCE (prior knowledge, not fetched).
- Evidence: famous-themes.ts L39 gives One Light's fifth accent `#cb7701`, while One Dark uses
  `#e5c07b` (`@hue-6-2`). My recollection of Atom one-light-syntax is `@hue-6-2: hsl(41, 99%,
  38%)` = `#c18401`; `#cb7701` is about hsl(35, 99%, 40%).
- Impact if confirmed: one of 42 benchmark accents is wrong, and the "checked against each
  project's own source" note (L5) is untrue for it. Effect on Table 4 likely small.
- Severity LOW. Disposition INVESTIGATE: fetch `packages/one-light-syntax/styles/colors.less`.

### H-F-10 — Methodology and coverage notes

- Status CONFIRMED. Basis SOURCE. Severity INFORMATIONAL. Disposition FOLLOW_UP.
- The leave-one-out refits (s, b, k) but keeps `BAND_L` 0.76 and `BAND_L_LIGHT` 0.58 fitted on
  all seven themes (derived.ts L70, L109; score.ts L37-49), so it is not fully held out. The
  dark→light column uses `(1 − b)(L − s) + b · 0.58` and `C / k`, not the inverse of the
  documented formula; the doc does not say so.
- No test covers chart contrast, the primary choice for a pale or very dark first seed, or
  agreement between the in-build and standalone audit, which is why H-F-1 to H-F-3 passed CI.
- The PR body says the delivery loop was not followed and the final design had no red run
  (DISCLOSED by the author; recorded, not judged here).

## 5. Attempts

| ID | Hypothesis | Method | Outcome | Findings |
| --- | --- | --- | --- | --- |
| H-A-1 | The gate passes | `bun test`, `bun x tsc --noEmit` at head | NOT_REPRODUCED (no failure) | — |
| H-A-2 | Derived themes fail required AA pairs on some palette | probe-stress.ts, 15 palettes x 2 moods, in-build audit | NOT_REPRODUCED (0 required failures in 30) | — |
| H-A-3 | Hidden chart failures | same probe, chart pairs < 3:1 | CONFIRMED_FINDING | H-F-2 |
| H-A-4 | In-build and standalone audits disagree | generate CSS, run `theme-book audit` | CONFIRMED_FINDING | H-F-1 |
| H-A-5 | Pale chromatic seeds are misread | CLI with #ffff00, #ccff00, Solarized | CONFIRMED_FINDING | H-F-3 |
| H-A-6 | Docs' numbers reproduce | score.ts, sankey.ts, scoreboard.ts, Table 3 recompute | CONFIRMED_FINDING for Table 3 only | H-F-4 |
| H-A-7 | Book references are real dependencies | mutate seeds in a built book, re-resolve, with controls | CONFIRMED_FINDING | H-F-5 |
| H-A-8 | Existing moods unchanged by the refactor | dump 225 configs at head and at 7a41cc1 | NOT_REPRODUCED (identical) | — |
| H-A-9 | Engine swap changes existing output vs base | needs design-book 0.26.0 | BLOCKED (not installed, no network) | — |
| H-A-10 | Extension example works with derived moods | README school.book.ts | CONFIRMED_FINDING | H-F-6 |
| H-A-11 | Flags honoured | `--generator` x3, `--standard` aaa/apca | CONFIRMED_FINDING | H-F-7 |
| H-A-12 | Destructive claims | probe-destructive.ts, 5 palettes x 2 moods | CONFIRMED_FINDING for the "same red" wording only | H-F-8 |
| H-A-13 | `install.sh` installs the vendored build | run install into a scratch prefix | NOT_ATTEMPTED (would need network or touch the live install) | — |

## 6. Coverage limits

- Not examined: CI workflow, Mermaid `sankey-beta` rendering on GitHub, `docs/specimen.svg`
  visual content, the vendored design-book's correctness (excluded), scoreboard HTML behaviour
  in a browser, `--format json`/`w3-tokens`/`svg` output for derived moods, `--native` output.
- Palette coverage is 15 hand-picked palettes plus the 9 specimen palettes in the suite; no
  property-based sweep.
- Famous-theme values were not fetched from their sources.
- No mutation testing of the new tests.

## 7. Suggested next checks

1. Fetch Atom one-light-syntax `colors.less` to settle H-F-9.
2. After any chart repair, rerun probe-stress.ts and the standalone audit over its palettes.
3. Run a seeded random sweep of palettes (1-6 seeds) through both moods, counting required
   failures, sub-3:1 charts and primaries not equal to the first chromatic seed.
4. If a base value-parity check is wanted, install design-book 0.26.0 in a scratch copy of base
   and diff `dump-existing.ts` output against dump-7a41cc1.txt.
