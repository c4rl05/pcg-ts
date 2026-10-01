/**
 * The erection on the page: the tower shown as it stood on a chosen day
 * between January 1887 and June 1889, and a scrubber to choose it.
 *
 * THE GRAPH IS NOT RECOOKED. `chronology.ts` dates every piece from where
 * it stands and what class it is; this module applies those dates ONCE,
 * at load, by reordering each mesh's triangles and each batch's instances
 * by date (`stageTriangles`, `stageItems`), after which a day is a prefix:
 * `drawRange` on a mesh, `count` on an instanced one, found by a binary
 * search. No shader changes, nothing per frame when the date is still, and
 * the shadow map, the occlusion pass and the "show" select all see
 * exactly what is drawn, because the hidden pieces are simply not drawn.
 *
 * A RIVET COMES WITH ITS IRON: each head is dated by the surfaces it sits
 * on (`hostDays`), the last of them to go up, not by its own height, so no
 * head is ever drawn before its plate; a site head then waits for the
 * book's pace (`siteRivetDays`).
 *
 * Only `?build` (or the panel's "build" toggle, which reloads into it)
 * runs any of this; the default page never reorders a thing. The staging
 * holds each GEOMETRY, not its mesh, so a view that swaps a mesh's
 * geometry for another leaves the staged one as it was and shows its own
 * whole. (The section, section.ts, swaps nothing: it is a clipping plane.)
 */
import type { BufferGeometry, InstancedBufferAttribute, InstancedBufferGeometry, InstancedMesh, Mesh } from "three";
import { BufferAttribute, DoubleSide, MeshStandardMaterial } from "three";
import {
  MILESTONES,
  SPAN,
  type Staged,
  dayOf,
  hostDays,
  instanceDay,
  isoOf,
  outputDay,
  pieceDay,
  shownThrough,
  siteRivetDays,
  stageItems,
  stageTriangles,
  worksDown,
} from "./chronology.js";
import { CRANE_RUNS, type CraneRun, cranePose } from "./cranes.js";
import { PART_CLASSES } from "./parts.js";
import { rivetClass } from "./spec.js";

/** Does this output carry temporary works (`erection.ts`)? The cook names them `works.<kind>`. */
export function isWorks(name: string): boolean {
  return name.startsWith("works.");
}

/** Is it iron rather than timber: the sand boxes and shoes on the pylons, and the cranes? */
export function isWorksIron(name: string): boolean {
  return name === "works.bearings" || name.startsWith("works.crane.");
}

/**
 * The temporary works' timber: sawn pine, weathered pale and dry, outside
 * the iron's family because it is not iron [estimated]. The bearings (sand
 * boxes and shoes) are iron and take the machinery's paint.
 */
export const TIMBER = new MeshStandardMaterial({ color: 0xa4865f, roughness: 0.88, metalness: 0, side: DoubleSide });

/** One drawn thing and how much of it to draw on a day. */
type Stage =
  | { readonly kind: "mesh"; readonly geometry: BufferGeometry; readonly staged: Staged; readonly until: number }
  | { readonly kind: "batch"; readonly items: Items; readonly staged: Staged }
  | { readonly kind: "whole"; readonly mesh: Mesh; readonly geometry: BufferGeometry; readonly day: number; readonly count: number }
  | { readonly kind: "crane"; readonly mesh: Mesh; readonly run: CraneRun; readonly home: readonly [number, number, number]; readonly count: number };

/**
 * A batch of instances as the page draws it: an instanced mesh (a matrix a
 * head, `?cpuRivets`, and the fittings) or a packed rivet mesh
 * (rivetPack.ts: a seat, a turn and a size a head, in its geometry's
 * per-instance attributes, drawn to `instanceCount`). Either way a day is a
 * prefix, and one permutation reorders every per-instance array.
 */
interface Items {
  readonly count: number;
  /** Instance i's seat (its translation), world metres. */
  seat(i: number): [number, number, number];
  /** Put the instances in `order` (item i becomes old item order[i]). */
  reorder(order: Uint32Array): void;
  /** Draw the first n. */
  show(n: number): void;
}

/** A drawn mesh as a batch of instances, or nothing if it is not one. */
function itemsOf(mesh: Mesh): Items | undefined {
  const inst = mesh as InstancedMesh;
  const g = mesh.geometry;
  const perInstance = (order: Uint32Array): void => {
    for (const attr of Object.values(g.attributes)) {
      const a = attr as InstancedBufferAttribute;
      if (a.isInstancedBufferAttribute !== true || a.count !== order.length || a.array === null) continue;
      permute(a.array as Float32Array, a.itemSize, order);
      a.needsUpdate = true;
    }
  };
  if (inst.isInstancedMesh) {
    const m = inst.instanceMatrix.array;
    return {
      count: inst.count,
      seat: (i) => [m[16 * i + 12]!, m[16 * i + 13]!, m[16 * i + 14]!],
      reorder(order) {
        permute(inst.instanceMatrix.array as Float32Array, 16, order);
        inst.instanceMatrix.needsUpdate = true;
        if (inst.instanceColor !== null) {
          permute(inst.instanceColor.array as Float32Array, 3, order);
          inst.instanceColor.needsUpdate = true;
        }
        perInstance(order);
      },
      show(n) {
        inst.count = n;
      },
    };
  }
  // A packed rivet mesh: staged before its first draw, while its arrays are
  // still on the CPU (rivetPack.ts drops them once uploaded).
  const ig = g as InstancedBufferGeometry;
  const at = g.getAttribute("rivetAt") as InstancedBufferAttribute | undefined;
  if (ig.isInstancedBufferGeometry === true && at !== undefined && at.array !== null) {
    const a = at.array;
    const count = ig.instanceCount;
    return {
      count,
      seat: (i) => [a[3 * i]!, a[3 * i + 1]!, a[3 * i + 2]!],
      reorder: perInstance,
      show(n) {
        ig.instanceCount = n;
      },
    };
  }
  return undefined;
}

/** The erection, staged: set a day and everything shows as it stood. */
export interface Erection {
  /** Show the tower as it stood at the END of `day` (days from 26 Jan 1887). */
  setDay(day: number): void;
  readonly day: number;
  /** Pieces dated, triangles and instances reordered, and what that took. */
  readonly stats: { readonly meshes: number; readonly batches: number; readonly ms: number; readonly bytes: number };
}

/**
 * Stage every drawn output by date. `meshes` is the page's map of drawn
 * outputs by name, as `main.ts` keeps it.
 */
export function stageErection(meshes: ReadonlyMap<string, readonly Mesh[]>): Erection {
  const t0 = performance.now();
  const stages: Stage[] = [];
  let bytes = 0;
  // The class meshes first: the rivets are dated by them.
  const surfaces: Array<{ position: ArrayLike<number>; index: ArrayLike<number>; triDays: Float64Array }> = [];
  for (const [name, list] of meshes) {
    if (!(PART_CLASSES as readonly string[]).includes(name) && !isWorks(name)) continue;
    // A crane is moved whole, day by day, along its climb (cranes.ts).
    const run = CRANE_RUNS.find((r) => name === `works.crane.${r.name}`);
    if (run !== undefined) {
      for (const mesh of list) stages.push({ kind: "crane", mesh, run, home: cranePose(run, run.from).at, count: countOf(mesh) });
      continue;
    }
    for (const mesh of list) {
      if (itemsOf(mesh) !== undefined) continue;
      const staged = stageMesh(name, mesh.geometry, stages, isWorks(name) ? (worksDown(name) ?? Infinity) : Infinity);
      if (staged === undefined) continue;
      bytes += staged.days.byteLength + staged.ends.byteLength;
      if (!isWorks(name)) surfaces.push({ position: mesh.geometry.getAttribute("position").array, index: staged.index, triDays: staged.sortedDays });
    }
  }
  // Every rivet head's iron, in one search over all of them.
  const heads: Items[] = [];
  for (const [name, list] of meshes) {
    if (!name.startsWith("rivets")) continue;
    for (const m of list) {
      const items = itemsOf(m);
      if (items !== undefined) heads.push(items);
    }
  }
  let total = 0;
  for (const h of heads) total += h.count;
  const at = new Float32Array(3 * total);
  let o = 0;
  for (const h of heads) {
    for (let i = 0; i < h.count; i++, o++) {
      const p = h.seat(i);
      at[3 * o] = p[0];
      at[3 * o + 1] = p[1];
      at[3 * o + 2] = p[2];
    }
  }
  const iron = total > 0 ? hostDays(at, surfaces) : new Float64Array(0);
  // Site rivets are dated together: the book's pace is over all of them.
  const site: Array<{ items: Items; iron: Float64Array }> = [];
  o = 0;
  for (const [name, list] of meshes) {
    const whole = outputDay(name);
    for (const mesh of list) {
      if (whole !== undefined) {
        stages.push({ kind: "whole", mesh, geometry: mesh.geometry, day: whole, count: countOf(mesh) });
        continue;
      }
      const items = itemsOf(mesh);
      if (items !== undefined) {
        const days = new Float64Array(items.count);
        const rivet = name.startsWith("rivets");
        for (let i = 0; i < items.count; i++) {
          const found = rivet ? iron[o++]! : Number.NaN;
          days[i] = Number.isNaN(found) ? instanceDay(name, ...items.seat(i)) : found;
        }
        if (rivet && rivetClass(name).share > 0) site.push({ items, iron: days });
        else bytes += stageBatch(items, days, stages);
        continue;
      }
      if ((PART_CLASSES as readonly string[]).includes(name) || isWorks(name)) continue;
      // Anything else — an output no class names — is dated whole by its box.
      const g = mesh.geometry;
      g.computeBoundingBox();
      const b = g.boundingBox!;
      stages.push({ kind: "whole", mesh, geometry: g, day: pieceDay(name, [b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z]), count: countOf(mesh) });
    }
  }
  if (site.length > 0) {
    let n = 0;
    for (const s of site) n += s.iron.length;
    const all = new Float64Array(n);
    let k = 0;
    for (const s of site) {
      all.set(s.iron, k);
      k += s.iron.length;
    }
    const driven = siteRivetDays(all);
    k = 0;
    for (const s of site) {
      bytes += stageBatch(s.items, driven.subarray(k, k + s.iron.length), stages);
      k += s.iron.length;
    }
  }
  let current = SPAN[1];
  const erection: Erection = {
    setDay(day) {
      current = day;
      for (const s of stages) {
        if (s.kind === "mesh") s.geometry.setDrawRange(0, day >= s.until ? 0 : shownThrough(s.staged, day));
        else if (s.kind === "batch") s.items.show(shownThrough(s.staged, day));
        else if (s.kind === "crane") {
          const pose = cranePose(s.run, day);
          s.mesh.geometry.setDrawRange(0, pose.shown ? s.count : 0);
          s.mesh.position.set(pose.at[0] - s.home[0], pose.at[1] - s.home[1], pose.at[2] - s.home[2]);
          s.mesh.updateMatrixWorld();
        }
        else setCount(s.mesh, s.geometry, day >= s.day ? s.count : 0);
      }
    },
    get day() {
      return current;
    },
    stats: {
      meshes: stages.filter((s) => s.kind === "mesh").length,
      batches: stages.filter((s) => s.kind === "batch").length,
      ms: performance.now() - t0,
      bytes,
    },
  };
  return erection;
}

/** A mesh's full draw: its index count, or its instance count. */
function countOf(mesh: Mesh): number {
  const inst = mesh as InstancedMesh;
  if (inst.isInstancedMesh) return inst.count;
  const g = mesh.geometry;
  return g.index !== null ? g.index.count : g.getAttribute("position").count;
}

function setCount(mesh: Mesh, geometry: BufferGeometry, n: number): void {
  const inst = mesh as InstancedMesh;
  if (inst.isInstancedMesh) inst.count = n;
  else geometry.setDrawRange(0, n);
}

/**
 * Reorder one mesh's triangles by date and stage it. Returns the reordered
 * index with each triangle's day in that order, or nothing for a geometry
 * with no index (none is drawn so).
 */
function stageMesh(
  cls: string,
  g: BufferGeometry,
  stages: Stage[],
  until: number,
): (Staged & { readonly index: Uint32Array; readonly sortedDays: Float64Array }) | undefined {
  const index = g.index;
  if (index === null) return undefined;
  const staged = stageTriangles(cls, g.getAttribute("position").array, index.array);
  g.setIndex(new BufferAttribute(staged.index, 1));
  stages.push({ kind: "mesh", geometry: g, staged: { days: staged.days, ends: staged.ends }, until });
  // Each triangle's day, in the new order: the table run out.
  const sortedDays = new Float64Array(staged.index.length / 3);
  let t = 0;
  for (let k = 0; k < staged.days.length; k++) for (const end = staged.ends[k]! / 3; t < end; t++) sortedDays[t] = staged.days[k]!;
  return { ...staged, sortedDays };
}

/**
 * Reorder one batch by date (its matrices, colours and per-instance
 * channels, or its packed seats, turns and sizes: {@link Items}), by one
 * permutation, and stage it.
 */
function stageBatch(items: Items, days: Float64Array, stages: Stage[]): number {
  const { order, days: d, ends } = stageItems(days);
  items.reorder(order);
  stages.push({ kind: "batch", items, staged: { days: d, ends } });
  return d.byteLength + ends.byteLength;
}

/** `array`'s items (`stride` wide) put in `order`: item i becomes old item order[i]. */
function permute(array: { length: number; [i: number]: number; slice(): ArrayLike<number> }, stride: number, order: Uint32Array): void {
  const old = array.slice();
  for (let i = 0; i < order.length; i++) {
    const from = order[i]! * stride;
    for (let k = 0; k < stride; k++) array[i * stride + k] = old[from + k]!;
  }
}

/** The book's dates the scrubber names as it passes them. */
const NAMED: ReadonlyArray<readonly [number, string]> = [
  [MILESTONES.foundationsBegun, "foundations begun"],
  [MILESTONES.metalBegun, "the iron begun"],
  [MILESTONES.at28m, "the legs at 28 m"],
  [MILESTONES.fourPanels, "four panels, on the pylons"],
  [MILESTONES.girdersBegun, "the 1st floor's girders begun"],
  [MILESTONES.girdersClosed, "the legs joined"],
  [MILESTONES.firstPlatform, "the 1st platform"],
  [MILESTONES.secondPlatform, "the 2nd platform"],
  [MILESTONES.intermediate, "the intermediate platform"],
  [MILESTONES.thirdPlatform, "the 3rd platform"],
  [MILESTONES.flag, "the flag on the top"],
  [MILESTONES.erected, "the erection finished"],
  [MILESTONES.riveted, "the last rivet"],
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "10 Oct 1887", and the milestone it is within a week after, if any. */
export function describeDay(day: number): string {
  const iso = isoOf(day);
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  let label = `${d} ${MONTHS[m - 1]} ${y}`;
  for (const [at, what] of NAMED) if (day >= at && day < at + 7) label += ` — ${what}`;
  return label;
}

/**
 * The scrubber: a date slider and a play button, in plain DOM in the
 * slot the page gives it (the overlay's own slider cannot be moved from
 * code, and play has to move it). `initial` is the day it opens on; `playing`
 * whether it opens running. `onDay` is called with every day it shows.
 */
export function attachScrubber(
  slot: HTMLElement,
  initial: number,
  playing: boolean,
  onDay: (day: number) => void,
): { tick(seconds: number): void; set(day: number): void; readonly day: number } {
  const row = document.createElement("div");
  row.className = "pcg-row";
  const play = document.createElement("button");
  play.type = "button";
  play.style.cssText = "flex:0 0 auto;min-width:2.2em;cursor:pointer;background:none;border:1px solid currentColor;border-radius:4px;color:inherit;opacity:0.8";
  const input = document.createElement("input");
  input.type = "range";
  input.min = String(SPAN[0]);
  input.max = String(SPAN[1]);
  input.step = "1";
  // The book's dates as ticks, where the browser draws them.
  const list = document.createElement("datalist");
  list.id = "eiffel-build-ticks";
  for (const [at] of NAMED) {
    const o = document.createElement("option");
    o.value = String(at);
    list.append(o);
  }
  input.setAttribute("list", list.id);
  const label = document.createElement("div");
  label.style.cssText = "font:12px ui-monospace,monospace;opacity:0.85;margin:-2px 0 6px";
  row.append(play, input, list);
  slot.append(row, label);

  /** Days of the erection per second of playing: the whole 29 months in about 40 s. */
  const RATE = (SPAN[1] - SPAN[0]) / 40;
  let day = initial;
  let running = playing;
  const show = (d: number): void => {
    day = Math.min(SPAN[1], Math.max(SPAN[0], d));
    input.value = String(Math.floor(day));
    const t = (day - SPAN[0]) / (SPAN[1] - SPAN[0]);
    input.style.setProperty("--p", `${t * 100}%`);
    label.textContent = describeDay(day);
    onDay(Math.floor(day));
  };
  const paintPlay = (): void => {
    play.textContent = running ? "❚❚" : "▶";
    play.title = running ? "Pause the erection" : "Play the erection";
  };
  play.addEventListener("click", () => {
    if (!running && day >= SPAN[1]) day = SPAN[0];
    running = !running;
    paintPlay();
  });
  input.addEventListener("input", () => {
    running = false;
    paintPlay();
    show(Number(input.value));
  });
  paintPlay();
  show(initial);
  return {
    tick(seconds) {
      if (!running) return;
      const before = Math.floor(day);
      day = Math.min(SPAN[1], day + seconds * RATE);
      if (day >= SPAN[1]) {
        running = false;
        paintPlay();
      }
      if (Math.floor(day) !== before) show(day);
    },
    set(d) {
      running = false;
      paintPlay();
      show(d);
    },
    /** The day shown, for the page's "copy view". */
    get day() {
      return day;
    },
  };
}

/**
 * The day `?build=` asks for: an ISO date, or nothing (the first day).
 * A value that does not parse falls back to the first day.
 */
export function buildDayParam(raw: string | null): number {
  if (raw === null || raw === "") return SPAN[0];
  const d = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? dayOf(raw) : Number.NaN;
  return Number.isFinite(d) ? Math.min(SPAN[1], Math.max(SPAN[0], d)) : SPAN[0];
}

/**
 * The capture probe's half for the erection (main.ts has the camera's
 * and the clock's): a script shows the tower on a day, by ISO date.
 */
declare global {
  interface Window {
    pcgEiffelBuild?: {
      /** Stop the scrubber and show the tower as it stood at the end of `iso` (`"1888-03-26"`). */
      setDay(iso: string): void;
    };
  }
}
