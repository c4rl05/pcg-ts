/**
 * `boxesToMesh`: every cell's box (`boundsMin`/`boundsMax`) as mesh
 * geometry — the faces of the box, built where the box IS.
 *
 * WHAT IT REPLACES. A grammar's cells became something a renderer draws
 * through a four-node tail: a setAttribute writing P = box("center"), a
 * setAttribute writing scale = box("size") (or a share of it), a unit
 * meshPrimitive box, and copyToPoints (topology "keep") stamping the unit
 * box onto the cells. That rebuilds each box from a centre and a size, so
 * a face lands at f32(c + s * 0.5) rather than on the stored face — an
 * ulp off on some boxes, so cells that share a face can open or overlap
 * by that ulp — and the cell's attributes (its colour, its label) do not
 * reach the copies unless copyToPoints is told to carry each one.
 *
 * THE LAYOUT IS meshPrimitive's BOX, cell by cell: per listed face its own
 * grid of points (none shared between faces, so uv seams and flat normals
 * are exact), points u fastest then v, two triangles per quad wound to
 * face OUTWARD. The default face order is meshPrimitive's (+x, -x, +y, -y,
 * +z, -z), so a cell's points and triangles are the unit box's copied onto
 * it. The faces are NAMED as shellSplit names a box's sides (floor -y,
 * ceiling +y, south -z, north +z, west -x, east +x), each point records
 * its side's shellSplit FACE CODE, and the uv is that face's FRAME — u
 * along, v up, as shellSplit writes them — so every face reads left to
 * right and bottom to top seen from outside, unmirrored (the box
 * primitive's uv mirrors three of its sides and turns u upright on two).
 *
 * WORLD BOXES, as every box node reads them: P, rot and scale are not
 * read. A point whose box is a LOCAL extent turned by `rot` (an instance)
 * is a copyToPoints of a unit box, not this.
 */
import { canonicalOneOf } from "../diagnostics/canonical.js";
import { suggestNames } from "../diagnostics/didYouMean.js";
import { adoptTopology } from "../data/adoptTopology.js";
import { type Attribute, Geometry, PRIMTYPE_ATTR, type PrimType } from "../data/index.js";
import { makeGeometryItem } from "../graph/index.js";
import { type InsideOutWording, requireBoxColumns, requireCellBoxAxis } from "./boxCells.js";
import { FACE_ALONG, FACE_ALONG_SIGN, FACE_NAMES, FACE_OUT, FACE_SIDE, FACE_UP_SIGN } from "./faceFrame.js";
import type {
  BoxesToMeshInputs,
  BoxesToMeshOutputs,
  BoxesToMeshParams,
} from "./params.generated.js";
import { standardNode } from "./registry.js";
import {
  CANCEL_STRIDE,
  copyElements,
  readComp,
  requireFinitePlainParam,
  requireGeometry,
  requireVec3Column,
  resolveOn,
} from "./util.js";

// Generated from the param schemas below; see params.generated.ts.
export type { BoxesToMeshParams } from "./params.generated.js";

const NODE = "boxesToMesh";

/**
 * shellSplit's side names, in its face-code order: the code IS the index,
 * into faceFrame.ts' face table — the world axis each side is normal to
 * (FACE_OUT), which side of the box (FACE_SIDE), and its frame.
 */
const SIDES = FACE_NAMES;
const SIDE_WHERE = ["min y", "min z", "max z", "min x", "max x", "max y"] as const;
/** meshPrimitive's box order (+x, -x, +y, -y, +z, -z), as shellSplit's names. */
const DEFAULT_FACES = ["east", "west", "ceiling", "floor", "north", "south"] as const;
const AXIS_NAMES = ["x", "y", "z"] as const;

/** Point attributes of a cell NOT carried: its transform, which this node replaces by baking the box into P. */
const NOT_CARRIED: ReadonlySet<string> = new Set(["P", "rot", "scale"]);

/** The cap on the output's points, summed over every cell: repeatPoints' and splitBox's. */
const MAX_MESH_POINTS = 1 << 22;

/** A cell box this node cannot build, in its words. */
const BOX_TAIL = "so it has no faces to build. Fix the node that made it, or drop the cell first (filterByExpression).";
const BOX_INSIDE_OUT: InsideOutWording = {
  state: "is INSIDE OUT",
  tail: "so its faces would face inward and overlap. Fix the node that made it (a box of no volume, min = max, is fine and kept), or drop the cell first (filterByExpression).",
};

/** Every cell's box as mesh faces, cell by cell. */
export const boxesToMesh = standardNode<BoxesToMeshParams, BoxesToMeshInputs, BoxesToMeshOutputs>({
  type: NODE,
  category: "surface",
  description: `TURNS every cell's box into MESH FACES, built where the box is: the step from a grammar's cells (splitBox, shellSplit, placeBox, offsetBox, transformBox) to geometry a renderer draws. A CELL IS A POINT WITH A BOX, as in splitBox: its standard \`boundsMin\`/\`boundsMax\`, read as the WORLD box they hold; P, rot and scale are not read, so a ROTATED cell gets the same mesh as an unrotated one. (A point whose box is a LOCAL extent turned by its \`rot\` — an instance, a packBricks brick read through its transform — is a copyToPoints of a unit meshPrimitive box instead.) It replaces the four-node tail P = box("center"), scale = box("size"), a unit meshPrimitive box, copyToPoints topology "keep": that tail REBUILDS each face from a centre and a size, f32(c + s * 0.5), which misses the stored face by an f32 ulp on some boxes (9% of the coordinates of basics-split-box's cells), so two cells that share a face can open or overlap by that ulp there; here every face vertex IS the stored corner coordinate, so two cells that share a face share its plane exactly. THE OUTPUT is one geometry: per cell, in input order, one block per face listed in \`faces\`, in that order; per face its own grid of points (no point shared between faces, so uv seams and flat normals are exact), laid in meshPrimitive's box order — a face normal to world axis a is a grid over axis (a + 1) % 3, fastest, then axis (a + 2) % 3 — and two 3-vertex "poly" triangles per quad, every one wound counter-clockwise SEEN FROM OUTSIDE the box; with the default \`faces\` (meshPrimitive's order +x, -x, +y, -y, +z, -z) a cell's points and triangles are those of a unit meshPrimitive box copied onto it. THE UV (f32 tuple 2) IS THE FACE'S FRAME, the one shellSplit writes on a face of that side (along x up = outward): u runs ALONG, v runs UP, each 0..1 across the face, so seen from OUTSIDE every face reads left to right and bottom to top, never mirrored — on a wall up is +y and along is -x on the south, +x north, +z west, -z east; the floor runs along +x and up +z (seen from below), the ceiling along +x and up -z (seen from above). A texture or a uv-driven pattern therefore lands the same way on all four walls, which the box primitive's uv (mirrored on three sides) does not. Under \`flip\` u is mirrored (1 - u), so a room seen from INSIDE reads the same way. A closed box is a closed solid: with all six faces, every edge is shared by exactly two triangles once coincident corner points are welded. THE FACES are named by side, shellSplit's names: "floor" min y, "ceiling" max y, "south" min z, "north" max z, "west" min x, "east" max x; a face not listed is left OPEN, so ["south"] alone is a facade panel and every face but "floor" a box with no bottom. \`subdivisions\` cuts each face into a grid of quads (meshPrimitive's param: quads per WORLD axis, a face taking the two that span it), plain or a FIELD resolved per cell — vec(max(floor(box("sx")), 1), 1, 1) gives every box about one column per unit of width. The input's TOPOLOGY and its VERTEX and PRIMITIVE attributes are neither read nor carried: the cells are its points. CARRIED: every point attribute of the cell except its transform (P, rot, scale) lands on EVERY point of that cell's mesh, strings included — its colour, its label, its \`seed\` (so a random drawn from the seed is one value per box), its boundsMin/boundsMax (so box names still read the cell's box on its mesh) — together with the detail attributes. Written: P, \`uv\`, a \`normal\` (f32 tuple 3, flat and outward) under \`normals\`, the side's FACE CODE under \`faceAttr\` (i32: shellSplit's codes, 0 floor, 1 south, 2 north, 3 west, 4 east, 5 ceiling, so a material or a filter can pick the top faces, eq(attribute("boxSide"), 5)), and the input cell's index under \`cellAttr\`. A written name the cell also carries is refused rather than overwritten. A box of NO VOLUME on an axis (a plate, a slab of zero height) is KEPT, as every box node keeps it: its two faces across that axis coincide back to back, so it draws from both sides, and the faces along that axis are zero-area triangles (which area-weighted sampling and the raycast mapping skip) — the counts are always cells * the listed faces' grids; list fewer faces to drop them. An inside-out or non-finite box is refused naming the cell. No inset or bevel: shrink a box first with transformBox (about its centre, pivotIn "cell") or offsetBox (by a distance per face), which keeps the box the mesh is built from on the cell as data. Vertex coordinates are the stored f32 corners and, between them, grid line i of n at (min * (n - i) + max * i) / n, rounded to f32 — exact at both ends and wherever a line falls on 0; -0 written +0. The output is CAPPED at 4194304 points in all (repeatPoints' and splitBox's cap, checked after a field subdivisions resolves), refused past that naming the cell the total ran out on. CPU only, as every box node: it builds topology whose size depends on each cell's subdivisions, which the GPU's elementwise field kernels do not express. Empty input gives an empty mesh.`,
  inputs: [{ name: "in", kind: "geometry" }],
  outputs: [{ name: "out", kind: "geometry" }],
  params: {
    faces: {
      type: "stringList",
      default: [...DEFAULT_FACES],
      description:
        'The sides of each box to build, in the order every cell emits them, by shellSplit\'s names: "floor" (min y), "ceiling" (max y), "south" (min z), "north" (max z), "west" (min x), "east" (max x), each at most once and at least one. A side NOT listed is left OPEN: ["south"] is one panel per cell, every side but "floor" a box with no bottom. The default is meshPrimitive\'s box order (+x, -x, +y, -y, +z, -z), which gives each cell the points and triangles of a unit meshPrimitive box copied onto it (the uv follows the face frame instead; see the description). Decided once per cook.',
    },
    subdivisions: {
      type: "vec3",
      default: [1, 1, 1],
      min: 1,
      acceptsField: true,
      description:
        "Quads per WORLD axis [x, y, z] — meshPrimitive's param, with its reading: whole numbers, at least 1, and each face takes the two axes that span it (the floor and ceiling x and z, the south and north walls x and y, the west and east walls y and z), so [1, 1, 1] is two triangles per face. A single number, plain or a field, broadcasts to all three. As a FIELD it is resolved per cell on the input, with the cell's box names — vec(max(floor(box(\"sx\")), 1), max(floor(box(\"sy\")), 1), 1) cuts every box into roughly unit quads. A count that is not a whole number of at least 1 is refused naming the cell (make it one with max(floor(...), 1)).",
    },
    flip: {
      type: "bool",
      default: false,
      description:
        "Reverse every triangle's winding (and the written `normal` with it), so every box faces INWARD — a room seen from inside it. meshPrimitive's `flip`. The uv's u is mirrored with it (1 - u), so seen from INSIDE every face still reads left to right and bottom to top; v is unchanged.",
    },
    normals: {
      type: "bool",
      default: false,
      description:
        "Write a `normal` point attribute (f32 tuple 3): each face's unit outward axis (inward under `flip`) on every one of its points — flat faces and hard edges, exact because faces share no points. Off by default, as on meshPrimitive: the renderer computes one from the triangles when none is stored, and a stored normal is only right until something moves P. Turn it on when this mesh is merged with one that carries a normal (mergePrimitives fills a missing column with (0, 0, 0), which a lit material renders black).",
    },
    faceAttr: {
      type: "string",
      default: "boxSide",
      description:
        'Name of the i32 point attribute (tuple 1) receiving each point\'s side as shellSplit\'s FACE CODE: 0 floor, 1 south, 2 north, 3 west, 4 east, 5 ceiling. It is "boxSide" rather than shellSplit\'s "face" because a shellSplit piece already carries "face" — the side of its PARENT it was cut from — and that is carried onto the mesh too, so both stay readable: the outer face of every wall piece is eq(attribute("boxSide"), attribute("face")). Empty writes none. Refused if the cell also carries the name.',
    },
    cellAttr: {
      type: "string",
      default: "",
      description:
        "Name of an i32 point attribute (tuple 1) receiving the INPUT CELL'S INDEX on every point of its mesh — copyToPoints' `targetIndexAttr`: the key that groups a mesh back into its boxes (partitionByAttribute, promoteAttribute). Empty (the default) writes none. Refused if the cell also carries the name.",
    },
  },
  execute({ inputs, params, seed, checkCancelled }) {
    // ---- params, decided ONCE: the side names become codes here, and no
    // string reaches the per-cell loop.
    const facesIn = params.faces as unknown;
    if (!Array.isArray(facesIn)) {
      throw new Error(
        `${NODE}: param "faces" is ${JSON.stringify(facesIn)}, not a list; give the sides to build, e.g. ${JSON.stringify(DEFAULT_FACES)} (a closed box).`,
      );
    }
    if (facesIn.length === 0) {
      throw new Error(
        `${NODE}: param "faces" is empty, so no cell would build anything; list at least one of ${SIDES.map((s) => JSON.stringify(s)).join(", ")} — all six for a closed box.`,
      );
    }
    const codes: number[] = [];
    for (let j = 0; j < facesIn.length; j++) {
      const name = canonicalOneOf(SIDES, facesIn[j]);
      if (name === undefined) {
        const near = typeof facesIn[j] === "string" ? suggestNames(facesIn[j] as string, SIDES) : { names: [], clause: "" };
        throw new Error(
          `${NODE}: param "faces" entry ${j} is ${JSON.stringify(facesIn[j])}, which names no side of a box${near.names.length > 0 ? ` (${near.clause.trim()})` : ""}. Valid: ${SIDES.map((s, k) => `"${s}" (${SIDE_WHERE[k]})`).join(", ")} — shellSplit's names.`,
        );
      }
      const code = (SIDES as readonly string[]).indexOf(name);
      if (codes.includes(code)) {
        throw new Error(
          `${NODE}: param "faces" lists "${name}" twice; each side is built at most once, so name it once.`,
        );
      }
      codes.push(code);
    }
    const flip = params.flip === true;
    const writeNormals = params.normals === true;
    requireFinitePlainParam(params.subdivisions, NODE, "subdivisions", "Subdivisions count quads per axis: whole numbers of at least 1, e.g. [1, 1, 1].");

    // ---- geometry
    const src = requireGeometry(inputs, "in", NODE);
    const srcSet = src.attrs.point;
    const n = srcSet.count;
    const { lo, hi } = requireBoxColumns(
      NODE,
      srcSet,
      "in",
      "a cell's box is the standard f32 tuple-3 pair boundsMin/boundsMax. Give the cells their boxes with setBounds (or splitBox, placeBox) first.",
    );

    // ---- the names this node writes, checked against each other and
    // against what the cells carry (decided once, before any cell).
    const carried: Attribute[] = [];
    for (const attr of srcSet) if (!NOT_CARRIED.has(attr.name)) carried.push(attr);
    const carriedNames = new Set(carried.map((a) => a.name));
    const written: { name: string; why: string }[] = [{ name: "uv", why: "the face uv this node writes" }];
    if (writeNormals) written.push({ name: "normal", why: 'the normal `normals` writes' });
    for (const slot of ["faceAttr", "cellAttr"] as const) {
      const name = params[slot];
      if (typeof name !== "string") {
        throw new Error(`${NODE}: param "${slot}" is ${JSON.stringify(name)}; give an attribute name, or "" to write none.`);
      }
      if (name === "") continue;
      if (NOT_CARRIED.has(name)) {
        throw new Error(
          `${NODE}: param "${slot}" is "${name}", the standard transform attribute${name === "P" ? " this node writes the mesh's positions into" : " a mesh point does not carry here"}; give the ${slot === "faceAttr" ? "face code" : "cell index"} a name of its own, e.g. "${slot === "faceAttr" ? "boxSide" : "cell"}".`,
        );
      }
      const clash = written.find((w) => w.name === name);
      if (clash !== undefined) {
        throw new Error(
          `${NODE}: param "${slot}" is "${name}", which is already ${clash.why}; give the ${slot === "faceAttr" ? "face code" : "cell index"} a name of its own.`,
        );
      }
      written.push({ name, why: `param "${slot}"` });
    }
    for (const w of written) {
      if (carriedNames.has(w.name)) {
        const attr = srcSet.get(w.name) as Attribute;
        throw new Error(
          `${NODE}: the cells carry a "${w.name}" point attribute (${attr.type} tupleSize ${attr.tupleSize}), and every cell attribute but P, rot and scale is carried onto its mesh — but "${w.name}" is ${w.why}, so the two would write one column. Drop the cells' "${w.name}" upstream (removeAttribute)${w.why.startsWith("param") ? `, or set ${w.why} to another name` : w.name === "normal" ? ", or turn `normals` off" : ", or copy it to another name first and drop it"}.`,
        );
      }
    }

    // ---- per-cell counts, resolved on the INPUT and checked before
    // anything is built, so a bad cell is refused as itself.
    const subCol = requireVec3Column(
      resolveOn(src, "point", params.subdivisions, seed, NODE, "subdivisions"),
      NODE,
      "subdivisions",
      "cell",
      "a quad count per world axis [x, y, z]",
    );
    const subs = new Uint32Array(n * 3);
    const pointsOf = new Uint32Array(n);
    let totalPoints = 0;
    let totalTris = 0;
    for (let i = 0; i < n; i++) {
      if ((i & (CANCEL_STRIDE - 1)) === 0) checkCancelled();
      for (let k = 0; k < 3; k++) {
        requireCellBoxAxis(NODE, i, k, lo[i * 3 + k], hi[i * 3 + k], BOX_TAIL, BOX_INSIDE_OUT);
        const s = readComp(subCol, i, k);
        if (!Number.isInteger(s) || s < 1) {
          throw new Error(
            `${NODE}: param "subdivisions" is ${s} along ${AXIS_NAMES[k]} on cell ${i}, but a subdivision count is a whole number of at least 1 (quads along that axis); make it one, e.g. max(floor(<count>), 1).`,
          );
        }
        // Checked BEFORE it is stored: a count past the cap is refused as
        // itself here, and so never wraps in the u32 column below.
        if (s > MAX_MESH_POINTS) {
          throw new Error(
            `${NODE}: param "subdivisions" is ${s} along ${AXIS_NAMES[k]} on cell ${i}, past the ${MAX_MESH_POINTS} points the whole mesh is capped at, so it is refused before anything is built. Lower a plain count, or bound a field expression itself — min(<the count field>, <the most quads you meant>).`,
          );
        }
        subs[i * 3 + k] = s;
      }
      let cellPoints = 0;
      for (const code of codes) {
        const an = FACE_OUT[code];
        const nu = subs[i * 3 + ((an + 1) % 3)];
        const nv = subs[i * 3 + ((an + 2) % 3)];
        cellPoints += (nu + 1) * (nv + 1);
        totalTris += 2 * nu * nv;
      }
      // THE CAP IS ON THE TOTAL, after the field has resolved (repeatPoints'
      // and splitBox's rule). Triangles are at most twice the points.
      if (totalPoints + cellPoints > MAX_MESH_POINTS) {
        throw new Error(
          `${NODE}: the mesh would hold more than ${MAX_MESH_POINTS} points from the input's ${n} cell(s) — cell ${i} builds ${cellPoints} (subdivisions [${subs[i * 3]}, ${subs[i * 3 + 1]}, ${subs[i * 3 + 2]}] over ${codes.length} face(s)), and the running total reached ${totalPoints + cellPoints}. The cap is on the TOTAL, so this is the cell the total ran out on rather than necessarily the largest offender. Bound the subdivisions — min(<the count field>, <the most quads you meant>) — or build fewer faces or cells.`,
        );
      }
      pointsOf[i] = cellPoints;
      totalPoints += cellPoints;
    }

    // ---- the columns, made before the faces are built and written in
    // place: P first, then the cells' columns, then what this node writes,
    // so the column order is stable. A cell's points are contiguous, so the
    // map from point to cell is known from the counts alone.
    const cellOf = new Uint32Array(totalPoints);
    for (let i = 0, at = 0; i < n; i++) {
      cellOf.fill(i, at, at + pointsOf[i]);
      at += pointsOf[i];
    }
    const geo = new Geometry();
    const pts = geo.attrs.point;
    pts.add("P", "f32", 3, [0, 0, 0]);
    pts.resize(totalPoints);
    copyElements(carried, pts, cellOf, totalPoints, n);
    const positions = pts.require("P").writable() as Float32Array;
    const uvs = pts.add("uv", "f32", 2, 0).writable() as Float32Array;
    const normalData = writeNormals ? (pts.add("normal", "f32", 3, 0).writable() as Float32Array) : undefined;
    const sideOf = params.faceAttr !== "" ? (pts.add(params.faceAttr, "i32", 1, -1).writable() as Int32Array) : undefined;
    if (params.cellAttr !== "") (pts.add(params.cellAttr, "i32", 1, -1).writable() as Int32Array).set(cellOf);
    copyElements(src.attrs.detail, geo.attrs.detail, undefined, src.attrs.detail.count);

    // ---- build: filled cell by cell
    const vertexToPoint = new Uint32Array(totalTris * 3);
    let pt = 0;
    let vx = 0;
    const p = [0, 0, 0];
    for (let i = 0; i < n; i++) {
      if ((i & (CANCEL_STRIDE - 1)) === 0) checkCancelled();
      for (const code of codes) {
        const an = FACE_OUT[code];
        const positive = FACE_SIDE[code] > 0;
        const au = (an + 1) % 3;
        const av = (an + 2) % 3;
        const nu = subs[i * 3 + au];
        const nv = subs[i * 3 + av];
        const uLo = lo[i * 3 + au];
        const uHi = hi[i * 3 + au];
        const vLo = lo[i * 3 + av];
        const vHi = hi[i * 3 + av];
        const plane = positive ? hi[i * 3 + an] : lo[i * 3 + an];
        // meshPrimitive's rule: the base winding faces +(au x av) = +an,
        // outward on the max side; the min side and `flip` reverse it.
        const reverse = flip !== !positive;
        const outSign = reverse ? -1 : 1;
        // uv in the face frame: along and up are the two in-face axes, so
        // one of them is au and the other av.
        const alongIsU = FACE_ALONG[code] === au;
        // Under `flip` the face is seen from INSIDE, where along runs right
        // to left: u is mirrored so it still reads left to right from the
        // side the triangles face. v (up) is the same from either side.
        const alongForward = FACE_ALONG_SIGN[code] > 0 !== flip;
        const upForward = FACE_UP_SIGN[code] > 0;
        const base = pt;
        for (let iv = 0; iv <= nv; iv++) {
          for (let iu = 0; iu <= nu; iu++) {
            const ia = alongIsU ? iu : iv;
            const na = alongIsU ? nu : nv;
            const iw = alongIsU ? iv : iu;
            const nw = alongIsU ? nv : nu;
            // (min * (n - i) + max * i) / n: each product of an f32 corner
            // and a count under 2^29 is exact in f64, so the ends are the
            // corners themselves whatever their magnitudes, and a line meant
            // to fall on 0 does (a (1 - t) * min + t * max form leaves a
            // 1e-16 residue there). `+ 0` below turns -0 into +0.
            p[au] = (uLo * (nu - iu) + uHi * iu) / nu;
            p[av] = (vLo * (nv - iv) + vHi * iv) / nv;
            p[an] = plane;
            positions[pt * 3] = Math.fround(p[0]) + 0;
            positions[pt * 3 + 1] = Math.fround(p[1]) + 0;
            positions[pt * 3 + 2] = Math.fround(p[2]) + 0;
            uvs[pt * 2] = (alongForward ? ia : na - ia) / na;
            uvs[pt * 2 + 1] = (upForward ? iw : nw - iw) / nw;
            if (normalData !== undefined) normalData[pt * 3 + an] = outSign;
            if (sideOf !== undefined) sideOf[pt] = code;
            pt++;
          }
        }
        const row = nu + 1;
        for (let iv = 0; iv < nv; iv++) {
          for (let iu = 0; iu < nu; iu++) {
            const a = base + iv * row + iu;
            const b = a + 1;
            const c = a + row;
            const d = c + 1;
            if (reverse) {
              vertexToPoint[vx++] = a;
              vertexToPoint[vx++] = c;
              vertexToPoint[vx++] = b;
              vertexToPoint[vx++] = b;
              vertexToPoint[vx++] = c;
              vertexToPoint[vx++] = d;
            } else {
              vertexToPoint[vx++] = a;
              vertexToPoint[vx++] = b;
              vertexToPoint[vx++] = c;
              vertexToPoint[vx++] = b;
              vertexToPoint[vx++] = d;
              vertexToPoint[vx++] = c;
            }
          }
        }
      }
    }

    const starts = new Uint32Array(totalTris);
    const counts = new Uint32Array(totalTris);
    for (let t = 0; t < totalTris; t++) {
      starts[t] = t * 3;
      counts[t] = 3;
    }
    adoptTopology(geo, vertexToPoint, starts, counts);
    geo.attrs.primitive.add(PRIMTYPE_ATTR, "string", 1, "poly" satisfies PrimType);
    return { out: [makeGeometryItem(geo)] };
  },
});
