/**
 * The one vocabulary of the box nodes — `snapMode` / `snapTo`
 * (latticeSnap.ts), `frame: "face"` (faceFrame.ts) and `fit` (boxFit.ts) —
 * tested once as modules and once ACROSS the nodes that share them, so a
 * word learned on one node is checked to mean the same on the next.
 *
 * Expectations are written out by hand, never recorded from a run. The
 * face-frame oracle is a real cross product of signed unit vectors, not the
 * cyclic-order rule the module uses.
 */
import { describe, expect, it } from "vitest";
import { Geometry, createPointCloud } from "../data/index.js";
import { makeGeometryItem } from "../graph/index.js";
import { FIT_WORDS, type FitWord, fitGlossary, fitRefusal } from "./boxFit.js";
import {
  FACE_ALONG,
  FACE_ALONG_SIGN,
  FACE_OUT,
  FACE_OUTWARD,
  FACE_SIDE,
  FACE_UP,
  FACE_UP_SIGN,
  decodeFaceFrame,
  faceCodeOf,
  readFaceFrame,
} from "./faceFrame.js";
import { BOX_SNAP_MODES, decodeBoxSnap, f32Ulp, refuseCutSnapMode, snapBoxAxis, snapToLattice } from "./latticeSnap.js";
import { offsetBox } from "./offsetBox.js";
import { placeBox } from "./placeBox.js";
import { listNodeTypes } from "./registry.js";
import { shellSplit } from "./shellSplit.js";
import { splitBox } from "./splitBox.js";
import { firstGeo, runNode } from "./nodes.testsupport.js";

// ---------------------------------------------------------------------------
// Harness

async function rejection(run: Promise<unknown>): Promise<string> {
  const err: unknown = await run.then(
    () => undefined,
    (e: unknown) => e,
  );
  if (!(err instanceof Error)) throw new Error("expected the node to throw an Error");
  return err.message;
}

async function run(def: typeof placeBox | typeof offsetBox | typeof shellSplit | typeof splitBox, geo: Geometry, params: Record<string, unknown> = {}): Promise<Geometry> {
  const outputs = await runNode(def as typeof placeBox, params, { in: [makeGeometryItem(geo)] }, 1);
  return firstGeo(outputs.out);
}

function col(geo: Geometry, name: string): number[] {
  const a = geo.attrs.point.require(name);
  return Array.from(a.data.slice(0, geo.attrs.point.count * a.tupleSize));
}

type Box = [number[], number[]];

function boxes(geo: Geometry): Box[] {
  const lo = col(geo, "boundsMin");
  const hi = col(geo, "boundsMax");
  return Array.from({ length: geo.pointCount }, (_, i) => [lo.slice(i * 3, i * 3 + 3), hi.slice(i * 3, i * 3 + 3)]);
}

function cells(list: Box[]): Geometry {
  const geo = createPointCloud(list.length);
  const pts = geo.attrs.point;
  list.forEach(([a, b], i) => {
    pts.require("boundsMin").setTuple(i, a);
    pts.require("boundsMax").setTuple(i, b);
  });
  return geo;
}

const worked = (): Geometry => cells([[[0, 0, 0], [8, 6, 4]]]);

/** A message with its leading node name taken off, to compare two nodes' wording. */
const unprefixed = (msg: string, node: string): string => {
  expect(msg.startsWith(`${node}: `)).toBe(true);
  return msg.slice(node.length);
};

// + 0 turns a -0 into +0, so toEqual compares directions only.
const cross = (a: number[], b: number[]): number[] => [a[1] * b[2] - a[2] * b[1] + 0, a[2] * b[0] - a[0] * b[2] + 0, a[0] * b[1] - a[1] * b[0] + 0];
const unit = (axis: number, sign: number): number[] => [0, 1, 2].map((k) => (k === axis ? sign : 0));

// ---------------------------------------------------------------------------

describe("latticeSnap.ts", () => {
  it("f32Ulp is one f32 step at the magnitude of x", () => {
    expect(f32Ulp(1)).toBe(2 ** -23);
    expect(f32Ulp(1.5)).toBe(2 ** -23);
    expect(f32Ulp(-1000)).toBe(2 ** -14);
    expect(f32Ulp(5e5)).toBe(2 ** -5);
    expect(f32Ulp(0)).toBe(2 ** -149);
    expect(f32Ulp(Infinity)).toBe(Infinity);
    // Just below a power of two it is the lower binade's: Math.log2 rounds
    // 1024 - 2^-42 (two f64 steps below 1024) up to 10, and the log2 form
    // gave twice this.
    expect(Math.log2(1024 - 2 ** -42)).toBe(10);
    expect(f32Ulp(-(1024 - 2 ** -42))).toBe(2 ** -14);
    expect(f32Ulp(2 - 2 ** -52)).toBe(2 ** -23);
    // It is the gap to the next f32.
    for (const x of [0.1, 3, 1000.5, 98765.43, 1e6]) {
      const f = Math.fround(x);
      expect(Math.fround(f + f32Ulp(f)) - f).toBe(f32Ulp(f));
    }
  });

  it("decodes the five snapMode words into face rounding codes (floor 0, round 1, ceil 2); a size rounds as the max face", () => {
    const codes = Object.fromEntries(BOX_SNAP_MODES.map((m) => [m, decodeBoxSnap("n", m, "lattice")]));
    expect(codes.round).toEqual({ lo: 1, hi: 1, toSize: false });
    expect(codes.floor).toEqual({ lo: 0, hi: 0, toSize: false });
    expect(codes.ceil).toEqual({ lo: 2, hi: 2, toSize: false });
    expect(codes.out).toEqual({ lo: 0, hi: 2, toSize: false }); // grows
    expect(codes.in).toEqual({ lo: 2, hi: 0, toSize: false }); // shrinks
    expect(decodeBoxSnap("n", "round", "size").toSize).toBe(true);
    expect(() => decodeBoxSnap("n", "nearest", "lattice")).toThrow('n: param "snapMode" is "nearest"; valid: round, floor, ceil, out, in — ');
    expect(() => decodeBoxSnap("n", "round", "grid")).toThrow('n: param "snapTo" is "grid"; valid: lattice, size.');
  });

  it("a face within two ulps of a line is ON it, whatever the mode; past that it rounds by the mode", () => {
    const F = Math.fround;
    // Stored 1.2 on a 0.4 lattice: on the line under ceil, not 1.6.
    expect(F(snapToLattice(F(1.2), 0.4, 2))).toBe(F(1.2));
    // Two ulps above 1000 is on 1000; eight is not.
    expect(snapToLattice(1000 + 2 * 2 ** -14, 1, 2)).toBe(1000);
    expect(snapToLattice(1000 + 8 * 2 ** -14, 1, 2)).toBe(1001);
    expect(snapToLattice(1000 + 8 * 2 ** -14, 1, 0)).toBe(1000);
  });

  it('snapBoxAxis "size" keeps the centre and rounds the size; "in" with no whole step is a box of no volume at the centre', () => {
    const out = [0, 0];
    snapBoxAxis(0, 10, 4, decodeBoxSnap("n", "out", "size"), out);
    expect(out).toEqual([-1, 11]);
    snapBoxAxis(0, 10, 16, decodeBoxSnap("n", "in", "size"), out);
    expect(out).toEqual([5, 5]);
    // A crossed box is left as it is, for fit.
    snapBoxAxis(3, 1, 4, decodeBoxSnap("n", "out", "size"), out);
    expect(out).toEqual([3, 1]);
  });

  it("refuseCutSnapMode refuses only the two box words", () => {
    expect(refuseCutSnapMode("splitBox", "snapMode", "out")).toContain('splitBox: param "snapMode" is "out", which snaps a BOX');
    expect(refuseCutSnapMode("splitBox", "snapMode", "in")).toContain("Valid here: floor, round, ceil");
    for (const v of ["floor", "round", "ceil", "bogus", 3]) expect(refuseCutSnapMode("splitBox", "snapMode", v)).toBeUndefined();
  });
});

describe("faceFrame.ts", () => {
  /** A one-cell frame as faceFrame reads it. */
  const colsOf = (along: number, sign: number, n: number[]) => ({
    alongAxis: [along],
    alongSign: [sign],
    outward: n,
    alongAxisAttr: "alongAxis",
    alongSignAttr: "alongSign",
    outwardAttr: "outward",
  });

  it("up is out x along — a real cross product — for every along axis and sign and every out axis and sign", () => {
    let n = 0;
    for (let a = 0; a < 3; a++)
      for (const sa of [1, -1])
        for (let o = 0; o < 3; o++)
          for (const so of [1, -1]) {
            if (a === o) continue;
            const axis = [0, 0, 0];
            const sign = [0, 0, 0];
            decodeFaceFrame("n", colsOf(a, sa * 0.5, unit(o, so * 2)), 0, axis, sign);
            const up = cross(unit(o, so), unit(a, sa));
            expect([axis[0], sign[0]]).toEqual([a, sa]);
            expect(unit(axis[1], sign[1]), `along ${a}/${sa} out ${o}/${so}`).toEqual(up);
            expect([axis[2], sign[2]]).toEqual([o, so]);
            // ...and the frame is right-handed: along x up = out.
            expect(cross(unit(a, sa), up)).toEqual(unit(o, so));
            n++;
          }
    expect(n).toBe(24);
  });

  it("the derived up is the face table's up, on every face code", () => {
    for (let k = 0; k < 6; k++) {
      const axis = [0, 0, 0];
      const sign = [0, 0, 0];
      decodeFaceFrame("n", colsOf(FACE_ALONG[k], FACE_ALONG_SIGN[k], [...FACE_OUTWARD[k]]), 0, axis, sign);
      expect([axis[1], sign[1]], `face ${k}`).toEqual([FACE_UP[k], FACE_UP_SIGN[k]]);
      expect([axis[2], sign[2]], `face ${k}`).toEqual([FACE_OUT[k], FACE_SIDE[k]]);
      expect(faceCodeOf(FACE_OUT[k], FACE_SIDE[k])).toBe(k);
    }
  });

  it("the derived up is the up shellSplit writes, on every face", async () => {
    const shell = await run(shellSplit, worked(), { thickness: [1] });
    const cols = readFaceFrame("n", shell.attrs.point, { alongAxisAttr: "alongAxis", alongSignAttr: "alongSign", outwardAttr: "outward" });
    const up = col(shell, "upAxis");
    const upS = col(shell, "upSign");
    expect(shell.pointCount).toBe(6);
    for (let i = 0; i < shell.pointCount; i++) {
      const axis = [0, 0, 0];
      const sign = [0, 0, 0];
      decodeFaceFrame("n", cols, i, axis, sign);
      expect([axis[1], sign[1]], `face ${i}`).toEqual([up[i], upS[i]]);
    }
  });
});

describe("boxFit.ts", () => {
  it("the glossary names every word once and says which this node takes", () => {
    const g = fitGlossary(["error", "clip"]);
    expect(g.startsWith("FIT GLOSSARY, one meaning per word across splitBox, shellSplit, placeBox and offsetBox: ")).toBe(true);
    for (const w of FIT_WORDS) expect(g).toContain(`"${w}" `);
    expect(g.endsWith('This node takes "error", "clip".')).toBe(true);
  });

  it("a refusal names the node's list, and why for a glossary word given a reason; never a reason for an unknown word", () => {
    expect(fitRefusal("n", "squash", ["error"], { clip: "why" })).toBe('n: param "fit" is "squash"; valid: error.');
    expect(fitRefusal("n", "clip", ["error"], {})).toBe('n: param "fit" is "clip"; valid: error.');
    expect(fitRefusal("n", "clip", ["error"], { clip: "it has no limit" })).toBe(
      'n: param "fit" is "clip"; valid: error. On the other box nodes "clip" cuts away what passes the limit and keeps the rest, nothing moved or rescaled; here it has no limit.',
    );
  });
});

// ---------------------------------------------------------------------------

describe("box nodes: one face frame", () => {
  it("on shellSplit output with NO up written (the brick house facade's call), placeBox and offsetBox agree with each other and with outward and up", async () => {
    const bare = await run(shellSplit, worked(), { thickness: [1], upAxisAttr: "", upSignAttr: "" });
    expect(bare.attrs.point.get("upAxis")).toBeUndefined();
    expect(bare.attrs.point.get("upSign")).toBeUndefined();
    // The same pieces with up written, to check the derived up against.
    const full = await run(shellSplit, worked(), { thickness: [1] });
    expect(boxes(bare)).toEqual(boxes(full));
    const outward = col(bare, "outward");
    const upAxis = col(full, "upAxis");
    const upSign = col(full, "upSign");
    const before = boxes(bare);
    const n = bare.pointCount;
    expect(n).toBe(6);

    /** [world axis, side] of the one face offsetBox moved on piece i. */
    const movedFace = (after: Box[], i: number): [number, number] => {
      const moved: [number, number][] = [];
      for (let k = 0; k < 3; k++) {
        if (after[i][0][k] !== before[i][0][k]) moved.push([k, -1]);
        if (after[i][1][k] !== before[i][1][k]) moved.push([k, 1]);
      }
      expect(moved.length, `piece ${i}`).toBe(1);
      return moved[0];
    };
    /** [world axis, side] of the end placeBox's thin slab stands against on piece i. */
    const slabSide = (after: Box[], i: number): [number, number] => {
      const off: [number, number][] = [];
      for (let k = 0; k < 3; k++) {
        const d = (after[i][0][k] + after[i][1][k]) / 2 - (before[i][0][k] + before[i][1][k]) / 2;
        if (d !== 0) off.push([k, Math.sign(d)]);
      }
      expect(off.length, `piece ${i}`).toBe(1);
      return off[0];
    };

    // OUT: a 0.25 slab flush against the outer face, and the outer face pushed out 1.
    const placedOut = boxes(await run(placeBox, bare, { frame: "face", size: [1, 1, 0.25], units: ["relative", "relative", "absolute"], anchor: [0.5, 0.5, 1] }));
    const offsetOut = boxes(await run(offsetBox, bare, { frame: "face", marginMax: [0, 0, 1] }));
    // UP: a 0.25 slab against the top, and the top raised 1.
    const placedUp = boxes(await run(placeBox, bare, { frame: "face", size: [1, 0.25, 1], units: ["relative", "absolute", "relative"], anchor: [0.5, 1, 0.5] }));
    const offsetUp = boxes(await run(offsetBox, bare, { frame: "face", marginMax: [0, 1, 0] }));
    for (let i = 0; i < n; i++) {
      const k = [0, 1, 2].find((a) => outward[i * 3 + a] !== 0)!;
      const out: [number, number] = [k, Math.sign(outward[i * 3 + k])];
      expect(slabSide(placedOut, i), `placeBox out, piece ${i}`).toEqual(out);
      expect(movedFace(offsetOut, i), `offsetBox out, piece ${i}`).toEqual(out);
      // Flush: the slab's outer face IS the piece's outer face.
      expect(out[1] > 0 ? placedOut[i][1][k] : placedOut[i][0][k]).toBe(out[1] > 0 ? before[i][1][k] : before[i][0][k]);
      const up: [number, number] = [upAxis[i], upSign[i]];
      expect(slabSide(placedUp, i), `placeBox up, piece ${i}`).toEqual(up);
      expect(movedFace(offsetUp, i), `offsetBox up, piece ${i}`).toEqual(up);
    }
  });

  it("a cell with along and up but no outward is refused by BOTH nodes in the same words, naming outward", async () => {
    const geo = worked();
    const pts = geo.attrs.point;
    pts.add("alongAxis", "i32", 1, 0);
    pts.add("alongSign", "i32", 1, 1);
    pts.add("upAxis", "i32", 1, 1);
    pts.add("upSign", "i32", 1, 1);
    const p = await rejection(run(placeBox, geo, { frame: "face" }));
    const o = await rejection(run(offsetBox, geo, { frame: "face" }));
    for (const msg of [p, o]) {
      expect(msg).toContain("cannot give one of them");
      expect(msg).toContain('there is no "outward" (param "outwardAttr", the outward normal)');
      expect(msg).not.toContain('there is no "alongAxis"');
    }
    expect(unprefixed(p, "placeBox")).toBe(unprefixed(o, "offsetBox"));
  });

  it("a cell missing all three gets ONE message naming all three, the same from both nodes", async () => {
    const p = await rejection(run(placeBox, worked(), { frame: "face" }));
    const o = await rejection(run(offsetBox, worked(), { frame: "face" }));
    for (const msg of [p, o]) {
      expect(msg).toContain("cannot give 3 of them");
      for (const [name, param] of [
        ["alongAxis", "alongAxisAttr"],
        ["alongSign", "alongSignAttr"],
        ["outward", "outwardAttr"],
      ]) {
        expect(msg).toContain(`there is no "${name}" (param "${param}"`);
      }
    }
    expect(unprefixed(p, "placeBox")).toBe(unprefixed(o, "offsetBox"));
  });

  it("both nodes refuse shellSplit's interior (a zero normal), naming the cell", async () => {
    const room = await run(shellSplit, worked(), { thickness: [1], interiorLabel: "room" });
    const p = await rejection(run(placeBox, room, { frame: "face" }));
    const o = await rejection(run(offsetBox, room, { frame: "face" }));
    for (const msg of [p, o]) expect(msg).toContain("cell 6's outward normal (\"outward\"), and it is [0, 0, 0] — a zero normal faces nowhere");
    expect(unprefixed(p, "placeBox")).toBe(unprefixed(o, "offsetBox"));
  });
});

describe("box nodes: one snapMode", () => {
  it("placeBox and offsetBox take all five words with one meaning, and refuse a sixth naming the same five", async () => {
    // placeBox: the centred unit box x [3.5, 4.5]; offsetBox: the box x [0.5, 2.5].
    const wantPlace: Record<string, number[]> = { round: [4, 5], floor: [3, 4], ceil: [4, 5], out: [3, 5], in: [4, 4] };
    const wantOffset: Record<string, number[]> = { round: [1, 3], floor: [0, 2], ceil: [1, 3], out: [0, 3], in: [1, 2] };
    for (const mode of BOX_SNAP_MODES) {
      const [pl] = boxes(await run(placeBox, worked(), { snap: [1, 0, 0], snapMode: mode }));
      expect([pl[0][0], pl[1][0]], `placeBox ${mode}`).toEqual(wantPlace[mode]);
      const [of] = boxes(await run(offsetBox, cells([[[0.5, 0, 0], [2.5, 1, 1]]]), { snap: [1, 0, 0], snapMode: mode }));
      expect([of[0][0], of[1][0]], `offsetBox ${mode}`).toEqual(wantOffset[mode]);
    }
    const p = await rejection(run(placeBox, worked(), { snapMode: "bogus" }));
    const o = await rejection(run(offsetBox, worked(), { snapMode: "bogus" }));
    expect(p).toContain('param "snapMode" is "bogus"; valid: round, floor, ceil, out, in — ');
    expect(unprefixed(p, "placeBox")).toBe(unprefixed(o, "offsetBox"));
  });

  it('splitBox refuses "out" and "in" with the cut message, and still takes floor, round and ceil', async () => {
    const p = { labels: ["a", "b", "c"], sizes: [1, 1, 1], units: ["relative", "relative", "relative"], snap: [1, 0, 0] };
    const cell = (): Geometry => cells([[[0, 0, 0], [10, 1, 1]]]);
    for (const mode of ["out", "in"]) {
      const msg = await rejection(run(splitBox, cell(), { ...p, snapMode: mode }));
      expect(msg).toBe(refuseCutSnapMode("splitBox", "snapMode", mode));
      expect(msg).toContain("a cut lies between two pieces and has no inside to grow or shrink. Valid here: floor, round, ceil");
    }
    // Cuts at 10/3 and 20/3.
    const cuts: Record<string, number[]> = { floor: [3, 6], round: [3, 7], ceil: [4, 7] };
    for (const mode of ["floor", "round", "ceil"]) {
      const b = boxes(await run(splitBox, cell(), { ...p, snapMode: mode }));
      expect([b[0][1][0], b[1][1][0]], mode).toEqual(cuts[mode]);
    }
    expect(await rejection(run(splitBox, cell(), { ...p, snapMode: "bogus" }))).toBe('splitBox: param "snapMode" is "bogus"; valid: floor, round, ceil.');
  });
});

describe("box nodes: one fit glossary", () => {
  const ACCEPTS: Record<string, FitWord[]> = {
    splitBox: ["error", "clip", "scale"],
    shellSplit: ["error", "clip", "scale"],
    placeBox: ["error", "allow", "clamp", "clip"],
    offsetBox: ["error", "scale", "allow"],
  };

  for (const type of Object.keys(ACCEPTS)) {
    it(`${type}: its registry description carries the glossary for its own fit words, every one a glossary word`, () => {
      const info = listNodeTypes().find((t) => t.type === type);
      expect(info, type).toBeDefined();
      const words = info!.params.fit?.enum as FitWord[] | undefined;
      expect(words).toBeDefined();
      for (const w of words!) expect(FIT_WORDS as readonly string[]).toContain(w);
      expect([...words!].sort()).toEqual([...ACCEPTS[type]].sort());
      expect(info!.description).toContain(fitGlossary(words!));
    });
  }
});
