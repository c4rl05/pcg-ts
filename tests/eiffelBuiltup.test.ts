/**
 * The lower uprights as built (demos/eiffel/builtup.ts) against PL-XXXI.
 *
 * Three things are held here. The SECTION TABLE: every area the plate
 * prints rebuilds from its parts, and every web width it prints is the
 * 0.877 plan square's side square to the axis. The BOX: four web plates
 * per panel, their outer faces in the tower's face planes, a lozenge
 * square to the axis, thickening inward and stepping at the nodes, run on
 * to the bisecting plane where the column turns. And the CENSUS of what
 * touches it (tests/support/eiffelBuiltupCensus.ts), which was taken of
 * the tower from before the box existed, so that it is known to report a
 * difference, and is asserted here at what the tower reads now.
 */
import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { type Geometry, type NodeHandle, cook, firstGeometry } from "pcg-ts";
import { jointFace, jointUpright } from "../demos/eiffel/builtup.js";
import { buildEiffel } from "../demos/eiffel/graph.js";
import type { Detail } from "../demos/eiffel/parts.js";
import {
  MEMBERS,
  NODES,
  UPPER_BOX,
  UPPER_SECTIONS,
  UPRIGHT_BOX,
  UPRIGHT_SECTIONS,
  type UpperMakeup,
  type UprightMakeup,
  profileAt,
  tableAt,
} from "../demos/eiffel/spec.js";
import {
  H,
  MEMBERS4,
  type Name,
  type Piece,
  type Slab,
  type Vec3,
  census,
  faceFrame,
  rivetBases,
  facePieces,
  slabs,
  upperCensus,
} from "./support/eiffelBuiltupCensus.js";

const sub = (p: Vec3, q: Vec3): Vec3 => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
const add = (p: Vec3, q: Vec3): Vec3 => [p[0] + q[0], p[1] + q[1], p[2] + q[2]];
const sc = (p: Vec3, s: number): Vec3 => [p[0] * s, p[1] * s, p[2] * s];
const dot = (p: Vec3, q: Vec3): number => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
const len = (p: Vec3): number => Math.hypot(p[0], p[1], p[2]);
const unit = (p: Vec3): Vec3 => sc(p, 1 / len(p));

/** An angle 100 x 100 x 12's area, t (2 L - t) [derived]. */
const ANGLE = 12 * (200 - 12);

const area = (m: UprightMakeup): number =>
  m.webs.reduce((s, [n, w, t]) => s + n * w * t, 0) + m.cj.reduce((s, [n, w, t]) => s + n * w * t, 0) + m.angles * ANGLE;

/** A section's panel above it (k: NODES[k] -> NODES[k + 1]). */
const panelOf = (section: string): number => NODES.findIndex((n) => n.name === section);

/** An upright's axis over segment k. */
function axis(name: string, k: number): { A: Vec3; Q: Vec3; T: Vec3 } {
  const m = MEMBERS4.find((x) => x[0] === name)!;
  const p = NODES[k]!;
  const q = NODES[k + 1]!;
  const A: Vec3 = [p[m[1]], p.y, p[m[2]]];
  const Q: Vec3 = [q[m[1]], q.y, q[m[2]]];
  return { A, Q, T: unit(sub(Q, A)) };
}

/** 877 |h squared off T|: the width of the plan square's face across h, square to the axis [derived]. */
const width = (T: Vec3, h: Vec3): number => 877 * len(sub(h, sc(T, dot(h, T))));

async function probe(ids: readonly string[], detail: Detail): Promise<Record<string, unknown>> {
  const g = buildEiffel(1889, detail);
  for (const id of ids) g.output({ id } as NodeHandle, "out", `probe:${id}`);
  return (await cook(g)).outputs as Record<string, unknown>;
}

/** The +x+z leg's plates of a box-mesh probe, each tagged with the upright, segment and face it lies on. */
function tagged(geo: Geometry): Array<{ sl: Slab; name: Name; k: number; d: readonly [number, number] }> {
  const out: Array<{ sl: Slab; name: Name; k: number; d: readonly [number, number] }> = [];
  for (const sl of slabs(geo)) {
    if (sl.c[0] <= 0 || sl.c[2] <= 0) continue;
    const pr = profileAt(sl.c[1]);
    let k = 0;
    while (k < 11 && NODES[k + 1]!.y <= sl.c[1]) k++;
    const [name, xs, zs] = MEMBERS4.reduce((b, m) =>
      Math.hypot(sl.c[0] - pr[m[1]], sl.c[2] - pr[m[2]]) < Math.hypot(sl.c[0] - pr[b[1]], sl.c[2] - pr[b[2]]) ? m : b,
    );
    const dx = sl.c[0] - pr[xs];
    const dz = sl.c[2] - pr[zs];
    const d: readonly [number, number] = Math.abs(dx) >= Math.abs(dz) ? [Math.sign(dx), 0] : [0, Math.sign(dz)];
    out.push({ sl, name, k, d });
  }
  return out;
}

describe("eiffel built-up uprights", () => {
  it("rebuilds every area PL-XXXI prints for the arbalétriers from its parts", () => {
    expect(UPRIGHT_SECTIONS.map((s) => s.section)).toEqual(
      ["XXVIII", "XXVII", "XXVI", "XXV", "XXIV", "XXIII", "XXII", "XXI", "XX", "XIX", "XVIII"],
    );
    for (const s of UPRIGHT_SECTIONS) {
      for (const [name, m] of [["a", s.a], ["bd", s.bd], ["c", s.c]] as const) {
        // XX b: the plate writes 2 x 866 x 11 = 19,054 for 19,052 and
        // carries it into its 55,622 — Eiffel's slip, kept as printed.
        const slip = s.section === "XX" && name === "bd" ? 2 : 0;
        expect(m.area - area(m), `${s.section} ${name}`).toBe(slip);
        // The faces' thicknesses are the printed plates': two exterior, two interior.
        const faces = m.webs.flatMap(([n, , t]) => Array<number>(n).fill(t)).sort();
        expect(faces).toEqual([m.ext.web, m.ext.web, m.int.web, m.int.web].sort());
        const covers = m.cj.flatMap(([n, , t]) => Array<number>(n).fill(t)).sort();
        expect(covers).toEqual([m.ext.cj, m.ext.cj, m.int.cj, m.int.cj].sort());
        expect(m.angles).toBe(panelOf(s.section) <= 5 ? 12 : 4);
      }
      // Omega is ONE leg's four arbalétriers: a + 2b + c (PL-XXXI's Nota);
      // XX's carries its b slip twice (222,524 for 222,520).
      const slip = s.section === "XX" ? 4 : 0;
      expect(s.omega - (s.a.area + 2 * s.bd.area + s.c.area), s.section).toBe(0);
      expect(s.omega - (area(s.a) + 2 * area(s.bd) + area(s.c)), s.section).toBe(slip);
    }
    // XXVIII a by hand (section-table.md): 4 x 800 x 18.5 + (2 x 205 + 2 x 200) x 12 + 12 angles.
    expect(4 * 800 * 18.5 + (2 * 205 + 2 * 200) * 12 + 12 * 2256).toBe(95_992);
    // 7.8 t/m3 gives the text's "2,850 k" for the XXVIII leg [derived]: 2,857.7 kg/m.
    expect((UPRIGHT_SECTIONS[0]!.omega * 1e-6 * 7800).toFixed(1)).toBe("2857.7");
  });

  it("prints each web as wide as the 0.877 plan square's side square to the axis", () => {
    // A web's printed width is the lozenge's side: 877 sin(angle between
    // the axis and the face's horizontal). Within 2 mm from XXVIII to XIX,
    // every member; XVIII prints XIX's widths (panel 10's, not its own
    // panel 11's: flagged in SOURCES.md).
    for (const s of UPRIGHT_SECTIONS) {
      const k = panelOf(s.section);
      const kk = s.section === "XVIII" ? k - 1 : k;
      for (const [name, m] of [["a", s.a], ["b", s.bd], ["d", s.bd], ["c", s.c]] as const) {
        const { T } = axis(name, kk);
        const got = [width(T, [1, 0, 0]), width(T, [1, 0, 0]), width(T, [0, 0, 1]), width(T, [0, 0, 1])].sort();
        const printed = m.webs.flatMap(([n, w]) => Array<number>(n).fill(w)).sort();
        got.forEach((w, i) => expect(Math.abs(w - printed[i]!), `${s.section} ${name}`).toBeLessThan(2.05));
      }
    }
    // XVIII against its own panel misses by up to 7 mm (c: 861 for 854).
    const { T } = axis("c", panelOf("XVIII"));
    expect(Math.abs(width(T, [1, 0, 0]) - 854)).toBeGreaterThan(5);
  });

  it("reads one joint clearance off the section: the box, the channel it lands on, and the 0.50 above", () => {
    const up = jointUpright(MEMBERS.uprightAbove);
    const face = jointFace(MEMBERS.uprightAbove);
    // Panels 1-4: every face 0.800 square to the axis, so 0.400 in any leg
    // face's plane; the channel's legs stand 0.100 out of the web along its
    // normal, which is 11.64 deg off that plane (the lozenge's skew), so
    // 0.1021 in it.
    expect(tableAt(up, 20)).toBeCloseTo(0.4 + 0.1 / Math.cos((11.64 * Math.PI) / 180), 4);
    expect(tableAt(face, 20)).toBeCloseTo(0.4, 3);
    // Panel 5: 0.411 (822), and the channel, skewed 7.82 deg.
    expect(tableAt(up, 54)).toBeCloseTo(0.8228 / 2 + 0.1 / Math.cos((7.82 * Math.PI) / 180), 4);
    // Panels 6-11: the widest in-plane half-width plus the thickest C.J.
    for (let k = 6; k <= 11; k++) {
      const y = (NODES[k]!.y + NODES[k + 1]!.y) / 2;
      expect(tableAt(up, y)).toBeGreaterThan(tableAt(face, y));
      expect(tableAt(up, y) - tableAt(face, y)).toBeLessThan(0.02 + 0.015);
    }
    // At XVII the lower box's, then the 0.50 box's step.
    expect(tableAt(up, NODES[12]!.y + 0.02)).toBe(0.25);
    expect(tableAt(face, NODES[12]!.y + 0.02)).toBe(0.25);
    // At a node, a member meets both panels: the larger clearance, the nearer face.
    const xxiv = NODES[5]!.y;
    expect(tableAt(up, xxiv)).toBeCloseTo(Math.max(tableAt(up, xxiv - 0.02), tableAt(up, xxiv + 0.02)), 9);
    expect(tableAt(face, xxiv)).toBeCloseTo(Math.min(tableAt(face, xxiv - 0.02), tableAt(face, xxiv + 0.02)), 9);
  });

  it("builds each lower upright as four web plates in the tower's face planes, thickening inward", async () => {
    const outputs = await probe(["legUprightPlatesLit"], {});
    const plates = tagged(firstGeometry(outputs["probe:legUprightPlatesLit"] as never)!);
    // The plain depth: webs alone, 4 per panel on 12 panels of 4 uprights, one leg of four.
    expect(plates).toHaveLength(4 * 12 * 4);
    const kinked = new Set<number>();
    for (let k = 1; k < 12; k++) {
      for (const [name] of MEMBERS4) if (dot(axis(name, k - 1).T, axis(name, k).T) < 1 - 1e-9) kinked.add(k);
    }
    for (const { sl, name, k, d } of plates) {
      const { A, Q, T } = axis(name, k);
      const f = faceFrame(name, k, d);
      const where = `${name} k${k} d${d}`;
      // Thin along the face's normal, long along the axis.
      const thin = sl.half.indexOf(Math.min(...sl.half));
      const n = sl.axes[thin]!;
      expect(Math.abs(dot(n, f.n)), where).toBeGreaterThan(1 - 1e-6);
      // The outer face in the face plane: 0.4385 out in plan from the axis at
      // its own height, along d, at every corner.
      const out = add(sl.c, sc(f.n, sl.half[thin]! * Math.sign(dot(n, f.n)) * Math.sign(dot(n, f.n))));
      for (const a of [-1, 1])
        for (const b of [-1, 1]) {
          const others = [0, 1, 2].filter((i) => i !== thin);
          const p = add(out, add(sc(sl.axes[others[0]!]!, a * sl.half[others[0]!]!), sc(sl.axes[others[1]!]!, b * sl.half[others[1]!]!)));
          // (The panel's own axis, run on past a node with the plate.)
          const X = add(A, sc(T, (p[1] - A[1]) / T[1]));
          const plan = d[0] !== 0 ? (p[0] - X[0]) * d[0] : (p[2] - X[2]) * d[1];
          expect(Math.abs(plan - H), `${where} outer face off its plane at y ${p[1].toFixed(3)} c ${sl.c.map((v) => v.toFixed(3))}`).toBeLessThan(2e-4);
        }
      // As thick as the section says on this face, and as wide as the face.
      const s = UPRIGHT_SECTIONS.find((x) => x.section === (k === 0 ? "XXVIII" : NODES[k]!.name))!;
      const mk = name === "a" ? s.a : name === "c" ? s.c : s.bd;
      const interior = UPRIGHT_BOX.interior[name].some(([x, z]) => x === d[0] && z === d[1]);
      expect(2 * sl.half[thin]!, where).toBeCloseTo((interior ? mk.int.web : mk.ext.web) / 1000, 5);
      const across = [0, 1, 2].find((i) => i !== thin && Math.abs(dot(sl.axes[i]!, T)) < 0.5)!;
      const h: Vec3 = [Math.abs(d[1]), 0, Math.abs(d[0])];
      expect(2 * sl.half[across]!, where).toBeCloseTo(width(T, h) / 1000, 5);
      // Node to node where the column runs straight on (at a turn, see below).
      const along = [0, 1, 2].find((i) => Math.abs(dot(sl.axes[i]!, T)) > 0.999)!;
      const ends = [-1, 1].map((g) => dot(sub(add(sl.c, sc(sl.axes[along]!, g * sl.half[along]!)), A), T)).sort((x, y) => x - y);
      // (f32: a box's length is a scale, 1e-4 covers it at 115 m.)
      if (!kinked.has(k)) expect(Math.abs(ends[0]!), where).toBeLessThan(1e-4);
      if (!kinked.has(k + 1)) expect(Math.abs(ends[1]! - len(sub(Q, A))), where).toBeLessThan(1e-4);
    }
    // WHERE THE COLUMN TURNS the two panels' faces meet on the node's
    // horizontal line (both have the node's plan square), which no box with
    // square ends can follow. Sampled over the true faces 0.35 either side
    // of every turn, every 5 mm up and 10 mm across, 5 mm in from the
    // corners (at the corners a notch stays, builtup.ts): no point is left
    // uncovered by the plates of its face, and the plate surface a point
    // shows stands at most 22 mm proud of it or 15 mm short of it.
    let samples = 0;
    let holes = 0;
    let proud = -Infinity;
    let short = Infinity;
    for (const [name, xs, zs] of MEMBERS4) {
      for (const j of kinked) {
        for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const own = plates.filter((p) => p.name === name && (p.k === j - 1 || p.k === j) && p.d[0] === d[0] && p.d[1] === d[1]);
          expect(own).toHaveLength(2);
          for (let dy = -0.35; dy <= 0.35 + 1e-9; dy += 0.005) {
            if (Math.abs(dy) < 1e-9) continue;
            const y = NODES[j]!.y + dy;
            const pr = profileAt(y);
            for (let u = -H + 0.005; u <= H - 0.005 + 1e-9; u += 0.01) {
              const X: Vec3 = [pr[xs] + H * d[0] + u * Math.abs(d[1]), y, pr[zs] + H * d[1] + u * Math.abs(d[0])];
              samples++;
              let top = -Infinity;
              for (const { sl } of own) {
                const thin = sl.half.indexOf(Math.min(...sl.half));
                const v = sub(X, sl.c);
                if ([0, 1, 2].some((i) => i !== thin && Math.abs(dot(v, sl.axes[i]!)) > sl.half[i]!)) continue;
                const out = Math.sign(dot(sl.axes[thin]!, [d[0], 0, d[1]]));
                top = Math.max(top, sl.half[thin]! - out * dot(v, sl.axes[thin]!));
              }
              if (top === -Infinity) holes++;
              else {
                proud = Math.max(proud, top);
                short = Math.min(short, top);
              }
            }
          }
        }
      }
    }
    expect(samples).toBeGreaterThan(1_000_000);
    expect(holes).toBe(0);
    expect(proud).toBeLessThan(0.022);
    expect(short).toBeGreaterThan(-0.015);
  }, 300_000);

  it("draws the webs alone at the plain depth, and what stands out of them from the laced depth up", async () => {
    // What the laced depth adds, as the census models it from the section
    // table (tests/support/eiffelBuiltupCensus.ts): the C.J. on every face,
    // and in panels 1-5 the fin on each exterior face, the channel on each
    // interior one.
    const drawn: ReadonlyArray<Piece["what"]> = ["cj", "finFlat", "fin", "channelFlat", "channelLeg"];
    const outputs = await probe(["legUprightPlatesLit"], { lacedWeb: true });
    const plates = tagged(firstGeometry(outputs["probe:legUprightPlatesLit"] as never)!);
    const expected = new Map<string, number>();
    for (const [name] of MEMBERS4)
      for (let k = 0; k < 12; k++)
        for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          for (const q of facePieces(name, k, d).filter((q) => drawn.includes(q.what))) {
            const key = `${name} ${k} ${d} ${q.what}`;
            expected.set(key, (expected.get(key) ?? 0) + 1);
          }
          const key = `${name} ${k} ${d} web`;
          expected.set(key, (expected.get(key) ?? 0) + 1);
        }
    const got = new Map<string, number>();
    for (const { sl, name, k, d } of plates) {
      // The slab's section in its face's (s, o), measured off the panel's own axis line.
      const f = faceFrame(name, k, d);
      const { A, T } = axis(name, k);
      // The covers over the tronçons' joints, under 1.5 m long where every
      // other piece runs its panel: tests/eiffelSplice.test.ts holds them.
      const run = [0, 1, 2].find((i) => Math.abs(dot(sl.axes[i]!, T)) > 0.99)!;
      if (2 * sl.half[run]! < 1.5) continue;
      const so = [-1, 1].flatMap((a) =>
        [-1, 1].flatMap((b) =>
          [-1, 1].map((c) => {
            const p = add(sl.c, add(sc(sl.axes[0], a * sl.half[0]), add(sc(sl.axes[1], b * sl.half[1]), sc(sl.axes[2], c * sl.half[2]))));
            const v = sub(sub(p, add(A, sc(T, dot(sub(p, A), T)))), f.mid);
            return [dot(v, f.e), dot(v, f.n)] as const;
          }),
        ),
      );
      const [s0, s1] = [Math.min(...so.map((x) => x[0])), Math.max(...so.map((x) => x[0]))];
      const [o0, o1] = [Math.min(...so.map((x) => x[1])), Math.max(...so.map((x) => x[1]))];
      const at = (a: number, b: number) => Math.abs(a - b) < 5e-4;
      let what: string | undefined;
      if (o1 <= 1e-4 && at(s1 - s0, width(T, [Math.abs(d[1]), 0, Math.abs(d[0])]) / 1000)) what = "web";
      for (const q of facePieces(name, k, d)) if (at(s0, q.s0) && at(s1, q.s1) && at(o0, q.o0) && at(o1, q.o1)) what = q.what;
      expect(what, `${name} k${k} d${d}: a slab s ${s0.toFixed(4)}..${s1.toFixed(4)} o ${o0.toFixed(4)}..${o1.toFixed(4)}`).toBeDefined();
      const key = `${name} ${k} ${d} ${what}`;
      got.set(key, (got.get(key) ?? 0) + 1);
    }
    expect(new Map([...got].sort())).toEqual(new Map([...expected].sort()));
  }, 300_000);

  it("seats every lower seam head on the plate that is the face there, clear of the next panel's", async () => {
    const outputs = await probe(["legUprightPlatesLit"], { rivets: true });
    const webs = tagged(firstGeometry(outputs["probe:legUprightPlatesLit"] as never)!).filter(({ sl }) => {
      const sorted = [...sl.half].sort((x, y) => x - y);
      return sorted[1]! > 0.3; // a web, not a C.J., fin or channel piece
    });
    const heads = rivetBases((outputs["rivets.leg.uprights"] as unknown[])[0]).filter((p) => p[0] > 0 && p[2] > 0);
    // (30,000 before the tronçons' covers took their stretches of the rows:
    // tests/eiffelSplice.test.ts.)
    expect(heads.length).toBeGreaterThan(20_000);
    // Each head's base on a web's outer face, inside it by a head's radius,
    // and no web standing over it: within the rivet's own jitter (1.7 mm).
    const SLACK = 0.002;
    let seated = 0;
    for (const h of heads) {
      let on = false;
      let over = false;
      for (const { sl } of webs) {
        const v = sub(h, sl.c);
        if (Math.abs(v[1]) > 6) continue;
        const thin = sl.half.indexOf(Math.min(...sl.half));
        const inside = [0, 1, 2].every((i) => i === thin || Math.abs(dot(v, sl.axes[i]!)) <= sl.half[i]!);
        if (!inside) continue;
        const up = Math.abs(dot(v, sl.axes[thin]!)) - sl.half[thin]!;
        if (Math.abs(up) < SLACK) {
          const edge = Math.min(...[0, 1, 2].filter((i) => i !== thin).map((i) => sl.half[i]! - Math.abs(dot(v, sl.axes[i]!))));
          if (edge > 0.019 - SLACK) on = true;
        } else if (up < -SLACK && Math.abs(dot(v, sl.axes[thin]!)) < sl.half[thin]! + 0.03) over = true;
      }
      expect(on, `head at ${h.map((x) => x.toFixed(3))} on no web`).toBe(true);
      expect(over, `head at ${h.map((x) => x.toFixed(3))} under a web`).toBe(false);
      seated++;
    }
    expect(seated).toBe(heads.length);
  }, 300_000);

  it("is a lozenge square to the axis: 101 38' where panels 1-4 lean, PL-IX fig. 28", () => {
    for (const [name] of MEMBERS4) {
      for (let k = 0; k <= 4; k++) {
        const { T } = axis(name, k);
        const nx = faceFrame(name, k, [1, 0]).n;
        const nz = faceFrame(name, k, [0, 1]).n;
        // Interior angle at the +x/+z corner = 180 - the normals' angle.
        const corner = 180 - (Math.acos(dot(nx, nz)) * 180) / Math.PI;
        expect(Math.min(corner, 180 - corner)).toBeCloseTo(78 + 22 / 60, 1);
        void T;
      }
    }
  });

  it("takes the census of what touches the lower uprights, against the box as built", async () => {
    // Taken first of the tower as it stood before the box (HEAD d65ee7e,
    // its swept 0.41 / 0.435 skin), against the same analytic box: the
    // numbers in the comments below. The first floor's rows and girders
    // (`ff.*`, firstFloor.ts) run axis to axis through the box, where a
    // closed box hides them, and are not the legs' to settle; they are
    // left out of what is asserted here.
    const g = buildEiffel(1889, { rivets: true });
    g.output({ id: "gussetsOut" } as NodeHandle, "out", "probe:gussetsOut");
    const { outputs } = await cook(g);
    const c = census(outputs as Record<string, unknown>);
    if (process.env.CENSUS_OUT !== undefined) writeFileSync(process.env.CENSUS_OUT, JSON.stringify(c, null, 1));
    const legs = (r: Record<string, number>) => Object.fromEntries(Object.entries(r).filter(([k]) => k.startsWith("leg.")));
    // No leg rivet head inside the box. Before: 116, lacing heads 13-16 mm
    // deep (leg.horizontals 56, leg.bracing 60), where the true box is
    // larger than the rolled square skin was.
    expect(legs(c.buriedHeads)).toEqual({});
    // Nor in anything standing out of it.
    expect(legs(Object.fromEntries(Object.entries(c.headsInPieces).map(([k, v]) => [k.split("|")[0]!, v])))).toEqual({});
    // No web member's steel inside the box: its struts end where the joint
    // rule's clearance says. Before: 384 bracing and 504 horizontal
    // vertices, up to 25 mm deep.
    expect(c.swallowed["bracing"] ?? 0).toBe(0);
    expect(c.swallowed["horizontals"] ?? 0).toBe(0);
    expect(c.vertsInPieces["bracing|channelLeg"] ?? 0).toBe(0);
    for (const [k, v] of Object.entries(c.vertsInPieces)) {
      expect(k.startsWith("bracing") || k.startsWith("horizontals"), `${k}: ${v}`).toBe(false);
    }
    // ...and at least 30 mm clear of the webs in every panel (before: 1-2
    // mm INSIDE in panels 1-4, the skin's rolled faces).
    for (const [k, gap] of Object.entries(c.gap)) {
      if (k.startsWith("bracing|") || k.startsWith("horizontals|")) expect(gap, k).toBeGreaterThan(0.03);
    }
    // THE RESIDUAL, D3 of the design study: the joint plates are today's,
    // beside the strut, not seated on the channel's legs as PL-IX seats the
    // real gussets. A plate stands 8 mm off the web it laps, so on the face
    // it laps (not the one its member lands on) a C.J. or a flat leg meets
    // it 4 mm deep and a channel's or fin's outstanding leg stands through
    // it. Counted in the +x+z leg, panels 1-5 only, until the joint is
    // re-derived: 120 plates pierced by a channel's leg (84 mm past the
    // plate at most), 120 by a fin's flat legs (8 mm), 2 by a fin (32 mm).
    // The same on the tower from before the box. No C.J. since the plates
    // stop short of the box's corners (strut.ts `JointOpts.corners`): the
    // two it met were at the bend, over the arris.
    expect(c.platesPierced).toEqual({ channelLeg: 120, finFlat: 120, channelFlat: 2, fin: 2 });
    expect(c.pierceDeepest["channelLeg"]!).toBeLessThan(0.085);
    expect(c.pierceDeepest["fin"]!).toBeLessThan(0.033);
    expect(c.pierceDeepest["finFlat"]!).toBeLessThan(0.008);
  }, 600_000);

  // -------------------------------------------------------------------------
  // THE UPPER UPRIGHTS, XVII to the top of panel 28 (UPPER_SECTIONS).
  // -------------------------------------------------------------------------

  it("rebuilds every area PL-XXXI prints for the upper arbalétriers from its parts", () => {
    // Angles t (2 L - t): 100 x 100 x 12 = 2,256; 90 x 90 x 9 = 1,539; 100 x 100 x 10 = 1,900.
    const angles = (m: UpperMakeup) => m.angles.reduce((s, [n, L, t]) => s + n * t * (2 * L - t), 0);
    const upperArea = (m: UpperMakeup): number =>
      angles(m) +
      (m.shape === "T" ? (m.flange ?? 0) * m.heavy + 500 * m.light : 2 * 500 * m.heavy + (m.shape === "box" ? 2 * 500 * m.light : 0));
    expect(UPPER_SECTIONS.map((s) => s.section)).toEqual(
      ["XVII", "XVI", "XV", "XIV", "XIII", "XII", "XI", "X", "IX", "VIII", "VII", "VI", "V", "IV", "III", "II", "I"],
    );
    for (const s of UPPER_SECTIONS) {
      for (const m of [s.c, s.bd]) {
        expect(upperArea(m), s.section).toBe(m.area);
        // The plies the drawing labels add up to the printed plate.
        expect(m.plies.reduce((a, b) => a + b, 0), s.section).toBe(m.heavy);
      }
      // Omega is the whole tower's: 4 c + 8 (b | d) up to XII, 4 (c + bd) from XI.
      const merged = NODES.findIndex((n) => n.name === s.section) >= NODES.findIndex((n) => n.name === "XI");
      expect(4 * s.c.area + (merged ? 4 : 8) * s.bd.area, s.section).toBe(s.omega);
      // c a box to XI and an L above; b or d a box to XII, the T from XI.
      expect(s.c.shape, s.section).toBe(merged && s.section !== "XI" ? "L" : "box");
      expect(s.bd.shape, s.section).toBe(merged ? "T" : "box");
    }
    // XI's T: the two legs' 500 boxes' faces side by side, 1,000 on the face.
    expect(UPPER_SECTIONS.find((s) => s.section === "XI")!.bd.flange).toBe(2 * 500);
    // The text quotes 591,084 for XVII; the plate's own arithmetic is 591,684.
    expect(UPPER_SECTIONS[0]!.omega).toBe(591_684);
  });

  it("builds the upper uprights in the tower's faces: 500 boxes, the XI T, the L and the T above", async () => {
    const H = UPPER_BOX.planHalf;
    const iXI = NODES.findIndex((n) => n.name === "XI");
    const segmentOf = (y: number) => {
      let k = NODES.findIndex((n) => n.name === "XVII");
      while (k < NODES.length - 2 && NODES[k + 1]!.y <= y) k++;
      return k;
    };
    // A member's axis in plan at height y, canonical (+x+z; bd on the +z face).
    const axisAt = (m: "c" | "b" | "d" | "bd", y: number): readonly [number, number] => {
      const pr = profileAt(y);
      return m === "c" ? [pr.outer, pr.outer] : m === "b" ? [pr.inner, pr.outer] : m === "d" ? [pr.outer, pr.inner] : [0, pr.outer];
    };
    const unturn = (x: number, z: number, q: number): readonly [number, number] => {
      let p: readonly [number, number] = [x, z];
      for (let i = 0; i < q; i++) p = [-p[1], p[0]];
      return p;
    };
    for (const depth of ["plain", "laced"] as const) {
      const outputs = await probe(["legUprightUpperPlatesLit", "shaftUprightPlatesLit"], depth === "laced" ? { lacedWeb: true } : {});
      const legs = slabs(firstGeometry(outputs["probe:legUprightUpperPlatesLit"] as never)!).filter((s) => s.c[0] > 0 && s.c[2] > 0);
      const shaft = slabs(firstGeometry(outputs["probe:shaftUprightPlatesLit"] as never)!);
      // Plain: a leg's c, b and d, four webs a panel over panels 12-17; the
      // shaft's four c (a box in 18, the L's two plates and its two closing
      // plates at each end in 19-28) and four bd (flange and stem, 18-28).
      // Laced adds the angles: the L's three (4 legs' worth), the T's six;
      // and a cover over each tronçon joint on every outer plate (the
      // splices, tests/eiffelSplice.test.ts): the legs' c, b and d 12 joints
      // each, 4 faces; the shaft's c 2 in panel 18 (4 faces) and 12 above
      // (the L's 2), its bd 14 (the T's flange).
      expect(legs).toHaveLength(3 * 6 * 4 + (depth === "laced" ? 3 * 12 * 4 : 0));
      expect(shaft).toHaveLength(
        4 * (4 + 10 * (2 + 2 * 2) + 11 * 2) + (depth === "laced" ? 4 * (10 * 6 + 11 * 12) + 4 * (2 * 4 + 12 * 2 + 14) : 0),
      );
      if (depth === "laced") continue;
      const closures = new Map<string, number>();
      for (const [who, list] of [["legs", legs], ["shaft", shaft]] as const) {
        for (const sl of list) {
          const y = sl.c[1];
          const k = segmentOf(y);
          const s = UPPER_SECTIONS.find((x) => x.section === NODES[k]!.name)!;
          // Which member, turned back to its canonical quarter.
          let found: { m: "c" | "b" | "d" | "bd"; dx: number; dz: number; q: number } | undefined;
          for (let q = 0; q < 4 && found === undefined; q++) {
            const [x, z] = unturn(sl.c[0], sl.c[2], q);
            for (const m of who === "legs" ? (["c", "b", "d"] as const) : (["c", "bd"] as const)) {
              const [ax, az] = axisAt(m, y);
              if (Math.max(Math.abs(x - ax), Math.abs(z - az)) < (m === "bd" ? 0.55 : 0.3)) found = { m, dx: x - ax, dz: z - az, q };
            }
          }
          expect(found, `${who} slab at ${sl.c.map((v) => v.toFixed(2))}`).toBeDefined();
          const { m, dx, dz, q } = found!;
          const thin = sl.half.indexOf(Math.min(...sl.half));
          const [nx, nz] = unturn(sl.axes[thin]![0], sl.axes[thin]![2], q);
          const t = 2 * sl.half[thin]!;
          const where = `${who} ${m} k${k} at ${sl.c.map((v) => v.toFixed(2))}`;
          if (m === "bd" && Math.abs(nx) > 0.99) {
            // The T's stem, square to the face, in its centre plane: two
            // plies of 10 in panel 18, 8 above; 0.50 deep less the flange.
            expect(Math.abs(dx), where).toBeLessThan(1e-3);
            expect(t * 1000, where).toBeCloseTo(k === iXI ? 20 : 8, 2);
            continue;
          }
          // Everything else lies in a face: its outer surface 0.25 out in
          // plan from the axis, at its own height, along that face's normal.
          const dir: readonly [number, number] = Math.abs(nx) > Math.abs(nz) ? [Math.sign(dx), 0] : [0, Math.sign(dz)];
          const outPlan = (dir[0] !== 0 ? Math.abs(dx) : Math.abs(dz)) + (t / 2) * (dir[0] !== 0 ? 1 / Math.abs(nx) : 1 / Math.abs(nz));
          expect(Math.abs(outPlan - H), `${where} outer surface ${outPlan}`).toBeLessThan(2e-4);
          const mk = m === "c" ? s.c : s.bd;
          const heavy =
            m === "bd" ||
            (m === "c" ? dir[0] > 0 || dir[1] > 0 : m === "b" ? dir[1] > 0 || dir[0] < 0 : dir[0] > 0 || dir[1] < 0);
          if (mk.shape === "L" && !heavy) {
            // The L's closing plates: 8 mm, UPPER_BOX.closure long, one at each end.
            expect(t * 1000, where).toBeCloseTo(8, 2);
            expect(2 * Math.max(...sl.half), where).toBeCloseTo(UPPER_BOX.closure, 3);
            const key = `${q} ${k}`;
            closures.set(key, (closures.get(key) ?? 0) + 1);
            continue;
          }
          // (f32 at 120-265 m: 0.01 mm.)
          expect(t * 1000, where).toBeCloseTo(heavy ? mk.heavy : mk.light, 2);
          if (m === "bd") {
            // The flange: 1,000 across the face in panel 18, 500 above.
            const across = [0, 1, 2].filter((i) => i !== thin).map((i) => 2 * sl.half[i]!).sort((a, b) => a - b)[0]!;
            expect(across, where).toBeCloseTo(k === iXI ? 1.0 : 0.5, 3);
          }
        }
      }
      // Two closing plates a node end on each of the L's two inner faces: 4 a panel.
      expect(closures.size).toBe(4 * 10);
      for (const [key, n] of closures) expect(n, key).toBe(4);
    }
  }, 300_000);

  it("takes the upper census: the seams on the steel as built, the joints clear of it, the plan girders on the T's stem", async () => {
    // Taken first of the tower from before the upper box (HEAD 6cc56d7:
    // the swept 0.25 skin, riveted on its square), against the same
    // analytic section (tests/support/eiffelBuiltupCensus.ts, upperCensus):
    // the numbers in the comments below.
    const g = buildEiffel(1889, { rivets: true });
    g.output({ id: "planBracingChordPaths" } as NodeHandle, "out", "probe:planBracingChordPaths");
    const { outputs } = await cook(g);
    const c = upperCensus(outputs as Record<string, unknown>, UPPER_BOX.closure);
    if (process.env.CENSUS_OUT !== undefined) writeFileSync(process.env.CENSUS_OUT, JSON.stringify(c, null, 1));
    // Every seam head on its own member's steel, none in another's. Before:
    // 13,539 of the legs' 49,376 and 15,180 of the shaft's 44,039 more than
    // 2 mm off it (the skin's normal square is not the plan square, and the
    // open L has no plates where 4 of the box's 8 rows ran), none buried.
    for (const [k, s] of Object.entries(c.seams)) {
      expect(s.total, k).toBeGreaterThan(30_000);
      expect(s.floating, k).toBe(0);
      expect(s.buried, k).toBe(0);
    }
    // No other head in the upper steel (the first floor's chords, `ff.*`,
    // run into the 2nd floor's boxes at XVII and are firstFloor.ts's).
    expect(Object.fromEntries(Object.entries(c.buriedHeads).filter(([k]) => !k.startsWith("ff.")))).toEqual({});
    // What the steel swallows, the same as before the upper box: a joint
    // plate's acute corner at XI, 2-5 mm into the edge of the 1,000 flange
    // (6 in a quarter; its near edge meets the flange's edge at its obtuse
    // corner, strut.ts); a gap-lattice plate's corner in b's and d's corner
    // (1 a quarter); and the 2nd floor's belt chords at XVII, which run to
    // the axes inside the deck [measured]. These count mesh POINTS: the
    // girders' 26 and 25 became 24 and 24 when the sweep's caps became
    // corner fans (2026-09-27), the three cap centres that were inside
    // gone with every other cap centre, the rest of the points unchanged.
    expect(c.swallowed).toEqual({ "gussets|bd": 24, "gussets|legB": 4, "gussets|legD": 6, "girders|legB": 24, "girders|legD": 24 });
    // Every web member clear of the steel it meets. Before, over panel 18,
    // 0.5 mm INSIDE the T's 1,000 flange (bracing) and 2.1 mm off it
    // (horizontals): the merge clearance stopped at XI. Now 17 mm at worst
    // (the legs' horizontals at XII, as before).
    for (const [k, gap] of Object.entries(c.gap)) expect(gap, k).toBeGreaterThan(0.015);
    // The plan girders end on what they meet. At c the L is closed over its
    // attachments, so they end 0.03 off its inner corner (their chords'
    // lines 0.08). At bd from X up they run in to the T's stem, their lines
    // 0.09-0.10 off it; before, 0.18, stopped at the corner of a box the T
    // does not have. At XI, where the bottom chord still lies beside the two
    // legs' boxes, the corner stop stays: 0.18 from the T's stem above XI.
    for (const [k, d] of Object.entries(c.planEnds)) {
      if (k.startsWith("c ") || (k.startsWith("bd ") && k !== "bd XI")) expect(d, k).toBeLessThan(0.1);
    }
    expect(c.planEnds["bd XI"]!).toBeLessThan(0.19);
  }, 600_000);
});
