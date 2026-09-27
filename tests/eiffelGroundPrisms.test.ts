/**
 * The ground's COOKED geometry against the TypeScript lists it is built
 * from (ground.ts): every prism and every chimney skin face that
 * `buildGround` sends into the graph comes out of the graph as exactly
 * those faces, and nothing else does.
 *
 * The other ground suites (eiffelGround, eiffelFoundations, eiffelPlinths,
 * eiffelSupports, eiffelChimney) audit the LISTS. Nothing checked the
 * graph's side of `prisms()`/`skin()` — the index-table ramps, the runs of
 * PRISM_RUN, pointsToPath, extrudePolygon — which is the side a refactor
 * that moves the repetition into the graph (copies onto frames) will
 * rewrite. That refactor may change point order, primitive order and
 * seeds; it must not change a single face.
 *
 * WHAT IS COMPARED. Faces, as multisets per class: each face's corners
 * (unordered) and its area vector (outward normal times area, so an
 * inside-out face fails), matched within {@link TOL}. See
 * `tests/support/eiffelGroundPrisms.ts`.
 *
 * PRE-JITTER. The graph's class outputs are jittered by up to 1 mm
 * (parts.ts `JITTER`), keyed on seed, and seeds are exactly what the
 * refactor changes. So this cooks `buildGround`'s own mesh nodes in a graph
 * of their own, before any class merge or jitter, and the tolerance only
 * has to absorb f32 storage and a different order of arithmetic: 0.1 mm,
 * a tenth of the jitter and far above any f32 rounding here (an ulp is
 * 15 µm at 200 m). It is not float-exact on purpose: a graph-side copy
 * transforms a template in f32 where the lists place each corner in f64.
 *
 * `buildGround` takes no `Detail`, so what it builds is the same at every
 * depth; the skeleton is all there is to cook.
 *
 * AGAINST A SNAPSHOT, NOT THE LIVE LISTS. The expected faces are built
 * from tests/eiffelGround.snapshot.json -- every labelled prism (outline and
 * depth) and chimney skin face, one per line -- not from `supportFrames`,
 * `supportPieces`, `groundPrisms` and `chimneySkin` as they run now. A
 * refactor that rewrote those would otherwise move both sides at once and
 * pass. A separate test holds the live lists to the same snapshot, so a
 * change to them is seen on its own; when one is MEANT, regenerate the
 * snapshot and commit it with the change:
 *
 *     EIFFEL_GROUND=update env -u NODE_ENV npx vitest run tests/eiffelGroundPrisms.test.ts
 *
 * Read the diff first: the lines it touches should be the pieces the
 * change was meant to move.
 *
 * ALSO CHECKED on the cook, over every item of every output: each corner's
 * point `normal` agrees with its face (dot > 0.5 against the face's unit
 * normal; `smoothNormals` bends a normal by at most the crease angle, 35
 * degrees here), and every point of the chimney skin (`groundChimney`)
 * carries `seed` 0, the one seed that keeps the skin closed under the class
 * jitter (see `skin` in ground.ts).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { type DataCollection, type Geometry, Graph, type NodeHandle, cook } from "pcg-ts";
import {
  type Prism,
  buildGround,
  caissonPrisms,
  chimneySkin,
  earthingPipes,
  groundPrisms,
  machineRoomPrisms,
  massifPrisms,
  supportFrames,
  supportPieces,
  wallPiers,
} from "../demos/eiffel/ground.js";
import { type Face, type Vec3, cookedFaces, matchFaces, normalMisfits, prismFaces, skinFace } from "./support/eiffelGroundPrisms.js";

/** Per-coordinate tolerance, metres (see the file comment). */
const TOL = 1e-4;
/** A corner normal must lie within 60 degrees of its face's. */
const MIN_NORMAL_DOT = 0.5;

const SNAPSHOT_PATH = fileURLToPath(new URL("./eiffelGround.snapshot.json", import.meta.url));
const REGENERATE = "EIFFEL_GROUND=update env -u NODE_ENV npx vitest run tests/eiffelGroundPrisms.test.ts";
const UPDATE = process.env.EIFFEL_GROUND === "update";
/** The node `skin(g, "groundChimney", ...)` ends in (ground.ts `buildGround`). */
const CHIMNEY_NODE = "groundChimney";

type GroundClass = "foundations" | "machinery" | "masonry";
const CLASSES: readonly GroundClass[] = ["foundations", "machinery", "masonry"];

interface Labeled {
  readonly label: string;
  readonly prism: Prism;
}

/**
 * `groundPrisms()` rebuilt from its sources with a name on every prism, so
 * a failure says which piece moved. A test below proves the concatenation
 * IS `groundPrisms()`, prism for prism, so the names cannot drift.
 */
function labeledGround(): Record<GroundClass, Labeled[]> {
  const frames = supportFrames();
  const name = (f: (typeof frames)[number]) => `pile ${f.pile} upright ${f.upright}`;
  const tag = (label: string, list: readonly Prism[]): Labeled[] => list.map((prism, i) => ({ label: `${label} #${i}`, prism }));
  const supports = frames.map((f) => ({ f, s: supportPieces(f) }));
  const caissons = frames.map((f) => ({ f, c: caissonPrisms(f) }));
  const found = [
    ...supports.flatMap(({ f, s }) => tag(`support ${name(f)} buried`, s.buried)),
    ...frames.flatMap((f) => tag(`massif ${name(f)}`, massifPrisms(f))),
    ...caissons.flatMap(({ f, c }) => tag(`caisson concrete ${name(f)}`, c.concrete)),
    ...tag("wall pier", wallPiers()),
    ...tag("earthing pipe", earthingPipes()),
  ];
  // The room's masonry and flue lead both `machineRoomPrisms().foundations`
  // and `groundPrisms().foundations`; what is left of the first is the chimney.
  const all = groundPrisms().foundations;
  const room = machineRoomPrisms().foundations.slice(0, all.length - found.length);
  return {
    foundations: [...tag("machine room / flue masonry", room), ...found],
    machinery: [
      ...tag("machine room plant", machineRoomPrisms().plant),
      ...supports.flatMap(({ f, s }) => tag(`support ${name(f)} iron`, s.iron)),
      ...caissons.flatMap(({ f, c }) => tag(`caisson iron ${name(f)}`, c.iron)),
    ],
    masonry: supports.flatMap(({ f, s }) => tag(`support ${name(f)} stone`, s.stone)),
  };
}

/**
 * One snapshot line: a labelled prism (`depth` present) or a labelled
 * chimney skin face (`depth` absent), with its class.
 */
interface Entry {
  readonly cls: GroundClass;
  readonly label: string;
  readonly depth?: number;
  readonly outline: readonly Vec3[];
}

/** The live lists as snapshot entries: every labelled prism, then the chimney skin. */
function liveEntries(labeled: Record<GroundClass, Labeled[]>): Entry[] {
  const out: Entry[] = [];
  for (const cls of CLASSES) {
    for (const { label, prism } of labeled[cls]) {
      out.push({ cls, label, depth: prism.depth, outline: prism.outline.map((v) => [v[0], v[1], v[2]] as const) });
    }
  }
  chimneySkin().forEach((o, i) => {
    out.push({ cls: "foundations", label: `chimney skin face #${i}`, outline: o.map((v) => [v[0], v[1], v[2]] as const) });
  });
  return out;
}

/** The snapshot's text: one entry per line, so a diff names the pieces that moved. */
function snapshotText(entries: readonly Entry[]): string {
  const lines = entries.map((e) => JSON.stringify(e));
  return `{\n"regenerate": ${JSON.stringify(REGENERATE)},\n"entries": [\n${lines.join(",\n")}\n]\n}\n`;
}

function readSnapshot(): Entry[] {
  let text: string;
  try {
    text = readFileSync(SNAPSHOT_PATH, "utf8");
  } catch {
    throw new Error(`tests/eiffelGround.snapshot.json is missing; generate it with: ${REGENERATE}`);
  }
  return (JSON.parse(text) as { entries: Entry[] }).entries;
}

/** Every face each class should hold, from the snapshot: its prisms', and for the foundations the chimney skin's. */
function expectedFaces(entries: readonly Entry[]): Record<GroundClass, Face[]> {
  const out: Record<GroundClass, Face[]> = { foundations: [], machinery: [], masonry: [] };
  for (const e of entries) {
    const label = `${e.cls}: ${e.label}`;
    if (e.depth === undefined) out[e.cls].push(skinFace(e.outline, label));
    else out[e.cls].push(...prismFaces({ outline: e.outline as Vec3[], depth: e.depth }, label));
  }
  return out;
}

interface Cooked {
  readonly faces: Record<GroundClass, Face[]>;
  /** The chimney skin's cooked meshes: every item of its output. */
  readonly chimney: Geometry[];
}

/** `buildGround`'s meshes, cooked alone and merged by class: before the class merge and its jitter. */
async function cookGround(): Promise<Cooked> {
  const g = new Graph(1889);
  const parts = buildGround(g);
  const names: Array<{ cls: GroundClass; name: string; node: string }> = [];
  for (const [cls, list] of Object.entries(parts)) {
    if (!Array.isArray(list)) continue;
    if (!(CLASSES as readonly string[]).includes(cls)) throw new Error(`buildGround now builds class "${cls}"; add it to this suite`);
    list.forEach((node, k) => {
      const name = `${cls}${k}`;
      g.output(node as NodeHandle, "out", name);
      names.push({ cls: cls as GroundClass, name, node: (node as NodeHandle).id });
    });
  }
  if (!names.some((n) => n.node === CHIMNEY_NODE)) throw new Error(`buildGround no longer returns the node "${CHIMNEY_NODE}"; update this suite`);
  const { outputs } = await cook(g);
  const faces: Record<GroundClass, Face[]> = { foundations: [], machinery: [], masonry: [] };
  const chimney: Geometry[] = [];
  for (const { cls, name, node } of names) {
    // Every item of the output, not only the first.
    let geos = 0;
    for (const item of (outputs[name] ?? []) as DataCollection) {
      if (item.kind !== "geometry") throw new Error(`buildGround's ${name} (${node}) cooked to a "${item.kind}" item`);
      geos++;
      faces[cls].push(...cookedFaces(item.geo, cls));
      if (node === CHIMNEY_NODE) chimney.push(item.geo);
    }
    if (geos === 0) throw new Error(`buildGround's ${name} (${node}) cooked to no geometry`);
  }
  return { faces, chimney };
}

function report(cls: string, r: { missing: Face[]; extra: Face[] }): string {
  if (r.missing.length === 0 && r.extra.length === 0) return "";
  const show = (fs: Face[]) => fs.slice(0, 12).map((f) => `    ${f.label}`).join("\n") + (fs.length > 12 ? `\n    ... and ${fs.length - 12} more` : "");
  return [
    `${cls}: ${r.missing.length} expected face(s) not in the cook, ${r.extra.length} cooked face(s) not in the lists`,
    r.missing.length > 0 ? `  missing (as the lists place them):\n${show(r.missing)}` : "",
    r.extra.length > 0 ? `  extra (as cooked):\n${show(r.extra)}` : "",
  ]
    .filter((s) => s !== "")
    .join("\n");
}

describe("eiffel ground: the cooked prisms are the snapshot's prisms", () => {
  const labeled = labeledGround();
  let snapshot: Entry[];
  let expected: Record<GroundClass, Face[]>;
  let cooked: Cooked;

  beforeAll(async () => {
    if (UPDATE) writeFileSync(SNAPSHOT_PATH, snapshotText(liveEntries(labeled)));
    snapshot = readSnapshot();
    expected = expectedFaces(snapshot);
    cooked = await cookGround();
  }, 120_000);

  it("names every prism groundPrisms() lists, and nothing more", () => {
    const lists = groundPrisms();
    for (const cls of CLASSES) {
      expect(labeled[cls].map((l) => l.prism), cls).toEqual(lists[cls]);
    }
    // Nothing empty slips through: every class has pieces.
    for (const cls of CLASSES) expect(labeled[cls].length, cls).toBeGreaterThan(0);
    expect(chimneySkin().length).toBeGreaterThan(0);
  });

  it("the live lists are exactly the snapshot, entry for entry", () => {
    const live = liveEntries(labeled);
    const lines: string[] = [];
    let differing = 0;
    const n = Math.max(live.length, snapshot.length);
    for (let i = 0; i < n; i++) {
      const a = snapshot[i];
      const b = live[i];
      if (JSON.stringify(a) === JSON.stringify(b)) continue;
      differing++;
      if (lines.length < 12) {
        lines.push(`  entry ${i}: snapshot ${a === undefined ? "(none)" : `${a.cls}: ${a.label}`}; live ${b === undefined ? "(none)" : `${b.cls}: ${b.label}`}`);
      }
    }
    const head = `${differing} of ${n} entries differ (${live.length} live, ${snapshot.length} in tests/eiffelGround.snapshot.json)`;
    expect(differing === 0 ? "" : `${head}; first:\n${lines.join("\n")}\nIf the change is meant: ${REGENERATE}`).toBe("");
  });

  for (const cls of CLASSES) {
    it(`cooks the ${cls} class to exactly the snapshot's faces`, () => {
      const r = matchFaces(expected[cls], cooked.faces[cls], TOL);
      expect(report(cls, r)).toBe("");
      expect(cooked.faces[cls].length).toBe(expected[cls].length);
    });
  }

  it("every cooked corner's normal agrees with its face (dot > 0.5), and a flipped or missing normal is caught", () => {
    for (const cls of CLASSES) {
      const faces = cooked.faces[cls];
      expect(faces.length, cls).toBeGreaterThan(0);
      const misfits = normalMisfits(faces, MIN_NORMAL_DOT);
      expect(misfits.slice(0, 12).join("\n"), `${cls}: ${misfits.length} face(s) with disagreeing normals`).toBe("");
    }
    // Proof it can fail: the same faces with every normal negated all fail,
    const m = cooked.faces.masonry;
    const flipped = m.map((f) => ({ ...f, normals: (f.normals ?? []).map((v) => (v === null ? null : ([-v[0], -v[1], -v[2]] as const))) }));
    expect(normalMisfits(flipped, MIN_NORMAL_DOT).length).toBe(m.length);
    // and so does a face whose mesh carries no normal.
    const bare = m.slice(0, 1).map((f) => ({ ...f, normals: f.verts.map(() => null) }));
    expect(normalMisfits(bare, MIN_NORMAL_DOT).length).toBe(1);
  });

  it(`every point of the chimney skin (${CHIMNEY_NODE}) is on seed 0`, () => {
    expect(cooked.chimney.length).toBeGreaterThan(0);
    for (const geo of cooked.chimney) {
      expect(geo.pointCount).toBeGreaterThan(0);
      const seed = geo.attrs.point.get("seed");
      if (seed === undefined) throw new Error(`${CHIMNEY_NODE} carries no point seed`);
      let bad = 0;
      let first = -1;
      for (let i = 0; i < geo.pointCount * seed.tupleSize; i++) {
        if (seed.data[i] !== 0) {
          bad++;
          if (first < 0) first = i;
        }
      }
      expect(bad, `${bad} of ${geo.pointCount} chimney points off seed 0 (first at element ${first})`).toBe(0);
    }
  });

  it("can fail: a 5 mm move of one corner, and a face turned inside out, are both caught", () => {
    const m = expected.masonry;
    const k = m.findIndex((f) => f.label.includes("(outline cap)"));
    const f = m[k] as Face;
    const moved: Face = {
      ...f,
      verts: f.verts.map((v, i) => (i === 0 ? ([v[0] + 0.005, v[1], v[2]] as const) : v)),
    };
    const r1 = matchFaces([...m.slice(0, k), moved, ...m.slice(k + 1)], cooked.faces.masonry, TOL);
    expect(r1.missing.map((x) => x.label)).toEqual([f.label]);
    expect(r1.extra.length).toBe(1);
    const flipped: Face = { ...f, area: [-f.area[0], -f.area[1], -f.area[2]] };
    const r2 = matchFaces([...m.slice(0, k), flipped, ...m.slice(k + 1)], cooked.faces.masonry, TOL);
    expect(r2.missing.map((x) => x.label)).toEqual([f.label]);
  });
});
