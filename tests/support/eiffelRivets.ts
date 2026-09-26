/**
 * Rivet heads as the cooked Eiffel tower puts them out, and the few
 * questions the rivet tests ask of them: which heads are the two ends of
 * one rivet, and where a head sits against a box. Shared by
 * tests/eiffelRivetCount.test.ts; plain helpers, no fixture.
 */
import type { Slab, Vec3 } from "./eiffelBuiltupCensus.js";

export const sub = (p: Vec3, q: Vec3): Vec3 => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
export const add = (p: Vec3, q: Vec3): Vec3 => [p[0] + q[0], p[1] + q[1], p[2] + q[2]];
export const sc = (p: Vec3, s: number): Vec3 => [p[0] * s, p[1] * s, p[2] * s];
export const dot = (p: Vec3, q: Vec3): number => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
export const len = (p: Vec3): number => Math.hypot(p[0], p[1], p[2]);
export const unit = (p: Vec3): Vec3 => sc(p, 1 / len(p));

/** A rivet head's radius (strut.ts' RIVET_HEAD). */
export const HEAD_R = 0.019;

/** One head: its base on the plate, its axis out of it, and the output it came from. */
export interface Head {
  readonly base: Vec3;
  readonly axis: Vec3;
  readonly set: string;
}

/** Every head of every `rivets.*` output. */
export function allHeads(outputs: Record<string, unknown>): Head[] {
  const out: Head[] = [];
  for (const set of Object.keys(outputs).sort()) {
    if (!set.startsWith("rivets.")) continue;
    for (const h of headsOf(outputs[set], set)) out.push(h);
  }
  return out;
}

/** The heads of one instances output. */
export function headsOf(list: unknown, set: string): Head[] {
  const it = (list as unknown[])[0] as { kind: string; batches: { count: number; transforms: Float32Array }[] };
  if (it?.kind !== "instances") throw new Error(`${set}: no instances`);
  const out: Head[] = [];
  for (const b of it.batches)
    for (let k = 0; k < b.count; k++) {
      const m = b.transforms.subarray(16 * k, 16 * k + 16);
      out.push({ base: [m[12]!, m[13]!, m[14]!], axis: unit([m[4]!, m[5]!, m[6]!]), set });
    }
  return out;
}

/** A uniform hash of points, and the ones within one cell of a point. */
export function pointGrid<T>(items: readonly T[], at: (t: T) => Vec3, cell: number): (p: Vec3) => T[] {
  const map = new Map<string, T[]>();
  for (const t of items) {
    const key = at(t)
      .map((v) => Math.floor(v / cell))
      .join(",");
    const l = map.get(key);
    if (l === undefined) map.set(key, [t]);
    else l.push(t);
  }
  return (p) => {
    const [i, j, k] = p.map((v) => Math.floor(v / cell)) as [number, number, number];
    const out: T[] = [];
    for (let a = -1; a <= 1; a++)
      for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) out.push(...(map.get(`${i + a},${j + b},${k + c}`) ?? []));
    return out;
  };
}

/**
 * Whether q is the other head of h's rivet: in the same output, facing
 * the opposite way, behind h ON its axis (the rivet's shank runs from one
 * to the other through the steel: within 3 mm of the axis, the two heads'
 * jitter) and within `reach` of it.
 */
export function backToBack(h: Head, q: Head, reach = 0.06): boolean {
  if (q === h || q.set !== h.set) return false;
  const d = sub(q.base, h.base);
  const along = -dot(d, h.axis);
  return len(d) <= reach && dot(q.axis, h.axis) < -0.99 && along > 0 && len(add(d, sc(h.axis, along))) < 0.003;
}

/**
 * The heads that are a rivet's second head: of each back-to-back pair,
 * one. A rivet the model draws both ends of (through a fin, a channel's
 * leg, a T's stem, a flat seen from both sides) is one rivet.
 */
export function secondHeads(heads: readonly Head[]): Set<Head> {
  const near = pointGrid(heads, (h) => h.base, 0.1);
  const second = new Set<Head>();
  for (const h of heads) {
    if (second.has(h)) continue;
    const q = near(h.base).find((x) => !second.has(x) && backToBack(h, x));
    if (q !== undefined) second.add(q);
  }
  return second;
}

/** A box as `slabs` reads it. */
export type Box = Pick<Slab, "c" | "axes" | "half">;

/** Whether a head's base lies on a face of the box, its axis out of that face, its disk on it. */
export function seatedOn(h: Head, b: Box, slack: number): boolean {
  const d = sub(h.base, b.c);
  for (let i = 0; i < 3; i++) {
    const up = dot(h.axis, b.axes[i]!);
    if (Math.abs(up) < 0.99) continue;
    if (Math.abs(dot(d, b.axes[i]!) * Math.sign(up) - b.half[i]!) > slack) continue;
    if ([0, 1, 2].every((j) => j === i || Math.abs(dot(d, b.axes[j]!)) <= b.half[j]! - HEAD_R + slack)) return true;
  }
  return false;
}

/** Whether a point lies inside a box by more than `margin`. */
export function inside(p: Vec3, b: Box, margin: number): boolean {
  const d = sub(p, b.c);
  return b.half.every((h, i) => Math.abs(dot(d, b.axes[i]!)) < h - margin);
}

/** A uniform hash of boxes by the cells their bounding spheres touch. */
export function boxGrid<T extends Box>(list: readonly T[], cell = 1): (p: Vec3) => T[] {
  const map = new Map<string, T[]>();
  for (const b of list) {
    const r = Math.hypot(...b.half) + 0.05;
    const lo = b.c.map((v) => Math.floor((v - r) / cell));
    const hi = b.c.map((v) => Math.floor((v + r) / cell));
    for (let i = lo[0]!; i <= hi[0]!; i++)
      for (let j = lo[1]!; j <= hi[1]!; j++)
        for (let k = lo[2]!; k <= hi[2]!; k++) {
          const key = `${i},${j},${k}`;
          const l = map.get(key);
          if (l === undefined) map.set(key, [b]);
          else l.push(b);
        }
  }
  return (p) => map.get(p.map((v) => Math.floor(v / cell)).join(",")) ?? [];
}
