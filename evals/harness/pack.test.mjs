// node --test --test-concurrency=1 "evals/harness/*.test.mjs"
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { gunzipSync, gzipSync } from "node:zlib";
import { STRIP_SETS, defaultStripLabel, findDanglingRefs, listTgz, matchesStripRule, parseStripArgs, readManifest, readTgzFile, stripRulesFor, stripTarball, stripTgz, tarRecords, verifyTarball } from "./pack.mjs";
import { DanglingReferenceError, findStrippedRefsInText, rewriteStrippedRefs } from "./refs.mjs";

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

// ---------------------------------------------------------------------------
// --strip-graphs rewrites what still names the corpus (refs.mjs)

const NOT_HERE = "not included in this package";

function corpusFixture() {
  return tgz([
    tarEntry("package/package.json", JSON.stringify({ name: "pcg-ts", version: "0.0.1", files: ["bin", "dist", "docs/graphs.md", "docs/graphs.json", "graphs", "skills"] }, null, 2) + "\n"),
    tarEntry("package/llms.txt", "- [Graph corpus](docs/graphs.md): the index (JSON: [graphs.json](docs/graphs.json))\n- [Example graphs](graphs/): the corpus files themselves\n"),
    tarEntry(
      "package/docs/nodes.md",
      "## arcTile\n\n**Examples:** [basics-a.json](../graphs/basics-a.json), [examples-b.json](../graphs/examples-b.json) — 2 total (`pcg graphs --node arcTile`)\n\nA tile along an arc.\n",
    ),
    tarEntry("package/docs/nodes.json", JSON.stringify([{ type: "arcTile", description: "see graphs/basics-a.json for the idea" }], null, 2)),
    tarEntry("package/docs/graphs.json", "[]"),
    tarEntry("package/docs/graphs.md", "# corpus"),
    tarEntry("package/graphs/basics-a.json", "{}"),
    tarEntry("package/graphs/examples-b.json", "{}"),
    tarEntry("package/graphs/panels/basics-a.json", "{}"),
    tarEntry("package/skills/a/SKILL.md", "Read `docs/graphs.md`, then `graphs/examples-b.json`. Every graph under `graphs/` cooks.\n"),
    tarEntry("package/README.md", "See [the source](https://github.com/x/pcg-ts/tree/main/graphs/basics-a.json) and the corpus graph `basics-a.json`.\n"),
    tarEntry("package/dist/index.js", "// graphs/basics-a.json is cited in code and stays\n"),
  ]);
}

/** Every ustar header in a tar must carry a checksum that matches its bytes. */
function assertChecksums(tar) {
  for (const rec of tarRecords(tar)) {
    const off = rec.end - Math.ceil((rec.size ?? 0) / 512) * 512 - 512;
    const h = Buffer.from(tar.subarray(off, off + 512));
    const stored = parseInt(h.subarray(148, 156).toString("latin1").replace(/[\0 ]+$/, ""), 8);
    h.fill(0x20, 148, 156);
    let sum = 0;
    for (const b of h) sum += b;
    assert.equal(stored, sum, `checksum of ${rec.path}`);
  }
}

test("the corpus-reference rewrite keeps the sentence, says what is missing, and spares URLs", () => {
  const names = ["basics-a", "examples-b"];
  const src = [
    "**Examples:** [basics-a.json](../graphs/basics-a.json), [examples-b.json](../graphs/examples-b.json) — 2 total",
    "every graph under `graphs/` cooks; panels live in `graphs/panels/`",
    "see graphs/basics-a.json. Then `docs/graphs.md`.",
    "the stages (`graphs/pipeline-*.json`)",
    "the hosted [editor](https://c4rl05.github.io/pcg-ts/editor/?graph=basics-a) and [tree](https://github.com/x/pcg-ts/tree/main/graphs/basics-a.json)",
    "`docs/graph.schema.json` is not the index",
  ].join("\n");
  const { text, count } = rewriteStrippedRefs(src, names);
  assert.equal(count, 7);
  assert.deepEqual(findStrippedRefsInText(text, names), []);
  const lines = text.split("\n");
  assert.equal(lines[0], `**Examples:** basics-a, examples-b (corpus examples, ${NOT_HERE}) — 2 total`);
  assert.equal(lines[1], `every graph under the graph corpus (${NOT_HERE}) cooks; panels live in the corpus panel specs (${NOT_HERE})`);
  assert.equal(lines[2], `see basics-a (corpus example, ${NOT_HERE}). Then the corpus index (${NOT_HERE}).`);
  assert.equal(lines[3], `the stages (\`pipeline-*\` (corpus examples, ${NOT_HERE}))`);
  assert.equal(lines[4], src.split("\n")[4], "web URLs resolve outside the package and stay");
  assert.equal(lines[5], src.split("\n")[5]);
});

test("any relative prefix is rewritten, and a form the rewrite does not know still fails the scan", () => {
  const names = ["basics-a"];
  for (const form of ["../../graphs/basics-a.json", "pcg-ts/graphs/basics-a.json", "$PKG/graphs/basics-a.json", "~/graphs/basics-a.json", "node_modules\\pcg-ts\\graphs\\basics-a.json"]) {
    const { text, count } = rewriteStrippedRefs(`open ${form} first`, names);
    assert.equal(count, 1, form);
    assert.equal(text, `open basics-a (corpus example, ${NOT_HERE}) first`, form);
    assert.deepEqual(findStrippedRefsInText(text, names), [], form);
  }
  // The scan does not share the rewrite's patterns, so what the rewrite
  // misses is reported instead of passing silently.
  const missed = "see C:/pkg/graphs/basics-a.json";
  assert.equal(rewriteStrippedRefs(missed, names).count, 0);
  assert.deepEqual(findStrippedRefsInText(missed, names), [{ line: 1, match: "C:/pkg/graphs/basics-a.json" }]);
});

test("--strip-graphs rewrites every prose file in the packed copy and leaves no dangling corpus reference", () => {
  const dir = mkdtempSync(join(tmpdir(), "pcg-packtest-"));
  try {
    const src = join(dir, "fixture-0.0.1.tgz");
    writeFileSync(src, corpusFixture());
    const { path, manifest } = stripTarball({ tarball: src, sets: ["graphs"], outDir: join(dir, "out"), verify: false });
    assert.match(manifest.danglingCheck, /^0 references/);
    assert.deepEqual(manifest.rewritten.map((r) => r.file).sort(), ["README.md", "docs/nodes.json", "docs/nodes.md", "llms.txt", "package.json", "skills/a/SKILL.md"]);
    assert.deepEqual(findDanglingRefs(path, ["basics-a", "examples-b"]), []);
    assertChecksums(gunzipSync(readFileSync(path)));
    const read = (p) => readTgzFile(path, p).toString("utf8");
    assert.match(read("docs/nodes.md"), new RegExp(`^\\*\\*Examples:\\*\\* basics-a, examples-b \\(corpus examples, ${NOT_HERE}\\) — 2 total`, "m"));
    assert.match(read("docs/nodes.md"), /A tile along an arc\./, "the per-node reference is untouched");
    assert.deepEqual(JSON.parse(read("package.json")).files, ["bin", "dist", "skills"]);
    assert.match(JSON.parse(read("docs/nodes.json"))[0].description, new RegExp(`see basics-a \\(corpus example, ${NOT_HERE}\\) for the idea`));
    assert.match(read("README.md"), /tree\/main\/graphs\/basics-a\.json/, "a web link is not a dangling one");
    assert.equal(read("dist/index.js"), "// graphs/basics-a.json is cited in code and stays\n", "code is never rewritten");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("without the rewrite the same pack fails with a DanglingReferenceError naming each file", () => {
  const dir = mkdtempSync(join(tmpdir(), "pcg-packtest-"));
  try {
    const src = join(dir, "fixture-0.0.1.tgz");
    writeFileSync(src, corpusFixture());
    const outDir = join(dir, "out");
    let caught;
    try {
      stripTarball({ tarball: src, sets: ["graphs"], outDir, verify: false, rewrite: false });
    } catch (err) {
      caught = err;
    }
    assert.ok(caught instanceof DanglingReferenceError, `expected a DanglingReferenceError, got ${caught}`);
    assert.equal(caught.name, "DanglingReferenceError");
    const files = new Set(caught.hits.map((h) => h.file));
    for (const f of ["docs/nodes.md", "llms.txt", "skills/a/SKILL.md", "README.md", "package.json", "docs/nodes.json"]) assert.ok(files.has(f), `${f} not reported`);
    assert.ok(caught.hits.some((h) => h.file === "docs/nodes.md" && h.line === 3 && h.match === "../graphs/basics-a.json"));
    assert.deepEqual(readdirSync(outDir).filter((f) => f.endsWith(".tgz")), [], "the failed tarball is deleted");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// The newest real arm that still ships the corpus: the one the last campaign ran.
const WITH_CORPUS = `${TARBALLS}/ab-B-0.18.0-d30ae21.tgz`;

test("the real package strips its corpus with no dangling reference left, and the check bites without the rewrite", { skip: !existsSync(WITH_CORPUS) && "ab-B tarball not on this machine" }, () => {
  const dir = mkdtempSync(join(tmpdir(), "pcg-packtest-"));
  try {
    const { path, manifest } = stripTarball({ tarball: WITH_CORPUS, sets: ["graphs"], outDir: dir, label: "t", verify: false });
    const names = manifest.removed.filter((p) => /^graphs\/[^/]+\.json$/.test(p)).map((p) => p.slice(7, -5));
    assert.ok(names.length > 100);
    assert.deepEqual(findDanglingRefs(path, names), []);
    const nodes = manifest.rewritten.find((r) => r.file === "docs/nodes.md");
    assert.ok(nodes && nodes.references >= 150, `docs/nodes.md rewrote ${nodes?.references} references`);
    assertChecksums(gunzipSync(readFileSync(path)));
    assert.throws(
      () => stripTarball({ tarball: WITH_CORPUS, sets: ["graphs"], outDir: dir, label: "t-raw", verify: false, rewrite: false }),
      (err) => err instanceof DanglingReferenceError && err.hits.filter((h) => h.file === "docs/nodes.md").length >= 150,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
