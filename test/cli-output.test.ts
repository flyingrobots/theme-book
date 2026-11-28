/**
 * The CLI's output contract (flyingrobots/theme-book#36): Parley-vous JSON Lines by default,
 * `--human` for the 0.5.0 prose, exit statuses per Parley-vous spec §3.4.
 */
import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { evaluateAudit, parseTokensFromText } from "../src/audit";
import { suggestCompanionColors } from "../src/books";

const ROOT = resolve(import.meta.dir, "..");
const CLI = join(ROOT, "bin", "theme-book");
const FIX = join(ROOT, "test", "fixtures", "human-0.5.0");
const SEED = "#2563eb";

interface Line {
  event: string;
  _schema: { id: string; version: string };
  [key: string]: unknown;
}

/** Runs the CLI in a fresh working directory, so its receipts land outside the repository. */
function cli(args: string[]) {
  const cwd = mkdtempSync(join(tmpdir(), "theme-book-cli-"));
  try {
    const r = Bun.spawnSync([CLI, ...args], { cwd, stdout: "pipe", stderr: "pipe" });
    return { status: r.exitCode, stdout: r.stdout.toString(), stderr: r.stderr.toString(), cwd };
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

/** Every non-empty line of a stream, parsed; a line that is not a JSON object fails the test. */
function lines(stream: string): Line[] {
  return stream
    .split("\n")
    .filter((l) => l.length > 0)
    .map((l) => {
      const v = JSON.parse(l) as Line;
      expect(typeof v).toBe("object");
      expect(typeof v._schema?.id).toBe("string");
      expect(typeof v._schema?.version).toBe("string");
      return v;
    });
}

function only(ls: Line[], id: string): Line {
  const hits = ls.filter((l) => l._schema.id === id);
  expect(hits.map((l) => l._schema.id)).toEqual([id]);
  return hits[0]!;
}

const fixture = (name: string) => readFileSync(join(FIX, name), "utf8");

describe("JSON Lines by default", () => {
  test("suggest: bootstrap, one theme-book.suggest.result carrying the library's answer, end 0", () => {
    const r = cli(["suggest", "--seed", SEED]);
    expect(r.status).toBe(0);
    const out = lines(r.stdout);
    lines(r.stderr);
    expect(out[0]!._schema.id).toBe("parley-vous.run.bootstrap");
    expect(out.at(-1)!._schema.id).toBe("parley-vous.end");
    expect(out.at(-1)!.status).toBe(0);
    const result = only(out, "theme-book.suggest.result");
    expect(result._schema.version).toBe("1.0.0");
    expect(result.suggestion).toEqual(JSON.parse(JSON.stringify(suggestCompanionColors({ seeds: [SEED] }))));
  });

  test("theme: the result line carries the rendered theme in the requested format", () => {
    const r = cli(["theme", "--seed", SEED]);
    expect(r.status).toBe(0);
    const result = only(lines(r.stdout), "theme-book.theme.result");
    expect(result._schema.version).toBe("1.0.0");
    expect(result.format).toBe("css");
    expect(result.text).toBe(fixture("theme.css"));
    expect(result.path).toBeUndefined();
  });

  test("theme --out: the file holds the theme and the result line names the path instead of the text", () => {
    const dir = mkdtempSync(join(tmpdir(), "theme-book-out-"));
    try {
      const path = join(dir, "tokens.css");
      const r = cli(["theme", "--seed", SEED, "--out", path]);
      expect(r.status).toBe(0);
      expect(readFileSync(path, "utf8")).toBe(fixture("theme.css"));
      const result = only(lines(r.stdout), "theme-book.theme.result");
      expect(result.path).toBe(path);
      expect(result.text).toBeUndefined();
      lines(r.stderr);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("theme --audit: the audit rides on the result line", () => {
    const r = cli(["theme", "--seed", SEED, "--audit"]);
    expect(r.status).toBe(0);
    const result = only(lines(r.stdout), "theme-book.theme.result");
    expect((result.audit as { status: string }).status).toBe("pass");
    lines(r.stderr);
  });

  test("audit: one theme-book.audit.report carrying the library's report", () => {
    const file = join(FIX, "theme.css");
    const r = cli(["audit", file]);
    expect(r.status).toBe(0);
    const report = only(lines(r.stdout), "theme-book.audit.report");
    expect(report._schema.version).toBe("1.0.0");
    const expected = evaluateAudit(parseTokensFromText(fixture("theme.css"), file), { standard: "wcag-aa" });
    expect(report.report).toEqual(JSON.parse(JSON.stringify(expected)));
    lines(r.stderr);
  });
});

describe("exit statuses follow Parley-vous spec §3.4", () => {
  test("a failed audit exits 1 and still ends the run", () => {
    const r = cli(["audit", join(FIX, "audit-fail.css")]);
    expect(r.status).toBe(1);
    const out = lines(r.stdout);
    expect(out.at(-1)!.status).toBe(1);
  });

  test("an incomplete audit exits 5, never 3", () => {
    const r = cli(["audit", join(FIX, "audit-incomplete.css")]);
    expect(r.status).toBe(5);
    expect(lines(r.stdout).at(-1)!.status).toBe(5);
  });

  test("an unknown option is a usage error before the bootstrap line: exit 3, one startup.failed line, empty stdout", () => {
    const r = cli(["theme", "--seed", SEED, "--bogus-flag"]);
    expect(r.status).toBe(3);
    expect(r.stdout).toBe("");
    const err = lines(r.stderr);
    expect(err.map((l) => l._schema.id)).toEqual(["parley-vous.startup.failed"]);
  });

  test("a missing audit file is a usage error too", () => {
    const r = cli(["audit", "no-such-file.css"]);
    expect(r.status).toBe(3);
    expect(r.stdout).toBe("");
    expect(lines(r.stderr).map((l) => l._schema.id)).toEqual(["parley-vous.startup.failed"]);
  });
});

describe("discovery", () => {
  test("--schema prints schema lines for theme-book's three result messages and exits 0", () => {
    const r = cli(["--schema"]);
    expect(r.status).toBe(0);
    const ids = lines(r.stdout).map((l) => l._schema.id);
    expect(ids).toContain("parley-vous.schema");
    const described = lines(r.stdout)
      .filter((l) => l._schema.id === "parley-vous.schema")
      .map((l) => (l.schema as { id: string }).id);
    for (const id of ["theme-book.suggest.result", "theme-book.theme.result", "theme-book.audit.report"]) {
      expect(described).toContain(id);
    }
  });

  test("<command> --help is a command line and exits 0", () => {
    for (const cmd of ["suggest", "theme", "audit"]) {
      const r = cli([cmd, "--help"]);
      expect(r.status).toBe(0);
      expect(lines(r.stdout).map((l) => l._schema.id)).toContain("parley-vous.command");
    }
  });

  test("every theme-book message has its schema under schemas/", () => {
    for (const id of ["theme-book.suggest.result", "theme-book.theme.result", "theme-book.audit.report"]) {
      const path = join(ROOT, "schemas", `${id}.schema.json`);
      expect(existsSync(path)).toBe(true);
      const schema = JSON.parse(readFileSync(path, "utf8")) as { properties: { _schema: { properties: { id: { const: string } } } } };
      expect(schema.properties._schema.properties.id.const).toBe(id);
    }
  });
});

describe("--human gives back the 0.5.0 prose", () => {
  test("suggest", () => {
    const r = cli(["suggest", "--seed", SEED, "--human"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toBe(fixture("suggest.txt"));
  });

  test("theme", () => {
    const r = cli(["theme", "--seed", SEED, "--human"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toBe(fixture("theme.css"));
  });

  test("audit, passing and failing", () => {
    const pass = cli(["audit", join(FIX, "theme.css"), "--human"]);
    expect(pass.status).toBe(0);
    expect(pass.stdout).toBe(fixture("audit.txt"));
    const failed = cli(["audit", join(FIX, "audit-fail.css"), "--human"]);
    expect(failed.status).toBe(1);
    expect(failed.stdout).toStartWith(fixture("audit-fail.txt"));
  });
});
