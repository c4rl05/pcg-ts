/**
 * Faces as geometry, for `tests/eiffelGroundPrisms.test.ts`: what a list of
 * convex prisms (or a skin of convex faces) SHOULD cook to, what a cooked
 * mesh DOES hold, and a tolerant multiset match between the two.
 *
 * A face is a planar convex polygon: its corners as an unordered multiset
 * and its area vector (outward normal times area). That is the unit which
 * survives everything a refactor of `ground.ts` may legitimately change —
 * point order, primitive order, per-point seeds, which run of a table a
 * prism lands in, and which corner a cap's fan starts from — while any
 * moved corner, missing or extra face, or face turned inside out changes it.
 *
 * Cooked faces are recovered from `extrudePolygon`'s own layout: every wall
 * band and every cap keeps SEPARATE points (its description says so, and
 * `smoothNormals` passes topology through), so the triangles connected
 * through shared point indices are exactly one face. A mesh whose faces
 * share points would merge them into one component, and the match would
 * fail loudly rather than pass.
 */
import type { Geometry } from "pcg-ts";
import type { Prism } from "../../demos/eiffel/ground.js";

export type Vec3 = readonly [number, number, number];

export interface Face {
  /** Where it came from: an expected face's piece, or a cooked face's centroid. */
  readonly label: string;
  readonly verts: readonly Vec3[];
  /** Outward normal times area. */
  readonly area: Vec3;
  readonly centroid: Vec3;
  /**
   * A cooked face's point `normal` per corner, in `verts` order; `null`
   * where the mesh carries no `normal`. Absent on an expected face.
   */
  readonly normals?: ReadonlyArray<Vec3 | null>;
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);

function centroidOf(verts: readonly Vec3[]): Vec3 {
  let c: Vec3 = [0, 0, 0];
  for (const v of verts) c = add(c, v);
  return mul(c, 1 / verts.length);
}

/** Half of Newell's sum: a planar polygon's area vector, along its right-hand normal. */
function newellArea(o: readonly Vec3[]): Vec3 {
  const n = [0, 0, 0];
  for (let i = 0; i < o.length; i++) {
    const [x0, y0, z0] = o[i] as Vec3;
    const [x1, y1, z1] = o[(i + 1) % o.length] as Vec3;
    n[0] += (y0 - y1) * (z0 + z1);
    n[1] += (z0 - z1) * (x0 + x1);
    n[2] += (x0 - x1) * (y0 + y1);
  }
  return [n[0]! / 2, n[1]! / 2, n[2]! / 2];
}

function face(label: string, verts: readonly Vec3[], area: Vec3): Face {
  return { label, verts, area, centroid: centroidOf(verts) };
}

/**
 * A prism's faces as `prisms()` builds it (extrudePolygon, direction
 * `polygonNormal`, caps `both`): the outline extruded `depth` along its own
 * right-hand normal, every face facing OUT of the solid — the outline's cap
 * against its normal, the far cap along it, each wall band away from the
 * interior.
 */
export function prismFaces(p: Prism, label: string): Face[] {
  const o = p.outline;
  const A = newellArea(o);
  const d = mul(A, p.depth / len(A));
  const top = o.map((q) => add(q, d));
  const out: Face[] = [face(`${label} (outline cap)`, o, mul(A, -1)), face(`${label} (far cap)`, top, A)];
  const unit = mul(A, 1 / len(A));
  for (let j = 0; j < o.length; j++) {
    const k = (j + 1) % o.length;
    // Counter-clockwise about the extrusion, so edge x direction points out.
    const e = sub(o[k] as Vec3, o[j] as Vec3);
    out.push(face(`${label} (wall ${j})`, [o[j] as Vec3, o[k] as Vec3, top[j] as Vec3, top[k] as Vec3], mul(cross(e, unit), p.depth)));
  }
  return out;
}

/**
 * One face of a skin as `skin()` builds it (only the outline's own cap,
 * `caps: "bottom"`, no walls): an outline wound to point INTO the solid, so
 * it faces against its own normal.
 */
export function skinFace(outline: readonly Vec3[], label: string): Face {
  return face(label, outline, mul(newellArea(outline), -1));
}

/**
 * A cooked mesh's faces: triangles grouped by shared point index (see the
 * file comment), each group's distinct points and summed area vector.
 */
export function cookedFaces(geo: Geometry, cls: string): Face[] {
  const P = geo.attrs.point.require("P").data;
  const N = geo.attrs.point.get("normal");
  const nrm = (i: number): Vec3 | null =>
    N === undefined || N.tupleSize !== 3 ? null : [N.data[3 * i] as number, N.data[3 * i + 1] as number, N.data[3 * i + 2] as number];
  const parent = new Int32Array(geo.pointCount).map((_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]!]!;
      i = parent[i]!;
    }
    return i;
  };
  const pt = (i: number): Vec3 => [P[3 * i]!, P[3 * i + 1]!, P[3 * i + 2]!];
  for (let p = 0; p < geo.primitiveCount; p++) {
    const s = geo.primVertexStart[p]!;
    const c = geo.primVertexCount[p]!;
    const a = find(geo.vertexToPoint[s]!);
    for (let v = s + 1; v < s + c; v++) {
      const b = find(geo.vertexToPoint[v]!);
      if (a !== b) parent[b] = a;
    }
  }
  const groups = new Map<number, { points: Set<number>; area: [number, number, number] }>();
  for (let p = 0; p < geo.primitiveCount; p++) {
    const s = geo.primVertexStart[p]!;
    const c = geo.primVertexCount[p]!;
    const root = find(geo.vertexToPoint[s]!);
    let g = groups.get(root);
    if (g === undefined) groups.set(root, (g = { points: new Set(), area: [0, 0, 0] }));
    const ring: Vec3[] = [];
    for (let v = s; v < s + c; v++) {
      g.points.add(geo.vertexToPoint[v]!);
      ring.push(pt(geo.vertexToPoint[v]!));
    }
    const a = newellArea(ring);
    g.area[0] += a[0];
    g.area[1] += a[1];
    g.area[2] += a[2];
  }
  const out: Face[] = [];
  for (const g of groups.values()) {
    const ids = [...g.points];
    const verts = ids.map(pt);
    const c = centroidOf(verts);
    out.push({
      ...face(`${cls}: cooked face of ${verts.length} points at [${c.map((x) => x.toFixed(4)).join(", ")}]`, verts, g.area),
      normals: ids.map(nrm),
    });
  }
  return out;
}

/**
 * Every cooked corner whose point `normal` does not agree with its face:
 * missing, zero, or with a dot product against the face's unit normal
 * (its area vector's direction) of `minDot` or less. One line per face,
 * naming the face and how many of its corners disagree.
 */
export function normalMisfits(faces: readonly Face[], minDot: number): string[] {
  const out: string[] = [];
  for (const f of faces) {
    const a = len(f.area);
    const u = mul(f.area, 1 / a);
    let bad = 0;
    let worst = Number.POSITIVE_INFINITY;
    const normals = f.normals ?? [];
    for (let i = 0; i < f.verts.length; i++) {
      const n = normals[i] ?? null;
      const l = n === null ? 0 : len(n);
      const d = n === null || !(l > 0) ? Number.NaN : (u[0] * n[0] + u[1] * n[1] + u[2] * n[2]) / l;
      if (!(d > minDot)) {
        bad++;
        worst = Math.min(worst, Number.isNaN(d) ? Number.NEGATIVE_INFINITY : d);
      }
    }
    if (bad > 0) {
      const w = worst === Number.NEGATIVE_INFINITY ? "missing or zero" : `worst dot ${worst.toFixed(3)}`;
      out.push(`${f.label}: ${bad} of ${f.verts.length} corner normal(s) disagree with the face (${w})`);
    }
  }
  return out;
}

/** Whether two faces are the same within `tol` per coordinate: same corner multiset, same area vector. */
function same(e: Face, c: Face, tol: number): boolean {
  if (e.verts.length !== c.verts.length) return false;
  const used = new Uint8Array(c.verts.length);
  for (const v of e.verts) {
    let hit = -1;
    for (let i = 0; i < c.verts.length; i++) {
      if (used[i] === 1) continue;
      const w = c.verts[i]!;
      if (Math.abs(v[0] - w[0]) <= tol && Math.abs(v[1] - w[1]) <= tol && Math.abs(v[2] - w[2]) <= tol) {
        hit = i;
        break;
      }
    }
    if (hit < 0) return false;
    used[hit] = 1;
  }
  // The corners agree to `tol`, so the area vector may differ by about
  // tol times the perimeter; anything more is a face turned inside out
  // (the corners alone cannot see a winding) or triangles off the face.
  let perimeter = 0;
  for (let i = 0; i < e.verts.length; i++) perimeter += len(sub(e.verts[(i + 1) % e.verts.length]!, e.verts[i]!));
  return len(sub(e.area, c.area)) <= 4 * tol * perimeter + 1e-9;
}

/**
 * Match two face multisets within `tol`: every expected face to one cooked
 * face, each used once. Returns what is left on either side.
 */
export function matchFaces(expected: readonly Face[], cooked: readonly Face[], tol: number): { missing: Face[]; extra: Face[] } {
  const CELL = 0.05;
  if (tol * 2 >= CELL) throw new Error(`matchFaces: tol ${tol} must be well under the ${CELL} cell`);
  const key = (x: number, y: number, z: number) => `${x},${y},${z}`;
  const cell = (c: Vec3) => [Math.floor(c[0] / CELL), Math.floor(c[1] / CELL), Math.floor(c[2] / CELL)] as const;
  const buckets = new Map<string, number[]>();
  cooked.forEach((f, i) => {
    const [x, y, z] = cell(f.centroid);
    const k = key(x, y, z);
    const b = buckets.get(k);
    if (b === undefined) buckets.set(k, [i]);
    else b.push(i);
  });
  const used = new Uint8Array(cooked.length);
  const missing: Face[] = [];
  for (const e of expected) {
    const [x, y, z] = cell(e.centroid);
    let hit = -1;
    search: for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          for (const i of buckets.get(key(x + dx, y + dy, z + dz)) ?? []) {
            if (used[i] === 0 && same(e, cooked[i]!, tol)) {
              hit = i;
              break search;
            }
          }
        }
      }
    }
    if (hit < 0) missing.push(e);
    else used[hit] = 1;
  }
  return { missing, extra: cooked.filter((_, i) => used[i] === 0) };
}
