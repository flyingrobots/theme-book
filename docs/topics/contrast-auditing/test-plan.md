# Contrast auditing — test plan

The contract ledger for [contrast auditing](README.md). Planned work is not evidence.

Evidence lives in `test/theme-book.test.ts` unless stated otherwise.

## Requirements

| ID | Requirement |
| --- | --- |
| CA-1 | Pairs are evaluated at full floating-point precision, without pre-comparison rounding |
| CA-2 | The requested standard determines the exit code |
| CA-3 | Colors that cannot be verified are reported, and yield exit `3` rather than a pass |
| CA-4 | A WCAG-passing text pair that APCA rates below fluent reading is reported as an advisory |
| CA-5 | The advisory never changes the exit code |
| CA-6 | Auditing under `--standard apca` raises no polarity advisory |
| CA-7 | `--fix` proposes verified replacement values, or states that no solution exists |

## Cases

| ID | Case | Oracle | Evidence | Status |
| --- | --- | --- | --- | --- |
| CA-4a | A dark pair passing WCAG AA but below APCA Lc 75 is flagged | `polarityAdvisories` non-empty; every entry `abs(apcaLc) < 75` and `wcagExact >= 4.5` | `polarity advisory > flags a dark pair that passes WCAG but reads below APCA fluent reading` | implemented |
| CA-5a | The advisory leaves conformance alone | `exitCode === 0` and `status === "pass"` while advisories exist | same test as CA-4a | implemented |
| CA-6a | `--standard apca` raises none | `polarityAdvisories` is `[]` | `polarity advisory > auditing under apca raises no advisory, because apca already is the standard` | implemented |
| CA-4b | A pair well above the threshold is not flagged | `polarityAdvisories` is `[]` for black on white | `polarity advisory > a pair comfortably above the fluent-reading threshold is not flagged` | implemented |
| CA-7a | An unsolvable pair reports `no-solution` rather than a bogus value | fix status is `no-solution` with a stated reason | — | **gap** |
| CA-3a | An out-of-gamut color yields exit `3`, not `0` | `status === "incomplete"`, `exitCode === 3` | — | **gap** |

## Known gaps

- **CA-7a, CA-3a have no automated evidence.** Both behaviors were observed by hand while
  auditing the `flyingrobots` monochrome tokens — `destructive` reported `no-solution` at AAA, and
  three out-of-sRGB values reported as unverified — but neither is pinned by a test.
- **`--fix` has no write path**, so there is no case covering a file being modified. See the
  known gaps in the [topic reference](README.md).
