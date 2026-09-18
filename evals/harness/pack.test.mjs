// node --test --test-concurrency=1 "evals/harness/*.test.mjs"
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { gunzipSync, gzipSync } from "node:zlib";
import { STRIP_SETS, defaultStripLabel, listTgz, matchesStripRule, parseStripArgs, readManifest, readTgzFile, stripRulesFor, stripTgz, tarRecords, verifyTarball } from "./pack.mjs";

/** Minimal ustar writer for fixtures (with an optional pax path record). */
function tarEntry(name, body, { pax } = {}) {
  const blocks = [];
  const header = (n, size, type) => {
    const h = Buffer.alloc(512);
    h.write(n.slice(0, 100), 0);
    h.write("0000644\0", 100);
    h.write("0000000\0", 108);
    h.write("0000000\0", 116);
    h.write(size.toString(8).padStart(11, "0") + "\0", 124);
    h.write("00000000000\0", 136);
    h.write("        ", 148);
    h.write(type, 156);
    h.write("ustar\0", 257);
    h.write("00", 263);
    let sum = 0;
    for (const b of h) sum += b;
    h.write(sum.toString(8).padStart(6, "0") + "\0 ", 148);
    return h;
  };
  const pad = (b) => Buffer.concat([b, Buffer.alloc((512 - (b.length % 512)) % 512)]);
  if (pax) {
    const rec = (k, v) => {
      const base = ` ${k}=${v}\n`;
      let len = base.length + 1;
      while (`${len}${base}`.length !== len) len = `${len}${base}`.length;
      return `${len}${base}`;
    };
    const data = Buffer.from(rec("path", pax));
    blocks.push(header("PaxHeader/x", data.length, "x"), pad(data));
  }
  const data = Buffer.from(body);
  blocks.push(header(name, data.length, "0"), pad(data));
  return Buffer.concat(blocks);
}

function tgz(entries) {
  return gzipSync(Buffer.concat([...entries, Buffer.alloc(1024)]));
}

test("strip rules match the documentation entries and nothing else", () => {
  for (const p of ["llms.txt", "docs/nodes.md", "docs/deep/x.json", "skills/a/SKILL.md"]) assert.equal(matchesStripRule(p), true, p);
  for (const p of ["dist/docs/index.js", "llms.txt.bak", "README.md", "graphs/docs.json", "docsx/a"]) assert.equal(matchesStripRule(p), false, p);
});

test("stripping removes docs entries (pax paths included) and keeps every other byte range", () => {
  const long = `package/docs/${"x".repeat(120)}.md`;
  const input = tgz([
    tarEntry("package/package.json", '{"name":"pcg-ts","version":"0.0.1"}'),
    tarEntry("package/llms.txt", "index"),
    tarEntry("package/docs/short.md", "doc"),
    tarEntry("package/placeholder", "long doc", { pax: long }),
    tarEntry("package/dist/docs/index.js", "code"),
    tarEntry("package/skills/a/SKILL.md", "skill"),
    tarEntry("package/README.md", "readme"),
  ]);
  const { tgz: out, removed } = stripTgz(input);
  assert.deepEqual(removed.sort(), [long.replace("package/", ""), "docs/short.md", "llms.txt", "skills/a/SKILL.md"].sort());
  const dir = mkdtempSync(join(tmpdir(), "pcg-packtest-"));
  try {
    const f = join(dir, "out.tgz");
    writeFileSync(f, out);
    assert.deepEqual(listTgz(f), ["package.json", "dist/docs/index.js", "README.md"]);
    assert.equal(readTgzFile(f, "README.md").toString(), "readme");
    assert.equal(readTgzFile(f, "llms.txt"), null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the graphs strip set takes the corpus and its index, and nothing that is code", () => {
  const rules = STRIP_SETS.graphs;
  for (const p of ["graphs/basics-x.json", "graphs/panels/x.json", "docs/graphs.json", "docs/graphs.md"]) assert.equal(matchesStripRule(p, rules), true, p);
  for (const p of ["docs/nodes.md", "llms.txt", "dist/index.js", "graphsy/a.json", "docs/graphs.schema.json", "README.md"]) assert.equal(matchesStripRule(p, rules), false, p);
});

test("strip sets union in set order, deduplicated, and name their own label", () => {
  assert.deepEqual(stripRulesFor(["docs"]).map((r) => r.path), ["llms.txt", "docs/", "skills/"]);
  assert.deepEqual(stripRulesFor(["docs", "graphs"]).map((r) => r.path), ["llms.txt", "docs/", "skills/", "graphs/", "docs/graphs.json", "docs/graphs.md"]);
  // docs/ already covers docs/graphs.json; the dir rule wins and the union does not repeat it.
  assert.equal(stripRulesFor(["graphs", "docs"]).filter((r) => r.path === "docs/graphs.json").length, 1);
  assert.equal(defaultStripLabel(["docs"]), "stripped");
  assert.equal(defaultStripLabel(["graphs"]), "stripped-graphs");
  assert.equal(defaultStripLabel(["docs", "graphs"]), "stripped-all");
  assert.equal(defaultStripLabel(["graphs", "docs"]), "stripped-all", "set order must not change the label");
  assert.throws(() => stripRulesFor(["prose"]), /unknown strip set\(s\) prose/);
});

test("the strip flags combine, take the tarball from either of them, and refuse an ambiguous one", () => {
  assert.deepEqual(parseStripArgs(["--strip-docs", "a.tgz", "--strip-graphs"]), { sets: ["docs", "graphs"], tarball: "a.tgz" });
  assert.deepEqual(parseStripArgs(["--strip-graphs", "a.tgz", "--strip-docs"]), { sets: ["docs", "graphs"], tarball: "a.tgz" });
  assert.deepEqual(parseStripArgs(["--strip-docs", "--strip-graphs", "--from", "a.tgz"]), { sets: ["docs", "graphs"], tarball: "a.tgz" });
  assert.deepEqual(parseStripArgs(["--strip-graphs", "a.tgz"]), { sets: ["graphs"], tarball: "a.tgz" });
  assert.deepEqual(parseStripArgs(["--strip-docs", "a.tgz", "--strip-docs"]), { sets: ["docs"], tarball: "a.tgz" }, "the same flag twice is still one set");
  assert.equal(parseStripArgs(["--verify", "a.tgz"]), null);
  assert.throws(() => parseStripArgs(["--strip-docs", "a.tgz", "--strip-graphs", "b.tgz"]), /two different source tarballs/);
  assert.throws(() => parseStripArgs(["--strip-docs", "--strip-graphs"]), /no source tarball/);
});

test("stripping both sets removes both and keeps every other byte range", () => {
  const input = tgz([
    tarEntry("package/package.json", '{"name":"pcg-ts","version":"0.0.1"}'),
    tarEntry("package/llms.txt", "index"),
    tarEntry("package/docs/nodes.md", "doc"),
    tarEntry("package/docs/graphs.json", "[]"),
    tarEntry("package/graphs/basics-a.json", "{}"),
    tarEntry("package/graphs/panels/basics-a.json", "{}"),
    tarEntry("package/skills/a/SKILL.md", "skill"),
    tarEntry("package/dist/index.js", "code"),
    tarEntry("package/bin/pcg.mjs", "bin"),
    tarEntry("package/README.md", "readme"),
  ]);
  const both = stripTgz(input, stripRulesFor(["docs", "graphs"]));
  assert.deepEqual(both.removed.sort(), ["docs/graphs.json", "docs/nodes.md", "graphs/basics-a.json", "graphs/panels/basics-a.json", "llms.txt", "skills/a/SKILL.md"]);
  // Graphs alone must leave the prose but take the index with the bodies.
  const graphsOnly = stripTgz(input, stripRulesFor(["graphs"]));
  assert.deepEqual(graphsOnly.removed.sort(), ["docs/graphs.json", "graphs/basics-a.json", "graphs/panels/basics-a.json"]);
  const dir = mkdtempSync(join(tmpdir(), "pcg-packtest-"));
  try {
    const f = join(dir, "all.tgz");
    writeFileSync(f, both.tgz);
    assert.deepEqual(listTgz(f), ["package.json", "dist/index.js", "bin/pcg.mjs", "README.md"]);
    assert.equal(readTgzFile(f, "bin/pcg.mjs").toString(), "bin");
    assert.equal(readTgzFile(f, "graphs/basics-a.json"), null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

const TARBALLS = "D:/Projects/JS/pcg-ts/evals/tarballs";
const BASELINE = `${TARBALLS}/baseline-0.17.0-0ad6998.tgz`;
const STRIPPED_ALL = `${TARBALLS}/stripped-all-0.17.0-9284b1f.tgz`;

test("the real baseline strips to exactly llms.txt, docs/ and skills/", { skip: !existsSync(BASELINE) && "baseline tarball not on this machine" }, async () => {
  const { readFileSync } = await import("node:fs");
  const { removed } = stripTgz(readFileSync(BASELINE));
  assert.ok(removed.includes("llms.txt"));
  assert.ok(removed.every((p) => p === "llms.txt" || p.startsWith("docs/") || p.startsWith("skills/")));
  assert.equal(removed.filter((p) => p.startsWith("skills/")).length, 3);
  assert.ok(tarRecords(gunzipSync(readFileSync(BASELINE))).some((r) => r.path === "package/dist/docs/index.js"), "dist/docs is code and stays");
});

test("the stripped-all arm has lost the corpus and the prose, and kept the package", { skip: !existsSync(STRIPPED_ALL) && "stripped-all tarball not on this machine" }, () => {
  const entries = listTgz(STRIPPED_ALL);
  for (const p of entries) assert.ok(!matchesStripRule(p, stripRulesFor(["docs", "graphs"])), `${p} should have been stripped`);
  assert.equal(entries.filter((p) => p.startsWith("graphs/")).length, 0);
  assert.equal(entries.filter((p) => p.startsWith("docs/")).length, 0);
  assert.ok(entries.includes("package.json"));
  assert.ok(entries.some((p) => p.startsWith("bin/")), "the CLI is still there");
  assert.ok(entries.some((p) => p.startsWith("dist/")), "the library is still there");
  const m = readManifest(STRIPPED_ALL);
  assert.deepEqual(m.stripSets, ["docs", "graphs"]);
  assert.ok(m.removed.some((p) => p.startsWith("graphs/")) && m.removed.includes("llms.txt"));
  assert.equal(m.derivedFrom.file, "candidate-U1-0.17.0-9284b1f.tgz");
  assert.ok(typeof m.derivedFrom.sha256 === "string" && m.derivedFrom.sha256.length === 64);
  assert.match(m.verification, /pcg --help ok/);
});

// Slow: installs the tarball into a scratch sandbox. It is the only check
// that the arm the campaign will actually run is a working package.
test("the stripped-all tarball installs and its CLI runs; corpus commands degrade without crashing", { skip: !existsSync(STRIPPED_ALL) && "stripped-all tarball not on this machine" }, () => {
  const r = verifyTarball(STRIPPED_ALL);
  assert.equal(r.ok, true, r.detail);
  assert.match(r.detail, /pcg nodes --json lists \d+ node types/);
  const by = Object.fromEntries(r.degradation.map((d) => [d.command, d]));
  for (const d of r.degradation) assert.equal(d.crashed, false, `${d.command} printed a stack trace: ${d.firstLine}`);
  // A node type's page still answers; only its example list is gone.
  assert.equal(by["pcg nodes pointScatterInBounds"].exitCode, 0);
  // `pcg graphs` IS the corpus, so it fails — but with a named cause, not a crash.
  assert.equal(by["pcg graphs"].exitCode, 1);
  assert.match(by["pcg graphs"].firstLine, /graphs:.*graphs\.json/);
});
