/**
 * The belts' and ties' chord rivets (legs.ts `beltRivets`, `tieRivets`):
 * no plate on a chord flat — PL-X Figs 2, 7, 14-17 and PL-XII Fig. 1 rivet
 * every tie, panel-5 and panel-11 member straight onto its chord's web —
 * but the edge row and a lap group where each member lands, every head on
 * steel, none in a deck, an upright or another head; and no belt post run
 * on into a floor deck.
 */
import { describe, expect, it } from "vitest";
import { type Geometry, type NodeHandle, cook, firstGeometry } from "pcg-ts";
import { buildEiffel } from "../demos/eiffel/graph.js";
import { FLOORS, MEMBERS, profileAt, tableAt } from "../demos/eiffel/spec.js";
import { SWEPT_BOX_POINTS, isSweptBox, sweptBoxCorners } from "./support/sweptBox.js";

type V = readonly [number, number, number];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sc = (a: V, s: number): V => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a: V) => Math.hypot(a[0], a[1], a[2]);
const cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: V): V => sc(a, 1 / len(a));
/** strut.ts RIVET_HEAD. */
const HEAD_R = 0.019;
/** platforms.ts DECK: every deck's thickness under its FLOORS level. */
const DECK = 0.6;

interface Box {
  c: V;
  n: V;
  u: V;
  v: V;
  ht: number;
  hu: number;
  hv: number;
}
/**
 * flatBars' boxes: a 'rect' sweep of a member's two ends, in the layout
 * tests/support/sweptBox.ts states; 8 distinct corners; n the thinnest axis.
 */
function boxes(geo: Geometry): Box[] {
  const P = geo.attrs.point.get("P")!.data;
  const count = geo.attrs.point.count;
  if (count % SWEPT_BOX_POINTS !== 0) throw new Error(`flat bars are ${SWEPT_BOX_POINTS} points a box; this has ${count}`);
  const out: Box[] = [];
  for (let i = 0; i < count; i += SWEPT_BOX_POINTS) {
    if (!isSweptBox(P, i, count)) throw new Error(`flat bar ${i / SWEPT_BOX_POINTS} is not a swept box`);
    const pts: V[] = sweptBoxCorners(P, i);
    const c = sc(
      pts.reduce<V>((a, p) => add(a, p), [0, 0, 0]),
      1 / pts.length,
    );
    const e = pts
      .slice(1)
      .map((p) => sub(p, pts[0]!))
      .sort((a, b) => len(a) - len(b));
    const ax: V[] = [];
    for (const d of e) if (ax.length < 3 && ax.every((a) => Math.abs(dot(a, d)) / (len(a) * len(d)) < 0.3)) ax.push(d);
    const [, a, b] = [...ax].sort((x, y) => len(x) - len(y)) as [V, V, V];
    const n = unit(cross(a, b));
    const u = unit(a);
    const v = unit(cross(n, u));
    const half = (d: V) =>
      (Math.max(...pts.map((p) => dot(sub(p, c), d))) - Math.min(...pts.map((p) => dot(sub(p, c), d)))) / 2;
    out.push({ c, n, u, v, ht: half(n), hu: half(u), hv: half(v) });
  }
  return out;
}
const inside = (p: V, b: Box, shrink: number, tolN: number) => {
  const d = sub(p, b.c);
  return (
    Math.abs(dot(d, b.u)) <= b.hu - shrink && Math.abs(dot(d, b.v)) <= b.hv - shrink && Math.abs(dot(d, b.n)) <= b.ht + tolN
  );
};
function heads(item: unknown): Array<{ base: V; axis: V }> {
  const it = item as { batches: { count: number; transforms: Float32Array }[] };
  const out: Array<{ base: V; axis: V }> = [];
  for (const b of it.batches)
    for (let k = 0; k < b.count; k++) {
      const m = b.transforms.subarray(16 * k, 16 * k + 16);
      out.push({ base: [m[12]!, m[13]!, m[14]!], axis: unit([m[4]!, m[5]!, m[6]!]) });
    }
  return out;
}

describe("eiffel chord rivets", () => {
  it("rivets the belts' and ties' chords on steel, clear of decks, uprights and each other", async () => {
    const g = buildEiffel(1889, { rivets: true });
    const memberIds = [
      "legBelt5PostsLit",
      "legBelt5BarsUpLit",
      "legBelt5BarsDownLit",
      "legBelt11PostsLit",
      "legBelt11BarsUpLit",
      "legBelt11BarsDownLit",
    ];
    const chordIds = ["legBelt5ChordsLit", "legBelt11ChordsLit", "tieTopChordLit", "tieAChordLit", "tieBChordLit"];
    for (const id of [...memberIds, ...chordIds, "legBelts4RotDone"]) g.output({ id } as NodeHandle, "out", `probe:${id}`);
    const { outputs } = await cook(g);
    const geo = (k: string) => firstGeometry(outputs[k] as never)!;
    const members = memberIds.flatMap((id) => boxes(geo(`probe:${id}`)));
    const chords = chordIds.flatMap((id) => boxes(geo(`probe:${id}`)));
    // The ties' bars, as the quadrant-copied two-point paths.
    const tb = geo("probe:legBelts4RotDone");
    const TP = tb.attrs.point.get("P")!.data;
    const at = (vx: number): V => {
      const j = tb.vertexToPoint[vx]!;
      return [TP[3 * j]!, TP[3 * j + 1]!, TP[3 * j + 2]!];
    };
    const bars = Array.from(tb.primVertexStart, (s, p) => [at(s), at(s + tb.primVertexCount[p]! - 1)] as const);
    // On a tie bar's face (face = true), or inside the bar (false).
    const onBar = (p: V, axis: V, face: boolean) =>
      bars.some(([a, b]) => {
        const d = sub(b, a);
        const l = len(d);
        const t = dot(sub(p, a), d) / l;
        if (t < 0 || t > l) return false;
        const off = sub(p, add(a, sc(d, t / l)));
        const o = dot(off, axis);
        const lat = len(sub(off, sc(axis, o)));
        return face
          ? Math.abs(Math.abs(o) - MEMBERS.beltBar) < 0.002 && lat <= MEMBERS.beltBar - HEAD_R
          : Math.abs(o) < MEMBERS.beltBar - 1e-4 && lat < MEMBERS.beltBar - 1e-4;
      });
    // Folded onto the +x +z leg (a quadrant turn maps the leg's square onto itself).
    const inUpright = (p: V) => {
      const q: V = [Math.abs(p[0]), p[1], Math.abs(p[2])];
      const pr = profileAt(q[1]);
      const h = tableAt(MEMBERS.upright, q[1]) + HEAD_R;
      return [
        [1, 1],
        [0, 1],
        [0, 0],
        [1, 0],
      ].some(
        ([u, v]) =>
          Math.abs(q[0] - (pr.inner + (pr.outer - pr.inner) * u!)) < h &&
          Math.abs(q[2] - (pr.inner + (pr.outer - pr.inner) * v!)) < h,
      );
    };
    const counts: Record<string, number> = {};
    const all: Array<{ base: V; axis: V }> = [];
    for (const key of Object.keys(outputs)
      .filter((k) => k.startsWith("rivets.leg.chords."))
      .sort()) {
      const tie = key.includes("Tie");
      const lap = key.includes("Lap");
      const hs = heads((outputs[key] as unknown[])[0]);
      counts[key] = hs.length;
      for (const { base, axis } of hs) {
        all.push({ base, axis });
        const where = base.map((x) => x.toFixed(3)).join(", ");
        // On the face of what it fastens: the member for a lap, the chord for an edge row.
        const fastened =
          lap && tie
            ? onBar(base, axis, true)
            : (lap ? members : chords).some(
                (b) =>
                  Math.abs(Math.abs(dot(axis, b.n)) - 1) < 1e-3 &&
                  Math.abs(Math.abs(dot(sub(base, b.c), b.n)) - b.ht) < 0.0025 &&
                  inside(base, b, HEAD_R, 0.003),
              );
        expect(fastened, `${key} head at ${where} is on no member's face`).toBe(true);
        // Its shank through a chord.
        const thru = chords.some((b) => {
          const s = dot(sub(base, b.c), b.n);
          return Math.abs(s) < 0.1 && inside(sub(base, sc(b.n, s)), b, HEAD_R, 1e-3);
        });
        expect(thru, `${key} head at ${where} is over no chord`).toBe(true);
        // The head's whole dome clear of steel: its axis from 2 mm up to its
        // rise, and a ring at nine tenths of its radius 2 mm up, so a head
        // buried in a member by more than 2 mm fails, not only one buried
        // past its middle. Not nearer than 2 mm: a rivet carries its own
        // jitter (strut.ts, JITTER per axis, up to 1.7 mm along a face's
        // normal) and the probed members none.
        const side = unit(cross(axis, Math.abs(axis[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]));
        const side2 = cross(axis, side);
        const probes: V[] = [0.002, 0.004, 0.006, 0.009, 0.0115].map((h) => add(base, sc(axis, h)));
        for (let k = 0; k < 8; k++) {
          const a = (k * Math.PI) / 4;
          probes.push(add(add(base, sc(axis, 0.002)), add(sc(side, 0.9 * HEAD_R * Math.cos(a)), sc(side2, 0.9 * HEAD_R * Math.sin(a)))));
        }
        const buried = probes.some((q) => [...members, ...chords].some((b) => inside(q, b, 0, -0.0002)));
        expect(buried, `${key} head at ${where} inside steel`).toBe(false);
        const mid = add(base, sc(axis, 0.006));
        if (tie) expect(probes.some((q) => onBar(q, axis, false)), `${key} head at ${where} inside a tie bar`).toBe(false);
        expect(inUpright(mid), `${key} head at ${where} in an upright`).toBe(false);
        // Neither belt's top chord is riveted: both lie in a floor deck.
        expect(mid[1] > 56.9 && mid[1] < 57.7, `${key} head at ${where} in the 1st floor's deck`).toBe(false);
        expect(mid[1] > 115.0 && mid[1] < 115.8, `${key} head at ${where} in the 2nd floor's deck`).toBe(false);
      }
    }
    // No two heads on one side closer than a head's diameter.
    const cell = new Map<string, Array<{ base: V; axis: V }>>();
    for (const h of all) {
      const s = h.base.map((x) => Math.floor(x / 0.1)).join(",");
      const l = cell.get(s);
      if (l) l.push(h);
      else cell.set(s, [h]);
    }
    let close = 0;
    for (const h of all)
      for (let dx = -1; dx <= 1; dx++)
        for (let dy = -1; dy <= 1; dy++)
          for (let dz = -1; dz <= 1; dz++) {
            const c = h.base.map((x, i) => Math.floor(x / 0.1) + [dx, dy, dz][i]!).join(",");
            for (const o of cell.get(c) ?? [])
              if (o !== h && dot(o.axis, h.axis) > 0.9 && len(sub(o.base, h.base)) < 2 * HEAD_R) close++;
          }
    expect(close).toBe(0);
    // No belt post reaches into a floor slab (the 0.60 deck under FLOORS'
    // levels, platforms.ts): the posts run on over the BOTTOM chords only,
    // and the top chords lie in the slabs.
    for (const [id, top] of [
      ["legBelt5PostsLit", FLOORS.first],
      ["legBelt11PostsLit", FLOORS.second],
    ] as const) {
      const highest = Math.max(
        ...boxes(geo(`probe:${id}`)).map((b) => b.c[1] + b.ht * Math.abs(b.n[1]) + b.hu * Math.abs(b.u[1]) + b.hv * Math.abs(b.v[1])),
      );
      expect(highest, `${id} reaches into the deck under ${top}`).toBeLessThan(top - DECK);
    }
    expect(counts).toEqual({
      "rivets.leg.chords.legBelt11BarLap": 2464,
      "rivets.leg.chords.legBelt11Edge": 2336,
      "rivets.leg.chords.legBelt11PostLap": 512,
      "rivets.leg.chords.legBelt5BarLap": 1568,
      "rivets.leg.chords.legBelt5Edge": 3456,
      "rivets.leg.chords.legBelt5PostLap": 768,
      "rivets.leg.chords.legTieEdge": 6496,
      "rivets.leg.chords.legTieLap": 1408,
    });
  }, 300_000);
});
