import { plugin } from "bun";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";

const RUNTIME_ROOT = resolve(import.meta.dir, "..");
const req = createRequire(join(RUNTIME_ROOT, "package.json"));

const PRIVATE_PACKAGES = new Set([
  "design-book",
  "design-book/engine",
  "design-book/naming",
  "design-book/internals",
  "poline",
  "rampensau",
  "culori",
]);

plugin({
  name: "theme-book-private-packages",
  setup(build) {
    build.onResolve(
      { filter: /^(design-book(\/.*)?|poline|rampensau|culori)$/ },
      (args) => {
        if (!PRIVATE_PACKAGES.has(args.path)) return undefined;
        return { path: req.resolve(args.path) };
      },
    );
  },
});
