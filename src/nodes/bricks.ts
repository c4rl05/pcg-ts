/**
 * Bricks: a set of boxes on a stud lattice, turned into the bricks that
 * would build it.
 *
 * One node, {@link packBricks}. The question behind it is a PACKING and not
 * a sampling: the boxes upstream say which lattice cells are solid and what
 * each one is made of, and the answer is a list of bricks — whole-number
 * footprints from a stated catalogue — that fills exactly those cells, no
 * brick crossing a change of material and no vertical seam continuing from
 * one course into the next where a different brick would have broken it.
 *
 * THE ALGORITHM IS A SCANLINE GREEDY, and the scan is what makes it
 * complete. Cells are visited course by course from the bottom, and within
 * a course in z then x. The first unfilled cell of a scan has every cell
 * before it filled, so any brick that covers it and has not been placed yet
 * has its minimum corner exactly there — the anchor is never a guess, and
 * the only choice is WHICH brick. Height first — the tallest entry that
 * fits is the course — and then footprint, less a cost for every stud of
 * joint that would sit on a seam in the course below where a bigger brick
 * could have bridged it. A brick that does not fit anywhere is refused
 * naming the cell, which is the case of a catalogue with no 1x1 plate.
 *
 * It is whole-input for the reason every packing is: a brick spans cells,
 * so cooked over half the boxes it would cut bricks at the half. No seed and
 * no randomness — the scan order and the catalogue order decide everything,
 * and which box owns a cell where two overlap is decided by point identity.
 */
import type { Attribute, Geometry } from "../data/index.js";
import { attributeNotFound } from "../data/attributeNotFound.js";
// Directly, not through `../data/index.js`: identity is internal to the
// library (see that module's header), and every identity-keyed node in the
// standard library reaches it the same way.
import { canonicalPointRanks } from "../data/identity.js";
import { makeGeometryItem } from "../graph/index.js";
import { standardNode } from "./registry.js";
import { CANCEL_STRIDE, gatherPoints, requireGeometry } from "./util.js";
import type { PackBricksInputs, PackBricksOutputs, PackBricksParams } from "./params.generated.js";

// Generated from the param schemas below; see params.generated.ts.
export type { PackBricksParams } from "./params.generated.js";

/** Named once; every message in this file leads with it. */
const NODE = "packBricks";

/**
 * How far a corner may sit from a lattice plane, in CELLS, and still be
 * read as on it. The boxes arrive in world units through f32 columns, and a
 * plate of 0.4 times 37 is 14.8000002 in f32 — a corner the author put on
 * the lattice exactly. A ten-thousandth of a cell is far above that
 * rounding and far below any offset somebody meant.
 */
const SNAP = 1e-4;

/**
 * The most lattice cells the occupancy grid may span: 16.7 million, 64 MB
 * of the two Int32 columns it carries. The grid is DENSE over the boxes'
 * joint extent, so two small boxes far apart cost the whole span between
 * them; that is refused by size rather than allowed to exhaust memory.
 */
const MAX_CELLS = 1 << 24;

/** Column names this node writes on both outputs. */
const BRICK_ATTR = "brick";
const BRICK_INDEX_ATTR = "brickIndex";

/**
 * The default catalogue as flat [w, d, h] triples: w studs along x, d studs
 * along z, h plates tall, in the brick's own frame. Full-height bricks are
 * three plates, and a 1x1 plate closes the list so any occupancy can be
 * covered.
 */
const DEFAULT_BRICKS: readonly number[] = [
  2, 8, 3, 2, 6, 3, 2, 4, 3, 2, 3, 3, 2, 2, 3, 1, 8, 3, 1, 6, 3, 1, 4, 3, 1, 3, 3, 1, 2, 3, 1, 1, 3,
  2, 8, 1, 2, 6, 1, 2, 4, 1, 2, 3, 1, 2, 2, 1, 1, 8, 1, 1, 6, 1, 1, 4, 1, 1, 3, 1, 1, 2, 1, 1, 1, 1,
];

/** One way of placing a catalogue entry: as listed, or a quarter turn. */
interface Candidate {
  /** Index of the entry in `bricks`. */
  readonly index: number;
  /** Footprint along x and z on the lattice, after the turn. */
  readonly fx: number;
  readonly fz: number;
  readonly h: number;
  /** Footprint in studs: what the seam cost is weighed against. */
  readonly area: number;
  readonly turned: boolean;
}

/**
 * Turns a catalogue of boxes on a stud lattice into the bricks that build
 * them, plus the studs left showing on top.
 */
export const packBricks = standardNode<PackBricksParams, PackBricksInputs, PackBricksOutputs>({
  type: NODE,
  category: "point op",
  description:
    "Reads axis-aligned BOXES on a stud lattice — one per point, its corners in two point attributes — and writes the BRICKS that build them: one point per brick, from a stated catalogue of footprints, that together fill exactly the lattice cells the boxes cover. The lattice is `pitch` in world units per cell (a stud is 1 across, a plate 0.4 tall, by default), anchored at `origin`; x and z count studs and y counts plates. Every corner must land on the lattice, and one that does not is refused naming the point and the corner, because a box half a stud off is a box the graph upstream built on a different lattice. Boxes may overlap: their cells are unioned, and a cell two boxes claim belongs to the one with the lower point IDENTITY (stored position bits plus `seed`), never the lower array index, so shuffling the input changes nothing — unless two overlapping boxes share both P and `seed`, which identity cannot tell apart, and then the earlier one in the input wins. WHAT A BRICK MAY NOT CROSS is `groupBy`: cells whose boxes differ in any listed attribute are different material and never share a brick, so a wall's colour changes exactly where its boxes' colour does. Each brick carries every point attribute of the box that owns its anchor cell. THE PACKING IS A SCANLINE GREEDY, course by course from the bottom and within a course in z then x. The first unfilled cell of a scan is always the minimum corner of the brick that covers it, so the scan never needs to backtrack; the choice there is WHICH catalogue entry, either way round. HEIGHT COMES FIRST: the tallest entry that fits is the course, so a wall is laid in full bricks and plates appear only where the space is shorter than a brick. Among footprints of that height the score is the footprint in studs less `stagger` for every stud of joint in the brick's bottom course that sits directly on a seam in the course below, counted only on the joints the placement decides — where the cell across is the same material and not yet filled — a running bond, the reason real walls hold together, charged only where a different brick could have avoided it. Ties go to the larger footprint, then the earlier catalogue entry, then the entry as listed rather than turned. If nothing fits — a catalogue with no 1x1 plate meeting a one-plate gap — the cell is refused by name rather than left empty, so the output always covers the input exactly. OUTPUT `out`: one point per brick in scan order. P is the brick's centre, `rot` a quarter turn about y when the entry was placed turned (identity otherwise), and `scale` its full extents in its OWN frame — w and d studs and h plates as listed, in world units — so a unit box copied onto these points draws every brick in place. `boundsMin`/`boundsMax` are its world corners, the same convention it reads. `brick` (string) is the entry as `WxDxH`, ready to be spawnInstances' `assetAttr`, and `brickIndex` (i32) is its position in the catalogue. OUTPUT `studs`: one point per stud left SHOWING — on a brick's top where the lattice cell above is empty — at the stud's base centre on the brick's top face, carrying the brick's attributes and its `brick`/`brickIndex`, with identity `rot` and unit `scale`, so a stud mesh modelled at world size with its base at the origin spawns straight onto it; the bounds columns are reset to zero. `islandsAttr` optionally writes a DETAIL u32 on `out` counting the pieces the build falls into when only stud CLUTCH holds it — a brick is joined to the bricks sitting on its top face where their footprints overlap, and side contact does not count, so a value above 1 is a build that comes apart when lifted. HALO: none. A brick spans cells, so cooked over part of the boxes it cuts bricks at the part's edge; this belongs on an unbounded level or before a split. Not GPU-eligible: the packing is sequential by construction. The occupancy grid is dense over the boxes' joint extent and refused past 16.7 million cells.",
  inputs: [{ name: "in", kind: "geometry" }],
  outputs: [
    { name: "out", kind: "geometry" },
    { name: "studs", kind: "geometry" },
  ],
  params: {
    minAttr: {
      type: "string",
      default: "boundsMin",
      description:
        "POINT attribute (f32 or i32, tuple size 3) holding each box's minimum corner in WORLD units — the absolute corner, not an offset from P, which is what setBounds writes. Converted to lattice cells through `pitch` and `origin` and refused, naming the point, unless every component lands on a lattice plane.",
    },
    maxAttr: {
      type: "string",
      default: "boundsMax",
      description:
        "POINT attribute (f32 or i32, tuple size 3) holding each box's maximum corner in world units, on the same terms as `minAttr`. A box with a maximum below its minimum on any axis is refused; one with zero extent on an axis covers no cells and is skipped.",
    },
    pitch: {
      type: "vec3",
      default: [1, 0.4, 1],
      description:
        "World size of one lattice cell: [stud, plate, stud]. The default is the proportion of the familiar toy brick, a plate being 0.4 of a stud's width and a full brick three plates. x and z must be EQUAL, because a stud is square and a brick turned a quarter turn has to land on the same lattice it left; every component must be positive.",
    },
    origin: {
      type: "vec3",
      default: [0, 0, 0],
      description:
        "World position of a lattice corner. Corners are read as origin + k * pitch for whole k on each axis, so a set of boxes built on integer studs but shifted by half a stud is packed by moving this, not the boxes.",
    },
    bricks: {
      type: "numberList",
      default: DEFAULT_BRICKS,
      description:
        "The CATALOGUE, as a flat list of [w, d, h] triples: w studs along x, d studs along z, h plates tall, all whole numbers of at least 1, in the brick's own frame. Each entry may also be placed a quarter turn about y (d along x, w along z), so [1, 4, 3] and [4, 1, 3] are the same brick and listing both is refused. The ORDER is the last tie-break: two entries of equal height, footprint and seam cost go to the earlier one. The default holds the common full-height bricks (h 3) and plates (h 1) from 1x1 to 2x8. Without [1, 1, 1] some occupancies cannot be covered at all — a gap one plate tall and one stud wide — and the cook is refused at the first such cell rather than leaving it empty.",
    },
    groupBy: {
      type: "stringList",
      default: [],
      description:
        "POINT attributes whose values a brick may not cross: two cells whose owning boxes differ in ANY listed attribute (any type, every component compared exactly; strings by value) never share a brick. Typically the colour and the kind — a window's glass is not one brick with the wall around it. Empty (the default) packs every cell as one material. A name the input does not carry is refused, listing what it does carry.",
    },
    stagger: {
      type: "f32",
      default: 3,
      min: 0,
      description:
        "The cost, in studs of footprint, of one stud of JOINT in a placement's bottom course that sits directly on a seam in the course below — a joint edge where the two cells beneath it belong to different bricks. Only the joints the placement DECIDES count — where the cell across is the SAME material and not yet filled, so a different brick could still have bridged it: a joint against another colour, empty space or a brick already standing is one every candidate shares, and charging for it would only favour short bricks. Height is not traded against it — the tallest entry that fits is chosen first — so this decides among footprints of one height. At the default of 3 a 1x8 whose end continues a seam scores 8 - 3 = 5 and loses to an unbroken 1x6 at 6, and a 2x8 with both studs of its end on a seam scores 10 against a 2x6's 12; a 1x2 on a seam (-1) loses to a 1x1 (1). 0 packs largest-first and lets seams run straight up a wall.",
    },
    islandsAttr: {
      type: "string",
      default: "",
      description:
        "Optional DETAIL attribute (u32) on `out` receiving how many separate pieces the bricks form when only stud clutch holds them together: a brick joins every brick sitting directly on its top face with an overlapping footprint, and side-by-side contact does not join. 1 is a build that lifts as one piece. Empty (the default) writes nothing.",
    },
  },
  execute({ inputs, params, checkCancelled }) {
    // Params before geometry, the house order: a bad param reported
    // against the data sends an author to debug the wrong thing.
    const { minAttr, maxAttr, groupBy, islandsAttr } = params;
    const pitch = [params.pitch[0], params.pitch[1], params.pitch[2]] as const;
    const origin = [params.origin[0], params.origin[1], params.origin[2]] as const;
    if (minAttr === "" || maxAttr === "") {
      throw new Error(
        `${NODE}: params "minAttr" and "maxAttr" must both name a point attribute (the defaults are "boundsMin" and "boundsMax"); got "${minAttr}" and "${maxAttr}"`,
      );
    }
    if (minAttr === maxAttr) {
      throw new Error(
        `${NODE}: params "minAttr" and "maxAttr" are both "${minAttr}"; a box needs two corners from two columns`,
      );
    }
    for (let c = 0; c < 3; c++) {
      const p = pitch[c] as number;
      if (!Number.isFinite(p) || p <= 0) {
        throw new Error(
          `${NODE}: param "pitch" is [${pitch.join(", ")}]; every component is the world size of one lattice cell and must be positive and finite`,
        );
      }
      if (!Number.isFinite(origin[c] as number)) {
        throw new Error(`${NODE}: param "origin" is [${origin.join(", ")}]; every component must be finite`);
      }
    }
    if (pitch[0] !== pitch[2]) {
      throw new Error(
        `${NODE}: param "pitch" is [${pitch.join(", ")}], with x and z different; a stud is square, so a brick turned a quarter turn would leave the lattice — set pitch[0] and pitch[2] equal`,
      );
    }
    const stagger = params.stagger;
    if (!Number.isFinite(stagger) || stagger < 0) {
      throw new Error(`${NODE}: param "stagger" is ${stagger}; it is a cost and must be finite and at least 0 (0 lets seams run)`);
    }
    const catalogue = readCatalogue(params.bricks);
    const seenGroup = new Set<string>();
    for (const name of groupBy) {
      if (name === "") {
        throw new Error(`${NODE}: param "groupBy" holds an empty name; list point attribute names, e.g. ["color"]`);
      }
      if (seenGroup.has(name)) {
        throw new Error(`${NODE}: param "groupBy" names "${name}" twice; each attribute is compared once`);
      }
      seenGroup.add(name);
    }

    const src = requireGeometry(inputs, "in", NODE);
    const pts = src.attrs.point;
    for (const [name, type] of [
      [BRICK_ATTR, "string"],
      [BRICK_INDEX_ATTR, "i32"],
    ] as const) {
      const existing = pts.get(name);
      if (existing !== undefined && (existing.type !== type || existing.tupleSize !== 1)) {
        throw new Error(
          `${NODE}: the input carries a point attribute "${name}" (${existing.type}, tuple size ${existing.tupleSize}), and this node writes "${name}" as ${type} with tuple size 1 on both outputs; remove it upstream with removeAttribute, or carry it under another name`,
        );
      }
    }
    const n = pts.count;
    const loCol = cornerColumn(src, minAttr, "minAttr");
    const hiCol = cornerColumn(src, maxAttr, "maxAttr");
    const groupCols = groupBy.map((name) => {
      const col = pts.get(name);
      if (col === undefined) {
        throw attributeNotFound(src, "point", name, { prefix: `${NODE}: `, param: "groupBy" });
      }
      return col;
    });

    // ---- boxes to lattice cells ---------------------------------------
    const cellLo = new Int32Array(n * 3);
    const cellHi = new Int32Array(n * 3);
    const solid = new Uint8Array(n);
    const gMin = [Infinity, Infinity, Infinity];
    const gMax = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < n; i++) {
      let empty = false;
      for (let c = 0; c < 3; c++) {
        const a = toCell(loCol.get(i, c), c, i, minAttr, pitch, origin);
        const b = toCell(hiCol.get(i, c), c, i, maxAttr, pitch, origin);
        if (b < a) {
          throw new Error(
            `${NODE}: point ${i} has ${maxAttr}.${"xyz"[c]} below ${minAttr}.${"xyz"[c]} (${hiCol.get(i, c)} < ${loCol.get(i, c)}); a box's maximum corner must not be under its minimum — check which column is which`,
          );
        }
        if (b === a) empty = true;
        cellLo[i * 3 + c] = a;
        cellHi[i * 3 + c] = b;
      }
      if (empty) continue;
      solid[i] = 1;
      for (let c = 0; c < 3; c++) {
        gMin[c] = Math.min(gMin[c] as number, cellLo[i * 3 + c] as number);
        gMax[c] = Math.max(gMax[c] as number, cellHi[i * 3 + c] as number);
      }
    }

    const owners: number[] = [];
    for (let i = 0; i < n; i++) if (solid[i] === 1) owners.push(i);
    if (owners.length === 0) {
      return emptyOutputs(src, islandsAttr);
    }
    const x0 = gMin[0] as number;
    const y0 = gMin[1] as number;
    const z0 = gMin[2] as number;
    const nx = (gMax[0] as number) - x0;
    const ny = (gMax[1] as number) - y0;
    const nz = (gMax[2] as number) - z0;
    const total = nx * ny * nz;
    if (total > MAX_CELLS) {
      throw new Error(
        `${NODE}: the boxes span ${nx} x ${ny} x ${nz} = ${total} lattice cells, above the limit of ${MAX_CELLS}; the occupancy grid is dense over their joint extent, so pack separate builds separately (partitionByAttribute) or check "pitch" — a pitch ten times too small is a grid a thousand times too large`,
      );
    }

    // ---- groups: one small integer per distinct material -------------
    const group = new Int32Array(n);
    if (groupCols.length > 0) {
      const isString = groupCols.map((col) => col.type === "string");
      const keys = new Map<string, number>();
      for (const i of owners) {
        const parts: (string | number)[] = [];
        for (let g = 0; g < groupCols.length; g++) {
          const col = groupCols[g] as Attribute;
          for (let c = 0; c < col.tupleSize; c++) {
            parts.push(isString[g] === true ? col.getString(i, c) : col.get(i, c));
          }
        }
        const key = JSON.stringify(parts);
        let id = keys.get(key);
        if (id === undefined) {
          id = keys.size;
          keys.set(key, id);
        }
        group[i] = id;
      }
    }

    // ---- occupancy: the lowest identity claims a shared cell ---------
    const rank = canonicalPointRanks(src, NODE);
    owners.sort((a, b) => (rank[a] as number) - (rank[b] as number));
    const owner = new Int32Array(total).fill(-1);
    const sxz = nx * nz;
    const at = (x: number, y: number, z: number): number => y * sxz + z * nx + x;
    let work = 0;
    for (const i of owners) {
      if ((++work & (CANCEL_STRIDE - 1)) === 0) checkCancelled();
      const ax = (cellLo[i * 3] as number) - x0;
      const ay = (cellLo[i * 3 + 1] as number) - y0;
      const az = (cellLo[i * 3 + 2] as number) - z0;
      const bx = (cellHi[i * 3] as number) - x0;
      const by = (cellHi[i * 3 + 1] as number) - y0;
      const bz = (cellHi[i * 3 + 2] as number) - z0;
      for (let y = ay; y < by; y++) {
        for (let z = az; z < bz; z++) {
          for (let x = ax; x < bx; x++) {
            const k = at(x, y, z);
            if (owner[k] === -1) owner[k] = i;
          }
        }
      }
    }
    const cellGroup = new Int32Array(total).fill(-1);
    for (let k = 0; k < total; k++) {
      const o = owner[k] as number;
      if (o >= 0) cellGroup[k] = group[o] as number;
    }

    // ---- the scan ----------------------------------------------------
    const brickOf = new Int32Array(total).fill(-1);
    const bx: number[] = [];
    const by: number[] = [];
    const bz: number[] = [];
    const bCand: Candidate[] = [];
    const bOwner: number[] = [];
    // Below the bottom course every cell is "not a seam": nothing is there.
    const seamBelow = (y: number, ax: number, az: number, cx: number, cz: number): boolean => {
      if (y === 0) return false;
      const a = brickOf[at(ax, y - 1, az)] as number;
      const b = brickOf[at(cx, y - 1, cz)] as number;
      return a >= 0 && b >= 0 && a !== b;
    };
    const fits = (x: number, y: number, z: number, cand: Candidate, g: number): boolean => {
      if (x + cand.fx > nx || z + cand.fz > nz || y + cand.h > ny) return false;
      for (let yy = y; yy < y + cand.h; yy++) {
        for (let zz = z; zz < z + cand.fz; zz++) {
          for (let xx = x; xx < x + cand.fx; xx++) {
            const k = at(xx, yy, zz);
            if (cellGroup[k] !== g || (brickOf[k] as number) >= 0) return false;
          }
        }
      }
      return true;
    };
    // The joints a placement DECIDES: faces of its bottom course whose
    // outside cell is the same material AND not yet filled, so a different
    // brick could still have bridged it — charged when the two cells below
    // belong to different bricks. A face against a brick already standing
    // (one placed earlier in this course, or a taller one rising from
    // below) is a joint every candidate has; so is one against another
    // material or empty space. Charging those penalised long and deep
    // bricks by the stud: against a party wall of another colour the
    // shortest brick always won, and charging the scan's already-filled
    // side cost 9% more bricks over forty houses for a WORSE bond (22% of
    // head joints running straight against 15%).
    const open = (k: number, g: number): boolean => cellGroup[k] === g && (brickOf[k] as number) < 0;
    const alignedSeams = (x: number, y: number, z: number, cand: Candidate, g: number): number => {
      if (y === 0) return 0;
      let count = 0;
      const x1 = x + cand.fx - 1;
      const z1 = z + cand.fz - 1;
      for (let zz = z; zz <= z1; zz++) {
        if (x > 0 && open(at(x - 1, y, zz), g) && seamBelow(y, x, zz, x - 1, zz)) count++;
        if (x1 + 1 < nx && open(at(x1 + 1, y, zz), g) && seamBelow(y, x1, zz, x1 + 1, zz)) count++;
      }
      for (let xx = x; xx <= x1; xx++) {
        if (z > 0 && open(at(xx, y, z - 1), g) && seamBelow(y, xx, z, xx, z - 1)) count++;
        if (z1 + 1 < nz && open(at(xx, y, z1 + 1), g) && seamBelow(y, xx, z1, xx, z1 + 1)) count++;
      }
      return count;
    };

    for (let y = 0; y < ny; y++) {
      for (let z = 0; z < nz; z++) {
        for (let x = 0; x < nx; x++) {
          const k = at(x, y, z);
          const o = owner[k] as number;
          if (o < 0 || (brickOf[k] as number) >= 0) continue;
          if ((++work & (CANCEL_STRIDE - 1)) === 0) checkCancelled();
          const g = cellGroup[k] as number;
          let best: Candidate | undefined;
          let bestScore = -Infinity;
          // Candidates are pre-sorted tallest first, then by footprint, then
          // catalogue order, then as listed before turned, so a strict >
          // keeps the tie-break. HEIGHT IS NOT TRADED against seams: the
          // first height that fits is the course, and the seam cost only
          // chooses among footprints of it. Scored on volume instead, a 1x1
          // plate beat any full brick whose end met a seam, and the plate
          // then knocked every course above it off the brick rhythm — a
          // house's walls came out three quarters plates.
          for (const cand of catalogue) {
            if (best !== undefined && (cand.h < best.h || cand.area <= bestScore)) break;
            if (!fits(x, y, z, cand, g)) continue;
            const score = cand.area - stagger * alignedSeams(x, y, z, cand, g);
            if (score > bestScore) {
              bestScore = score;
              best = cand;
            }
          }
          if (best === undefined) {
            throw new Error(
              `${NODE}: no entry in "bricks" fits at lattice cell (${x + x0}, ${y + y0}, ${z + z0}) — world (${origin[0] + (x + x0) * pitch[0]}, ${origin[1] + (y + y0) * pitch[1]}, ${origin[2] + (z + z0) * pitch[2]}), in the box of point ${o}. The space left there is narrower or shorter than every brick in the catalogue; add [1, 1, 1] (a 1x1 plate) to "bricks" so any occupancy can be covered`,
            );
          }
          const id = bCand.length;
          for (let yy = y; yy < y + best.h; yy++) {
            for (let zz = z; zz < z + best.fz; zz++) {
              for (let xx = x; xx < x + best.fx; xx++) brickOf[at(xx, yy, zz)] = id;
            }
          }
          bx.push(x);
          by.push(y);
          bz.push(z);
          bCand.push(best);
          bOwner.push(o);
        }
      }
    }

    // ---- studs and clutch --------------------------------------------
    const count = bCand.length;
    const parent = new Int32Array(count);
    for (let i = 0; i < count; i++) parent[i] = i;
    const find = (i: number): number => {
      let r = i;
      while ((parent[r] as number) !== r) r = parent[r] as number;
      while ((parent[i] as number) !== r) {
        const next = parent[i] as number;
        parent[i] = r;
        i = next;
      }
      return r;
    };
    const studX: number[] = [];
    const studY: number[] = [];
    const studZ: number[] = [];
    const studBrick: number[] = [];
    for (let id = 0; id < count; id++) {
      const cand = bCand[id] as Candidate;
      const top = (by[id] as number) + cand.h;
      for (let zz = bz[id] as number; zz < (bz[id] as number) + cand.fz; zz++) {
        for (let xx = bx[id] as number; xx < (bx[id] as number) + cand.fx; xx++) {
          const above = top < ny ? (brickOf[at(xx, top, zz)] as number) : -1;
          if (above < 0) {
            studX.push(xx);
            studY.push(top);
            studZ.push(zz);
            studBrick.push(id);
          } else {
            const ra = find(id);
            const rb = find(above);
            if (ra !== rb) parent[Math.max(ra, rb)] = Math.min(ra, rb);
          }
        }
      }
    }
    let islands = 0;
    for (let i = 0; i < count; i++) if (find(i) === i) islands++;

    // ---- outputs ------------------------------------------------------
    const bricksGeo = gatherPoints(src, bOwner);
    const S = Math.SQRT1_2;
    {
      const bp = bricksGeo.attrs.point;
      const P = bp.replace("P", "f32", 3, [0, 0, 0]).writable();
      const rot = bp.replace("rot", "f32", 4, [0, 0, 0, 1]).writable();
      const scale = bp.replace("scale", "f32", 3, [1, 1, 1]).writable();
      const bMin = bp.replace("boundsMin", "f32", 3, [0, 0, 0]).writable();
      const bMax = bp.replace("boundsMax", "f32", 3, [0, 0, 0]).writable();
      const label = bp.replace(BRICK_ATTR, "string", 1, "");
      const index = bp.replace(BRICK_INDEX_ATTR, "i32", 1, 0).writable();
      for (let id = 0; id < count; id++) {
        const cand = bCand[id] as Candidate;
        const lo = [(bx[id] as number) + x0, (by[id] as number) + y0, (bz[id] as number) + z0];
        const ext = [cand.fx, cand.h, cand.fz];
        for (let c = 0; c < 3; c++) {
          const a = origin[c] + (lo[c] as number) * pitch[c];
          const b = origin[c] + ((lo[c] as number) + (ext[c] as number)) * pitch[c];
          bMin[id * 3 + c] = a;
          bMax[id * 3 + c] = b;
          P[id * 3 + c] = 0.5 * (a + b);
        }
        // Own-frame extents: as listed, whichever way it was placed.
        const w = cand.turned ? cand.fz : cand.fx;
        const d = cand.turned ? cand.fx : cand.fz;
        scale[id * 3] = w * pitch[0];
        scale[id * 3 + 1] = cand.h * pitch[1];
        scale[id * 3 + 2] = d * pitch[2];
        if (cand.turned) {
          rot[id * 4 + 1] = S;
          rot[id * 4 + 3] = S;
        }
        label.setString(id, `${w}x${d}x${cand.h}`);
        index[id] = cand.index;
      }
      if (islandsAttr !== "") bricksGeo.attrs.detail.replace(islandsAttr, "u32", 1, 0).set(0, islands);
    }

    const studOwners = studBrick.map((id) => bOwner[id] as number);
    const studsGeo = gatherPoints(src, studOwners);
    {
      const sp = studsGeo.attrs.point;
      const P = sp.replace("P", "f32", 3, [0, 0, 0]).writable();
      sp.replace("rot", "f32", 4, [0, 0, 0, 1]);
      sp.replace("scale", "f32", 3, [1, 1, 1]);
      sp.replace("boundsMin", "f32", 3, [0, 0, 0]);
      sp.replace("boundsMax", "f32", 3, [0, 0, 0]);
      const label = sp.replace(BRICK_ATTR, "string", 1, "");
      const index = sp.replace(BRICK_INDEX_ATTR, "i32", 1, 0).writable();
      const bLabel = bricksGeo.attrs.point.require(BRICK_ATTR);
      for (let s = 0; s < studBrick.length; s++) {
        const id = studBrick[s] as number;
        P[s * 3] = origin[0] + ((studX[s] as number) + x0 + 0.5) * pitch[0];
        P[s * 3 + 1] = origin[1] + ((studY[s] as number) + y0) * pitch[1];
        P[s * 3 + 2] = origin[2] + ((studZ[s] as number) + z0 + 0.5) * pitch[2];
        label.setString(s, bLabel.getString(id));
        index[s] = (bCand[id] as Candidate).index;
      }
    }

    return { out: [makeGeometryItem(bricksGeo)], studs: [makeGeometryItem(studsGeo)] };
  },
});

/** Validates the flat catalogue and expands it into sorted placements. */
function readCatalogue(flat: readonly number[]): Candidate[] {
  if (flat.length === 0 || flat.length % 3 !== 0) {
    throw new Error(
      `${NODE}: param "bricks" has ${flat.length} numbers; it is a flat list of [w, d, h] triples, so its length must be a positive multiple of 3, e.g. [2, 4, 3, 1, 1, 1]`,
    );
  }
  const out: Candidate[] = [];
  const seen = new Map<string, number>();
  for (let e = 0; e < flat.length / 3; e++) {
    const w = flat[e * 3] as number;
    const d = flat[e * 3 + 1] as number;
    const h = flat[e * 3 + 2] as number;
    for (const v of [w, d, h]) {
      if (!Number.isInteger(v) || v < 1) {
        throw new Error(
          `${NODE}: param "bricks" entry ${e} is [${w}, ${d}, ${h}]; studs and plates are whole numbers of at least 1`,
        );
      }
    }
    const key = `${Math.min(w, d)}x${Math.max(w, d)}x${h}`;
    const prior = seen.get(key);
    if (prior !== undefined) {
      throw new Error(
        `${NODE}: param "bricks" entries ${prior} and ${e} are the same brick (${key}) — every entry is also tried a quarter turn round, so list it once`,
      );
    }
    seen.set(key, e);
    out.push({ index: e, fx: w, fz: d, h, area: w * d, turned: false });
    if (w !== d) out.push({ index: e, fx: d, fz: w, h, area: w * d, turned: true });
  }
  // Taller first, then larger footprint, then catalogue order, then as
  // listed before turned.
  out.sort(
    (a, b) => b.h - a.h || b.area - a.area || a.index - b.index || Number(a.turned) - Number(b.turned),
  );
  return out;
}

function cornerColumn(src: Geometry, name: string, param: string): Attribute {
  const col = src.attrs.point.get(name);
  if (col === undefined) throw attributeNotFound(src, "point", name, { prefix: `${NODE}: `, param });
  if ((col.type !== "f32" && col.type !== "i32") || col.tupleSize !== 3) {
    throw new Error(
      `${NODE}: param "${param}" names "${name}", which is ${col.type} with tuple size ${col.tupleSize}; a corner is f32 or i32 with tuple size 3, in world units`,
    );
  }
  return col;
}

/** World coordinate to lattice plane index, refused off the lattice. */
function toCell(
  v: number,
  axis: number,
  point: number,
  attr: string,
  pitch: readonly [number, number, number],
  origin: readonly [number, number, number],
): number {
  const t = (v - origin[axis]) / pitch[axis];
  const k = Math.round(t);
  if (!Number.isFinite(t) || Math.abs(t - k) > SNAP) {
    throw new Error(
      `${NODE}: point ${point}'s ${attr}.${"xyz"[axis]} is ${v}, which is ${t} cells from "origin" on a pitch of ${pitch[axis]} — not on the lattice. Every corner must be origin + a whole number of cells; set "pitch" and "origin" to the lattice the boxes were built on`,
    );
  }
  return k;
}

/** Both pins, with every column a caller reads, for a build of no cells. */
function emptyOutputs(src: Geometry, islandsAttr: string) {
  const make = () => {
    const geo = gatherPoints(src, []);
    const p = geo.attrs.point;
    p.replace("P", "f32", 3, [0, 0, 0]);
    p.replace("rot", "f32", 4, [0, 0, 0, 1]);
    p.replace("scale", "f32", 3, [1, 1, 1]);
    p.replace("boundsMin", "f32", 3, [0, 0, 0]);
    p.replace("boundsMax", "f32", 3, [0, 0, 0]);
    p.replace(BRICK_ATTR, "string", 1, "");
    p.replace(BRICK_INDEX_ATTR, "i32", 1, 0);
    return geo;
  };
  const bricks = make();
  if (islandsAttr !== "") bricks.attrs.detail.replace(islandsAttr, "u32", 1, 0).set(0, 0);
  return { out: [makeGeometryItem(bricks)], studs: [makeGeometryItem(make())] };
}
