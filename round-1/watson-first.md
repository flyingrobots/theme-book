# Watson first deposition

Case: 2026-11-27-theme-book-pr30-r1. Phase: initial inquiry (blind first reader). Plain voice.
Subject: ~/.local/state/baker-street/cases/2026-11-27-theme-book-pr30-r1/subject at
4259148402f510aed7c5d5a5239fbe4ff2cc4369 (base 9eed99b79485fe7964c1d855d4c9f488d07b7170).

## Declarations

- Prior exposure: none to this change. I had the global and project instructions (CLAUDE.md, the
  theme-book AGENTS.md) in context before reading.
- Read: the role packet; `gh pr view 30` (PR body); the diff of README.md, CHANGELOG.md,
  docs/README.md, docs/topics/derived-moods/README.md, skills/theme-book/SKILL.md,
  skills/theme-book/CHANGELOG.md, vendor/README.md, install.sh, package.json, src/audit.ts,
  src/cli.ts, src/books.ts, src/palette.ts, test fixtures and test edits; the whole of
  src/derived.ts, test/derived-moods.test.ts and the top of scripts/benchmark/score.ts.
- Not read: scoreboard.html/svg, specimen.svg, scripts/specimen.ts, scripts/benchmark/{famous-themes,
  sankey,scoreboard}.ts, the vendored tarball, docs/topics/contrast-auditing.
- Ran: nothing beyond `git` and `gh pr view` reads. No probes, per the Watson role. Every
  observation below is SOURCE (inspection) or INFERENCE. I did not verify the PR body's test counts,
  the audit counts in Listing 2, or the benchmark numbers.
- I read the source to check what the docs tell a reader, not to audit the engine.

## Audience and perspectives

1. Maintainer merging the PR.
2. CLI user generating or auditing a theme.
3. Author of a `--book` extension.
4. Agent following skills/theme-book/SKILL.md.
5. Reader of README and docs/topics/derived-moods.

### Maintainer: "Do I need to change anything? Can I tell from this?"

Mostly yes. The PR body is candid: it says the delivery loop was not followed, there was no red run
for the final design, AAA fails 10 pairs, and the docs are unreviewed. The commit list matches the
branch. Two things I could not tell from the material: whether the stated counts ("233 pass",
"36/36") are current at this head, and why the audit count in the PR body (36/36 from
`theme-book audit`) differs from the docs' Listing 2 (26 passed, 16 advisory from `theme --audit`)
for what both call the Owl Coral theme (W-F-2). Two code comments point at files that do not exist
(W-F-6).

### CLI user

I can generate a theme from the README and the docs page. I can not tell:
- whether `theme-book audit tokens.css` on the generated CSS will pass, since the advisory charts
  apply only inside `theme --audit` (W-F-1);
- that `--standard wcag-aaa` with these moods is expected to fail (W-F-3);
- that "the first seed is always primary" holds only when that seed counts as an accent (W-F-4);
- what `suggest --mood corporate|freak` does, since the usage text advertises it (W-F-7).

### Extension author

The CHANGELOG says `shadcn@1.0.0` is now refused and that the other moods' rules are unchanged, and
the README and SKILL examples are updated to 1.1.0. So I know to change the version string. I can
not tell whether an extension applies to `--mood corporate` or `freak`. Those moods build no
`neutrals` scope (the test asserts it), and the README example refers to `rules.ref("neutrals")`
(W-F-5).

### Agent following SKILL.md

The new "Generate, never hand-pick" rule is clear. The moods are described, but the SKILL's own
`--seed` line still says "`seed-1` tints `--accent`". In the derived moods the second accent seed
becomes secondary, and accent comes from the next non-status accent (W-F-8). The SKILL says freak
fills are "the same in both modes" without the conditions the code applies (W-F-9).

### Docs reader

The derivation, Tables 3 and 4, and the limits read clearly. The benchmark gate is real: the test
calls `accentMove(h, DERIVED_SETTINGS.corporate)`, so a change to the settings is caught. One
reassurance is broader than the code (W-F-4), one is conditional without saying so (W-F-9), and the
"chart bars are advisory in the audit" limit doesn't say which audit (W-F-1).

## Findings

### W-F-1. The docs don't say that the advisory charts apply only inside `theme --audit`

- Status: CONFIRMED (that the option is not exposed); HYPOTHESIS (that real palettes then fail the
  standalone audit). Basis: SOURCE, INFERENCE.
- Evidence: `chartsAdvisory: isDerived(opts.mood)` is passed only from `buildThemeBook`
  (src/books.ts:862). The `audit` subcommand's boolean flags are `fix`, `strict-borders`, `help` and
  `h` (src/cli.ts:85, 345), so it has no charts-advisory option. The docs' Limits say "Chart bars are
  advisory in the audit for these moods ... one shared lightness spread cannot clear 3:1 on both
  pages for every bar". AGENTS.md tells maintainers to check a real theme with
  `theme-book audit path/to/tokens.css`.
- Impact: a user or agent writes the generated CSS to a file and audits it with `theme-book audit`
  (the documented gate) → chart pairs are now required at 3:1 → for a palette whose bars miss on one
  page, the audit fails, and the reader has no doc explaining why `theme --audit` said PASS. The PR
  body's 36/36 suggests Owl Coral itself passes, so this needs a palette that triggers it.
- Severity: MODERATE. Prevalence: UNKNOWN. Origin: INTRODUCED. Disclosure: UNDISCLOSED to CLI users.
- Next check: run `theme --mood corporate|freak` on the specimen palettes, write the CSS, and run
  `theme-book audit --standard wcag-aa` on it. See whether the chart pairs fail.

### W-F-2. Two audit counts for one theme, with no explanation

- Status: CONFIRMED (the texts differ). Basis: SOURCE.
- Evidence: the PR body says "A generated Owl Coral theme: `theme-book audit --standard wcag-aa`
  passes 36/36". docs/topics/derived-moods/README.md Listing 2, labeled "Observed output", says
  "26 passed, 0 failed, 0 unverified, 16 advisory" (42 pairs).
- Impact: the maintainer can't tell which number to expect or whether either is current. The
  difference may simply be the standalone audit against `theme --audit`, but nothing says so.
- Severity: LOW. Origin: INTRODUCED.
- Next check: reproduce both commands at head and compare the counts.

### W-F-3. The docs don't say that AAA fails with these moods

- Status: CONFIRMED (absent from the user-facing docs). Basis: SOURCE.
- Evidence: the PR body says "At WCAG AAA a generated theme fails 10 pairs ... these moods target
  AA." The derived-moods page says only "audit with WCAG AA by default". Its Limits section, the
  README and the SKILL do not mention AAA. AGENTS.md tells maintainers to check real themes with
  `--standard wcag-aaa`.
- Impact: a user or agent asks for `--standard wcag-aaa` with `corporate` → the audit fails → they
  take it for a bug or a bad palette and do not learn that the mood is not designed for AAA.
- Severity: LOW. Origin: INTRODUCED. Disclosure: DISCLOSED to the maintainer (PR body);
  UNDISCLOSED to users and agents.

### W-F-4. "The first seed is always primary" is broader than the code

- Status: CONFIRMED (SOURCE). Wrong action: INFERENCE.
- Evidence: primary is `r.accents[0]` (src/derived.ts, `derivedShadcnRules`). `isAccent` requires
  OKLCH `c >= 0.04 && 0.25 < l < 0.93`, so a first seed that is very dark, very pale or near-grey
  becomes base material (page or ink). Primary then goes to the next accent, or to the ink if there
  is none. The docs (Table 2, "Status hues stay off actions") and src/derived.ts's header both say
  "the first seed is always primary, a red brand included". The SKILL says "primary first".
- Impact: a user with a deep navy or near-black brand color passes it first → the brand turns into
  the ink or dark page, and another seed becomes the button color → the user ships a theme whose
  primary is not their brand, after reading that it would be.
- Severity: LOW to MODERATE (bounded to brands outside the accent window). Prevalence: UNKNOWN.
  Origin: INTRODUCED.
- Next check: build `--mood corporate` with a first seed such as `#0f172a` and look at `--primary`.

### W-F-5. The docs don't say whether `--book` extensions work with the derived moods

- Status: HYPOTHESIS. Basis: SOURCE, INFERENCE.
- Evidence: derived moods populate none of the legacy scopes. The test asserts that `neutrals`,
  `brand`, `candidates`, `accentSeeds` and `inks` are undefined. The README extension example
  (updated to `shadcn@1.1.0` in this PR) uses `rules.ref("neutrals")`. src/extension.ts has no
  mood handling that I found. The CHANGELOG says only that the rules version changed "for the two
  new moods".
- Impact: an extension author combines their book with `--mood corporate` → the reference to
  `neutrals` fails or behaves differently → nothing in the docs says whether that combination is
  supported.
- Severity: UNKNOWN until the behavior is observed. Origin: INTRODUCED.
- Next check: run the README `school` extension with `--mood corporate` and record the outcome.

### W-F-6. Comments point at files that do not exist

- Status: CONFIRMED. Basis: SOURCE.
- Evidence: src/books.ts `presetMoods` doc comment: "freak has rules for shadcn only (see
  src/freak.ts)". There is no src/freak.ts, and corporate is omitted. src/derived.ts header: "see
  docs/topics/light-dark-derivation". The page is docs/topics/derived-moods.
- Impact: a maintainer follows the pointer and finds nothing. Minor.
- Severity: LOW. Origin: INTRODUCED.

### W-F-7. The `MOOD_PROFILES` entries and `suggest --mood` don't match the derived moods

- Status: CONFIRMED (text); impact INFERENCE. Basis: SOURCE.
- Evidence: src/palette.ts gives `freak` the description "Post-modern Memphis: cream page, hard
  outlines ..." and `corporate` "Corporate grey and blue: cool slate surfaces, one blue doing the
  work". Both describe fixed looks, but the docs say the moods derive from any palette. I found no
  code that reads `.description`. The `suggest` usage line now lists `corporate|freak`, and suggest
  uses `MOOD_PROFILES` chroma settings, not src/derived.ts. No doc says what `suggest --mood
  corporate` means.
- Impact: a maintainer reads a stale intent. A `suggest` user expects the derived-mood rules and
  gets ordinary chroma-profile suggestions.
- Severity: LOW. Origin: INTRODUCED.

### W-F-8. The SKILL's `seed-1 tints --accent` line contradicts the derived moods

- Status: CONFIRMED. Basis: SOURCE.
- Evidence: SKILL.md options: "`--seed <color>` (... `seed-1` tints `--accent`)". In
  src/derived.ts, secondary is `actions[0]` and accent is `actions[1]`, where
  `actions = accents.slice(1)` without status hues. So for derived moods the second accent seed
  fills `--secondary`.
- Impact: an agent orders seeds by that rule to control `--accent` → the wrong token takes the color.
- Severity: LOW. Origin: EXPOSED (the line predates the PR; the PR adds moods it doesn't hold for).

### W-F-9. "The same in both modes" for freak is conditional, and the docs don't say so

- Status: CONFIRMED. Basis: SOURCE.
- Evidence: freak's secondary and accent are flat only if the seed `holdsText` (4.5:1 against black
  or white); otherwise they fall back to tints that differ by mode. Primary goes through
  `nearestPassing` in light and `darkOf` with the contrast floor in dark, so it can move off the seed
  and differ between modes. Docs Table 1 says "unchanged (Solarized's move)" and "the palette's own
  colors, flat, the same in both modes". The SKILL says the same. Table 2's floor rule partly
  qualifies it. The test checks only the Memphis palette.
- Impact: a user picks freak to keep exact brand hexes in both modes → for some palettes the fills
  change or become tints → small surprise, with no adverse consequence beyond expectation.
- Severity: LOW. Origin: INTRODUCED.

## What reads clearly

- The migration for extension authors: bump to `shadcn@1.1.0`. It is stated in the CHANGELOG and the
  examples.
- The vendored design-book. Why it is vendored, how to rebuild it, how to return to npm, and the
  AGPL note are all in vendor/README.md. install.sh copies vendor/ before `bun install`. theme-book
  is itself AGPL-3.0-only, so vendoring is consistent with the boundary.
- `chartsAdvisory` is opt-in, and only the derived moods turn it on (src/books.ts:862), which
  matches the CHANGELOG.
- The agent-written, unreviewed status of the docs is disclosed on the page and in the PR body.

## Limits

- This is a simulated reader assessment, not a usability study, and not a verification of numbers.
- I did not examine the specimen, the scoreboard, the sankey's fidelity to a built book, the famous
  theme palettes against their sources, or the vendored tarball.
- W-F-1, W-F-4 and W-F-5 each name a next check. None was run.
