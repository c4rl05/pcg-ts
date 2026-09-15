// node --test --test-concurrency=1 "evals/harness/*.test.mjs"
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { gunzipSync, gzipSync } from "node:zlib";
import { listTgz, matchesStripRule, readTgzFile, stripTgz, tarRecords } from "./pack.mjs";

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

const BASELINE = "D:/Projects/JS/pcg-ts/evals/tarballs/baseline-0.17.0-0ad6998.tgz";
test("the real baseline strips to exactly llms.txt, docs/ and skills/", { skip: !existsSync(BASELINE) && "baseline tarball not on this machine" }, async () => {
  const { readFileSync } = await import("node:fs");
  const { removed } = stripTgz(readFileSync(BASELINE));
  assert.ok(removed.includes("llms.txt"));
  assert.ok(removed.every((p) => p === "llms.txt" || p.startsWith("docs/") || p.startsWith("skills/")));
  assert.equal(removed.filter((p) => p.startsWith("skills/")).length, 3);
  assert.ok(tarRecords(gunzipSync(readFileSync(BASELINE))).some((r) => r.path === "package/dist/docs/index.js"), "dist/docs is code and stays");
});
