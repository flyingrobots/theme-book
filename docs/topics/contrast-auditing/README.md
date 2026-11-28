# Contrast auditing

`theme-book audit` reads a theme's tokens, pairs the ones that face each other, and verifies every
pair against a contrast standard — at full floating-point precision, with alpha compositing, and
with explicit reporting of what it could *not* verify.

See the [test plan](test-plan.md) for requirements and evidence.

## What it reads

CSS (`@layer base`, `@supports`, `@media (prefers-color-scheme: dark)`, `:root.dark`, `html.dark`,
classic shadcn bare HSL, post-merge `var()`), `theme-book` JSON, and W3C DTCG JSON.

```bash
theme-book audit path/to/tokens.css
theme-book audit path/to/tokens.css --standard wcag-aaa
theme-book audit path/to/tokens.css --standard apca --strict-borders --format json
```

## Which standard to ask for

**Audit with WCAG for conformance and read the APCA numbers for the truth. Never one alone.**

WCAG 2.x is *polarity-blind*: its ratio is symmetric, so dark-on-light and light-on-dark score
identically. Human vision is not symmetric — light text on a dark background blooms and reads
worse than the arithmetic implies.

> Passing WCAG AAA does not mean a dark theme is readable.

Every report line already prints both numbers. Only the requested standard reaches the exit code.

| `--standard` | Text threshold | Non-text graphic |
| --- | --- | --- |
| `wcag-aa` (default) | 4.5:1 | 3:1 |
| `wcag-aaa` | 7:1 | 3:1 |
| `apca` | Lc 75 | Lc 45 |

APCA `Lc` guidance: 45 is the floor for large or non-body text, 60 the body-text minimum, 75
fluent body reading, 90 preferred for body copy.

## The polarity advisory

When auditing against a WCAG standard, any **required text pair that passes but that APCA rates
below Lc 75** is reported as an advisory:

```text
Polarity advisory (WCAG 2.x scores both directions the same; APCA does not):
[ADVISORY] (dark · text) muted-foreground on muted — passes wcag-aaa at 7.06:1
           but APCA rates it Lc 53.2, below the Lc 75 needed for fluent body reading
```

The advisory **never changes the exit code**. WCAG is the conformance standard; APCA is the
WCAG 3 candidate and has no legal standing yet. Auditing under `--standard apca` raises none,
because APCA is then already the bar.

When one fires, decide deliberately. Raising a dark theme's muted greys to Lc 75 is a visible
change in character, and Lc in the 50s is defensible for secondary or large text. Record the
decision either way.

In JSON output the advisories are the `polarityAdvisories` array.

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | pass — every required check evaluated and passed |
| `1` | fail — one or more required checks failed |
| `2` | invalid — unknown option or malformed input |
| `3` | incomplete — zero failures, but required evidence was unverified |

Exit `3` is not a pass. It means something could not be checked: a color outside the sRGB gamut,
an unresolved or cyclic `var()`, an unknown translucent backdrop, or an unsupported conditional
at-rule. **A color outside sRGB is a real defect** — a browser silently clips it to something
duller and hue-shifted — so treat `3` as work, not noise.

## Known gaps

- **`--fix` does not write.** It reports suggested replacement values and their verified contrast,
  but the file is unchanged; apply them yourself. The root cause is that the CSS parser strips
  comments before scanning, so token positions cannot be mapped back to the source.
- **`--fix` offers nothing for out-of-gamut colors.** They are reported as unverified, with no
  suggested in-gamut equivalent. Gamut-map them with `theme-book eval` and `culori`'s
  `clampChroma`, which preserves hue and lightness and reduces only chroma.
- Border contrast is advisory by default; `--strict-borders` makes it required.
