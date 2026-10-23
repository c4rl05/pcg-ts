/**
 * References to the stripped corpus, found and rewritten in a packed arm's
 * prose. `pack.mjs --strip-graphs` removes `graphs/`, `docs/graphs.json` and
 * `docs/graphs.md`, but the files it keeps still name them: every
 * `**Examples:**` line in `docs/nodes.md` and `docs/primitives.md` links into
 * `../graphs/`, and the README, `docs/authoring.md`, `docs/llms-full.txt`,
 * `llms.txt` and the skills cite corpus files by path. In the campaign that
 * found this, three sessions ran `find /` hunting for those files. A link to
 * a file the package does not hold is not a lost hint; it is a dead end that
 * costs turns and reads as a broken package.
 *
 * So the packer rewrites the PACKED COPY (never the source tree): each
 * reference becomes plain text that says what it was and that it is not in
 * this package, and the sentence around it stays. Then `findStrippedRefs`
 * scans the result, and any hit fails the pack (`DanglingReferenceError`).
 *
 * What counts as a reference to a stripped path:
 *
 * - a path into the corpus: `graphs/…`, `../graphs/…`, `./graphs/…`,
 *   `node_modules/pcg-ts/graphs/…`, the bare directory `graphs/` included;
 * - the corpus index: `docs/graphs.md`, `docs/graphs.json`, or `graphs.md` /
 *   `graphs.json` on their own;
 * - a stripped graph's file name on its own, `examples-brick-house.json`.
 *
 * Not a reference: a URL (the `/` before `graphs/` rules it out, so GitHub
 * tree links and the hosted editor's `?graph=<name>` survive, because they
 * resolve on the web and not in the package), and a graph's bare name with
 * no `.json` and no path, which names an idea rather than a file.
 *
 * Scope: every entry outside `dist/` and `bin/` — the README, `llms.txt`,
 * `docs/**` (markdown, `llms-full.txt`, every `.json`), `skills/**` and
 * `package.json`. `dist/` and `bin/` are code: their doc comments and source
 * maps quote corpus paths too, but rewriting compiled code to change prose
 * is not a trade worth making, and an agent reads them as code.
 */

const ANNOTATION = {
  file: "(corpus example, not included in this package)",
  files: "(corpus examples, not included in this package)",
  dir: "(not included in this package)",
  index: "(not included in this package)",
};

/** Placeholders for the annotations while a text is being rewritten (NUL never occurs in prose). */
const MARK = { file: "\u0000F", files: "\u0000P", dir: "\u0000D", index: "\u0000I" };
const MARK_KIND = Object.fromEntries(Object.entries(MARK).map(([k, v]) => [v, k]));

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Entries the rewrite and the scan read: everything that is not code. */
export function isProsePath(relPath) {
  if (/^(dist|bin)\//.test(relPath)) return false;
  const base = relPath.split("/").pop();
  return /\.(md|markdown|txt|json)$/i.test(base) || !base.includes(".");
}

/** The graph names (file stem) a removed-entries list took out of `graphs/`. */
export function strippedGraphNames(removed) {
  const names = new Set();
  for (const p of removed) {
    const m = /^graphs\/(?:.+\/)?([^/]+)\.json$/.exec(p);
    if (m) names.add(m[1]);
  }
  return [...names].sort();
}

/**
 * The token patterns. Built per name list because the bare-file-name form
 * only names graphs this package actually lost.
 */
function patterns(names) {
  // Any relative prefix (`../../`, `node_modules/pcg-ts/`, `$PKG/`, `~/`,
  // either separator) is part of the token. A URL never matches: each of its
  // path segments follows a `/`, which the lookbehind refuses as a start,
  // and `https:` is not a prefix segment.
  const lead = String.raw`(?<![\w\/\\.\-$~])`;
  const prefix = String.raw`(?:[\w.$~\-]+[\/\\])*`;
  const path = String.raw`${lead}${prefix}graphs[\/\\](?:[\w.*<>{}\-]+[\/\\]?)*`;
  const index = String.raw`${lead}${prefix}graphs\.(?:md|json)(?![\w])`;
  const file = names.length ? String.raw`${lead}${prefix}(?:${names.map(escapeRe).join("|")})\.json(?![\w])` : null;
  const token = [path, index, file].filter(Boolean).join("|");
  return {
    token,
    tokenRe: () => new RegExp(token, "g"),
    exact: new RegExp(`^(?:${token})$`),
    path: new RegExp(`^${path}$`),
    index: new RegExp(`^${index}$`),
  };
}

/** What one matched token is, as the phrase that replaces it and its kind. */
function classify(tok, pat) {
  if (pat.index.test(tok)) return { phrase: "the corpus index", kind: "index" };
  if (pat.path.test(tok)) {
    const at = /graphs[\/\\]/.exec(tok);
    const rest = tok.slice(at.index + at[0].length).replace(/\\/g, "/");
    if (rest === "") return { phrase: "the graph corpus", kind: "dir" };
    if (rest.startsWith("panels/")) {
      return rest === "panels/" ? { phrase: "the corpus panel specs", kind: "dir" } : { phrase: "a corpus panel spec", kind: "dir" };
    }
    if (rest.endsWith("/")) return { phrase: "a corpus directory", kind: "dir" };
    const name = rest.split("/").pop().replace(/\.json$/, "");
    return { phrase: name, kind: /[*<>{}]/.test(name) ? "files" : "file", code: true };
  }
  return { phrase: tok.split(/[\/\\]/).pop().replace(/\.json$/, ""), kind: "file", code: true };
}

/** A token can swallow the sentence's full stop (`graphs/x.json.`); give it back. */
function splitTrailing(tok) {
  const m = /^(.*?)(\.+)$/.exec(tok);
  if (!m || /\.json$/.test(tok)) return [tok, ""];
  return [m[1], m[2]];
}

/**
 * Rewrite every reference to a stripped path in one piece of markdown or
 * plain text. Returns `{ text, count }`.
 *
 * - A link whose TARGET is stripped loses its target and keeps its text,
 *   which is itself rewritten if it names a stripped file; the annotation
 *   follows.
 * - A code span holding only a stripped path keeps a graph's name in code
 *   (`` `examples-forest` ``) or becomes a plain phrase for the directory or
 *   the index, and is followed by the annotation.
 * - A bare token in prose becomes the phrase plus the annotation.
 * - A run of rewritten examples in a list (`a, b, c` as on an `Examples:`
 *   line) shares one plural annotation instead of repeating it per item.
 */
export function rewriteStrippedRefs(text, names) {
  if (text.includes("\u0000")) return { text, count: 0 };
  const pat = patterns(names);
  let count = 0;
  const link = String.raw`(!?)\[([^\]\n]*)\]\(([^()\s]+)\)`;
  const code = String.raw`\x60([^\x60\n]+)\x60`;
  const inline = (s) =>
    s.replace(new RegExp(`${link}|${code}|(${pat.token})`, "g"), (whole, bang, ltext, target, codeBody, tok) => {
      if (target !== undefined) {
        const bare = target.replace(/#.*$/, "");
        if (!pat.exact.test(bare)) return `${bang}[${inline(ltext)}](${target})`;
        // One reference, whether or not the link text also names the file.
        const before = count;
        const inner = inline(ltext);
        count = before + 1;
        return inner !== ltext ? inner : `${ltext} ${MARK[classify(splitTrailing(bare)[0], pat).kind]}`;
      }
      if (codeBody !== undefined) {
        const hits = codeBody.match(pat.tokenRe());
        if (!hits) return whole;
        count += hits.length;
        const trimmed = codeBody.trim();
        if (pat.exact.test(trimmed)) {
          const [core, tail] = splitTrailing(trimmed);
          const c = classify(core, pat);
          return `${c.code ? `\x60${c.phrase}${tail}\x60` : c.phrase + tail} ${MARK[c.kind]}`;
        }
        const kinds = hits.map((h) => classify(splitTrailing(h)[0], pat).kind);
        const body = codeBody.replace(pat.tokenRe(), (t) => {
          const [core, tail] = splitTrailing(t);
          return classify(core, pat).phrase + tail;
        });
        return `\x60${body}\x60 ${MARK[kinds.includes("file") || kinds.includes("files") ? "file" : kinds[0]]}`;
      }
      count++;
      const [core, tail] = splitTrailing(tok);
      const c = classify(core, pat);
      return `${c.phrase} ${MARK[c.kind]}${tail}`;
    });
  let out = inline(text);
  // `a (…), b (…), c (…)` → `a, b, c (corpus examples, …)`.
  const run = / \u0000[FP](, (?:\x60[^\x60\n]+\x60|[\w*.\-]+)) \u0000[FP]/g;
  while (run.test(out)) out = out.replace(run, `$1 ${MARK.files}`);
  out = out.replace(/\u0000[FPDI]/g, (m) => ANNOTATION[MARK_KIND[m]]);
  return { text: out, count };
}

/**
 * Every stripped-path reference in one text, as `{ line, match }`.
 *
 * Deliberately NOT the rewrite's patterns: sharing them would let a form the
 * rewrite does not know pass the check too, silently. This scan is looser —
 * `graphs/` or `graphs\` in any case after anything, either index file, any
 * stripped graph's file name — and takes out only web URLs first, because
 * they resolve outside the package. It reports what the rewrite missed
 * rather than agreeing with it.
 */
export function findStrippedRefsInText(text, names) {
  const loose = [String.raw`graphs[\/\\]`, String.raw`(?<![\w\-])graphs\.(?:md|json)\b`];
  if (names.length) loose.push(String.raw`(?<![\w\-])(?:${names.map(escapeRe).join("|")})\.json\b`);
  const re = new RegExp(loose.join("|"), "gi");
  const url = /\b[a-z][a-z0-9+.\-]*:\/\/[^\s<>()\x60"']+/gi;
  const hits = [];
  text.split(/\n/).forEach((l, i) => {
    const noUrls = l.replace(url, (u) => " ".repeat(u.length));
    for (const m of noUrls.matchAll(re)) {
      // Show the whole path-like run the hit sits in, not just the keyword.
      const from = noUrls.slice(0, m.index).search(/[^\s(\[\x60"'<]*$/);
      const after = noUrls.slice(m.index + m[0].length).search(/[\s)\]\x60"'>,;]|$/);
      const match = l.slice(from, m.index + m[0].length + after);
      // `../graphs/x.json` trips two patterns; it is one reference.
      if (!hits.some((h) => h.line === i + 1 && h.match === match)) hits.push({ line: i + 1, match });
    }
  });
  return hits;
}

/** Visit every string (keys included) of a parsed JSON value. */
function mapJsonStrings(value, fn) {
  if (typeof value === "string") return fn(value);
  if (Array.isArray(value)) return value.map((v) => mapJsonStrings(v, fn));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [fn(k), mapJsonStrings(v, fn)]));
  }
  return value;
}

function jsonIndent(text) {
  const m = /^\{\s*\n([ \t]+)\S/.exec(text) ?? /^\[\s*\n([ \t]+)\S/.exec(text);
  return m ? m[1] : text.includes("\n") ? 2 : 0;
}

/**
 * Rewrite one packed file. JSON is rewritten through its parsed strings, so
 * an escape sequence can never hide a token or be broken by one, and
 * re-serialized at its own indentation only when something changed.
 * `package.json` also drops the stripped entries from `files`, which would
 * otherwise list paths the package does not hold.
 *
 * Returns `{ bytes, count, lines }`; `bytes` is null when nothing changed.
 */
export function rewriteFile(relPath, bytes, { names, isStripped }) {
  const text = bytes.toString("utf8");
  if (text.includes("\u0000")) return { bytes: null, count: 0, lines: 0 };
  let next;
  let count = 0;
  if (/\.json$/i.test(relPath)) {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { bytes: null, count: 0, lines: 0 };
    }
    if (relPath === "package.json" && Array.isArray(parsed.files)) {
      const kept = parsed.files.filter((f) => !isStripped(f.replace(/^\/+/, "").replace(/\/+$/, "")));
      count += parsed.files.length - kept.length;
      parsed = { ...parsed, files: kept };
    }
    const rewritten = mapJsonStrings(parsed, (s) => {
      const r = rewriteStrippedRefs(s, names);
      count += r.count;
      return r.text;
    });
    if (!count) return { bytes: null, count: 0, lines: 0 };
    // A package packed from a Windows checkout carries CRLF; keep the file's own endings.
    const eol = text.includes("\r\n") ? "\r\n" : "\n";
    next = JSON.stringify(rewritten, null, jsonIndent(text)).replace(/\n/g, eol) + (text.endsWith("\n") ? eol : "");
  } else {
    const r = rewriteStrippedRefs(text, names);
    if (!r.count) return { bytes: null, count: 0, lines: 0 };
    count = r.count;
    next = r.text;
  }
  return { bytes: Buffer.from(next, "utf8"), count, lines: changedLines(text, next) };
}

/**
 * Lines changed between two texts, as a multiset difference: the larger of
 * lines only in the old text and lines only in the new one. A removed line
 * (package.json's `files`) shifts every later line, so comparing by index
 * would count all of them.
 */
function changedLines(a, b) {
  const tally = new Map();
  for (const l of a.split("\n")) tally.set(l, (tally.get(l) ?? 0) + 1);
  let added = 0;
  for (const l of b.split("\n")) {
    const n = tally.get(l) ?? 0;
    if (n > 0) tally.set(l, n - 1);
    else added++;
  }
  let removed = 0;
  for (const n of tally.values()) removed += n;
  return Math.max(added, removed);
}

/** Every stripped-path reference left in one packed file, as `{ line, match }`. */
export function findStrippedRefsInFile(relPath, bytes, names) {
  const text = bytes.toString("utf8");
  if (text.includes("\u0000")) return [];
  if (/\.json$/i.test(relPath)) {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return findStrippedRefsInText(text, names);
    }
    const hits = [];
    mapJsonStrings(parsed, (s) => {
      for (const h of findStrippedRefsInText(s, names)) hits.push({ line: null, match: h.match });
      return s;
    });
    // `files: ["graphs"]` names the corpus without a slash, which the token
    // patterns (rightly) do not read as a path in prose.
    if (relPath === "package.json" && Array.isArray(parsed.files)) {
      for (const f of parsed.files) if (/^\/?graphs\/?$/.test(f)) hits.push({ line: null, match: JSON.stringify(f), files: true });
    }
    // Keep a line number where the raw text shows the match, for the error.
    const rawLines = text.split("\n");
    return hits.map((h) => {
      const i = rawLines.findIndex((l) => (h.files ? new RegExp(`^\\s*${h.match.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")},?\\s*$`).test(l) : l.includes(h.match)));
      return { line: i >= 0 ? i + 1 : null, match: h.files ? `files: ${h.match}` : h.match };
    });
  }
  return findStrippedRefsInText(text, names);
}

/** A packed arm still names files it does not hold. */
export class DanglingReferenceError extends Error {
  constructor(tarball, hits) {
    const files = [...new Set(hits.map((h) => h.file))];
    const shown = hits.slice(0, 20).map((h) => `${h.file}${h.line ? `:${h.line}` : ""} ${h.match}`);
    super(
      `DanglingReferenceError: ${tarball} still names stripped paths ${hits.length} time(s) in ${files.length} file(s) (${files.join(", ")}): ${shown.join("; ")}${hits.length > shown.length ? `; … ${hits.length - shown.length} more` : ""}. ` +
        "The rewrite in evals/harness/refs.mjs should have turned each into plain text; extend its patterns to the form above, or the arm ships links to files it does not hold.",
    );
    this.name = "DanglingReferenceError";
    this.code = "EDANGLINGREF";
    this.hits = hits;
  }
}
