# Fixtures

`shadcn-stock-index.css` is the `src/index.css` written by `shadcn init -t vite -b radix -p nova` with shadcn CLI 4.23.0, unedited. It is the oracle for the `shadcn` preset's token set (`test/shadcn-stock.test.ts`). Replace it only with a fresh CLI capture.

`preset-rules.json` records each preset's rules version and the fingerprint of its rules (`presetRulesFingerprint` in `src/books.ts`). The fingerprint test fails when a rule, a helper scope, an extra or the pool generation changes. When that happens, bump the preset's `PRESET_RULES_VERSION` and re-record it:

```bash
bun -e 'import { PRESET_RULES_VERSION, presetRulesFingerprint } from "./src/books"; const o = {}; for (const p of ["shadcn", "semantic", "slide-deck"]) o[p] = { version: PRESET_RULES_VERSION[p], fingerprint: presetRulesFingerprint(p) }; await Bun.write("test/fixtures/preset-rules.json", JSON.stringify(o, null, 2) + "\n")'
```
