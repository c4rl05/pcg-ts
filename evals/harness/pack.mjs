/**
 * Tarballs the eval installs, and the manifests that pin them.
 *
 *   node evals/harness/pack.mjs --from-repo [--label candidate] [--role "..."] [--out evals/tarballs]
 *   node evals/harness/pack.mjs --strip-docs <tgz> [--label stripped] [--out <dir of tgz>] [--no-verify]
 *   node evals/harness/pack.mjs --strip-graphs <tgz> [--label stripped-graphs] ...
 *   node evals/harness/pack.mjs --strip-docs --strip-graphs <tgz> [--label stripped-all] ...
 *   node evals/harness/pack.mjs --verify <tgz>
 *
 * --from-repo builds the current tree and packs it to
 * `<label>-<version>-<sha7>.tgz` beside a `<same>.manifest.json`
 * `{ role, file, sha256, version, gitSha, dirty, node, packedAt }`.
 *
 * --strip-docs and --strip-graphs derive a sensitivity arm: the same package
 * with one or both of the STRIP_SETS removed and every other byte of every
 * other entry kept.
 *
 * - `docs`: `llms.txt`, `docs/` and `skills/` — the prose.
 * - `graphs`: `graphs/` and its index `docs/graphs.json` / `docs/graphs.md` —
 *   the shipped corpus. The index goes with the bodies because it carries
 *   each graph's title, description, tags and node types: leaving it would
 *   leave the corpus in prose, and would point `pcg graphs` at files that
 *   are not there. The pilot measured agents reading the corpus in 83–89% of
 *   runs in EVERY arm, the docs-stripped one included, which is why the
 *   corpus is its own strip set.
 *
 * Both together are the `stripped-all` arm. The tar stream is filtered block
 * by block rather than extracted and re-packed, so nothing else can change
 * (no re-ordered entries, no new mtimes, no platform tar differences). The
 * manifest gains `stripSets`, `derivedFrom: { file, sha256 }` and the list of
 * every removed entry. The result is installed into a scratch sandbox and
 * `pcg --help` and `pcg nodes --json` must run, or the tarball is deleted and
 * the command fails; `pcg graphs` and `pcg nodes <type>` are probed too and
 * their behaviour recorded in the manifest's `degradation` (they degrade to a
 * note rather than an error — see readCorpusIndex in src/cli/corpus.ts).
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync, gzipSync } from "node:zlib";
import { REPO_ROOT, createSandbox, readJson, runNpm, sha256, sha256File, writeJson } from "./sandbox.mjs";

/**
 * Entries (relative to the package root) each strip set removes. A set is
 * named on the command line (`--strip-docs`, `--strip-graphs`) and recorded
 * in the manifest, so an arm's label is never the only record of what it lost.
 */
export const STRIP_SETS = {
  docs: [
    { kind: "file", path: "llms.txt" },
    { kind: "dir", path: "docs/" },
    { kind: "dir", path: "skills/" },
  ],
  graphs: [
    { kind: "dir", path: "graphs/" },
    { kind: "file", path: "docs/graphs.json" },
    { kind: "file", path: "docs/graphs.md" },
  ],
};

/** The label a set combination gets when `--label` is not given. */
export const STRIP_LABELS = { docs: "stripped", graphs: "stripped-graphs", "docs+graphs": "stripped-all" };

/** Entries the documentation-blind arm loses. The default for the rule helpers. */
export const STRIP_RULES = STRIP_SETS.docs;

/** The union of the named sets' rules, in set order, deduplicated by path. */
export function stripRulesFor(sets) {
  const unknown = sets.filter((s) => !STRIP_SETS[s]);
  if (unknown.length) throw new Error(`unknown strip set(s) ${unknown.join(", ")}; known sets: ${Object.keys(STRIP_SETS).join(", ")}`);
  const seen = new Set();
  const out = [];
  for (const s of sets) {
    for (const r of STRIP_SETS[s]) {
      if (seen.has(r.path)) continue;
      seen.add(r.path);
      out.push(r);
    }
  }
  return out;
}

/** The canonical label for a set combination ("docs+graphs" → "stripped-all"). */
export function defaultStripLabel(sets) {
  const key = [...new Set(sets)].sort().join("+");
  return STRIP_LABELS[key] ?? `stripped-${key.replace(/\+/g, "-")}`;
}

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
 * Corpus-facing commands whose answer an arm without `graphs/` changes. They
 * are probed but never required: a stripped arm is allowed to say less, it is
 * not allowed to crash. `pcg nodes <type>` names a node the package always
 * registers, so the probe reads the same on every arm.
 */
const DEGRADE_PROBES = [
  { command: ["graphs"], why: "lists the shipped corpus" },
  { command: ["nodes", "pointScatterInBounds"], why: "a node type's page, whose example list comes from the corpus" },
  { command: ["agents"], why: "the agent entry point, which links the shipped documentation" },
];

/**
 * Install a tarball into a scratch sandbox and run its CLI. Returns
 * `{ ok, detail, degradation }`; the sandbox is always removed.
 *
 * `ok` is decided by `pcg --help` and `pcg nodes --json` alone — the two
 * commands every arm must answer. `degradation` records, without judging,
 * what the corpus-facing commands did, so an arm's manifest carries evidence
 * rather than a claim.
 */
export function verifyTarball(tgzPath) {
  let sb;
  try {
    sb = createSandbox({ tarball: tgzPath, copyBrief: false, baseDir: join(tmpdir(), "pcg-pack-verify") });
    const bin = join(sb.pcgDir, "bin", "pcg.mjs");
    const run = (args) => spawnSync(process.execPath, [bin, ...args], { cwd: sb.dir, encoding: "utf8", windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
    const help = run(["--help"]);
    if (help.status !== 0 || !/usage: pcg/.test(help.stdout)) {
      return { ok: false, detail: `pcg --help exited ${help.status}: ${(help.stderr || help.stdout).slice(-500)}` };
    }
    const nodes = run(["nodes", "--json"]);
    let count = 0;
    try {
      count = JSON.parse(nodes.stdout).length;
    } catch {
      /* reported below */
    }
    if (nodes.status !== 0 || !count) return { ok: false, detail: `pcg nodes --json exited ${nodes.status} with ${count} entries` };
    const degradation = DEGRADE_PROBES.map((p) => {
      const r = run(p.command);
      const text = `${r.stdout ?? ""}${r.stderr ?? ""}`;
      return {
        command: `pcg ${p.command.join(" ")}`,
        why: p.why,
        exitCode: r.status,
        crashed: /^\s*(Error|TypeError|ReferenceError)\b|\bat .*\.mjs:\d+/m.test(text),
        firstLine: text.split(/\r?\n/).find((l) => l.trim()) ?? "",
      };
    });
    return {
      ok: true,
      detail: `pcg --help ok; pcg nodes --json lists ${count} node types; installed offline=${sb.installedOffline}`,
      degradation,
    };
  } catch (err) {
    return { ok: false, detail: err.message };
  } finally {
    sb?.cleanup();
  }
}

/**
 * Derive a sensitivity arm by removing one or more STRIP_SETS from a tarball.
 * `sets` defaults to `["docs"]`, which is what `stripDocs` was.
 */
export function stripTarball({ tarball, sets = ["docs"], outDir, label, verify = true }) {
  const chosen = [...new Set(sets)];
  if (!chosen.length) throw new Error(`--strip-*: name at least one strip set (${Object.keys(STRIP_SETS).join(", ")})`);
  const rules = stripRulesFor(chosen);
  const flag = `--strip-${chosen.join(" --strip-")}`;
  const src = resolve(tarball);
  if (!existsSync(src)) throw new Error(`${flag}: tarball not found: ${src}`);
  const srcManifest = readManifest(src);
  const pkgBytes = readTgzFile(src, "package.json");
  if (!pkgBytes) throw new Error(`${flag}: ${src} has no package/package.json`);
  const pkgJson = JSON.parse(pkgBytes.toString("utf8"));
  const version = srcManifest?.version ?? pkgJson.version;
  const gitSha = srcManifest?.gitSha ?? null;
  const sha7 = gitSha ? gitSha.slice(0, 7) : sha256File(src).slice(0, 7);
  const { tgz, removed } = stripTgz(readFileSync(src), rules);
  // Every set must have bitten. A set that matched nothing means the package
  // stopped shipping what the arm is supposed to lose, and a silently
  // identical arm is the one failure this command exists to prevent.
  const empty = chosen.filter((s) => !removed.some((p) => matchesStripRule(p, STRIP_SETS[s])));
  if (empty.length) {
    throw new Error(`${flag}: strip set(s) ${empty.join(", ")} matched nothing in ${src} (looked for ${empty.flatMap((s) => STRIP_SETS[s].map((r) => r.path)).join(", ")})`);
  }
  const dest = resolve(outDir ?? dirname(src));
  mkdirSync(dest, { recursive: true });
  const file = `${label ?? defaultStripLabel(chosen)}-${version}-${sha7}.tgz`;
  const out = join(dest, file);
  writeFileSync(out, tgz);
  const leftovers = listTgz(out).filter((p) => matchesStripRule(p, rules));
  if (leftovers.length) throw new Error(`${flag}: ${out} still holds ${leftovers.join(", ")}`);
  let verification = null;
  if (verify) {
    verification = verifyTarball(out);
    if (!verification.ok) {
      rmSync(out, { force: true });
      throw new Error(`${flag}: the stripped tarball does not work: ${verification.detail}`);
    }
  }
  const manifest = {
    role: `stripped arm (${chosen.join("+")}): ${rules.map((r) => r.path).join(", ")} removed`,
    file,
    sha256: sha256(tgz),
    version,
    gitSha,
    dirty: srcManifest?.dirty ?? null,
    node: process.version,
    packedAt: new Date().toISOString(),
    stripSets: chosen,
    strippedPaths: rules.map((r) => r.path),
    derivedFrom: { file: basename(src), sha256: sha256File(src) },
    removed,
    verification: verification?.detail ?? "skipped",
    degradation: verification?.degradation ?? "skipped",
    // Measured on 2026-09-18 against stripped-all-0.17.0-9284b1f, not assumed;
    // `degradation` above is the evidence for whichever arm this is.
    note:
      (chosen.includes("graphs")
        ? "This arm ships no graph corpus. `pcg nodes <type>` still answers (exit 0) and simply drops its example list, because readCorpusIndex in src/cli/corpus.ts never throws — a missing docs/graphs.json comes back as available:false. `pcg graphs`, whose whole answer IS the corpus, exits 1 with a named cause and no stack trace. "
        : "") +
      (chosen.includes("docs")
        ? "This arm ships no llms.txt, docs/ or skills/. `pcg agents`, which reads the shipped skill, exits 1 with a named cause and no stack trace. "
        : "") +
      "`pcg --help`, `pcg nodes --json`, validate, cook, inspect and render are unaffected: nothing an agent needs to AUTHOR a graph was removed, only what it could read to learn how. See `degradation` for what the probes actually printed.",
  };
  writeJson(manifestPathFor(out), manifest);
  return { path: out, manifest };
}

/** The documentation-blind arm: `stripTarball` with the `docs` set. */
export function stripDocs({ tarball, outDir, label = "stripped", verify = true }) {
  return stripTarball({ tarball, sets: ["docs"], outDir, label, verify });
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
    // The scratch dir is under the OS temp root, which on Windows is often a
    // different volume from the repo: rename then fails with EXDEV. Copy and
    // remove instead — the scratch dir is deleted afterwards either way.
    try {
      renameSync(join(scratch, info.filename), out);
    } catch (err) {
      if (err?.code !== "EXDEV") throw err;
      copyFileSync(join(scratch, info.filename), out);
    }
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

const USAGE = [
  "usage: node evals/harness/pack.mjs --from-repo [--label L] [--role R] [--out DIR] [--no-build]",
  "       node evals/harness/pack.mjs --strip-docs [<tgz>] [--strip-graphs] [--from <tgz>] [--label L] [--out DIR] [--no-verify]",
  "       node evals/harness/pack.mjs --strip-graphs <tgz> [--label L] [--out DIR] [--no-verify]",
  "       node evals/harness/pack.mjs --verify <tgz>",
  "",
  `strip sets: ${Object.entries(STRIP_SETS)
    .map(([k, rs]) => `${k} (${rs.map((r) => r.path).join(", ")})`)
    .join("; ")}`,
  `default labels: ${Object.entries(STRIP_LABELS)
    .map(([k, v]) => `${k} → ${v}`)
    .join("; ")}`,
].join("\n");

/**
 * Parse the strip flags. Each may carry the source tarball or stand alone, so
 * `--strip-docs a.tgz --strip-graphs`, `--strip-graphs a.tgz --strip-docs` and
 * `--strip-docs --strip-graphs --from a.tgz` all name the same job. A value
 * beginning with `-` belongs to the next flag, not to this one.
 */
export function parseStripArgs(argv) {
  const value = (flag) => {
    const i = argv.indexOf(flag);
    if (i < 0) return undefined;
    const v = argv[i + 1];
    return v !== undefined && !v.startsWith("-") ? v : null;
  };
  const sets = [];
  const froms = [];
  for (const set of Object.keys(STRIP_SETS)) {
    const v = value(`--strip-${set}`);
    if (v === undefined) continue;
    sets.push(set);
    if (v !== null) froms.push(v);
  }
  if (!sets.length) return null;
  const explicit = value("--from");
  if (explicit) froms.push(explicit);
  const unique = [...new Set(froms)];
  if (unique.length > 1) throw new Error(`--strip-*: two different source tarballs named (${unique.join(", ")}); give it once, or use --from`);
  if (!unique.length) throw new Error(`--strip-${sets.join(" --strip-")}: no source tarball; pass it after a --strip flag or as --from <tgz>`);
  return { sets, tarball: unique[0] };
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
    const strip = parseStripArgs(argv);
    if (strip) {
      const r = stripTarball({ tarball: strip.tarball, sets: strip.sets, outDir: get("--out"), label: get("--label"), verify: !argv.includes("--no-verify") });
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
  console.error(USAGE);
  return 2;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
