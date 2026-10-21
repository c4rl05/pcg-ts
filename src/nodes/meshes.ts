/**
 * Mesh source nodes: triangle geometry built from parameters alone, with
 * no runtime injection.
 *
 * This is the only in-graph door to mesh geometry. `dataInput` carries
 * live items that a serialized graph does not keep, so before this node
 * existed every mesh-consuming path (surfaceSample, transferAttribute's
 * uv and raycast mappings, promoteAttribute's topology) was unreachable
 * from JSON alone.
 */
import { createTriangleMesh } from "../data/index.js";
import { makeGeometryItem } from "../graph/index.js";
import { standardNode } from "./registry.js";
import type {
  MeshPrimitiveInputs,
  MeshPrimitiveOutputs,
  MeshPrimitiveParams,
} from "./params.generated.js";

// Generated from the param schemas below; see params.generated.ts.
export type { MeshPrimitiveParams } from "./params.generated.js";

/** Axis letters in world order, for error messages. */
const AXIS_NAMES = ["x", "y", "z"] as const;

/** In-plane axes of each plane orientation: [u axis, v axis]. */
const PLANE_AXES: Record<string, readonly [number, number]> = {
  xz: [0, 2],
  xy: [0, 1],
  yz: [1, 2],
};

/**
 * Whole-number quad counts per world axis, validated. `vec3` params carry
 * finite numbers, not integers, so a fractional count is caught here where
 * the message can name the axis and the fix.
 */
function subdivisionCounts(subdivisions: readonly number[]): [number, number, number] {
  const out: number[] = [];
  for (let a = 0; a < 3; a++) {
    const v = subdivisions[a];
    if (!Number.isInteger(v)) {
      throw new Error(
        `meshPrimitive: subdivisions.${AXIS_NAMES[a]} is ${v}, but subdivision counts must be whole numbers >= 1 (they count quads along an axis); use ${Math.max(1, Math.round(v))}`,
      );
    }
    out.push(v);
  }
  return out as [number, number, number];
}

/**
 * Append one subdivided quad to the buffers: `nu * nv` quads spanning the
 * `au`/`av` world axes at a fixed `an` coordinate. Points run u fastest.
 * The base winding gives a normal along +(au x av); `reverse` flips it.
 *
 * Every point of the quad gets the same `normal`, and it is DERIVED from
 * the winding rather than passed in, so the column and the faces cannot
 * disagree: +(au x av) is +an when (au, av, an) is a cyclic permutation of
 * (x, y, z) and -an otherwise. A face's points are its own (a box shares
 * none between faces), so this is the split-corner shading the 'square'
 * sweep gets by duplicating its corners — flat faces, hard edges.
 */
function appendQuad(
  positions: number[],
  uvs: number[],
  normals: number[],
  triangles: number[],
  au: number,
  av: number,
  an: number,
  nu: number,
  nv: number,
  minU: number,
  minV: number,
  sizeU: number,
  sizeV: number,
  planeCoord: number,
  reverse: boolean,
): void {
  const base = positions.length / 3;
  const stepU = sizeU / nu;
  const stepV = sizeV / nv;
  // One scratch tuple for the whole quad: the axes are chosen at runtime,
  // so the coordinate has to be addressed by index, not by name.
  const p = [0, 0, 0];
  const n = [0, 0, 0];
  const cyclic = av === (au + 1) % 3;
  n[an] = cyclic !== reverse ? 1 : -1;
  for (let iv = 0; iv <= nv; iv++) {
    for (let iu = 0; iu <= nu; iu++) {
      p[au] = minU + iu * stepU;
      p[av] = minV + iv * stepV;
      p[an] = planeCoord;
      positions.push(p[0], p[1], p[2]);
      uvs.push(iu / nu, iv / nv);
      normals.push(n[0], n[1], n[2]);
    }
  }
  const rowStride = nu + 1;
  for (let iv = 0; iv < nv; iv++) {
    for (let iu = 0; iu < nu; iu++) {
      const a = base + iv * rowStride + iu;
      const b = a + 1;
      const c = a + rowStride;
      const d = c + 1;
      if (reverse) {
        triangles.push(a, c, b, b, c, d);
      } else {
        triangles.push(a, b, c, b, d, c);
      }
    }
  }
}

/** [sin, cos] at 0, 1, 2 and 3 quarter turns, with no -0 in them. */
const QUARTER_TURNS: readonly (readonly [number, number])[] = [
  [0, 1],
  [1, 0],
  [0, -1],
  [-1, 0],
];

/**
 * Sine and cosine of `k` of `sides` equal steps round a turn, with the
 * quarter turns EXACT. `Math.cos(PI / 2)` is 6e-17, not 0, and a ring
 * point meant to sit on an axis would carry that hair into P (an f32
 * holds it) and into every bound computed from it; a multiple of a
 * quarter turn is read from a table instead, so a ring whose `sides` is a
 * multiple of 4 reaches its full extents exactly and its axis points have
 * a true zero. The angle is taken at `k % sides` for the reason
 * circleProfile gives: the duplicated seam column is then bit-identical to
 * the first, not a `Math.sin(2 * PI)` hair away from it.
 */
function ringSinCos(k: number, sides: number): readonly [number, number] {
  const j = k % sides;
  if ((4 * j) % sides === 0) return QUARTER_TURNS[(4 * j) / sides];
  const phi = (2 * Math.PI * j) / sides;
  return [Math.sin(phi), Math.cos(phi)];
}

/**
 * Append one flat elliptic disc in the plane spanned by `au`/`av` at a
 * fixed `an` coordinate: `sides` corner points on the ellipse of radii
 * `ru`, `rv` about (`cu`, `cv`), and `sides - 2` triangles fanned from the
 * first corner — no centre point, the cap sweepProfile builds. Corner k
 * sits at angle 2*PI*k/sides measured from +av toward +au
 * (P[au] = cu + ru sin, P[av] = cv + rv cos), the order the cylinder wall
 * walks, so a cap's corners sit exactly on the wall's end ring.
 *
 * That order turns from +av toward +au, so the base fan's normal is
 * -(au x av); `reverse` flips it. As in appendQuad, the written `normal`
 * is DERIVED from the winding, so the column and the faces cannot
 * disagree. uv is the planar map of the ELLIPSE's bounding rectangle onto
 * 0..1 (a polygon whose corners miss the axes stops short of 0 and 1), u along `au` and v along `av` — the plane's own uv, restricted to
 * the ellipse.
 */
function appendDisc(
  positions: number[],
  uvs: number[],
  normals: number[],
  triangles: number[],
  au: number,
  av: number,
  an: number,
  sides: number,
  cu: number,
  cv: number,
  ru: number,
  rv: number,
  planeCoord: number,
  reverse: boolean,
): void {
  const base = positions.length / 3;
  const p = [0, 0, 0];
  const n = [0, 0, 0];
  const cyclic = av === (au + 1) % 3;
  // -(au x av) is -an when (au, av, an) is cyclic and +an otherwise.
  n[an] = cyclic === reverse ? 1 : -1;
  for (let k = 0; k < sides; k++) {
    const [s, c] = ringSinCos(k, sides);
    // `+ 0` canonicalizes -0 (a -0 center plus a -0 offset), which deep
    // equality and a hashed snapshot both tell apart from 0.
    p[au] = cu + ru * s + 0;
    p[av] = cv + rv * c + 0;
    p[an] = planeCoord + 0;
    positions.push(p[0], p[1], p[2]);
    uvs.push((1 + s) / 2, (1 + c) / 2);
    normals.push(n[0], n[1], n[2]);
  }
  for (let j = 1; j + 1 < sides; j++) {
    if (reverse) triangles.push(base, base + j + 1, base + j);
    else triangles.push(base, base + j, base + j + 1);
  }
}

/**
 * Append a cylinder wall about the y axis: `rows + 1` rings of
 * `sides + 1` points (the last column duplicates the seam so uv u runs
 * 0..1 instead of backwards across one column of quads), u — round the
 * ring — fastest, then v from the bottom ring up. The ring walks from +z
 * toward +x, which makes the base quad winding (appendQuad's) face
 * OUTWARD and the uv read left to right seen from outside.
 *
 * The written `normal` is the wall's smooth analytic one, not a flat
 * per-quad face: for the ellipse (rx sin t, rz cos t) it is
 * (rz sin t, 0, rx cos t) normalized, the radial direction on a circle.
 * Where both radii are zero (a degenerate wall) it falls back to the
 * radial direction, so the column stays unit length.
 */
function appendWall(
  positions: number[],
  uvs: number[],
  normals: number[],
  triangles: number[],
  sides: number,
  rows: number,
  cx: number,
  cz: number,
  rx: number,
  rz: number,
  minY: number,
  maxY: number,
  reverse: boolean,
): void {
  const base = positions.length / 3;
  const stepY = (maxY - minY) / rows;
  const sign = reverse ? -1 : 1;
  for (let r = 0; r <= rows; r++) {
    // The top ring is `maxY` itself, not `minY + rows * stepY`, which can
    // land an ulp off it: the top cap is built at `maxY`, and the rim
    // points of wall and cap must be bit-identical for the solid to weld
    // closed.
    const y = (r === rows ? maxY : minY + r * stepY) + 0;
    for (let k = 0; k <= sides; k++) {
      const [s, c] = ringSinCos(k, sides);
      positions.push(cx + rx * s + 0, y, cz + rz * c + 0);
      uvs.push(k / sides, r / rows);
      let nx = rz * s;
      let nz = rx * c;
      let len = Math.hypot(nx, nz);
      if (len === 0) {
        nx = s;
        nz = c;
        len = 1;
      }
      normals.push((sign * nx) / len + 0, 0, (sign * nz) / len + 0);
    }
  }
  const rowStride = sides + 1;
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < sides; k++) {
      const a = base + r * rowStride + k;
      const b = a + 1;
      const c = a + rowStride;
      const d = c + 1;
      if (reverse) {
        triangles.push(a, c, b, b, c, d);
      } else {
        triangles.push(a, b, c, b, d, c);
      }
    }
  }
}

/** Shapes, in schema order; the error for an unknown one lists these. */
const SHAPES = ["plane", "box", "cylinder", "disc"] as const;

/** Which ends of a cylinder are closed, in schema order (extrudePolygon's spelling). */
const CYLINDER_CAPS = ["none", "top", "bottom", "both"] as const;

/** Parametric triangle meshes: a subdivided plane or box, a cylinder, a disc. */
export const meshPrimitive = standardNode<
  MeshPrimitiveParams,
  MeshPrimitiveInputs,
  MeshPrimitiveOutputs
>({
  type: "meshPrimitive",
  category: "source",
  description:
    "Builds a parametric triangle mesh with no input: shape 'plane' is one axis-aligned rectangle, shape 'box' is six of them around a volume, shape 'cylinder' is an upright (y-axis) cylinder with optional caps, and shape 'disc' is one flat polygonal disc lying like a plane. Output carries P (f32 tuple 3), a uv point attribute (f32 tuple 2) running 0..1 across each face, one 3-vertex 'poly' primitive per triangle — everything surfaceSample, transferAttribute's 'uv' and 'raycast' mappings, and promoteAttribute need — and, with `normals` on, a `normal` point attribute (f32 tuple 3). This is the only mesh source that survives serialization: dataInput's items are injected at runtime and a saved graph carries none, so a graph that must cook from JSON alone gets its surface from here. Plane and disc normals point along the positive third axis (+y for orientation 'xz', +z for 'xy', +x for 'yz'); box and cylinder normals point outward. A plane or box face's point order is u fastest then v, a box one block per face in the order +x, -x, +y, -y, +z, -z; a box's faces do not share points, so uv seams are exact. A cylinder is its wall block — `subdivisions.y + 1` rings of `sides + 1` points, round the ring fastest, bottom ring first, the seam column duplicated so u runs 0..1 — then the top cap's `sides` corners, then the bottom cap's; caps share no points with the wall, so the rim is a real crease, and each cap (like a disc) is a fan of `sides - 2` triangles from its first corner with no centre point. Ring corners lie ON the ellipse whose diameters are the size's components, starting on +z and turning toward +x, so a `sides` that is a multiple of 4 reaches the full `size` extents exactly. A zero size component makes degenerate (zero-area) triangles, which area-weighted sampling and the raycast mapping skip.",
  inputs: [],
  outputs: [{ name: "out", kind: "geometry" }],
  params: {
    shape: {
      type: "enum",
      default: "plane",
      enum: [...SHAPES],
      description:
        "'plane' builds one rectangle in the world plane named by `orientation`; 'box' builds a closed six-sided box of the full `size` extents (and ignores `orientation`); 'cylinder' builds a `sides`-sided cylinder standing on the y axis, `size.y` tall, closed at the ends `caps` names (it ignores `orientation` — rotate it downstream to lay it down); 'disc' builds one flat `sides`-sided disc in the plane named by `orientation`, the round counterpart of 'plane'. A disc is its own shape rather than a zero-height cylinder because a flat cylinder is the wrong mesh for it: its wall would be a ring of `2 * sides` zero-area triangles per band, and with both caps on it would be two coincident discs facing opposite ways.",
    },
    size: {
      type: "vec3",
      default: [10, 10, 10],
      min: 0,
      description:
        "Full extents along world x, y, z, in world units (not half-extents). For 'plane' and 'disc', the component along the normal axis is ignored. For 'cylinder' and 'disc' the two in-plane components are DIAMETERS — x and z for a cylinder, whose height is y — so unequal ones make an elliptic section; a stud of radius 0.3 is size [0.6, height, 0.6].",
    },
    center: {
      type: "vec3",
      default: [0, 0, 0],
      description: "World position of the shape's center.",
    },
    orientation: {
      type: "enum",
      default: "xz",
      enum: ["xz", "xy", "yz"],
      description:
        "Which world plane a 'plane' or a 'disc' lies in, and so which axis is its normal: 'xz' is the ground plane (normal +y), 'xy' faces +z, 'yz' faces +x. Ignored for 'box' and 'cylinder'.",
    },
    subdivisions: {
      type: "vec3",
      default: [1, 1, 1],
      min: 1,
      description:
        "Quads along world x, y, z — whole numbers, minimum 1. A plane uses the two components of its own axes ([1,1,1] is a single quad, two triangles); a box uses all three, each face taking the two that span it; a cylinder uses only y, the number of bands its wall is cut into up its height (round it, `sides` counts instead); a disc uses none. More subdivisions give finer sampling and a finer uv/raycast target.",
    },
    sides: {
      type: "i32",
      default: 16,
      min: 3,
      max: 256,
      description:
        "Corners round a 'cylinder' or a 'disc' — whole number, 3..256; ignored by 'plane' and 'box'. The section is the regular polygon INSCRIBED in the ellipse (its corners lie on it), the first corner on +z, so 3 is a triangular prism, 4 a diamond, and a multiple of 4 reaches the full `size` extents exactly. Cost is linear: each wall ring is `sides + 1` points (the extra one duplicates the seam for the uv), each band `2 * sides` triangles, and each cap `sides` points and `sides - 2` triangles. The same name and range as sweepProfile's circle `sides`; the default is 16 rather than its 8 because that one matches a shipped tube asset and this one is meant to read round on its own.",
    },
    caps: {
      type: "enum",
      default: "both",
      enum: [...CYLINDER_CAPS],
      description:
        "Which ends of a 'cylinder' are closed, in extrudePolygon's spelling: 'both' is a closed solid (every edge shared by exactly two triangles once the coincident rim and seam points are welded), 'bottom' alone is a cup, 'top' alone a tube with a lid, 'none' is an open tube. Ignored by every other shape. A cap faces out of the cylinder (+y on top, -y below) and shares no points with the wall, so the rim stays a hard crease and the cap's planar uv is independent of the wall's.",
    },
    flip: {
      type: "bool",
      default: false,
      description:
        "Reverse every triangle's winding (and the written `normal` with it, under `normals`), which flips the surface — a plane or a disc becomes a ceiling, a box an inward-facing room, a cylinder an inward-facing shaft.",
    },
    normals: {
      type: "bool",
      default: false,
      description:
        "Write a `normal` point attribute (f32 tuple 3): FLAT on every flat face — one face's unit axis on each of that face's points, derived from the same winding the triangles use (so `flip` turns both) — the split-corner shading sweepProfile's 'square' and extrudePolygon give their hard edges, which a box's unshared face points make exact; a cylinder's caps and a disc are flat the same way. A cylinder's WALL is the one curved face, and gets its SMOOTH analytic normal instead (radial on a circle, the ellipse's own normal on an elliptic section), so it shades round with no smoothNormals pass while its rim, whose cap points are separate, stays a hard edge. That holds however few `sides` it has: a 3- or 6-sided prism with `normals` on shades ROUND, not faceted, and so does the renderer's own computed normal with `normals` off, because the wall's points are shared round the ring. A faceted prism needs split corners, which this node does not build: extrudePolygon over a polygon outline gives one. TURN IT ON when this mesh is merged with one that carries a normal (sweepProfile, extrudePolygon, meshFromField): mergePrimitives fills a column missing on one input with its default, (0, 0, 0), and a lit material renders those points black. OFF BY DEFAULT because a stored normal is only right until something moves P, and the renderer computes one from the triangles when none is stored: the commonest use of a plane is displacement into terrain, which would then shade flat on rolling ground, and a box copied onto ROTATED targets keeps its unturned normal unless copyToPoints' `rotateAttrs` names `normal`. A graph that displaces the mesh and still wants a stored normal recomputes it afterwards with smoothNormals.",
    },
  },
  execute({ params }) {
    const sub = subdivisionCounts(params.subdivisions);
    const [cx, cy, cz] = params.center;
    const center = [cx, cy, cz];
    const size = [params.size[0], params.size[1], params.size[2]];
    const positions: number[] = [];
    const uvs: number[] = [];
    const normals: number[] = [];
    const triangles: number[] = [];

    if (params.shape === "plane") {
      const axes = PLANE_AXES[params.orientation];
      if (!axes) {
        throw new Error(
          `meshPrimitive: unknown orientation "${params.orientation}"; valid orientations: ${Object.keys(PLANE_AXES).join(", ")}`,
        );
      }
      const [au, av] = axes;
      const an = 3 - au - av;
      // The base winding's normal is +(au x av), which is -y for 'xz'
      // (x cross z). Reversing there is what makes every orientation's
      // normal the POSITIVE third axis, as the description promises.
      const reverse = params.flip !== (au === 0 && av === 2);
      appendQuad(
        positions,
        uvs,
        normals,
        triangles,
        au,
        av,
        an,
        sub[au],
        sub[av],
        center[au] - size[au] / 2,
        center[av] - size[av] / 2,
        size[au],
        size[av],
        center[an],
        reverse,
      );
    } else if (params.shape === "box") {
      // +x, -x, +y, -y, +z, -z. For normal axis `an`, the spanning axes
      // (an+1)%3 and (an+2)%3 cross to +an, so the base winding already
      // faces outward on the positive side and is reversed on the other.
      for (let an = 0; an < 3; an++) {
        for (const sign of [1, -1]) {
          const au = (an + 1) % 3;
          const av = (an + 2) % 3;
          appendQuad(
            positions,
            uvs,
            normals,
            triangles,
            au,
            av,
            an,
            sub[au],
            sub[av],
            center[au] - size[au] / 2,
            center[av] - size[av] / 2,
            size[au],
            size[av],
            center[an] + (sign * size[an]) / 2,
            params.flip !== (sign < 0),
          );
        }
      }
    } else if (params.shape === "cylinder" || params.shape === "disc") {
      const sides = params.sides;
      if (!Number.isInteger(sides) || sides < 3 || sides > 256) {
        throw new Error(
          `meshPrimitive: sides is ${sides}, but a ${params.shape} needs a whole number of corners from 3 to 256; use ${Math.min(256, Math.max(3, Math.round(Number.isFinite(sides) ? sides : 3)))}`,
        );
      }
      if (params.shape === "disc") {
        const axes = PLANE_AXES[params.orientation];
        if (!axes) {
          throw new Error(
            `meshPrimitive: unknown orientation "${params.orientation}"; valid orientations: ${Object.keys(PLANE_AXES).join(", ")}`,
          );
        }
        const [au, av] = axes;
        const an = 3 - au - av;
        // The fan's base normal is -(au x av): +y for 'xz' (x cross z is
        // -y), -z for 'xy', -x for 'yz'. Reversing the latter two is what
        // makes every orientation face the POSITIVE third axis, as the
        // plane does — the plane's reversal, mirrored.
        const reverse = params.flip !== !(au === 0 && av === 2);
        appendDisc(
          positions,
          uvs,
          normals,
          triangles,
          au,
          av,
          an,
          sides,
          center[au],
          center[av],
          size[au] / 2,
          size[av] / 2,
          center[an],
          reverse,
        );
      } else {
        // Decided once: which ends are closed. The loop below never sees
        // the string (see the param-string convention in CLAUDE.md).
        const caps = params.caps;
        if (!(CYLINDER_CAPS as readonly string[]).includes(caps)) {
          throw new Error(
            `meshPrimitive: unknown caps "${caps}"; valid caps: ${CYLINDER_CAPS.join(", ")}`,
          );
        }
        const top = caps === "both" || caps === "top";
        const bottom = caps === "both" || caps === "bottom";
        const rx = size[0] / 2;
        const rz = size[2] / 2;
        const minY = center[1] - size[1] / 2;
        const maxY = center[1] + size[1] / 2;
        appendWall(
          positions,
          uvs,
          normals,
          triangles,
          sides,
          sub[1],
          center[0],
          center[2],
          rx,
          rz,
          minY,
          maxY,
          params.flip,
        );
        // Caps lie in (x, z), whose fan faces +y unreversed (see
        // appendDisc): the top keeps it, the bottom is turned to face -y.
        if (top) {
          appendDisc(positions, uvs, normals, triangles, 0, 2, 1, sides, center[0], center[2], rx, rz, maxY, params.flip);
        }
        if (bottom) {
          appendDisc(positions, uvs, normals, triangles, 0, 2, 1, sides, center[0], center[2], rx, rz, minY, !params.flip);
        }
      }
    } else {
      throw new Error(
        `meshPrimitive: unknown shape "${params.shape}"; valid shapes: ${SHAPES.join(", ")}`,
      );
    }

    const geo = createTriangleMesh(positions, triangles);
    const uv = geo.attrs.point.add("uv", "f32", 2, 0);
    uv.writable().set(uvs);
    if (params.normals) {
      const normal = geo.attrs.point.add("normal", "f32", 3, 0);
      normal.writable().set(normals);
    }
    return { out: [makeGeometryItem(geo)] };
  },
});
