/**
 * The bands World, off the page's thread (bands.ts has what it cooks).
 *
 * A cell of the tower's laced depth can take a few hundred milliseconds
 * to cook, and a node of it tens of milliseconds at a stretch: on the
 * page's thread that is a hitch every time the camera brings one in. So
 * the World runs here, and the page only draws. Everything a cell hands
 * the page crosses by TRANSFER: its meshes as the arrays a
 * `BufferGeometry` takes, built here (`toBufferGeometry`, the page's
 * normal repair), and its rivets packed here as the page's shader reads
 * them (rivetPack.ts, 24 bytes a head).
 *
 * THE LOOP. The page posts where the camera is whenever it has moved;
 * the worker runs one `World.update` after another from the latest
 * position until nothing it wants is left to cook, then sleeps until the
 * next move. An update in flight is ABORTED when the camera has moved
 * more than a rivet cell from where it began — the cell being cooked is
 * dropped half way and the next update starts from where the camera now
 * is, nearest cell first — so the queue follows the camera instead of
 * finishing a list for a place it has left.
 */
import { CookCancelledError, type CellOutputs, type DataCollection, type InstancesItem } from "pcg-ts";
import { toBufferGeometry } from "pcg-ts/three";
import type { BufferAttribute, InterleavedBufferAttribute } from "three";
import {
  type AttrPayload,
  type BandLevel,
  type BandsIn,
  type BandsOut,
  type BandsSpec,
  LACED_CLASSES,
  type MeshPayload,
  type RivetPayload,
  bandsWorld,
} from "./bands.js";
import { HEAD_DRIVE_ATTR } from "./heads.js";
import { repairZeroNormals } from "./normals.js";
import type { CrossPlate, PartClass } from "./parts.js";
import { type RivetBatch, isFallback, packRivets } from "./rivetPack.js";

type Vec3 = readonly [number, number, number];

const post = (msg: BandsOut, transfer: Transferable[] = []): void =>
  (self as unknown as { postMessage(m: unknown, t: Transferable[]): void }).postMessage(msg, transfer);

let run: ((at: Vec3) => void) | undefined;

self.onmessage = (e: MessageEvent<BandsIn>): void => {
  const msg = e.data;
  try {
    if (msg.type === "start") run = start(msg.spec, msg.crossPlate);
    else if (msg.type === "view") run?.(msg.at);
  } catch (err) {
    post({ type: "error", message: err instanceof Error ? err.message : String(err) });
  }
};

function start(spec: BandsSpec, crossPlate: Partial<CrossPlate>): (at: Vec3) => void {
  const t0 = performance.now();
  let cooked = 0;
  let evicted = 0;
  let cancelled = 0;
  const { world } = bandsWorld({
    spec,
    crossPlate,
    // Every cell a level keeps is ALSO the page's meshes: the World need
    // not hold its outputs once they have crossed (`keepOutputs: false`
    // on both levels), and a resident cell is never cooked twice.
    maxCellsPerLevel: 4096,
    onCellReady: (level, coord, outputs) => {
      cooked++;
      send(level as BandLevel, coord as unknown as Vec3, outputs);
    },
    onCellEvicted: (level, coord) => {
      evicted++;
      post({ type: "evict", level: level as BandLevel, coord: coord as unknown as Vec3 });
    },
  });
  const buildMs = performance.now() - t0;

  let target: Vec3 | undefined;
  let from: Vec3 | undefined;
  let ctrl: AbortController | undefined;
  let pumping = false;
  const far = (a: Vec3, b: Vec3): boolean => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) > spec.rivets.cell;

  const pump = async (): Promise<void> => {
    pumping = true;
    while (target !== undefined) {
      const at = target;
      from = at;
      ctrl = new AbortController();
      const t = performance.now();
      let pending = 0;
      try {
        // The budget gates the START of each cell and is the cook's yield
        // interval, so the camera's messages are read between nodes.
        const st = await world.update(at, { budgetMs: 50, signal: ctrl.signal, maxCooksPerUpdate: 4 });
        pending = st.pending;
      } catch (err) {
        if (!(err instanceof CookCancelledError)) throw err;
        cancelled++;
        pending = 1;
      }
      const s = world.stats();
      const memory = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
      post({
        type: "status",
        laced: s.levels[0]?.cellCount ?? 0,
        rivets: s.levels[1]?.cellCount ?? 0,
        pending,
        cooked,
        evicted,
        updateMs: performance.now() - t,
        cancelled,
        heapMB: memory === undefined ? undefined : memory.usedJSHeapSize / 2 ** 20,
        buildMs,
      });
      if (pending === 0 && target === at) target = undefined;
    }
    pumping = false;
  };

  return (at) => {
    target = at;
    if (ctrl !== undefined && from !== undefined && pumping && far(at, from)) ctrl.abort();
    if (!pumping) {
      void pump().catch((err: unknown) => {
        pumping = false;
        post({ type: "error", message: err instanceof Error ? err.message : String(err) });
      });
    }
  };
}

/** Convert one cell's outputs for the page and post them, arrays transferred. */
function send(level: BandLevel, coord: Vec3, outputs: CellOutputs): void {
  const t = performance.now();
  const transfer: Transferable[] = [];
  const meshes: MeshPayload[] = [];
  const rivets: RivetPayload[] = [];
  if (level === "laced") {
    for (const cls of LACED_CLASSES) {
      const list = outputs[cls];
      if (list !== undefined) meshes.push(...meshesOf(cls, list, transfer));
    }
  } else {
    for (const [name, list] of Object.entries(outputs)) rivets.push(...rivetsOf(name, list, transfer));
  }
  post({ type: "cell", level, coord, meshes, rivets, convertMs: performance.now() - t }, transfer);
}

function meshesOf(cls: PartClass, list: DataCollection, transfer: Transferable[]): MeshPayload[] {
  const out: MeshPayload[] = [];
  for (const item of list) {
    if (item.kind !== "geometry" || item.geo.primitiveCount === 0) continue;
    const geometry = toBufferGeometry(item.geo);
    repairZeroNormals(geometry);
    geometry.computeBoundingSphere();
    const s = geometry.boundingSphere;
    const attrs: AttrPayload[] = [];
    for (const [name, a] of Object.entries(geometry.attributes)) {
      const attr = a as BufferAttribute | InterleavedBufferAttribute;
      if ((attr as InterleavedBufferAttribute).isInterleavedBufferAttribute === true) continue;
      const array = (attr as BufferAttribute).array as AttrPayload["array"];
      attrs.push({ name, array, itemSize: attr.itemSize, normalized: attr.normalized });
      transfer.push(array.buffer);
    }
    const index = (geometry.index?.array ?? null) as MeshPayload["index"];
    if (index !== null) transfer.push(index.buffer);
    out.push({
      cls,
      attrs,
      index,
      sphere: s === null ? [0, 0, 0, 0] : [s.center.x, s.center.y, s.center.z, s.radius],
      triangles: (index === null ? geometry.attributes.position!.count : index.length) / 3,
    });
  }
  return out;
}

function rivetsOf(name: string, list: DataCollection, transfer: Transferable[]): RivetPayload[] {
  const out: RivetPayload[] = [];
  for (const item of list) {
    if (item.kind !== "instances") continue;
    for (const batch of (item as InstancesItem).batches) {
      if (batch.count === 0) continue;
      const packed = packRivets(batch as RivetBatch);
      if (isFallback(packed)) {
        const transforms = batch.transforms.slice();
        const drive = (batch.attributes?.[HEAD_DRIVE_ATTR] as Float32Array | undefined)?.slice();
        transfer.push(transforms.buffer);
        if (drive !== undefined) transfer.push(drive.buffer);
        out.push({ name, count: batch.count, fallback: `${packed.reason}: ${packed.detail}`, transforms, drive });
        continue;
      }
      transfer.push(packed.at.buffer, packed.turn.buffer, packed.size.buffer);
      const c = packed.bounds.center;
      out.push({
        name,
        count: packed.count,
        at: packed.at,
        turn: packed.turn,
        size: packed.size,
        sphere: [c.x, c.y, c.z, packed.bounds.radius],
      });
    }
  }
  return out;
}
