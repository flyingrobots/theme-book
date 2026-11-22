# Releasing

`theme-book` ships as a CLI, a library, and a skill that is installed into the agent hub. A release
is a git tag plus a GitHub release; there is no npm publish.

1. **Land the work.** `bun test` must pass.
2. **Update `CHANGELOG.md`** under a new version heading. Pre-1.0, a new feature is a minor bump and
   a fix is a patch bump.
3. **Bump `version` in `package.json`** to match.
4. **Commit**, then tag: `git tag -a vX.Y.Z -m "theme-book vX.Y.Z"`.
5. **Push both**: `git push && git push --tags`.
6. **Create the release**: `gh release create vX.Y.Z --title "..." --notes-file <notes>`.
7. **Reinstall locally** so the live skill and CLI match the tag: `./install.sh`, then confirm with
   `sync-agents --check`.

Step 7 matters: the CLI runs from an isolated runtime staged into `~/.theme-book/`, not from this
checkout, so edits here have no effect until `install.sh` runs.
