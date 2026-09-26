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
  UPRIGHT_BOX,
  UPRIGHT_SECTIONS,
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
    expect(heads.length).toBeGreaterThan(30_000);
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
    // The same on the tower from before the box.
    expect(c.platesPierced).toEqual({ channelLeg: 120, finFlat: 120, cj: 2, channelFlat: 2, fin: 2 });
    expect(c.pierceDeepest["channelLeg"]!).toBeLessThan(0.085);
    expect(c.pierceDeepest["fin"]!).toBeLessThan(0.033);
    expect(c.pierceDeepest["finFlat"]!).toBeLessThan(0.008);
  }, 600_000);
});
