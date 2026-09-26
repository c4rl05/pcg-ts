/**
 * `?bands` on the page: the laced and riveted depths drawn round the
 * camera over the plain tower, as the worker (bandsWorker.ts) cooks them.
 *
 * THE SEAM. A laced cell puts out every primitive whose bounding box
 * meets its cube (bands.ts), so a member crossing a face comes out of both
 * cells whole, and every triangle that passes through the cube at all is
 * in it — which is what the cut below needs. The page makes the cube faces exact with ONE table, a texel per
 * laced cell, 1 where the cell's detail is on the page: the plain meshes
 * of the classes the laced depth changes ({@link LACED_CLASSES}) discard
 * every fragment in a cell whose texel is 1, and the laced meshes every
 * fragment in a cell whose texel is 0. Both read the same texel from the
 * same world position, so the two depths meet on the cube face with
 * neither a gap nor a double, whatever a member does there; where two
 * laced cells meet, both draw the same bytes and the depth test keeps
 * one. The shadow map and the occlusion pass's prepass draw with the same
 * cut (each mesh carries a depth and a prepass material taught it), so
 * the laced lattice casts its own shadow where it is shown, and the solid
 * bars' nowhere else.
 *
 * The rivets need none of this: each head is in exactly one rivet cell.
 */
import {
  type BufferGeometry as BufferGeometryType,
  BufferAttribute,
  BufferGeometry,
  type Camera,
  DataTexture,
  Material,
  Mesh,
  MeshDepthMaterial,
  MeshNormalMaterial,
  type MeshStandardMaterial,
  NearestFilter,
  NoBlending,
  RedFormat,
  type Scene,
  Sphere,
  UnsignedByteType,
  Vector3,
  type WebGLProgramParametersWithUniforms,
} from "three";
import {
  type BandLevel,
  type BandsIn,
  type BandsOut,
  type BandsSpec,
  ENVELOPE,
  LACED_CLASSES,
  type MeshPayload,
  type RivetPayload,
} from "./bands.js";
import type { CrossPlate, PartClass } from "./parts.js";
import { type PackedRivets, packedRivetMesh } from "./rivetPack.js";
import { profileAt } from "./spec.js";

/** What the page lends the bands. */
export interface BandsHost {
  readonly scene: Scene;
  readonly spec: BandsSpec;
  readonly crossPlate: Partial<CrossPlate>;
  /** The page's class materials: the laced classes' are taught the plain side of the cut, in place. */
  readonly materials: Record<PartClass, MeshStandardMaterial>;
  /** The page's plain meshes by output name: the laced classes' get the plain cut's depth and prepass. */
  readonly meshes: ReadonlyMap<string, readonly Mesh[]>;
  /** The packed material for a rivet output (shop or site: main.ts). */
  readonly rivetMaterial: (name: string) => MeshStandardMaterial;
  /** The unit rivet head. */
  readonly rivetHead: BufferGeometryType;
  /** A heads batch that would not pack, drawn the page's other way. */
  readonly drawFallback: (name: string, transforms: Float32Array, drive: Float32Array | undefined) => Mesh[];
  /** Ask for the shadow map to be redrawn (it does not auto-update). */
  readonly shadowsChanged: () => void;
  /** A stat line. */
  readonly stat: (label: string) => (value: string) => void;
}

/** The running bands: tick it every frame with the camera. */
export interface Bands {
  tick(camera: Camera): void;
  /** Counters for a capture or a probe. */
  readonly state: () => BandsState;
}

export interface BandsState {
  readonly laced: number;
  readonly rivets: number;
  readonly heads: number;
  readonly triangles: number;
  readonly pending: number;
  readonly worker: BandsOut | undefined;
  /** Main-thread milliseconds spent building meshes from arrived cells, the longest one. */
  readonly longestArrivalMs: number;
}

/** The laced cells' grid as a texture: which cells cover the tower's envelope. */
function flagGrid(cell: number): { origin: [number, number, number]; dims: [number, number, number] } {
  const w = profileAt(ENVELOPE.bottom).outer + ENVELOPE.margin;
  const lo = Math.floor(-w / cell);
  const hi = Math.floor(w / cell);
  const y0 = Math.floor(ENVELOPE.bottom / cell);
  const y1 = Math.floor(ENVELOPE.top / cell);
  return { origin: [lo, y0, lo], dims: [hi - lo + 1, y1 - y0 + 1, hi - lo + 1] };
}

const CUT_KEY = "eiffelBands";

/**
 * Teach `m` the cut: `side` "plain" hides it in a laced cell, "laced"
 * everywhere else. The uniforms are shared, so one texture update moves
 * every material at once.
 */
function teachCut(m: Material, side: "plain" | "laced", uniforms: Record<string, { value: unknown }>): void {
  const before = m.onBeforeCompile;
  m.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms, renderer) => {
    before.call(m, shader, renderer);
    Object.assign(shader.uniforms, uniforms);
    const anchor = "#include <project_vertex>";
    if (!shader.vertexShader.includes(anchor) || !shader.fragmentShader.includes("void main() {")) {
      throw new Error(`eiffel bands: this three's ${m.type} shader has no "${anchor}" to cut at (bandsView.ts)`);
    }
    shader.vertexShader = `varying vec3 vBandsWorld;\n${shader.vertexShader.replace(
      anchor,
      `${anchor}\n  vBandsWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
    )}`;
    const test = side === "plain" ? "bandsLaced() > 0.5" : "bandsLaced() < 0.5";
    shader.fragmentShader = `varying vec3 vBandsWorld;
uniform sampler2D bandsFlags;
uniform vec3 bandsOrigin;
uniform vec3 bandsDims;
uniform float bandsCell;
float bandsLaced() {
  vec3 c = floor(vBandsWorld / bandsCell) - bandsOrigin;
  if (any(lessThan(c, vec3(0.0))) || any(greaterThanEqual(c, bandsDims))) return 0.0;
  return texelFetch(bandsFlags, ivec2(int(c.x + c.z * bandsDims.x), int(c.y)), 0).r;
}
${shader.fragmentShader.replace("void main() {", `void main() {\n  if (${test}) discard;`)}`;
  };
  const key = m.customProgramCacheKey.bind(m);
  m.customProgramCacheKey = () => `${key()}|${CUT_KEY}-${side}`;
  m.needsUpdate = true;
}

/** Start the bands: the worker, the cut, the stat lines. */
export function startBands(host: BandsHost): Bands {
  const { cell } = host.spec.laced;
  const grid = flagGrid(cell);
  const [nx, ny, nz] = grid.dims;
  const flags = new Uint8Array(nx * nz * ny);
  const texture = new DataTexture(flags, nx * nz, ny, RedFormat, UnsignedByteType);
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.needsUpdate = true;
  const uniforms = {
    bandsFlags: { value: texture },
    bandsOrigin: { value: new Vector3(...grid.origin) },
    bandsDims: { value: new Vector3(...grid.dims) },
    bandsCell: { value: cell },
  };
  const flagAt = (c: readonly number[]): number => {
    const x = (c[0] as number) - grid.origin[0];
    const y = (c[1] as number) - grid.origin[1];
    const z = (c[2] as number) - grid.origin[2];
    if (x < 0 || y < 0 || z < 0 || x >= nx || y >= ny || z >= nz) return -1;
    return y * nx * nz + (x + z * nx);
  };

  // The cut's materials: the plain side on the page's own class materials
  // and on a depth and prepass material each side; the laced side on a
  // clone of each class material.
  const depth = { plain: new MeshDepthMaterial(), laced: new MeshDepthMaterial() };
  const prepass = { plain: new MeshNormalMaterial(), laced: new MeshNormalMaterial() };
  for (const side of ["plain", "laced"] as const) {
    teachCut(depth[side], side, uniforms);
    teachCut(prepass[side], side, uniforms);
    prepass[side].blending = NoBlending;
    // The occlusion pass's override would draw it uncut (gtao.ts swaps it in).
    prepass[side].allowOverride = false;
  }
  const laced = {} as Record<PartClass, MeshStandardMaterial>;
  for (const cls of LACED_CLASSES) {
    laced[cls] = host.materials[cls].clone();
    teachCut(laced[cls], "laced", uniforms);
    teachCut(host.materials[cls], "plain", uniforms);
    for (const mesh of host.meshes.get(cls) ?? []) {
      mesh.customDepthMaterial = depth.plain;
      mesh.userData.prepassMaterial = prepass.plain;
    }
  }

  const worker = new Worker(new URL("./bandsWorker.ts", import.meta.url), { type: "module" });
  const cells = new Map<string, { level: BandLevel; meshes: Mesh[]; heads: number; triangles: number }>();
  let heads = 0;
  let triangles = 0;
  let status: BandsOut | undefined;
  let longest = 0;
  const statCells = host.stat("bands");
  const statCost = host.stat("bands worker");
  let shadowDue = false;

  const arrive = (msg: Extract<BandsOut, { type: "cell" }>): void => {
    const t = performance.now();
    const key = `${msg.level}:${msg.coord.join(",")}`;
    const meshes: Mesh[] = [];
    let h = 0;
    let tris = 0;
    for (const m of msg.meshes) {
      meshes.push(lacedMesh(m, laced[m.cls], depth.laced, prepass.laced));
      tris += m.triangles;
    }
    for (const r of msg.rivets) {
      const made = rivetMeshes(r, host);
      meshes.push(...made);
      h += r.count;
    }
    for (const mesh of meshes) host.scene.add(mesh);
    const old = cells.get(key);
    if (old !== undefined) drop(key);
    cells.set(key, { level: msg.level, meshes, heads: h, triangles: tris });
    heads += h;
    triangles += tris;
    if (msg.level === "laced") setFlag(msg.coord, 255);
    shadowDue = true;
    longest = Math.max(longest, performance.now() - t);
  };
  const drop = (key: string): void => {
    const c = cells.get(key);
    if (c === undefined) return;
    for (const mesh of c.meshes) {
      host.scene.remove(mesh);
      mesh.geometry.dispose();
    }
    heads -= c.heads;
    triangles -= c.triangles;
    cells.delete(key);
    shadowDue = true;
  };
  const setFlag = (coord: readonly number[], v: number): void => {
    const i = flagAt(coord);
    if (i < 0) return;
    flags[i] = v;
    texture.needsUpdate = true;
  };

  worker.onmessage = (e: MessageEvent<BandsOut>): void => {
    const msg = e.data;
    if (msg.type === "cell") arrive(msg);
    else if (msg.type === "evict") {
      drop(`${msg.level}:${msg.coord.join(",")}`);
      if (msg.level === "laced") setFlag(msg.coord, 0);
    } else if (msg.type === "status") {
      status = msg;
      statCost(
        `${msg.cooked} cooked, ${msg.evicted} evicted, ${msg.cancelled} cut short; ` +
          (msg.heapMB === undefined ? "" : `heap ${msg.heapMB.toFixed(0)} MB; `) +
          `graphs ${msg.buildMs.toFixed(0)} ms`,
      );
    } else if (msg.type === "error") {
      console.error(`eiffel bands: ${msg.message}`);
      statCost(`error: ${msg.message}`);
    }
  };
  worker.onerror = (e): void => {
    console.error("eiffel bands: worker failed", e.message);
    statCost(`worker failed: ${e.message}`);
  };
  worker.postMessage({ type: "start", spec: host.spec, crossPlate: host.crossPlate } satisfies BandsIn);

  const last = new Vector3(Number.NaN, 0, 0);
  let lastShadow = 0;
  return {
    tick(camera: Camera): void {
      const p = camera.position;
      // A metre is well inside every cell; posting less often than that
      // would only delay the worker noticing a move.
      if (!(last.distanceTo(p) < 1)) {
        last.copy(p);
        worker.postMessage({ type: "view", at: [p.x, p.y, p.z] } satisfies BandsIn);
      }
      // The shadow map is redrawn for the new cut at most twice a second:
      // it is the whole tower from the sun, every time.
      const now = performance.now();
      if (shadowDue && now - lastShadow > 500) {
        shadowDue = false;
        lastShadow = now;
        host.shadowsChanged();
      }
      let l = 0;
      let r = 0;
      for (const c of cells.values()) c.level === "laced" ? l++ : r++;
      const pending = status?.type === "status" ? status.pending : 0;
      statCells(
        `laced ${l}, rivets ${r} cells; ${triangles.toLocaleString()} tri, ${heads.toLocaleString()} heads` +
          (pending > 0 ? ", cooking" : ""),
      );
    },
    state: () => {
      let l = 0;
      let r = 0;
      for (const c of cells.values()) c.level === "laced" ? l++ : r++;
      return {
        laced: l,
        rivets: r,
        heads,
        triangles,
        pending: status?.type === "status" ? status.pending : -1,
        worker: status,
        longestArrivalMs: longest,
      };
    },
  };
}

function lacedMesh(m: MeshPayload, material: Material, depth: Material, prepass: Material): Mesh {
  const g = new BufferGeometry();
  for (const a of m.attrs) {
    const attr = new BufferAttribute(a.array, a.itemSize, a.normalized);
    attr.onUpload(release);
    g.setAttribute(a.name, attr);
  }
  if (m.index !== null) {
    const index = new BufferAttribute(m.index, 1);
    index.onUpload(release);
    g.setIndex(index);
  }
  const [x, y, z, r] = m.sphere;
  g.boundingSphere = new Sphere(new Vector3(x, y, z), r);
  const mesh = new Mesh(g, material);
  mesh.name = `bands.${m.cls}`;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.customDepthMaterial = depth;
  mesh.userData.prepassMaterial = prepass;
  return mesh;
}

function rivetMeshes(r: RivetPayload, host: BandsHost): Mesh[] {
  if ("fallback" in r) {
    console.info(`eiffel bands: ${r.name} drawn on the CPU path`, r.fallback);
    return host.drawFallback(r.name, r.transforms, r.drive);
  }
  const [x, y, z, radius] = r.sphere;
  const packed: PackedRivets = {
    count: r.count,
    at: r.at,
    turn: r.turn,
    size: r.size,
    bounds: new Sphere(new Vector3(x, y, z), radius),
  };
  const mesh = packedRivetMesh(packed, host.rivetHead, host.rivetMaterial(r.name));
  mesh.name = `bands.${r.name}`;
  return [mesh];
}

/** Drop an attribute's array once it is on the GPU device (three's own `disposeArray` idiom). */
function release(this: { array: unknown }): void {
  this.array = null;
}

declare global {
  interface Window {
    /** The running bands (`?bands`), for a probe or a capture to read. */
    pcgEiffelBands?: Bands;
  }
}
