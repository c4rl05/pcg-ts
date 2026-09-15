/**
 * Tarballs the eval installs, and the manifests that pin them.
 *
 *   node evals/harness/pack.mjs --from-repo [--label candidate] [--role "..."] [--out evals/tarballs]
 *   node evals/harness/pack.mjs --strip-docs <tgz> [--label stripped] [--out <dir of tgz>] [--no-verify]
 *   node evals/harness/pack.mjs --verify <tgz>
 *
 * --from-repo builds the current tree and packs it to
 * `<label>-<version>-<sha7>.tgz` beside a `<same>.manifest.json`
 * `{ role, file, sha256, version, gitSha, dirty, node, packedAt }`.
 *
 * --strip-docs derives the documentation-blind arm: the same package with
 * `llms.txt`, `docs/` and `skills/` removed and every other byte of every
 * other entry kept. The tar stream is filtered block by block rather than
 * extracted and re-packed, so nothing else can change (no re-ordered
 * entries, no new mtimes, no platform tar differences). The manifest gains
 * `derivedFrom: { file, sha256 }` and the list of removed entries. The result
 * is installed into a scratch sandbox and `pcg --help` and `pcg nodes --json`
 * must run, or the tarball is deleted and the command fails.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync, gzipSync } from "node:zlib";
import { REPO_ROOT, createSandbox, readJson, runNpm, sha256, sha256File, writeJson } from "./sandbox.mjs";

/** Entries (relative to the package root) the stripped arm loses. */
export const STRIP_RULES = [
  { kind: "file", path: "llms.txt" },
  { kind: "dir", path: "docs/" },
  { kind: "dir", path: "skills/" },
];

const BLOCK = 512;

function readString(buf, start, len) {
  const slice = buf.subarray(start, start + len);
  const nul = slice.indexOf(0);
  return slice.subarray(0, nul < 0 ? len : nul).toString("utf8");
}

function readOctal(buf, start, len) {
  // Base-256 (GNU) sizes have the high bit set; tarballs of this size never use it.
  if (buf[start] & 0x80) throw new Error("tar: base-256 size fields are not supported");
  const s = readString(buf, start, len).trim();
  return s ? parseInt(s, 8) : 0;
}

/** Parse pax extended header records ("<len> key=value\n"). */
function parsePax(data) {
  const out = {};
  let i = 0;
  const text = data.toString("utf8");
  while (i < text.length) {
    const sp = text.indexOf(" ", i);
    if (sp < 0) break;
    const len = parseInt(text.slice(i, sp), 10);
    if (!Number.isFinite(len) || len <= 0) break;
    const rec = text.slice(sp + 1, i + len - 1);
    const eq = rec.indexOf("=");
    if (eq > 0) out[rec.slice(0, eq)] = rec.slice(eq + 1);
    i += len;
  }
  return out;
}

/**
 * Split an uncompressed tar buffer into records. Each record is one real
 * entry together with the metadata headers (pax 'x', GNU 'L'/'K') that
 * precede it, as raw byte ranges, plus the entry's effective path.
 * Global pax headers ('g') become their own record with path null.
 */
export function tarRecords(tar) {
  const records = [];
  let off = 0;
  let pending = { start: -1, pax: {}, longName: null };
  while (off + BLOCK <= tar.length) {
    const header = tar.subarray(off, off + BLOCK);
    if (header.every((b) => b === 0)) break;
    const name = readString(header, 0, 100);
    const size = readOctal(header, 124, 12);
    const type = String.fromCharCode(header[156] || 48);
    const magic = readString(header, 257, 6);
    const prefix = magic.startsWith("ustar") ? readString(header, 345, 155) : "";
    const dataBlocks = Math.ceil(size / BLOCK);
    const end = off + BLOCK + dataBlocks * BLOCK;
    const data = tar.subarray(off + BLOCK, off + BLOCK + size);
    if (pending.start < 0) pending.start = off;
    if (type === "x") {
      Object.assign(pending.pax, parsePax(data));
    } else if (type === "L") {
      pending.longName = readString(data, 0, data.length);
    } else if (type === "K") {
      // long link name: metadata only
    } else if (type === "g") {
      records.push({ start: pending.start, end, path: null, type });
      pending = { start: -1, pax: {}, longName: null };
    } else {
      const path = pending.pax.path ?? pending.longName ?? (prefix ? `${prefix}/${name}` : name);
      records.push({ start: pending.start, end, path, type, size });
      pending = { start: -1, pax: {}, longName: null };
    }
    off = end;
  }
  return records;
}

/** Path relative to the package root (npm packs everything under `package/`). */
export function packageRelative(path) {
  return path.replace(/^\.?\/?/, "").replace(/^[^/]+\//, "");
}

export function matchesStripRule(relPath, rules = STRIP_RULES) {
  return rules.some((r) => (r.kind === "file" ? relPath === r.path : relPath === r.path.slice(0, -1) || relPath.startsWith(r.path)));
}

/** Filter a .tgz buffer, returning the new .tgz buffer and the removed paths. */
export function stripTgz(tgz, rules = STRIP_RULES) {
  const tar = gunzipSync(tgz);
  const records = tarRecords(tar);
  const kept = [];
  const removed = [];
  for (const rec of records) {
    if (rec.path !== null && matchesStripRule(packageRelative(rec.path), rules)) removed.push(packageRelative(rec.path));
    else kept.push(tar.subarray(rec.start, rec.end));
  }
  let body = Buffer.concat([...kept, Buffer.alloc(BLOCK * 2)]);
  const RECORD = BLOCK * 20;
  if (body.length % RECORD) body = Buffer.concat([body, Buffer.alloc(RECORD - (body.length % RECORD))]);
  return { tgz: gzipSync(body, { level: 9 }), removed };
}

/** List package-relative entry paths of a .tgz. */
export function listTgz(tgzPath) {
  return tarRecords(gunzipSync(readFileSync(tgzPath)))
    .filter((r) => r.path !== null)
    .map((r) => packageRelative(r.path));
}

/** Bytes of one package-relative file inside a .tgz, or null when absent. */
export function readTgzFile(tgzPath, relPath) {
  const tar = gunzipSync(readFileSync(tgzPath));
  const rec = tarRecords(tar).find((r) => r.path && packageRelative(r.path) === relPath);
  if (!rec) return null;
  const dataStart = rec.end - Math.ceil(rec.size / BLOCK) * BLOCK;
  return tar.subarray(dataStart, dataStart + rec.size);
}

function manifestPathFor(tgzPath) {
  return tgzPath.replace(/\.tgz$/, ".manifest.json");
}

/** Read a tarball's manifest (beside it), or null. */
export function readManifest(tgzPath) {
  const p = manifestPathFor(tgzPath);
  return existsSync(p) ? readJson(p) : null;
}

/**
 * Install a tarball into a scratch sandbox and run its CLI. Returns
 * `{ ok, detail }`; the sandbox is always removed.
 */
export function verifyTarball(tgzPath) {
  let sb;
  try {
    sb = createSandbox({ tarball: tgzPath, copyBrief: false });
    const bin = join(sb.pcgDir, "bin", "pcg.mjs");
    const help = spawnSync(process.execPath, [bin, "--help"], { cwd: sb.dir, encoding: "utf8", windowsHide: true });
    if (help.status !== 0 || !/usage: pcg/.test(help.stdout)) {
      return { ok: false, detail: `pcg --help exited ${help.status}: ${(help.stderr || help.stdout).slice(-500)}` };
    }
    const nodes = spawnSync(process.execPath, [bin, "nodes", "--json"], { cwd: sb.dir, encoding: "utf8", windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
    let count = 0;
    try {
      count = JSON.parse(nodes.stdout).length;
    } catch {
      /* reported below */
    }
    if (nodes.status !== 0 || !count) return { ok: false, detail: `pcg nodes --json exited ${nodes.status} with ${count} entries` };
    return { ok: true, detail: `pcg --help ok; pcg nodes --json lists ${count} node types; installed offline=${sb.installedOffline}` };
  } catch (err) {
    return { ok: false, detail: err.message };
  } finally {
    sb?.cleanup();
  }
}

export function stripDocs({ tarball, outDir, label = "stripped", verify = true }) {
  const src = resolve(tarball);
  if (!existsSync(src)) throw new Error(`--strip-docs: tarball not found: ${src}`);
  const srcManifest = readManifest(src);
  const pkgBytes = readTgzFile(src, "package.json");
  if (!pkgBytes) throw new Error(`--strip-docs: ${src} has no package/package.json`);
  const pkgJson = JSON.parse(pkgBytes.toString("utf8"));
  const version = srcManifest?.version ?? pkgJson.version;
  const gitSha = srcManifest?.gitSha ?? null;
  const sha7 = gitSha ? gitSha.slice(0, 7) : sha256File(src).slice(0, 7);
  const { tgz, removed } = stripTgz(readFileSync(src));
  if (!removed.length) throw new Error(`--strip-docs: nothing matched ${STRIP_RULES.map((r) => r.path).join(", ")} in ${src}`);
  const dest = resolve(outDir ?? dirname(src));
  mkdirSync(dest, { recursive: true });
  const file = `${label}-${version}-${sha7}.tgz`;
  const out = join(dest, file);
  writeFileSync(out, tgz);
  const leftovers = listTgz(out).filter((p) => matchesStripRule(p));
  if (leftovers.length) throw new Error(`--strip-docs: ${out} still holds ${leftovers.join(", ")}`);
  let verification = null;
  if (verify) {
    verification = verifyTarball(out);
    if (!verification.ok) {
      rmSync(out, { force: true });
      throw new Error(`--strip-docs: the stripped tarball does not work: ${verification.detail}`);
    }
  }
  const manifest = {
    role: `stripped arm: ${STRIP_RULES.map((r) => r.path).join(", ")} removed`,
    file,
    sha256: sha256(tgz),
    version,
    gitSha,
    dirty: srcManifest?.dirty ?? null,
    node: process.version,
    packedAt: new Date().toISOString(),
    derivedFrom: { file: basename(src), sha256: sha256File(src) },
    removed,
    verification: verification?.detail ?? "skipped",
  };
  writeJson(manifestPathFor(out), manifest);
  return { path: out, manifest };
}

export function packFromRepo({ repoRoot = REPO_ROOT, label = "candidate", role, outDir, build = true }) {
  const git = (args) => spawnSync("git", args, { cwd: repoRoot, encoding: "utf8", windowsHide: true });
  const head = git(["rev-parse", "HEAD"]);
  if (head.status !== 0) throw new Error(`--from-repo: git rev-parse HEAD failed in ${repoRoot}`);
  const gitSha = head.stdout.trim();
  const dirty = git(["status", "--porcelain", "--untracked-files=no"]).stdout.trim().length > 0;
  if (build) {
    const b = runNpm(["run", "build"], { cwd: repoRoot, timeoutMs: 20 * 60_000 });
    if (b.status !== 0) throw new Error(`--from-repo: npm run build failed (${b.status}): ${b.stderr.slice(-1500)}`);
  }
  const scratch = mkdtempSync(join(tmpdir(), "pcg-pack-"));
  try {
    const p = runNpm(["pack", "--json", "--pack-destination", scratch], { cwd: repoRoot, timeoutMs: 10 * 60_000 });
    if (p.status !== 0) throw new Error(`--from-repo: npm pack failed (${p.status}): ${p.stderr.slice(-1500)}`);
    const jsonStart = p.stdout.indexOf("[");
    const info = JSON.parse(p.stdout.slice(jsonStart))[0];
    const version = info.version;
    const file = `${label}-${version}-${gitSha.slice(0, 7)}.tgz`;
    const dest = resolve(outDir ?? join(repoRoot, "evals", "tarballs"));
    mkdirSync(dest, { recursive: true });
    const out = join(dest, file);
    if (existsSync(out)) throw new Error(`--from-repo: ${out} already exists; tarballs are immutable, choose another --label`);
    renameSync(join(scratch, info.filename), out);
    const manifest = {
      role: role ?? label,
      file,
      sha256: sha256File(out),
      version,
      gitSha,
      dirty,
      node: process.version,
      packedAt: new Date().toISOString(),
    };
    writeJson(manifestPathFor(out), manifest);
    return { path: out, manifest };
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

function main(argv) {
  const get = (flag) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  try {
    if (argv.includes("--from-repo")) {
      const r = packFromRepo({ label: get("--label") ?? "candidate", role: get("--role"), outDir: get("--out"), build: !argv.includes("--no-build") });
      console.log(JSON.stringify(r, null, 2));
      return 0;
    }
    if (argv.includes("--strip-docs")) {
      const r = stripDocs({ tarball: get("--strip-docs"), outDir: get("--out"), label: get("--label") ?? "stripped", verify: !argv.includes("--no-verify") });
      console.log(JSON.stringify(r, null, 2));
      return 0;
    }
    if (argv.includes("--verify")) {
      const r = verifyTarball(resolve(get("--verify")));
      console.log(JSON.stringify(r, null, 2));
      return r.ok ? 0 : 1;
    }
  } catch (err) {
    console.error(`pack: ${err.message}`);
    return 1;
  }
  console.error("usage: node evals/harness/pack.mjs --from-repo [--label L] [--role R] [--out DIR] [--no-build]\n       node evals/harness/pack.mjs --strip-docs <tgz> [--label stripped] [--out DIR] [--no-verify]\n       node evals/harness/pack.mjs --verify <tgz>");
  return 2;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
