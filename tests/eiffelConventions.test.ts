/**
 * The Eiffel demo's compass and datum, held to the plates.
 *
 * Anything placed on a face or in a leg — the pavilions, the lifts, the
 * stairs, the caissons — reads `PILES` and `FACES` in
 * demos/eiffel/spec.ts. The book numbers the piles two ways (its text once
 * prints "2 ou Ouest"); the plates give 1 Nord, 2 Est, 3 Sud, 4 Ouest,
 * clockwise from above. These tests check the table against that, against
 * how the quadrant targets actually turn a part, and against the parts
 * that already depend on it.
 */
import { describe, expect, it } from "vitest";
import { LIFT_CARS } from "../demos/eiffel/lifts.js";
import { FACES, FLOORS, GROUND_ALTITUDE, PILES, pile, yOfCote } from "../demos/eiffel/spec.js";

/** Quadrant target k, as `quadrants` turns it: k * 90 degrees about +y. */
function turn(k: number, [x, z]: readonly [number, number]): [number, number] {
  const a = (k * Math.PI) / 2;
  const c = Math.round(Math.cos(a));
  const s = Math.round(Math.sin(a));
  // Rotation about +y: x' = x cos + z sin, z' = -x sin + z cos.
  return [x * c + z * s, -x * s + z * c];
}

describe("eiffel piles", () => {
  it("numbers the piles as the plates do: 1 Nord, 2 Est, 3 Sud, 4 Ouest", () => {
    expect(pile(1).name).toBe("Nord");
    expect(pile(2).name).toBe("Est");
    expect(pile(3).name).toBe("Sud");
    expect(pile(4).name).toBe("Ouest");
  });

  it("puts each pile where its quadrant target carries the +x+z leg", () => {
    for (const p of PILES) expect(turn(p.quadrant, [1, 1])).toEqual([...p.corner]);
  });

  it("lays PL-XVIII Fig. 3 out as the top view (x right, z down)", () => {
    // The figure: pile 2 top left, 3 top right, 1 bottom left, 4 bottom right.
    const at = (n: 1 | 2 | 3 | 4) => pile(n).corner;
    expect(at(2)).toEqual([-1, -1]);
    expect(at(3)).toEqual([1, -1]);
    expect(at(1)).toEqual([-1, 1]);
    expect(at(4)).toEqual([1, 1]);
  });

  it("runs 1 -> 2 -> 3 -> 4 clockwise seen from above", () => {
    // Seen from +y, x right and z down, clockwise is a NEGATIVE turn in
    // (x, -z), i.e. a positive cross product in (x, z) screen coordinates
    // with z down. Check each step turns the same way, a quarter turn.
    const order = [1, 2, 3, 4, 1] as const;
    for (let i = 0; i < 4; i++) {
      const [ax, az] = pile(order[i] as 1).corner;
      const [bx, bz] = pile(order[i + 1] as 1).corner;
      // Screen coords: u = x, v = z (down). Clockwise on screen = cross > 0.
      expect(ax * bz - az * bx).toBeGreaterThan(0);
    }
  });

  it("gives Otis to piles 1 and 3, Roux and the ground stairs to 2 and 4", () => {
    for (const p of PILES) {
      expect(p.lift).toBe(p.n % 2 === 1 ? "otis" : "roux");
      expect(p.groundStair).toBe(p.n % 2 === 0);
    }
    // The graph splits the quadrant targets by parity (lifts.ts, legs.ts):
    // even = Roux, odd = Otis. That holds only while PILES says so.
    for (const p of PILES) expect(p.lift).toBe(p.quadrant % 2 === 0 ? "roux" : "otis");
  });

  it("puts the caissons under the two Seine-side legs, North and West, which share the NW face", () => {
    const withCaissons = PILES.filter((p) => p.caissons).map((p) => p.n);
    expect(withCaissons.sort()).toEqual([1, 4]);
    const nw = FACES.find((f) => f.compass === "NW");
    expect([...(nw?.piles ?? [])].sort()).toEqual([1, 4]);
  });

  it("names every leg car by its pile's system and name", () => {
    expect(LIFT_CARS.slice(0, 4).map((c) => c.name)).toEqual(["roux.ouest", "otis.sud", "roux.est", "otis.nord"]);
  });
});

describe("eiffel faces", () => {
  it("puts each face where its quadrant target carries the +z face, between its two piles", () => {
    for (const f of FACES) {
      expect(turn(f.quadrant, [0, 1])).toEqual([...f.normal]);
      const [p, q] = f.piles.map((n) => pile(n).corner) as [readonly [number, number], readonly [number, number]];
      // Both piles lie on the face's side, and the face normal is their mean.
      expect([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]).toEqual([...f.normal]);
    }
  });

  it("faces each face the intercardinal between its piles' compass points", () => {
    const compass = { Nord: "N", Est: "E", Sud: "S", Ouest: "W" } as const;
    for (const f of FACES) {
      const names = f.piles.map((n) => compass[pile(n).name]);
      const ns = names.find((c) => c === "N" || c === "S");
      const ew = names.find((c) => c === "E" || c === "W");
      expect(`${ns}${ew}`).toBe(f.compass);
    }
  });

  it("places the 1889 pavilions as the text does: Russe NE, Français SE, Anglo-Américain SW, Flamand NW", () => {
    const by = Object.fromEntries(FACES.map((f) => [f.compass, f.pavilion]));
    expect(by).toEqual({
      NE: "Restaurant russe",
      SE: "Restaurant français",
      SW: "Bar anglo-américain",
      NW: "Restaurant flamand",
    });
  });
});

describe("eiffel datum", () => {
  it("reads every floor as its printed cote less 33.50", () => {
    expect(GROUND_ALTITUDE).toBe(33.5);
    // PL-I's printed cotes, and the heights it prints beside them.
    const cotes: ReadonlyArray<readonly [keyof typeof FLOORS, number]> = [
      ["first", 91.13],
      ["second", 149.23],
      ["landing", 229.43],
      ["third", 309.63],
      ["lanternTerrace", 326.715],
      ["topTerrace", 334.015],
    ];
    for (const [k, cote] of cotes) expect(yOfCote(cote)).toBeCloseTo(FLOORS[k], 9);
  });
});
