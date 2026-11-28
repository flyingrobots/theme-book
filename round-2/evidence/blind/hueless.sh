#!/usr/bin/env bash
S=~/.local/state/baker-street/cases/2026-11-27-theme-book-pr30-r2/subject
E=~/.local/state/baker-street/cases/2026-11-27-theme-book-pr30-r2/evidence/blind
cd "$S"
./bin/theme-book theme --seed "#ffffff" --seed "#000000" --preset shadcn --mood corporate --audit > "$E/hueless.css" 2> "$E/hueless.err"; echo "theme exit $?"; sed -n 2p "$E/hueless.css"; grep "Contrast Audit" "$E/hueless.err"
./bin/theme-book audit "$E/hueless.css" > "$E/hueless.audit.out" 2>&1; echo "audit exit $?"; grep "Contrast Audit" "$E/hueless.audit.out"
./bin/theme-book audit "$E/hueless.css" --charts-advisory > "$E/hueless.audit-ca.out" 2>&1; echo "audit --charts-advisory exit $?"; grep "Contrast Audit" "$E/hueless.audit-ca.out"
./bin/theme-book audit "$E/hueless.css" --charts-advisory --format json > "$E/hueless.audit-ca.json" 2>&1; echo "json exit $?"; grep -o '"chartsAdvisory":[a-z]*' "$E/hueless.audit-ca.json" | head -2
./bin/theme-book audit "$E/hueless.css" --format json > "$E/hueless.audit.json" 2>&1; grep -o '"chartsAdvisory":[a-z]*' "$E/hueless.audit.json" | head -2
./bin/theme-book theme --seed "#ffffff" --seed "#000000" --preset shadcn --mood corporate --format json > "$E/hueless.json" 2>/dev/null; grep -o '"chartsAdvisory":[a-z]*' "$E/hueless.json" | head -2
# A grey that is not hueless (chroma 0.005-0.04): charts required.
./bin/theme-book theme --seed "#6b7280" --preset shadcn --mood corporate --audit > "$E/grey.css" 2> "$E/grey.err"; echo "grey exit $?"; sed -n 2p "$E/grey.css"; grep "Contrast Audit" "$E/grey.err"
