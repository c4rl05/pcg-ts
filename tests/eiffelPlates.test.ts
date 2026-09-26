/**
 * The plate overlay's registration (`demos/eiffel/plates.ts`; backlog 31):
 * Eiffel's figures laid over the model by an affine map fitted to control
 * points picked on e-rara's scans.
 *
 * - THE MATH: a synthetic figure drawn by a known affine is recovered to
 *   the micrometre, pixel → view → pixel round-trips, and one control moved
 *   by a known amount shows up as a residual of that size — the control
 *   that proves a residual check can fail.
 * - THE VIEWS: each basis is a camera's (right × up = −dir), and the faces
 *   put the piles where the plates draw them.
 * - THE TABLE: well-formed (ids, regions inside their pages, controls
 *   inside their regions, 3+ non-collinear fitted controls an axis), every
 *   figure's fitted px/m within 8 % of its printed scale, every fitted
 *   residual within the figure's declared tolerance. `--reporter=verbose`
 *   prints each figure's residuals in metres.
 * - THE CAMERA frames the whole region, and a plan's or a section's
 *   camera stands on its cut.
 * - THE URLS are IIIF region requests on e-rara, `?plate=` resolves, and
 *   `&opacity=` is read, clamped and defaulted.
 * - THE GATE: the page reaches the tool only through `plateTool.ts`'s
 *   `import.meta.hot` branch, which a build drops (the owner's decision
 *   of 2026-09-26: an audit tool on the dev server, not a page feature).
 *
 * No network: nothing here fetches a scan.
 */
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  IIIF_BASE,
  PLATE_FIGURES,
  type PlateFigure,
  fitPlate,
  pixelToView,
  plateCamera,
  plateCorners,
  PLATE_OPACITY,
  plateFromQuery,
  plateOpacity,
  plateUrl,
  viewBasis,
  viewToPixel,
  viewToWorld,
  worldToView,
} from "../demos/eiffel/plates.js";
import { FACES, pile } from "../demos/eiffel/spec.js";

type V3 = readonly [number, number, number];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** The e-rara scans' resolution: 11.7 px per millimetre of paper (Plate I Fig. 1). */
const PX_PER_MM = 11.7;

/** A figure drawn by a known map: right = 0.08x + 0.002y − 150, up = 0.001x − 0.085y + 440. */
function synthetic(controls: PlateFigure["controls"]): PlateFigure {
  return {
    id: "test",
    plate: "0",
    fig: "Fig. 0",
    title: "synthetic",
    pageId: 1,
    page: [5000, 6000],
    scale: 1000,
    region: [100, 100, 4000, 5000],
    view: { kind: "elevation", face: "SE" },
    controls,
    tolerance: { metres: 0, why: "exact" },
  };
}
const R = (x: number, y: number): number => 0.08 * x + 0.002 * y - 150;
const U = (x: number, y: number): number => 0.001 * x - 0.085 * y + 440;
const PTS: Array<[number, number]> = [
  [300, 400],
  [3900, 500],
  [2000, 2500],
  [500, 4800],
  [3500, 4600],
];

describe("the registration math", () => {
  const exact = synthetic(PTS.map(([x, y]) => ({ at: [x, y], right: R(x, y), up: U(x, y), what: `(${x}, ${y})` })));

  it("recovers a known affine exactly", () => {
    const fit = fitPlate(exact);
    expect(fit.r[0]).toBeCloseTo(0.08, 12);
    expect(fit.r[1]).toBeCloseTo(0.002, 12);
    expect(fit.r[2]).toBeCloseTo(-150, 8);
    expect(fit.u[0]).toBeCloseTo(0.001, 12);
    expect(fit.u[1]).toBeCloseTo(-0.085, 12);
    expect(fit.u[2]).toBeCloseTo(440, 8);
    expect(fit.max).toBeLessThan(1e-6);
  });

  it("round-trips pixel → view → pixel", () => {
    const fit = fitPlate(exact);
    for (const [x, y] of [
      [0, 0],
      [1234.5, 4321],
      [4999, 17],
    ] as const) {
      const [r, u] = pixelToView(fit, x, y);
      const [x2, y2] = viewToPixel(fit, r, u);
      expect(Math.hypot(x2 - x, y2 - y)).toBeLessThan(1e-6);
    }
  });

  it("CONTROL: a check point moved 2 m reads 2 m, and a fitted one moved pulls the rest", () => {
    const moved = synthetic([
      ...exact.controls,
      { at: [2000, 1000], up: U(2000, 1000) + 2, what: "moved 2 m", check: true },
    ]);
    const fit = fitPlate(moved);
    const res = fit.residuals.find((r) => r.what === "moved 2 m");
    expect(res?.metres).toBeCloseTo(-2, 9);
    expect(fit.max).toBeLessThan(1e-6);
    const bad = synthetic(exact.controls.map((c, i) => (i === 2 ? { ...c, up: (c.up as number) + 2 } : c)));
    expect(fitPlate(bad).max).toBeGreaterThan(0.5);
  });

  it("refuses an axis with too few or collinear controls, naming the figure and the axis", () => {
    const few = synthetic(exact.controls.slice(0, 2));
    expect(() => fitPlate(few)).toThrow(/plate test's "right" axis has 2 fitted controls/);
    const line = synthetic(
      [0, 1, 2, 3].map((i) => ({ at: [100 + 500 * i, 900] as const, right: i, up: 3, what: `on one row ${i}` })),
    );
    expect(() => fitPlate(line)).toThrow(/degenerate/);
  });
});

describe("the views", () => {
  const views = [
    ...FACES.map((f) => ({ kind: "elevation" as const, face: f.compass })),
    { kind: "plan" as const, up: [0, -1] as const, cutY: 59 },
  ];

  it("each basis is a camera's: right × up = −dir, all unit", () => {
    for (const v of views) {
      const b = viewBasis(v);
      const c = cross(b.right, b.up);
      for (let i = 0; i < 3; i++) expect(c[i]).toBeCloseTo(-b.dir[i]!, 12);
      for (const a of [b.right, b.up, b.dir]) expect(Math.hypot(...a)).toBeCloseTo(1, 12);
    }
  });

  it("an elevation looks at its face from outside, and view ↔ world round-trips", () => {
    for (const f of FACES) {
      const v = { kind: "elevation" as const, face: f.compass };
      const b = viewBasis(v);
      expect(b.dir[0]).toBeCloseTo(-f.normal[0], 12);
      expect(b.dir[2]).toBeCloseTo(-f.normal[1], 12);
      const w = viewToWorld(v, 12.5, 57.63, 40);
      const back = worldToView(v, w);
      expect(back[0]).toBeCloseTo(12.5, 12);
      expect(back[1]).toBeCloseTo(57.63, 12);
      expect(back[2]).toBeCloseTo(40, 12);
    }
  });

  it("PL-XIX Fig. 1, from the École militaire (SE), draws pile 3 Sud on the left and pile 2 Est on the right", () => {
    const v = { kind: "elevation" as const, face: "SE" as const };
    const at = (n: 1 | 2 | 3 | 4): number => {
      const [cx, cz] = pile(n).corner;
      return worldToView(v, [cx * 50, 0, cz * 50])[0];
    };
    expect(at(3)).toBeLessThan(0);
    expect(at(2)).toBeGreaterThan(0);
  });

  it("PL-XVIII Fig. 3's plan (image up = −z) puts 2 Est top-left, 3 Sud top-right, 1 Nord bottom-left, 4 Ouest bottom-right", () => {
    const v = { kind: "plan" as const, up: [0, -1] as const, cutY: 59 };
    const at = (n: 1 | 2 | 3 | 4): readonly [number, number] => {
      const [cx, cz] = pile(n).corner;
      const p = worldToView(v, [cx * 50, 0, cz * 50]);
      return [Math.sign(p[0]), Math.sign(p[1])];
    };
    expect(at(2)).toEqual([-1, 1]);
    expect(at(3)).toEqual([1, 1]);
    expect(at(1)).toEqual([-1, -1]);
    expect(at(4)).toEqual([1, -1]);
  });
});

describe("the table", () => {
  it("is well-formed", () => {
    expect(PLATE_FIGURES.length).toBeGreaterThanOrEqual(1);
    const ids = PLATE_FIGURES.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const f of PLATE_FIGURES) {
      expect(f.id, f.id).toMatch(/^[IVXL]+(?: (?:bis|ter|quater))?-[0-9a-z]+$/);
      expect(Number.isInteger(f.pageId) && f.pageId > 8976000, f.id).toBe(true);
      const [x, y, w, h] = f.region;
      expect(x >= 0 && y >= 0 && w > 0 && h > 0, f.id).toBe(true);
      expect(x + w <= f.page[0] && y + h <= f.page[1], `${f.id}: region inside its page`).toBe(true);
      for (const c of f.controls) {
        const inside = c.at[0] >= x && c.at[0] <= x + w && c.at[1] >= y && c.at[1] <= y + h;
        expect(inside, `${f.id}: "${c.what}" inside the region`).toBe(true);
        expect(c.right !== undefined || c.up !== undefined, `${f.id}: "${c.what}" fixes an axis`).toBe(true);
      }
      expect(f.tolerance.metres > 0 && f.tolerance.why.length > 0, f.id).toBe(true);
      if (f.view.kind === "plan") expect(Math.hypot(...f.view.up), f.id).toBeCloseTo(1, 12);
    }
  });

  for (const f of PLATE_FIGURES) {
    it(`${f.id} (Pl. ${f.plate} ${f.fig}) registers within ${f.tolerance.metres} m, at its printed 1:${f.scale}`, () => {
      const fit = fitPlate(f);
      const lines = fit.residuals.map(
        (r) =>
          `  ${r.axis.padEnd(5)} ${(r.metres >= 0 ? "+" : "") + r.metres.toFixed(3)} m  ${r.what}${r.check ? "  (check)" : ""}`,
      );
      console.log(
        `${f.id}: rms ${fit.rms.toFixed(3)} m, max ${fit.max.toFixed(3)} m, ` +
          `${fit.pxPerMetre[0].toFixed(2)} × ${fit.pxPerMetre[1].toFixed(2)} px/m\n${lines.join("\n")}`,
      );
      expect(fit.max).toBeLessThanOrEqual(f.tolerance.metres);
      const expected = (PX_PER_MM * 1000) / f.scale;
      for (const p of fit.pxPerMetre) expect(Math.abs(p / expected - 1), `${f.id}: ${p} px/m against ${expected}`).toBeLessThan(0.08);
      // A check point was not fitted: it is held to twice the tolerance,
      // or to the figure's own bound on its checks where it states one.
      const checks = f.tolerance.checks ?? 2 * f.tolerance.metres;
      for (const r of fit.residuals.filter((x) => x.check)) {
        expect(Math.abs(r.metres), `${f.id}: check "${r.what}"`).toBeLessThanOrEqual(checks);
      }
    });
  }
});

describe("the camera", () => {
  for (const f of PLATE_FIGURES) {
    it(`${f.id}: frames the whole region, from where its view says`, () => {
      const fit = fitPlate(f);
      for (const aspect of [0.6, 1, 16 / 9]) {
        const cam = plateCamera(f, fit, aspect);
        expect(cam.halfWidth / cam.halfHeight).toBeCloseTo(aspect, 9);
        const c = worldToView(f.view, cam.position);
        for (const [r, u] of plateCorners(f, fit)) {
          expect(Math.abs(r - c[0])).toBeLessThanOrEqual(cam.halfWidth);
          expect(Math.abs(u - c[1])).toBeLessThanOrEqual(cam.halfHeight);
        }
        expect(cam.quadDepth).toBeGreaterThan(cam.near);
        expect(cam.quadDepth).toBeLessThan(cam.far);
        const cut = f.view.kind === "plan" ? f.view.cutY : f.view.cut;
        if (cut !== undefined) {
          expect(c[2]).toBeCloseTo(cut, 9);
          expect(cam.near).toBeLessThanOrEqual(0.01);
        } else {
          // Out past everything the model builds on that side.
          expect(c[2]).toBeGreaterThan(100);
        }
      }
    });
  }
});

describe("the URLs", () => {
  it("request the figure's region from e-rara's IIIF server", () => {
    const f = PLATE_FIGURES.find((x) => x.id === "I-1") as PlateFigure;
    expect(IIIF_BASE).toBe("https://www.e-rara.ch/i3f/v20");
    expect(plateUrl(f)).toBe("https://www.e-rara.ch/i3f/v20/8976362/560,1420,2560,3900/!2400,2400/0/default.jpg");
    expect(plateUrl(f, "1200,")).toBe("https://www.e-rara.ch/i3f/v20/8976362/560,1420,2560,3900/1200,/0/default.jpg");
    for (const g of PLATE_FIGURES) {
      expect(plateUrl(g)).toMatch(/^https:\/\/www\.e-rara\.ch\/i3f\/v20\/\d+\/\d+,\d+,\d+,\d+\/!2400,2400\/0\/default\.jpg$/);
    }
  });

  it("?plate= resolves a figure, reports an unknown one, and is absent by default", () => {
    expect(plateFromQuery("").figure).toBeUndefined();
    expect(plateFromQuery("?laced&still").asked).toBeUndefined();
    expect(plateFromQuery("?plate=I-1&laced").figure?.id).toBe("I-1");
    const nope = plateFromQuery("?plate=XCIX-9");
    expect(nope.figure).toBeUndefined();
    expect(nope.asked).toBe("XCIX-9");
  });
});

describe("the opacity param", () => {
  it("reads 0..1, clamps, and defaults", () => {
    expect(plateOpacity("")).toBe(PLATE_OPACITY);
    expect(plateOpacity("?plate=I-1&opacity=0.35")).toBe(0.35);
    expect(plateOpacity("?opacity=1.7")).toBe(1);
    expect(plateOpacity("?opacity=-2")).toBe(0);
    expect(plateOpacity("?opacity=abc")).toBe(PLATE_OPACITY);
    expect(plateOpacity("?opacity=")).toBe(PLATE_OPACITY);
  });
});

describe("the gate: a dev-server tool the build drops", () => {
  const src = (f: string): string => readFileSync(new URL(`../demos/eiffel/${f}`, import.meta.url), "utf-8");
  const code = (f: string): string => src(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  it("main.ts imports neither the view nor the panel, only the door", () => {
    const main = code("main.ts");
    // Nor the table: it names e-rara's pages, which the published page must not carry.
    expect(main).not.toMatch(/plateView|PlatePanel|\.\/plates\.js/);
    // No other page module reaches the tool except through the door.
    const dir = new URL("../demos/eiffel/", import.meta.url);
    const others = readdirSync(dir).filter((f) => /\.(ts|svelte)$/.test(f) && !/^(plate|Plate)/.test(f));
    expect(others).toContain("main.ts");
    for (const f of others) expect(code(f), f).not.toMatch(/plateView|PlatePanel|\.\/plates\.js/);
    expect(main).toMatch(/from "\.\/plateTool\.js"/);
  });

  it("the door imports the view only under an `import.meta.hot` test, and only by `import()`", () => {
    const tool = code("plateTool.ts");
    // Nothing static but types.
    for (const line of tool.split("\n").filter((l) => /^import /.test(l))) expect(line).toMatch(/^import type /);
    const guard = tool.indexOf("if (import.meta.hot === undefined) return undefined;");
    const load = tool.indexOf('import("./plateView.js")');
    expect(guard).toBeGreaterThan(0);
    expect(load).toBeGreaterThan(guard);
    // Not `import.meta.env`: vite folds NODE_ENV into it, and a shell with
    // NODE_ENV=development made a production build keep the tool.
    expect(tool).not.toMatch(/import\.meta\.env/);
    // CONTROL: the check sees a static import when there is one.
    expect(code("plateView.ts")).toMatch(/^import PlatePanel from/m);
  });
});
