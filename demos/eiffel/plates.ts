/**
 * THE PLATE OVERLAY (backlog item 31): pick one of Eiffel's plates, put the
 * camera on its projection, and lay the scanned drawing over the model.
 *
 * AN AUDIT TOOL, NOT A FEATURE OF THE PAGE: the overlay runs on the dev
 * server only (`plateTool.ts`), by the owner's decision of 2026-09-26. This
 * module — the table, the fit, the cameras — is the part a later overlay of
 * the model's own redrawn figures would reuse, and holds no image.
 *
 * THE IMAGES ARE NOT IN THE REPOSITORY. Each figure is fetched live, at
 * runtime, from e-rara's IIIF image server (ETH-Bibliothek Zürich's copy of
 * the 1900 album, Rar 9704, https://doi.org/10.3931/e-rara-28271), and only
 * the region of the page the figure occupies is requested, at a size a
 * texture can hold, and none is hosted here (closed by the same decision);
 * the tool credits the library. The server sends `Access-Control-Allow-Origin: *`,
 * so the image can be a WebGL texture (checked 2026-09-26).
 *
 * REGISTRATION IS DATA. A figure is its page, the pixel region of the page
 * it occupies, the VIEW it draws (an elevation from a named face, a vertical
 * section, or a plan), and a list of CONTROLS: pixels on the scan paired
 * with what they are in the model, in the view's own metres — a floor line
 * is a height, a dimension chain's tick is a distance from the tower's axis,
 * a point on the axis is both. `fitPlate` solves the affine map from page
 * pixels to view metres by least squares, one axis at a time, and every
 * control keeps its RESIDUAL in metres: what the drawing says there against
 * what the model uses. An affine and not a similarity, because the plates
 * are not isotropic (SOURCES.md §24.1: each is read on its own vertical
 * scale; Plate I's lower 58 m are drawn about 5 % short) and the scans are
 * not square to the page; a residual that stays after the fit is the
 * drawing's own, and the overlay shows it rather than hides it. A control
 * marked `check` is reported but not fitted, so a plate can be tested on
 * points it was not registered on.
 *
 * WHAT CANNOT BE REGISTERED. Plate VII draws each face "en rabattement",
 * rotated into the drawing plane: its heights run along the inclined face,
 * so no orthographic camera on the model reproduces it (the face's slope
 * changes at every kinked node). It is not in the table.
 *
 * Coordinates: the model's metres, y up, y = 0 the ground at the tower's
 * centre (y = cote − 33.50), x and z by `PILES`/`FACES` in spec.ts. A view's
 * RIGHT and UP are the directions the drawing's own right and up point to
 * in the world; `viewBasis` holds the table of them.
 *
 * Nothing here imports three or touches the DOM: the tests run it as the
 * tool does (`plateView.ts` is the tool's page half).
 */
import { FACES } from "./spec.js";

/** e-rara's IIIF Image API endpoint (version 2). */
export const IIIF_BASE = "https://www.e-rara.ch/i3f/v20";

/** What the page must say about where the drawings come from. */
export const PLATE_CREDIT = {
  work: "G. Eiffel, La Tour de trois cents mètres (Paris: Lemercier, 1900), Planches",
  holder: "ETH-Bibliothek Zürich, Rar 9704",
  via: "e-rara",
  doi: "https://doi.org/10.3931/e-rara-28271",
} as const;

/**
 * The default size a figure is fetched at: the region scaled to fit 2400 px
 * on its long side (IIIF `!w,h`). Enough to read a rivet line on a 1:200
 * figure at full screen, and a texture every GPU takes.
 */
export const PLATE_SIZE = "!2400,2400";

export type Face = "NW" | "SW" | "SE" | "NE";

/** How a figure projects the tower. */
export type PlateView =
  /**
   * An elevation seen from outside `face`. With `cut`, a vertical section:
   * the camera's near plane stands `cut` metres out from the axis along the
   * face's outward normal, and what is in front of it is cut away. The
   * ground is edge-on in an elevation and hides nothing, so what the model
   * builds below it (foundations, the machine rooms) is clipped away, as
   * the plates draw the ground; `below` keeps it, for a figure that draws
   * the foundations.
   */
  | { readonly kind: "elevation"; readonly face: Face; readonly cut?: number; readonly below?: boolean }
  /**
   * A plan, looking straight down, cut at `cutY` (a « coupe horizontale »
   * a little over its floor). `up` is the world (x, z) direction the
   * drawing's up points to.
   */
  | { readonly kind: "plan"; readonly up: readonly [number, number]; readonly cutY: number };

/** One registration point: a pixel on the page and what it is in the model. */
export interface PlateControl {
  /** Full-resolution page pixel, x right, y down. */
  readonly at: readonly [number, number];
  /** Metres along the view's right from the tower's axis, where the point fixes it. */
  readonly right?: number;
  /** Metres along the view's up (the height, for an elevation), where the point fixes it. */
  readonly up?: number;
  /** What was picked, and where its number comes from. */
  readonly what: string;
  /** Reported, not fitted: a point to test the registration on. */
  readonly check?: boolean;
}

/** One registered figure. */
export interface PlateFigure {
  /** `?plate=` id: the plate's numeral and the figure's number. */
  readonly id: string;
  /** The plate's numeral as printed (« Pl. XIX »). */
  readonly plate: string;
  /** The figure's label as printed. */
  readonly fig: string;
  /** Its caption, abridged. */
  readonly title: string;
  /** e-rara page id of the plate. */
  readonly pageId: number;
  /** The page's full-resolution size, [w, h] px (the server's info.json). */
  readonly page: readonly [number, number];
  /**
   * The scale it is printed at, as the denominator: « Échelle 0m001 p.m. »
   * is 1000. The fitted px/m is held to it (the scans run about 11.7 px per
   * millimetre of paper), which catches a control picked on the wrong line.
   */
  readonly scale: number;
  /** The figure's box on the page, [x, y, w, h] px: all that is fetched. */
  readonly region: readonly [number, number, number, number];
  readonly view: PlateView;
  readonly controls: readonly PlateControl[];
  /**
   * The largest fitted residual the figure is held to, in metres, with the
   * reason it is not smaller: the drawing's own error, not the fit's.
   */
  readonly tolerance: {
    readonly metres: number;
    /** The bound on the `check` points, where it is not twice `metres`. */
    readonly checks?: number;
    readonly why: string;
  };
}

type Vec3 = readonly [number, number, number];

/** The view's axes in the world: its right, its up, and the direction it looks. */
export interface ViewBasis {
  readonly right: Vec3;
  readonly up: Vec3;
  /** Where the camera looks: right × up = −dir, as a camera's axes are. */
  readonly dir: Vec3;
}

function faceNormal(face: Face): readonly [number, number] {
  const f = FACES.find((x) => x.compass === face);
  if (f === undefined) throw new Error(`plates: no face "${face}" in FACES (NW, SW, SE, NE)`);
  return f.normal;
}

/**
 * The view's basis. An elevation from a face with outward normal n looks
 * along −n with y up, so its right is (n.z, 0, −n.x): NW → +x, SW → −z,
 * SE → −x, NE → +z. A plan looks down −y with the drawing's up at (u.x, 0,
 * u.z), so its right is (−u.z, 0, u.x).
 */
export function viewBasis(view: PlateView): ViewBasis {
  if (view.kind === "elevation") {
    const [nx, nz] = faceNormal(view.face);
    return { right: [nz, 0, -nx], up: [0, 1, 0], dir: [-nx, 0, -nz] };
  }
  const [ux, uz] = view.up;
  const l = Math.hypot(ux, uz);
  return { right: [-uz / l, 0, ux / l], up: [ux / l, 0, uz / l], dir: [0, -1, 0] };
}

/**
 * The world point at view coordinates (right, up), `depth` metres toward
 * the viewer: out from the axis along the face's normal for an elevation,
 * the height for a plan.
 */
export function viewToWorld(view: PlateView, right: number, up: number, depth: number): Vec3 {
  const b = viewBasis(view);
  return [
    b.right[0] * right + b.up[0] * up - b.dir[0] * depth,
    b.right[1] * right + b.up[1] * up - b.dir[1] * depth,
    b.right[2] * right + b.up[2] * up - b.dir[2] * depth,
  ];
}

/** A world point in the view's metres: [right, up, depth]. */
export function worldToView(view: PlateView, p: Vec3): Vec3 {
  const b = viewBasis(view);
  const dot = (a: Vec3): number => a[0] * p[0] + a[1] * p[1] + a[2] * p[2];
  return [dot(b.right), dot(b.up), -dot(b.dir)];
}

/** One control's residual: the fitted map's value there less the model's, in metres. */
export interface PlateResidual {
  readonly what: string;
  readonly axis: "right" | "up";
  readonly metres: number;
  readonly check: boolean;
}

/** A solved registration. */
export interface PlateFit {
  /** right = r[0]·x + r[1]·y + r[2], x and y the page pixel. */
  readonly r: readonly [number, number, number];
  /** up = u[0]·x + u[1]·y + u[2]. */
  readonly u: readonly [number, number, number];
  readonly residuals: readonly PlateResidual[];
  /** Over the fitted controls only. */
  readonly rms: number;
  readonly max: number;
  /** Page pixels per metre along the drawing's x and y. */
  readonly pxPerMetre: readonly [number, number];
}

/** Solve a 3 × 3 system by Cramer's rule; throws on a degenerate one. */
function solve3(m: number[][], b: number[], what: string): [number, number, number] {
  const det = (a: number[][]): number =>
    (a[0]![0]! * (a[1]![1]! * a[2]![2]! - a[1]![2]! * a[2]![1]!) -
      a[0]![1]! * (a[1]![0]! * a[2]![2]! - a[1]![2]! * a[2]![0]!) +
      a[0]![2]! * (a[1]![0]! * a[2]![1]! - a[1]![1]! * a[2]![0]!));
  const d = det(m);
  // Normal equations over pixel coordinates in the thousands: scale the
  // test to the matrix, not to 1.
  const scale = Math.abs(m[0]![0]! * m[1]![1]! * m[2]![2]!) || 1;
  if (Math.abs(d) <= 1e-9 * scale) {
    throw new Error(
      `plates: ${what} is degenerate — its controls' pixels are collinear or too few; ` +
        `give at least 3 not on one line`,
    );
  }
  const out: [number, number, number] = [0, 0, 0];
  for (let k = 0; k < 3; k++) {
    const mk = m.map((row, i) => row.map((v, j) => (j === k ? b[i]! : v)));
    out[k] = det(mk) / d;
  }
  return out;
}

/**
 * Least squares for one axis: value ≈ c0·x + c1·y + c2 over the controls
 * that fix it. Pixels are centred on their mean first, so the normal
 * equations stay well conditioned at page coordinates in the thousands.
 */
function fitAxis(pts: ReadonlyArray<readonly [number, number, number]>, what: string): [number, number, number] {
  if (pts.length < 3) {
    throw new Error(`plates: ${what} has ${pts.length} fitted controls; it needs at least 3 not on one line`);
  }
  const mx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const my = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  const m = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const b = [0, 0, 0];
  for (const [x, y, v] of pts) {
    const row = [x - mx, y - my, 1];
    for (let i = 0; i < 3; i++) {
      b[i]! += row[i]! * v;
      for (let j = 0; j < 3; j++) m[i]![j]! += row[i]! * row[j]!;
    }
  }
  const [a, c, k] = solve3(m, b, what);
  return [a, c, k - a * mx - c * my];
}

/** Register a figure: the affine map from its page pixels to its view's metres. */
export function fitPlate(fig: PlateFigure): PlateFit {
  const pick = (axis: "right" | "up"): Array<readonly [number, number, number]> =>
    fig.controls
      .filter((c) => c[axis] !== undefined && c.check !== true)
      .map((c) => [c.at[0], c.at[1], c[axis] as number] as const);
  const r = fitAxis(pick("right"), `plate ${fig.id}'s "right" axis`);
  const u = fitAxis(pick("up"), `plate ${fig.id}'s "up" axis`);
  const residuals: PlateResidual[] = [];
  for (const c of fig.controls) {
    for (const axis of ["right", "up"] as const) {
      const want = c[axis];
      if (want === undefined) continue;
      const k = axis === "right" ? r : u;
      residuals.push({
        what: c.what,
        axis,
        metres: k[0] * c.at[0] + k[1] * c.at[1] + k[2] - want,
        check: c.check === true,
      });
    }
  }
  const fitted = residuals.filter((x) => !x.check).map((x) => Math.abs(x.metres));
  const rms = Math.sqrt(fitted.reduce((s, v) => s + v * v, 0) / fitted.length);
  // The metres one pixel step moves along the page's x and along its y
  // (the map's Jacobian's columns), inverted.
  const pxPerMetre: [number, number] = [1 / Math.hypot(r[0], u[0]), 1 / Math.hypot(r[1], u[1])];
  return { r, u, residuals, rms, max: Math.max(...fitted), pxPerMetre };
}

/** A page pixel in the view's metres, [right, up]. */
export function pixelToView(fit: PlateFit, x: number, y: number): [number, number] {
  return [fit.r[0] * x + fit.r[1] * y + fit.r[2], fit.u[0] * x + fit.u[1] * y + fit.u[2]];
}

/** The page pixel at the view's (right, up): the fitted map inverted. */
export function viewToPixel(fit: PlateFit, right: number, up: number): [number, number] {
  const [a, b, c] = fit.r;
  const [d, e, f] = fit.u;
  const det = a * e - b * d;
  const rr = right - c;
  const uu = up - f;
  return [(e * rr - b * uu) / det, (a * uu - d * rr) / det];
}

/**
 * The region's four corners in the view's metres, in the order the texture
 * wants them: top-left, top-right, bottom-right, bottom-left of the image.
 * An affine map takes the region's rectangle to a parallelogram, and two
 * triangles over a parallelogram interpolate an affine map exactly, so the
 * quad needs no more vertices than these.
 */
export function plateCorners(fig: PlateFigure, fit: PlateFit): Array<[number, number]> {
  const [x, y, w, h] = fig.region;
  return [
    pixelToView(fit, x, y),
    pixelToView(fit, x + w, y),
    pixelToView(fit, x + w, y + h),
    pixelToView(fit, x, y + h),
  ];
}

/** An orthographic camera, as plain numbers. */
export interface PlateCamera {
  readonly position: Vec3;
  readonly target: Vec3;
  readonly up: Vec3;
  /** Frustum half-extents about the camera's axis, in metres. */
  readonly halfWidth: number;
  readonly halfHeight: number;
  readonly near: number;
  readonly far: number;
  /** How far in front of the camera the plate's quad is laid, inside near..far. */
  readonly quadDepth: number;
}

/** How far out an uncut elevation's camera stands, and a plan's reach below its cut. */
const STAND_OFF = 400;
const PLAN_REACH = 120;

/**
 * The orthographic camera that frames the figure on a viewport of `aspect`
 * (width / height): looking along the view, centred on the region, the
 * region contained with a margin. For a section or a plan the camera stands
 * ON the cut with a near plane a centimetre in front of it, so everything
 * on the viewer's side of the cut is clipped away.
 */
export function plateCamera(fig: PlateFigure, fit: PlateFit, aspect: number, margin = 0.04): PlateCamera {
  const corners = plateCorners(fig, fit);
  const rs = corners.map((c) => c[0]);
  const us = corners.map((c) => c[1]);
  const r0 = Math.min(...rs);
  const r1 = Math.max(...rs);
  const u0 = Math.min(...us);
  const u1 = Math.max(...us);
  let hw = ((r1 - r0) / 2) * (1 + margin);
  let hh = ((u1 - u0) / 2) * (1 + margin);
  if (hw / hh < aspect) hw = hh * aspect;
  else hh = hw / aspect;
  const rc = (r0 + r1) / 2;
  const uc = (u0 + u1) / 2;
  const view = fig.view;
  const cut = view.kind === "plan" ? view.cutY : view.cut;
  const depth = cut ?? STAND_OFF;
  const near = cut === undefined ? 1 : 0.01;
  const far = view.kind === "plan" ? depth + PLAN_REACH : depth + STAND_OFF;
  const b = viewBasis(view);
  const position = viewToWorld(view, rc, uc, depth);
  const target: Vec3 = [position[0] + b.dir[0], position[1] + b.dir[1], position[2] + b.dir[2]];
  return { position, target, up: b.up, halfWidth: hw, halfHeight: hh, near, far, quadDepth: near + 0.5 };
}

/** The IIIF URL of the figure's region at `size` (IIIF Image API 2 size syntax). */
export function plateUrl(fig: PlateFigure, size: string = PLATE_SIZE): string {
  const [x, y, w, h] = fig.region;
  return `${IIIF_BASE}/${fig.pageId}/${x},${y},${w},${h}/${size}/0/default.jpg`;
}

/** The whole page, for the credit's link. */
export function plateInfoUrl(fig: PlateFigure): string {
  return `${IIIF_BASE}/${fig.pageId}/full/full/0/default.jpg`;
}

/**
 * THE TABLE. Controls were picked on the full-resolution e-rara scans
 * (pixel coordinates are that server's), each against the number printed
 * on the plate or the code's sourced value, as its `what` says. The
 * residuals are in `tests/eiffelPlates.test.ts`'s verbose output.
 */
export const PLATE_FIGURES: readonly PlateFigure[] = [
  {
    id: "I-1",
    plate: "I",
    fig: "Fig. 1",
    title: "Élévation, 1:1000",
    pageId: 8976362,
    page: [8635, 6608],
    scale: 1000,
    region: [560, 1420, 2560, 3900],
    // No label says which face; the tower is symmetric at this scale, and
    // NW (the Seine side, Plate I's Fig. 6 « côté de la Seine ») is taken.
    view: { kind: "elevation", face: "NW" },
    controls: [
      // Each floor is taken on both sides of the tower where the plate draws
      // its leader on both: taken on one side only, the uneven vertical scale
      // came out of the fit as a 0.5° tilt (the independent re-pick's finding).
      { at: [1110, 5137], up: 0, what: "the ground outside the left foot, under « Niveau des centres des appuis »" },
      { at: [2675, 5138.7], up: 0, what: "the ground outside the right foot, where the height chains land" },
      { at: [1894, 5147.7], up: 0, what: "« Sol au centre de la Tour (33.50) », drawn 0.9 m under the outer ground", check: true },
      { at: [1370, 4499], up: 57.63, what: "« Côté extérieur 70m695 » leader, the 1st floor, left" },
      { at: [2365, 4498.4], up: 57.63, what: "« Plancher du 1er Étage (91,13) », right" },
      { at: [1375, 3808], up: 115.73, what: "« Côté extérieur 37m63 » leader, the 2nd floor, left" },
      { at: [2225, 3813.9], up: 115.73, what: "« Plancher du 2e Étage (149,23) », right" },
      { at: [2745, 2867.7], up: 195.93, what: "« Plancher intermédiaire (229,43) », right (no leader on the left)" },
      { at: [1700, 1913], up: 276.13, what: "« Côté extérieur 18m65 » leader, the 3rd floor, left" },
      { at: [2810, 1911.8], up: 276.13, what: "« Plancher du 3e Étage (309,63) », right" },
      { at: [2150, 1718], up: 293.215, what: "« terrasse du phare (326,715) »", check: true },
      { at: [2200, 1628.5], up: 300.515, what: "« terrasse supérieure (334,015) »", check: true },
      { at: [2200, 1513.5], up: 312.275, what: "the rod's top, « 11m760 » over the top terrace" },
      { at: [1161, 5225], right: -62.453, what: "the ground chain's end (124.906 / 2), left" },
      { at: [1459, 5230], right: -37.119, what: "the ground chain's « 74m238 » tick, left" },
      { at: [2323, 5230], right: 37.119, what: "the « 74m238 » tick, right" },
      { at: [2628, 5225], right: 62.453, what: "the ground chain's end, right" },
      { at: [1910, 1550], right: 0, what: "the rod, on the tower's axis" },
    ],
    tolerance: {
      metres: 1.8,
      why:
        "SOURCES.md §24.1: the lower 58 m are drawn about 5 % short (11.2 px/m against 11.8 above), " +
        "which no single affine holds: the ground and the 3rd floor read high, the 1st and 2nd low, " +
        "by the same amount on both sides of the axis",
    },
  },
  {
    id: "XXXI-d",
    plate: "XXXI",
    fig: "Diagramme",
    title: "Diagramme de l'élévation, 1:1000",
    pageId: 8976398,
    page: [8720, 6699],
    scale: 1000,
    region: [5500, 1780, 1450, 3680],
    // Symmetric and unlabelled: NW taken. Every control is a NODES half-width or
    // height (the plate's own printed widths, halved).
    view: { kind: "elevation", face: "NW" },
    controls: [
      { at: [5564, 5384], right: -56.2435, up: 6.4, what: "node XXVIII, left outer (c/d) axis" },
      { at: [5739, 5384], right: -41.2435, up: 6.4, what: "node XXVIII, left inner (a/b) axis" },
      { at: [6706.6, 5390], right: 41.2435, up: 6.4, what: "node XXVIII, right inner axis" },
      { at: [6885, 5391], right: 56.2435, up: 6.4, what: "node XXVIII, right outer axis" },
      { at: [5854, 4769], right: -31.3476, up: 57.4, what: "node XXIII, left outer (printed 15.00 | 32.6952 | 15.00)" },
      { at: [6035, 4769], right: -16.3476, up: 57.4, what: "node XXIII, left inner" },
      { at: [6421, 4772], right: 16.3476, up: 57.4, what: "node XXIII, right inner" },
      { at: [6595, 4772], right: 31.3476, up: 57.4, what: "node XXIII, right outer" },
      { at: [6056, 4090], right: -15.852, up: 115.5, what: "node XVII, left outer (printed 10.412 | 10.880 | 10.412)" },
      { at: [6174, 4090], right: -5.44, up: 115.5, what: "node XVII, left inner" },
      { at: [6299, 4089], right: 5.44, up: 115.5, what: "node XVII, right inner" },
      { at: [6420, 4089], right: 15.852, up: 115.5, what: "node XVII, right outer" },
      { at: [6133.5, 3334], right: -9.25, up: 179.1, what: "node XI, left outer (printed 18.500)" },
      { at: [6352, 3334], right: 9.25, up: 179.1, what: "node XI, right outer" },
      { at: [6179.5, 2370], right: -5.2848, up: 259.067, what: "node I, left outer (printed 10.56952)" },
      { at: [6307.5, 2370], right: 5.2848, up: 259.067, what: "node I, right outer" },
      { at: [5950, 5432], up: 2.5, what: "« Centre des Sommiers (36.00) » line, left" },
      { at: [6500, 5435], up: 2.5, what: "« Centre des Sommiers (36.00) » line, right" },
      { at: [6222, 5300], right: 0, what: "« Axe de la Tour », low" },
      { at: [6242, 3000], right: 0, what: "tower axis, middle" },
      { at: [6249, 2200], right: 0, what: "tower axis, under the 3rd floor" },
      { at: [6468, 2162], up: 276.13, what: "height-chain tick: top of panel 29, 3rd floor (309.63)", check: true },
      { at: [6467, 2298], up: 264.9, what: "height-chain tick: bottom of panel 29 (11.23 printed)", check: true },
      { at: [6400, 1869], up: 300.515, what: "(334.015) top terrace, 24.385 above the 3rd floor", check: true },
      { at: [6400, 1960], up: 293.215, what: "(326.715) lantern terrace", check: true },
    ],
    tolerance: { metres: 0.8, why: "the diagram's node spacing runs 11.7 to 12.1 px/m, so its heights alternate ±0.6 m about any straight scale; its top (panel 29 and the terraces) is drawn about 1 m tall" },
  },
  {
    id: "XI-1",
    plate: "XI",
    fig: "Fig. 1",
    title: "Arc décoratif, élévation, pile n° 1, 1:500",
    pageId: 8976372,
    page: [8856, 6765],
    scale: 500,
    region: [640, 1000, 1260, 1180],
    // « Face 1, ornementée », the outer face, with pile 1 on the left: seen from
    // outside, only NW puts pile 1 there. A true elevation, isotropic within 0.3 %.
    // The plate's « Arbalétrier c » is the model's b (SOURCES.md).
    view: { kind: "elevation", face: "NW" },
    controls: [
      { at: [1155, 1039], up: 50.4, what: "dash-dot node grid: node XXIV 50.40 (also the poutre decorative's top) (NODES)" },
      { at: [1350, 1040], up: 50.4, what: "dash-dot node grid: poutre decorative top chord, 50.40 (NODES)" },
      { at: [1080, 1169], up: 44.9, what: "dash-dot node grid: mid line of panel 5, 44.90 (NODES)" },
      { at: [1070, 1302], up: 39.4, what: "dash-dot node grid: node XXV 39.40 (NODES)" },
      { at: [925, 1433], up: 33.9, what: "dash-dot node grid: mid line of panel 4, 33.90 (NODES)" },
      { at: [970, 1565], up: 28.4, what: "dash-dot node grid: node XXVI 28.40 (NODES)" },
      { at: [830, 1698], up: 22.9, what: "dash-dot node grid: mid line of panel 3, 22.90 (NODES)" },
      { at: [780, 1829], up: 17.4, what: "dash-dot node grid: node XXVII 17.40 (NODES)" },
      { at: [780, 1961], up: 11.9, what: "dash-dot node grid: mid line of panel 2, 11.90 (NODES)" },
      { at: [770, 2092], up: 6.4, what: "dash-dot node grid: node XXVIII 6.40 (NODES)" },
      { at: [1868, 1305], up: 39.4, what: "intrados crown (ARCH.crownY 39.40), lower edge of the lower chord at the axis" },
      { at: [1850, 1208], up: 43.3173, what: "extrados crown 39.40 + 3.9173 (ARCH.band), under the girder's bottom chord", check: true },
      { at: [1066.2, 1039], right: -34.125, what: "outer upright's axis (dash-dot line, fitted straight through 68 samples) at node XXIV (NODES.outer)" },
      { at: [931.5, 1302], right: -39.6545, what: "outer upright's axis (dash-dot line, fitted straight through 68 samples) at node XXV (NODES.outer)" },
      { at: [796.7, 1565], right: -45.184, what: "outer upright's axis (dash-dot line, fitted straight through 68 samples) at node XXVI (NODES.outer)" },
      { at: [661.5, 1829], right: -50.7135, what: "outer upright's axis (dash-dot line, fitted straight through 68 samples) at node XXVII (NODES.outer)" },
      { at: [1158.9, 1565], right: -30.184, what: "inner upright's axis (solid band labelled 'Arbaletrier c', the model's b; centre of its 0.79 edges, fitted straight) at node XXVI (NODES.inner)" },
      { at: [1022.2, 1829], right: -35.7135, what: "inner upright's axis (solid band labelled 'Arbaletrier c', the model's b; centre of its 0.79 edges, fitted straight) at node XXVII (NODES.inner)" },
      { at: [886, 2092], right: -41.2435, what: "inner upright's axis (solid band labelled 'Arbaletrier c', the model's b; centre of its 0.79 edges, fitted straight) at node XXVIII (NODES.inner)" },
      { at: [1512.5, 1045], right: -15.53, what: "poutre decorative post 4 x 3.8825 from the axis, top" },
      { at: [1511, 1165], right: -15.53, what: "same post, bottom" },
      { at: [1605, 1045], right: -11.6475, what: "poutre decorative post 3 x 3.8825 from the axis, top" },
      { at: [1603, 1165], right: -11.6475, what: "same post, bottom" },
      { at: [1695.5, 1045], right: -7.765, what: "poutre decorative post 2 x 3.8825 from the axis, top" },
      { at: [1694, 1165], right: -7.765, what: "same post, bottom" },
      { at: [1788.5, 1045], right: -3.8825, what: "poutre decorative post 1 x 3.8825 from the axis, top" },
      { at: [1786.5, 1165], right: -3.8825, what: "same post, bottom" },
      { at: [1877, 1120], right: 0, what: "section line AB at the crown: the cut end of the poutre decorative (tower's face centre line)" },
      { at: [1090.1, 1698], right: -32.949, what: "inner upright's axis at 22.90 (between nodes)", check: true },
      { at: [953.8, 1961], right: -38.4785, what: "inner upright's axis at 11.90 (between nodes)", check: true },
    ],
    tolerance: { metres: 0.3, why: "the drawn uprights lean 0.512 and 0.518 px per px against the model's 0.503, so the inner axis drifts 0.13 by 28.40" },
  },
  {
    id: "XIX-1",
    plate: "XIX",
    fig: "Fig. 1",
    title: "Premier étage, élévation du côté de l'École militaire, 1:200",
    pageId: 8976382,
    page: [8727, 6699],
    scale: 200,
    region: [920, 700, 4800, 1790],
    // Labelled PILIER N°3 (SUD) left and N°2 (EST) right: face SE. The figure crosses
    // the spread's gutter at x ≈ 4430, and right of it the scan is shifted 0.55–0.75 m
    // inboard; the two piers there are checks, so the fit holds the left 83 %. The
    // left chain « 8.70 » (« 4.90 » + « 3.80 », « 1.15 », « 0.50 ») stands 0.57–0.61
    // over the model at every tick: the plate measures the arcade from 0.50 above the
    // gallery floor, which puts its crown about 65.7 against the model's 65.10.
    view: { kind: "elevation", face: "SE" },
    controls: [
      { at: [1300, 2045], up: 50.4, what: "skirt foot / girder top line, left (the 7m00 chain's 83.90 = z 50.40)" },
      { at: [3000, 2047], up: 50.4, what: "skirt foot / girder top line, centre" },
      { at: [5000, 2050], up: 50.4, what: "skirt foot line, right (extension of the 7m00 chain)" },
      { at: [5330, 2051], up: 50.4, what: "'Grande poutre 7m00' chain, bottom extension line" },
      { at: [5250, 1635], up: 57.4, what: "node XXIII line: 0.230 under the restaurant floor, top of 'Grande poutre 7m00' and foot of 'Panneau 6 11m00'" },
      { at: [5360, 1635], up: 57.4, what: "node XXIII line, right end" },
      { at: [5000, 982], up: 68.4, what: "'Panneau 6 11m00' top extension line (node XXII)" },
      { at: [5280, 981], up: 68.4, what: "'Panneau 6 11m00' top, at the chain" },
      { at: [3000, 2451], up: 43.4, what: "'45.287' chain on the poutre de l'arc's bottom chord: model bottom y 43.40 (FIRST_FLOOR.decorativeBottomY)", check: true },
      { at: [975, 1135], up: 65.1, what: "top of the '8.70' / '4.90' / '1.75' chains, left: model vault crown 65.10 (SOURCES 10.3)", check: true },
      { at: [1005, 1428], up: 60.2, what: "'4.90' / '3.80' chain junction: model column top 60.20", check: true },
      { at: [1005, 1654], up: 56.4, what: "base of the '3.80' and '1.15' chains: model gallery floor 56.40", check: true },
      { at: [1005, 1684], up: 55.9, what: "foot of the '0.50' chain under it: model skirt cornice foot 55.90", check: true },
      { at: [2225, 2127], right: -15.53, what: "poutre de l'arc vertical post k=-4 (3.8825 bays, FIRST_FLOOR), upper" },
      { at: [2223, 2332], right: -15.53, what: "post k=-4, lower" },
      { at: [2455.5, 2127], right: -11.6475, what: "poutre de l'arc vertical post k=-3 (3.8825 bays, FIRST_FLOOR), upper" },
      { at: [2690.5, 2127], right: -7.765, what: "poutre de l'arc vertical post k=-2 (3.8825 bays, FIRST_FLOOR), upper" },
      { at: [2921.5, 2127], right: -3.8825, what: "poutre de l'arc vertical post k=-1 (3.8825 bays, FIRST_FLOOR), upper" },
      { at: [3152.5, 2127], right: 0, what: "poutre de l'arc vertical post k=0 (3.8825 bays, FIRST_FLOOR), upper" },
      { at: [3150, 2332], right: 0, what: "post k=0, lower" },
      { at: [3378.5, 2127], right: 3.8825, what: "poutre de l'arc vertical post k=1 (3.8825 bays, FIRST_FLOOR), upper" },
      { at: [3608.5, 2127], right: 7.765, what: "poutre de l'arc vertical post k=2 (3.8825 bays, FIRST_FLOOR), upper" },
      { at: [3839, 2127], right: 11.6475, what: "poutre de l'arc vertical post k=3 (3.8825 bays, FIRST_FLOOR), upper" },
      { at: [4066.5, 2127], right: 15.53, what: "poutre de l'arc vertical post k=4 (3.8825 bays, FIRST_FLOOR), upper" },
      { at: [4064.5, 2332], right: 15.53, what: "post k=4, lower" },
      { at: [1085.5, 1517], right: -34.9425, what: "gallery pier (column pair 0.80) at -34.9425 (7.765 module, SOURCES 10.3)" },
      { at: [1545.5, 1517], right: -27.1775, what: "gallery pier (column pair 0.80) at -27.1775 (7.765 module, SOURCES 10.3)" },
      { at: [2004, 1517], right: -19.4125, what: "gallery pier (column pair 0.80) at -19.4125 (7.765 module, SOURCES 10.3)" },
      { at: [2462, 1517], right: -11.6475, what: "gallery pier (column pair 0.80) at -11.6475 (7.765 module, SOURCES 10.3)" },
      { at: [2926.5, 1517], right: -3.8825, what: "gallery pier (column pair 0.80) at -3.8825 (7.765 module, SOURCES 10.3)" },
      { at: [3384, 1517], right: 3.8825, what: "gallery pier (column pair 0.80) at +3.8825 (7.765 module, SOURCES 10.3)" },
      { at: [3841.5, 1517], right: 11.6475, what: "gallery pier (column pair 0.80) at +11.6475 (7.765 module, SOURCES 10.3)" },
      { at: [4299.5, 1517], right: 19.4125, what: "gallery pier (column pair 0.80) at +19.4125 (7.765 module, SOURCES 10.3)" },
      { at: [4725.5, 1517], right: 27.1775, what: "gallery pier +27.1775, right of the page fold", check: true },
      { at: [5178, 1517], right: 34.9425, what: "corner pier +34.9425, right of the page fold", check: true },
      { at: [1797, 2443], right: -22.6435, what: "'45.287' chain's left end tick (b's axis at 43.40, half 22.6435)", check: true },
    ],
    tolerance: {
      metres: 0.2,
      checks: 0.8,
      why:
        "the fitted controls are the plate's own printed chains; the checks carry the book's fold (0.62–0.74) " +
        "and the arcade chain drawn 0.57–0.61 over the model",
    },
  },
  {
    id: "XVIII-3",
    plate: "XVIII",
    fig: "Fig. 3",
    title: "Premier étage, coupe horizontale, 1:250",
    pageId: 8976381,
    page: [8727, 6699],
    scale: 250,
    region: [4700, 1000, 3500, 3500],
    // Pile labels: 2 Est top-left, 3 Sud top-right, 1 Nord bottom-left, 4 Ouest
    // bottom-right, so the drawing's up is −z. Cut 1.47 over the 1st floor.
    view: { kind: "plan", up: [0, -1], cutY: 59.1 },
    controls: [
      { at: [4792.5, 1070.9], right: -35.3475, up: 35.3475, what: "corner column, pile 2 Est (top-left)" },
      { at: [8118.5, 1061.8], right: 35.3475, up: 35.3475, what: "corner column, pile 3 Sud (top-right)" },
      { at: [4785.7, 4406.5], right: -35.3475, up: -35.3475, what: "corner column, pile 1 Nord (bottom-left)" },
      { at: [8092.8, 4399.5], right: 35.3475, up: -35.3475, what: "corner column, pile 4 Ouest (bottom-right)" },
      { at: [5170.7, 4405.5], right: -27.1775, up: -35.3475, what: "bottom chain, 1st pier pair (after the 8.16 end bay)" },
      { at: [6257, 4401], right: -3.8825, up: -35.3475, what: "bottom chain, pier pair left of the face centre" },
      { at: [6987.3, 4397.1], right: 11.6475, up: -35.3475, what: "bottom chain, pier pair" },
      { at: [7710.2, 4398.5], right: 27.1775, up: -35.3475, what: "bottom chain, last pier pair before the 8.16 end bay" },
      { at: [5177.6, 1067.2], right: -27.1775, up: 35.3475, what: "top face, pier pair" },
      { at: [6276.2, 1061.8], right: -3.8825, up: 35.3475, what: "top face, pier pair left of centre" },
      { at: [7368, 1062.4], right: 19.4125, up: 35.3475, what: "top face, pier pair" },
      { at: [4791.2, 1455.2], right: -35.3475, up: 27.1775, what: "left face, pier pair" },
      { at: [4788.9, 2559.5], right: -35.3475, up: 3.8825, what: "left face, pier pair above centre" },
      { at: [4786.6, 3647.8], right: -35.3475, up: -19.4125, what: "left face, pier pair" },
      { at: [8114.8, 1450.5], right: 35.3475, up: 27.1775, what: "right face, pier pair" },
      { at: [8106.4, 2544], right: 35.3475, up: 3.8825, what: "right face, pier pair above centre" },
      { at: [8098.1, 3641.8], right: 35.3475, up: -19.4125, what: "right face, pier pair" },
      { at: [6447.5, 2722.5], right: 0, up: 0, what: "« Pendule au centre de la Tour » circle, on both dash-dot face axes" },
      { at: [6727, 1186], up: 32.7475, what: "printed 2.60 (gallery) tick inside the column axis", check: true },
      { at: [7132, 1244], up: 31.3475, what: "printed 4.00 tick: leg's outer upright line (NODES XXIII outer 31.3476)", check: true },
    ],
    tolerance: { metres: 0.3, why: "the scan is not rigid: its top face draws 3326 px between the corner columns and its bottom 3307 (0.4 m), and its horizontal axis passes 0.26 m above the corners' midpoint" },
  },
  {
    id: "XIX-7",
    plate: "XIX",
    fig: "Fig. 7",
    title: "Plan du deuxième étage, 1:200",
    pageId: 8976382,
    page: [8727, 6699],
    scale: 200,
    region: [5880, 3060, 2300, 2380],
    // Pile labels as PL-XVIII, « Côté de la Seine » along the bottom (NW). Fitted on the
    // covered gallery's outer post line, the printed chain closing on « 36m80 »: the
    // model's PLATFORMS.second.side 37.63 (half 18.815) matches no drawn line (it
    // falls 0.415 outside the posts and 0.135 inside the text's 37.90 gutter).
    view: { kind: "plan", up: [0, -1], cutY: 117.2 },
    controls: [
      { at: [6024.4, 3168.8], right: -17.19, up: 18.4, what: "top gallery post, first after the 1.21 corner cut (pile 2 end)" },
      { at: [6445.2, 3170.5], right: -10.08, up: 18.4, what: "top gallery post" },
      { at: [7039.8, 3167.1], right: 0, up: 18.4, what: "top gallery post on the face centre" },
      { at: [7637.4, 3173.9], right: 10.08, up: 18.4, what: "top gallery post" },
      { at: [8054.5, 3176.8], right: 17.19, up: 18.4, what: "top gallery post, last before the corner cut (pile 3 end)" },
      { at: [6009.9, 5355.8], right: -17.19, up: -18.4, what: "bottom gallery post (Seine side), pile 1 end" },
      { at: [6423.8, 5343.7], right: -10.08, up: -18.4, what: "bottom gallery post" },
      { at: [7024.2, 5346.5], right: 0, up: -18.4, what: "bottom gallery post on the face centre" },
      { at: [7621.1, 5355.2], right: 10.08, up: -18.4, what: "bottom gallery post" },
      { at: [8038.2, 5358.6], right: 17.19, up: -18.4, what: "bottom gallery post, pile 4 end (printed 0.80 | 1.21)" },
      { at: [5952, 3243], right: -18.4, up: 17.19, what: "left gallery post, pile 2 end" },
      { at: [5947.8, 3870.5], right: -18.4, up: 6.72, what: "left gallery post" },
      { at: [5944, 4262.8], right: -18.4, up: 0, what: "left gallery post on the face centre" },
      { at: [5940, 4852.2], right: -18.4, up: -10.08, what: "left gallery post" },
      { at: [5934.9, 5284.4], right: -18.4, up: -17.19, what: "left gallery post, pile 1 end" },
      { at: [8127, 3248], right: 18.4, up: 17.19, what: "right gallery post, pile 3 end" },
      { at: [8125, 3861.2], right: 18.4, up: 6.72, what: "right gallery post" },
      { at: [8121.7, 4260.1], right: 18.4, up: 0, what: "right gallery post on the face centre" },
      { at: [8118.7, 4859.9], right: 18.4, up: -10.08, what: "right gallery post" },
      { at: [8110.8, 5283.9], right: 18.4, up: -17.19, what: "right gallery post, pile 4 end" },
      { at: [6131, 3346], right: -15.852, up: 15.852, what: "pile 2 upright c, centre of the drawn box (NODES XVII outer)", check: true },
      { at: [7940, 3355], right: 15.852, up: 15.852, what: "pile 3 upright c, box centre", check: true },
      { at: [6122, 5160], right: -15.852, up: -15.852, what: "pile 1 upright c, box centre", check: true },
      { at: [7935, 5165], right: 15.852, up: -15.852, what: "pile 4 upright c, box centre", check: true },
      { at: [6725, 3349], right: -5.44, up: 15.852, what: "pile 2 upright d, box centre (NODES XVII inner 5.44)", check: true },
      { at: [6130, 3950], right: -15.852, up: 5.44, what: "pile 2 upright b, box centre", check: true },
    ],
    tolerance: {
      metres: 0.3,
      checks: 0.8,
      why:
        "post centres picked by a dark-weighted centroid; a post line is not a hard edge. The checks are the " +
        "uprights at node XVII, drawn as pictorial boxes whose centres sit 0.4–0.7 inside NODES' 15.852",
    },
  },
  {
    id: "XIX-3",
    plate: "XIX",
    fig: "Fig. 3",
    title: "Troisième étage, élévation, 1:200",
    pageId: 8976382,
    page: [8727, 6699],
    scale: 200,
    region: [640, 2850, 1220, 1480],
    // Symmetric and unlabelled (section marks A–B, C–D only): NW taken; the companion
    // plans Figs 6 and 9 put « Côté de la Seine » at the bottom, which is NW too.
    // PLATFORMS.third's 18.65 is drawn nowhere on it, so it is not a control.
    view: { kind: "elevation", face: "NW" },
    controls: [
      { at: [720, 3593], up: 276.13, what: "3rd floor (309.63): top of the 'Panneau 29 11.23' chain, dashed level line" },
      { at: [790, 3591], up: 276.13, what: "3rd floor, same line at the '850'/'1.20' chain" },
      { at: [1715, 3588], up: 276.13, what: "3rd floor: the floor band's top, right" },
      { at: [720, 4257], up: 264.9, what: "bottom of panel 29 (PANEL29.bottom): foot of 'Panneau 29 11.23'" },
      { at: [850, 4258], up: 264.9, what: "bottom of panel 29, extension line" },
      { at: [1105, 4258.5], up: 264.9, what: "bottom of panel 29: the horizontal's axis (edges 4244/4273), left" },
      { at: [1530, 4258], up: 264.9, what: "bottom of panel 29: the horizontal's axis, right" },
      { at: [720, 3443], up: 278.71, what: "Eiffel's balcony floor, '2.58' over the 3rd floor (SOURCES 10.8)" },
      { at: [780, 3442], up: 278.71, what: "Eiffel's balcony floor, at the '1.20'/'2.58' chain" },
      { at: [720, 3308], up: 280.98, what: "'2.270' over the balcony: 4.850 level, the pavilion roof / diagonal girders' foot (summit.ts 280.98)" },
      { at: [920, 3307], up: 280.98, what: "4.850 level at the foot of the '4.50' chain" },
      { at: [920, 3046], up: 285.48, what: "top of 'Parties droites des poutres en diagonale 4.50' (summit.ts 285.48)" },
      { at: [965, 3047], up: 285.48, what: "same line, at the box's edge" },
      { at: [1000, 4140], right: -5, what: "upright c axis, left (PANEL29.half 5.0) at v 4140" },
      { at: [1152, 4140], right: -2.5, what: "panel 29 montant at -2.5 (4 bays a face) at v 4140" },
      { at: [1303, 4140], right: 0, what: "arbaletrier b d on the face centre line (axis 0) at v 4140" },
      { at: [1449, 4140], right: 2.5, what: "panel 29 montant at +2.5 (4 bays a face) at v 4140" },
      { at: [1603, 4140], right: 5, what: "upright c axis, right (PANEL29.half 5.0) at v 4140" },
      { at: [1003, 3980], right: -5, what: "upright c axis, left (PANEL29.half 5.0) at v 3980" },
      { at: [1156, 3980], right: -2.5, what: "panel 29 montant at -2.5 (4 bays a face) at v 3980" },
      { at: [1304.5, 3980], right: 0, what: "arbaletrier b d on the face centre line (axis 0) at v 3980" },
      { at: [1453.5, 3980], right: 2.5, what: "panel 29 montant at +2.5 (4 bays a face) at v 3980" },
      { at: [1606, 3980], right: 5, what: "upright c axis, right (PANEL29.half 5.0) at v 3980" },
      { at: [1007, 3810], right: -5, what: "upright c axis, left (PANEL29.half 5.0) at v 3810" },
      { at: [1159, 3810], right: -2.5, what: "panel 29 montant at -2.5 (4 bays a face) at v 3810" },
      { at: [1307.5, 3810], right: 0, what: "arbaletrier b d on the face centre line (axis 0) at v 3810" },
      { at: [1456.5, 3810], right: 2.5, what: "panel 29 montant at +2.5 (4 bays a face) at v 3810" },
      { at: [1609, 3810], right: 5, what: "upright c axis, right (PANEL29.half 5.0) at v 3810" },
      { at: [1010, 3615], right: -5, what: "'5.00' chain, left tick (PANEL29.half)" },
      { at: [1311, 3615], right: 0, what: "'5.00' chain, centre tick on the axis line" },
      { at: [1610, 3615], right: 5, what: "'5.00' chain, right tick" },
      { at: [819, 3500], right: -8.28, what: "glazed gallery's outer face, left: 'Paroi vitree' 16.560 across flats (PL-XIX Fig. 9)" },
      { at: [1810, 3500], right: 8.28, what: "glazed gallery's outer face, right" },
    ],
    tolerance: { metres: 0.2, why: "sheared about 9 px in 550 and 1.7 % anisotropic, which the affine takes out; what is left is picking" },
  },
];

/** A figure by its id, or undefined. */
export function plateFigure(id: string): PlateFigure | undefined {
  return PLATE_FIGURES.find((f) => f.id === id);
}

/** The scan's opacity a plate opens at, when the link does not say. */
export const PLATE_OPACITY = 0.5;

/**
 * `&opacity=`: the scan's opacity a link opens at, in 0..1; the default
 * where it is absent or not a number, clamped where it is out of range.
 */
export function plateOpacity(search: string): number {
  const raw = new URLSearchParams(search).get("opacity");
  const v = raw === null || raw === "" ? Number.NaN : Number(raw);
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : PLATE_OPACITY;
}

/**
 * `?plate=<id>`: the figure a link opens on, or undefined when the page
 * should open as it always has (no param, or an id the table does not
 * hold — which is reported by the caller, not thrown).
 */
export function plateFromQuery(search: string): { figure?: PlateFigure; asked?: string } {
  const asked = new URLSearchParams(search).get("plate");
  if (asked === null || asked === "") return {};
  return { figure: plateFigure(asked), asked };
}
