#!/usr/bin/env bash
S=~/.local/state/baker-street/cases/2026-11-27-theme-book-pr30-r2/subject
E=~/.local/state/baker-street/cases/2026-11-27-theme-book-pr30-r2/evidence/blind
cd "$S"
for fmt in "" "--hex" "--native"; do
  ./bin/theme-book theme --seed "#b09551" --seed "#a58f24" --seed "#59193b" --preset shadcn --mood corporate --audit $fmt > "$E/case1-cli${fmt}.css" 2> "$E/case1-cli${fmt}.err"; echo "fmt=[$fmt] exit $?"; grep "Contrast Audit" "$E/case1-cli${fmt}.err"; sed -n 2p "$E/case1-cli${fmt}.css"
  ./bin/theme-book audit "$E/case1-cli${fmt}.css" 2>&1 | grep "Contrast Audit"
done
