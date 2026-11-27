#!/usr/bin/env bash
set -euo pipefail

# Install theme-book into an isolated runtime directory (default ~/.theme-book)
# so WIP edits in ~/git/theme-book never disturb your live CLI or agents.
#
# Safety properties:
# - Canonicalizes --prefix and --bin-dir to absolute paths (no broken relative symlinks).
# - Refuses /, $HOME, or any existing non-empty directory that lacks .theme-book-install
#   (unless it matches the exact baseline legacy layout: package.json "name":"theme-book"
#    + bin/theme-book + src/cli.ts, which is upgraded cleanly).
# - Performs backup-and-swap replacement with automatic rollback on failure.

REPO_DIR="$(cd -P "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RAW_INSTALL_DIR="${THEME_BOOK_HOME:-$HOME/.theme-book}"
RAW_BIN_DIR="${BIN_DIR:-$HOME/.local/bin}"
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
    --prefix)   RAW_INSTALL_DIR="$2"; shift ;;
    --prefix=*) RAW_INSTALL_DIR="${1#--prefix=}" ;;
    --bin-dir)  RAW_BIN_DIR="$2"; shift ;;
    --bin-dir=*) RAW_BIN_DIR="${1#--bin-dir=}" ;;
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

expand_tilde() {
  local p="$1"
  case "$p" in
    "~")   printf '%s\n' "$HOME" ;;
    "~/"*) printf '%s/%s\n' "$HOME" "${p:2}" ;;
    *)     printf '%s\n' "$p" ;;
  esac
}

canonicalize_path() {
  local p
  p="$(expand_tilde "$1")"
  if [[ "$p" != "/" ]]; then
    p="${p%/}"
  fi
  local parent base
  parent="$(dirname "$p")"
  base="$(basename "$p")"
  if [[ "$p" == "/" ]]; then
    printf '/\n'
    return 0
  fi
  mkdir -p "$parent"
  local abs_parent
  abs_parent="$(cd -P "$parent" && pwd)"
  if [[ "$base" == "." ]]; then
    printf '%s\n' "$abs_parent"
  elif [[ "$base" == ".." ]]; then
    (cd -P "$abs_parent/.." && pwd)
  elif [[ "$abs_parent" == "/" ]]; then
    printf '/%s\n' "$base"
  else
    printf '%s/%s\n' "$abs_parent" "$base"
  fi
}

INSTALL_DIR="$(canonicalize_path "$RAW_INSTALL_DIR")"
BIN_DIR="$(canonicalize_path "$RAW_BIN_DIR")"
ABS_HOME="$(cd -P "$HOME" && pwd)"

# Guard against dangerous destination paths
if [[ "$INSTALL_DIR" == "/" || "$INSTALL_DIR" == "$ABS_HOME" || -z "$INSTALL_DIR" ]]; then
  echo "install.sh: refusing unsafe --prefix: $INSTALL_DIR" >&2
  exit 1
fi

if [[ -L "$INSTALL_DIR" ]]; then
  echo "install.sh: refusing to overwrite symlink at --prefix: $INSTALL_DIR" >&2
  exit 1
fi

is_legacy_theme_book_dir() {
  local dir="$1"
  [[ -f "$dir/package.json" && -f "$dir/bin/theme-book" && -f "$dir/src/cli.ts" ]] || return 1
  grep -Eq '"name"[[:space:]]*:[[:space:]]*"theme-book"' "$dir/package.json"
}

is_dir_empty() {
  local dir="$1"
  [[ -z "$(ls -A "$dir" 2>/dev/null)" ]]
}

if [[ -e "$INSTALL_DIR" ]]; then
  if [[ ! -d "$INSTALL_DIR" ]]; then
    echo "install.sh: --prefix exists and is not a directory: $INSTALL_DIR" >&2
    exit 1
  fi
  if [[ -f "$INSTALL_DIR/.theme-book-install" ]]; then
    : # Existing marked theme-book installation — safe to upgrade
  elif is_dir_empty "$INSTALL_DIR"; then
    : # Empty directory — safe to install into
  elif is_legacy_theme_book_dir "$INSTALL_DIR"; then
    echo "[migrate] upgrading legacy theme-book installation at $INSTALL_DIR"
  else
    echo "install.sh: refusing to overwrite existing non-empty directory without .theme-book-install marker: $INSTALL_DIR" >&2
    exit 1
  fi
fi

PARENT_DIR="$(dirname "$INSTALL_DIR")"
mkdir -p "$PARENT_DIR" "$BIN_DIR"

STAGE_DIR="$(mktemp -d "$PARENT_DIR/.theme-book-stage.XXXXXX")"
BACKUP_DIR=""

cleanup() {
  if [[ -n "${STAGE_DIR:-}" && -d "$STAGE_DIR" ]]; then
    rm -rf "$STAGE_DIR"
  fi
  if [[ -n "${BACKUP_DIR:-}" && -d "$BACKUP_DIR" && ! -d "$INSTALL_DIR" ]]; then
    mv "$BACKUP_DIR" "$INSTALL_DIR" || true
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
# design-book is installed from a vendored build (see vendor/README.md).
cp -R "$REPO_DIR/vendor" "$STAGE_DIR/vendor"
printf 'theme-book-install-v1\n' > "$STAGE_DIR/.theme-book-install"
chmod 755 "$STAGE_DIR" "$STAGE_DIR/bin/theme-book" "$STAGE_DIR/src/cli.ts"

(cd "$STAGE_DIR" && bun install --production --frozen-lockfile --silent)

# Backup-and-swap so a failed move rolls back cleanly
if [[ -d "$INSTALL_DIR" ]]; then
  BACKUP_DIR="$(mktemp -d "$PARENT_DIR/.theme-book-prev.XXXXXX")"
  rmdir "$BACKUP_DIR"
  mv "$INSTALL_DIR" "$BACKUP_DIR"
fi

mv "$STAGE_DIR" "$INSTALL_DIR"
STAGE_DIR=""

if [[ -n "$BACKUP_DIR" && -d "$BACKUP_DIR" ]]; then
  rm -rf "$BACKUP_DIR"
  BACKUP_DIR=""
fi

ln -sfn "$INSTALL_DIR/bin/theme-book" "$BIN_DIR/theme-book"
echo "[install] theme-book -> $INSTALL_DIR"
echo "[install] symlink    -> $BIN_DIR/theme-book"

if [[ "$INSTALL_SKILL" -eq 1 ]] && command -v sync-agents >/dev/null 2>&1; then
  sync-agents --force --skill "$INSTALL_DIR/skills/theme-book"
fi
