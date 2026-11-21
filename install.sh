#!/usr/bin/env bash
set -euo pipefail

# Install theme-book into an isolated runtime directory (default ~/.theme-book)
# so WIP edits in ~/git/theme-book never disturb your live CLI or agents.

REPO_DIR="$(cd -P "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="${THEME_BOOK_HOME:-$HOME/.theme-book}"
BIN_DIR="${BIN_DIR:-$HOME/.local/bin}"
INSTALL_SKILL=1

usage() {
  cat <<'EOF'
Usage: ./install.sh [OPTIONS]

Install theme-book into ~/.theme-book, install its production dependencies,
symlink ~/.local/bin/theme-book, and sync skills/theme-book via sync-agents.

Options:
  --prefix <dir>   Install directory (default: ~/.theme-book)
  --bin-dir <dir>  Directory for theme-book symlink (default: ~/.local/bin)
  --no-skill       Skip syncing skills/theme-book via sync-agents
  -h, --help       Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --prefix)   INSTALL_DIR="$2"; shift ;;
    --bin-dir)  BIN_DIR="$2"; shift ;;
    --no-skill) INSTALL_SKILL=0 ;;
    -h|--help)  usage; exit 0 ;;
    *)          echo "install.sh: unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
  shift
done

if ! command -v bun >/dev/null 2>&1; then
  echo "install.sh: bun is required (https://bun.sh)" >&2
  exit 1
fi

PARENT_DIR="$(dirname "$INSTALL_DIR")"
mkdir -p "$PARENT_DIR" "$BIN_DIR"

STAGE_DIR="$(mktemp -d "$PARENT_DIR/.theme-book-stage.XXXXXX")"
cleanup() {
  if [[ -n "${STAGE_DIR:-}" && -d "$STAGE_DIR" ]]; then
    rm -rf "$STAGE_DIR"
  fi
}
trap cleanup EXIT

cp "$REPO_DIR/package.json" "$STAGE_DIR/package.json"
if [[ -f "$REPO_DIR/bun.lock" ]]; then
  cp "$REPO_DIR/bun.lock" "$STAGE_DIR/bun.lock"
fi
cp -R "$REPO_DIR/bin" "$STAGE_DIR/bin"
cp -R "$REPO_DIR/src" "$STAGE_DIR/src"
cp -R "$REPO_DIR/skills" "$STAGE_DIR/skills"
chmod 755 "$STAGE_DIR" "$STAGE_DIR/bin/theme-book" "$STAGE_DIR/src/cli.ts"

(cd "$STAGE_DIR" && bun install --production --silent)

rm -rf "$INSTALL_DIR"
mv "$STAGE_DIR" "$INSTALL_DIR"
STAGE_DIR=""

ln -sfn "$INSTALL_DIR/bin/theme-book" "$BIN_DIR/theme-book"
echo "[install] theme-book -> $INSTALL_DIR"
echo "[install] symlink    -> $BIN_DIR/theme-book"

if [[ "$INSTALL_SKILL" -eq 1 ]] && command -v sync-agents >/dev/null 2>&1; then
  sync-agents --force --skill "$INSTALL_DIR/skills/theme-book"
fi
