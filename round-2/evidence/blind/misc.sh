#!/usr/bin/env bash
S=~/.local/state/baker-street/cases/2026-11-27-theme-book-pr30-r2/subject
E=~/.local/state/baker-street/cases/2026-11-27-theme-book-pr30-r2/evidence/blind
cd "$S"
echo "== native: is every var() defined?"
./bin/theme-book theme --seed "#2563eb" --mood corporate --native > "$E/native-corp.css" 2>/dev/null; echo "exit $?"
used=$(grep -o 'var(--[a-z0-9-]*' "$E/native-corp.css" | sed 's/var(//' | sort -u); for v in $used; do grep -q "^ *$v:" "$E/native-corp.css" || echo "UNDEFINED $v"; done | head
./bin/theme-book audit "$E/native-corp.css" 2>&1 | grep "Contrast Audit"
./bin/theme-book theme --seed "#2563eb" --mood editorial --native > "$E/native-ed.css" 2>/dev/null; ./bin/theme-book audit "$E/native-ed.css" 2>&1 | grep "Contrast Audit"
echo "== formats"
for f in json w3-tokens svg; do ./bin/theme-book theme --seed "#2563eb" --mood freak --format $f > "$E/fmt.$f" 2>/dev/null; echo "$f exit $? bytes $(wc -c < "$E/fmt.$f")"; done
echo "== suggest"
for m in corporate freak; do ./bin/theme-book suggest --seed "#2563eb" --mood $m > "$E/suggest-$m.out" 2>&1; echo "suggest $m exit $?"; head -3 "$E/suggest-$m.out"; done
echo "== default preset with derived"
./bin/theme-book theme --seed "#2563eb" --mood freak > /dev/null 2>&1; echo "exit $?"
./bin/theme-book theme --seed "#2563eb" --mood freak --preset slide-deck > /dev/null 2> "$E/sd.err"; echo "slide-deck exit $?: $(cat "$E/sd.err")"
echo "== red brand only: secondary/accent hue"
for m in corporate freak; do ./bin/theme-book theme --seed "#dc2626" --mood $m --hex 2>/dev/null | grep -E -- "--(secondary|accent|primary|destructive):" | head -8 | tr '\n' ' '; echo " [$m]"; done
./bin/theme-book theme --seed "#16a34a" --seed "#ca8a04" --mood freak --hex 2>/dev/null | grep -E -- "--(secondary|accent|primary):" | head -3 | tr '\n' ' '; echo " [green brand + yellow, freak]"
