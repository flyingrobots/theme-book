#!/usr/bin/env bash
# Reproduce docs/topics/derived-moods Listing 1/2 and the stated aaa/apca failure counts.
S=~/.local/state/baker-street/cases/2026-11-27-theme-book-pr30-r2/subject
E=~/.local/state/baker-street/cases/2026-11-27-theme-book-pr30-r2/evidence/blind
cd "$S"
SEEDS=(--seed "#e88e8d" --seed "#79cce2" --seed "#d1a45f" --seed "#60bd90" --seed "#cfa0e8" --seed "#292c2f")
./bin/theme-book theme "${SEEDS[@]}" --preset shadcn --mood corporate --audit --hex > "$E/listing1.css" 2> "$E/listing1.err"; echo "theme exit $?"
./bin/theme-book audit "$E/listing1.css" > "$E/listing1.audit.out" 2>&1; echo "audit exit $?"
for st in wcag-aaa apca; do
  ./bin/theme-book theme "${SEEDS[@]}" --preset shadcn --mood corporate --audit --hex --standard $st > "$E/listing1.$st.css" 2> "$E/listing1.$st.err"; echo "$st exit $?"
done
./bin/theme-book theme "${SEEDS[@]}" --preset shadcn --mood corporate --preset semantic > /dev/null 2> "$E/semantic.err"; echo "semantic exit $?"
./bin/theme-book theme "${SEEDS[@]}" --preset shadcn --mood corporate --hex --generator poline > "$E/listing1.poline.css" 2>/dev/null; echo "poline exit $?"
