hint: if you need to wait for this pull request to be reviewed, merged, or closed before continuing, use this instead of polling:
    gh event listen --resource https://github.com/flyingrobots/theme-book/pull/30 --event com.github.pull_request.review.submitted.v1,com.github.pull_request.state.changed.v1
  - It prints the first event as a JSON line on stdout and exits; run it again to wait for the next one.
  - Add `--timeout` to stop waiting after a while, for example `--timeout 30m`; it then exits with status 8.
  - Events carry no details; read the pull request to see what changed.
  - It misses changes made before it starts, so read the pull request once it is running.
  - See `gh event listen --help` for other event types.
  - Event subscriptions are in preview and may not be enabled for your account.
Build light and dark from one palette, with rules fitted to famous themes
9dbfc4dffa826490c86ab6a800374b4842056b4f
----
## Summary

Two shadcn moods, `corporate` and `freak`, build a light and a dark theme from one palette so that the two read as one theme. The rules were fitted to seven famous light/dark pairs (Solarized, Gruvbox, Tokyo Night, One, Catppuccin, Rosé Pine, GitHub), with each palette checked against its project's own source.

| Rule | Evidence |
| --- | --- |
| The dark page takes the light theme's ink hue, at about OKLCH L 0.24, never black | within 1.4–16.4° in six of the seven themes (`bun scripts/benchmark/fit.ts`) |
| Accents keep their hue and move together: dark L = (1 − b)(L + s) + b · 0.76, chroma × k | within OKLab 0.080 of the official accents (0.081 leave-one-out, with the band lightnesses held fixed), against 0.124 for Material's tone table and 0.319 for flipping OKLCH lightness |
| Contrast is a floor in each mode, never an equality across modes: text, fills, and every chart bar of a hued palette (3:1) | |
| The first colored seed is primary, whatever its lightness | |
| Destructive is a fixed red that holds white text, set for shadcn's 60% in dark; secondary and accent never take a red, yellow or green palette color; charts run light to dark | |

The derivation, benchmark and limits are in `docs/topics/derived-moods/README.md`.

## Commits

1. `7a41cc1` vendors design-book `main` at `2d80b33` (no release has it yet; meodai/design-book#5 asks), with `e16f7c8` merging `main` in.
2. `57304c7` red tests for an early design of `freak` (tinted pages, mirrored APCA Lc), since replaced.
3. `4259148` the moods, the engine (`src/derived.ts`), `scripts/benchmark/`, the docs, the README section with a Mermaid sankey drawn from a built book's recorded origins, the specimen as light/dark pairs, `chartsAdvisory` in the audit, and shadcn rules 1.1.0.
4. `4856aac`, `7bf7906`, `9dbfc4d`: repairs from a Baker Street review (round 1, below). The code repairs were written test-first: each new test was red at `4259148` and is green now.
   - Contrast floors measure the exact WCAG ratio, not the display-rounded one (2.996 had passed as 3:1; about 2% of random palettes failed their own audit).
   - Every chart bar of a hued palette clears 3:1 on its mode's pages; only a hueless palette keeps stock shadcn's greys, audited as advisory. The header then says `charts advisory`, and the new `theme-book audit --charts-advisory` reproduces the verdict.
   - The first colored seed is primary (a navy or yellow brand had become a page).
   - Docs: Table 3 is now the output of `scripts/benchmark/fit.ts` (two values were wrong); the docs say what the moods ignore (`--generator`; `--standard` beyond AA only audits) and that an extension sees only `seeds` and `palette`; stale references fixed.

## Checks

- `bun test`: 298 pass, 0 fail (local, at `9dbfc4d`). One earlier run at this head had one failure that did not name itself and did not recur in six reruns; it ran while a review agent was loading the machine.
- `bun x tsc --noEmit`: clean.
- Owl Coral's palette, generated and then re-audited with `theme-book audit`: the build's verdict and the standalone audit's agree (36 passed, 6 advisory border pairs).

| Owl Coral | WCAG AA | WCAG AAA | APCA |
| --- | --- | --- | --- |
| `corporate` | pass, 36/36 | fail, 10 of 36 | fail, 7 of 36 |
| `freak` | pass, 36/36 | fail, 12 of 36 | fail, 13 of 36 |

- The review's random sweep (622 builds, both moods) fails none, with chart bars now required.

## Not followed, and limits

- The delivery loop was not followed for the original work: there is no issue, no draft PR was opened first, and the tests in `test/derived-moods.test.ts` were first written after the design was settled by eye. `57304c7` is red for an earlier design; the review repairs were test-first.
- These moods are built for WCAG AA. `--standard wcag-aaa` or `apca` audits but does not change the colors, so it fails (table above).
- The docs in `docs/topics/derived-moods/` are agent-written and not yet human-reviewed.
- Two measured levers (a signature rule break, hue gravity) are documented but not built. Component-level looks are flyingrobots/theme-book#29.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

