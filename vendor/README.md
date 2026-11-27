# Vendored builds

## design-book

`design-book-0.26.0+main.2d80b33.tgz` is an unmodified build of [`meodai/design-book`](https://github.com/meodai/design-book) at commit `2d80b33`, nine commits past the `v0.26.0` release on npm. theme-book uses that commit's unreleased engine: a book that measures APCA itself (`contrast: 'apca'`), contrast thresholds given as text styles, and selectors rendered as `var()`.

It is vendored because no release contains those commits yet (meodai/design-book#5 asks whether one is planned), and because an install from git has no `dist/`: design-book builds only before publishing. meodai/design-book#4 offers a `prepare` script that fixes the second problem for npm.

The `+main.2d80b33` build metadata in the version makes a recipe record the commit that ran (`recipe.designBookVersion`), not the `0.26.0` that `main`'s `package.json` still names. `bun.lock` pins the tarball by its sha512.

design-book is AGPL-3.0-only; its licence ships inside the tarball.

To rebuild at another commit:

```bash
git clone https://github.com/meodai/design-book.git && cd design-book
git checkout <sha>
npm ci --ignore-scripts && npm run build
npm pkg set version=<base>+main.<sha>
npm pack --pack-destination <theme-book>/vendor
```

_Listing 1. Building and packing a design-book commit for this directory._

Then point `package.json` at the new file, run `bun install`, and delete the old tarball. When design-book publishes a release that contains the commit, return to the npm version and delete this directory.
