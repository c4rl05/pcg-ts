/**
 * A doc comment that describes a cooked result's SHAPE is checked against
 * the shape, not trusted.
 *
 * This exists because `Geometry`'s own doc comment said "one AttributeSet
 * per domain plus topology" while the three topology arrays sat flat on
 * the object. Readers — people and agents both — believed the sentence and
 * reached for `geo.topology`, which is `undefined`. Rewording it would fix
 * that one sentence and leave the next one free to drift, so each type
 * whose shape gets described in prose carries a machine-checked line
 * instead:
 *
 *     Properties, in full: `a`, `b`, `c`.
 *
 * and this suite reads the names back off a REAL value of that type. A
 * member added, renamed or removed fails here, naming the line to fix, so
 * the comment cannot outlive the object it describes. `absent` pins the
 * other half — the names readers actually guessed — so a future rename
 * that resurrects one of them as a real member fails here too.
 *
 * The values are built by the library's own factories rather than by
 * object literals here, so the suite cannot agree with a stale copy of the
 * shape it is meant to police.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { AttributeSet, Geometry } from "../src/data/index.js";
import type { GeometryItem, InstanceBatch } from "../src/graph/data.js";
import { makeGeometryItem, makeInstanceBatch } from "../src/graph/data.js";

/**
 * `true` only when `Names` is exactly the key set of `T`.
 *
 * An interface's OPTIONAL members cannot be read off a value — a batch
 * that omits `residency` is still a batch — so for the two payload
 * interfaces the documented list is pinned to `keyof T` at compile time
 * instead, and `npm run check` is what fails when a member is added.
 * Without this the runtime half would pass a list that is merely what
 * some factory happened to produce.
 */
type KeysAre<T, Names extends string> = [Names] extends [keyof T & string]
  ? [keyof T & string] extends [Names]
    ? true
    : never
  : never;

/** Every key of `GeometryItem`, checked against the interface. */
const GEOMETRY_ITEM_KEYS = ["geo", "kind", "rev", "tags"] as const;
const _geometryItemKeysAreComplete: KeysAre<
  GeometryItem,
  (typeof GEOMETRY_ITEM_KEYS)[number]
> = true;

/** Every key of `InstanceBatch`, optional members included. */
const INSTANCE_BATCH_KEYS = [
  "assetId",
  "attributes",
  "colors",
  "count",
  "residency",
  "transforms",
] as const;
const _instanceBatchKeysAreComplete: KeysAre<
  InstanceBatch,
  (typeof INSTANCE_BATCH_KEYS)[number]
> = true;

/** Read a repo-relative source file, from this suite's own location. */
function readSource(file: string): string {
  return readFileSync(fileURLToPath(new URL(`../${file}`, import.meta.url)), "utf8");
}

/**
 * The marker a shape-describing doc comment ends with. It says "not
 * methods" because the check reads properties off a value and a method is
 * not one: a comment claiming to list everything would be false for any
 * class. The marker's paragraph carries the list and NOTHING else — every
 * backticked name after it is read as a claim — so anything a comment
 * wants to add about those properties goes above it.
 */
const MARKER = "Properties (not methods), in full:";

interface ShapeCase {
  /** The declaration this suite reads the doc comment above. */
  readonly declaration: string;
  /** Source file, repo-relative. */
  readonly file: string;
  /** A real value of the type, as complete as the type allows. */
  readonly value: object;
  /**
   * Names the runtime value carries that the type does not publish:
   * TypeScript `private` fields, which are ordinary own properties once
   * the class is compiled. Listed one by one so that a NEW field has to be
   * classified by hand rather than slipping through a pattern.
   */
  readonly internal?: readonly string[];
  /**
   * For an interface, its complete key set as the compile-time assertions
   * above pin it. The runtime value still has to be a subset of this, so
   * neither half can drift alone: the type check catches a member the
   * factory never produces, the value check catches a name the interface
   * does not declare.
   */
  readonly declaredKeys?: readonly string[];
  /** Names readers have guessed that are NOT members, and must stay absent. */
  readonly absent: readonly string[];
}

/** A maximal batch: every optional member a CPU batch can carry, present. */
function maximalBatch(): object {
  return makeInstanceBatch("asset", 1, new Float32Array(16), {
    color: new Float32Array(3),
  });
}

const CASES: readonly ShapeCase[] = [
  {
    declaration: "export class Geometry {",
    file: "src/data/geometry.ts",
    value: new Geometry(),
    absent: ["topology"],
  },
  {
    declaration: "export class AttributeSet implements Iterable<Attribute> {",
    file: "src/data/attribute.ts",
    value: new AttributeSet(),
    internal: ["map", "_count", "_capacity"],
    absent: ["set", "entries", "keys", "values", "forEach"],
  },
  {
    declaration: "export interface GeometryItem {",
    file: "src/graph/data.ts",
    value: makeGeometryItem(new Geometry()),
    declaredKeys: GEOMETRY_ITEM_KEYS,
    absent: ["geometry"],
  },
  {
    declaration: "export interface InstanceBatch {",
    file: "src/graph/data.ts",
    value: maximalBatch(),
    declaredKeys: INSTANCE_BATCH_KEYS,
    absent: ["matrices"],
  },
];

/**
 * The doc comment immediately above `declaration`: the last `/** … *\/`
 * block before it, with only whitespace in between. A declaration with no
 * such block returns `undefined` rather than the nearest block further up,
 * which would otherwise be checked against the wrong type.
 */
function docCommentAbove(source: string, declaration: string): string | undefined {
  const at = source.indexOf(declaration);
  if (at === -1) return undefined;
  const before = source.slice(0, at);
  const close = before.lastIndexOf("*/");
  if (close === -1 || before.slice(close + 2).trim() !== "") return undefined;
  const open = before.lastIndexOf("/**", close);
  return open === -1 ? undefined : before.slice(open, close + 2);
}

/** Every distinct `backticked` identifier in `text`, sorted. */
function backtickedNames(text: string): string[] {
  const names = new Set<string>();
  for (const m of text.matchAll(/`([A-Za-z_$][\w$]*)`/g)) names.add(m[1] as string);
  return [...names].sort();
}

/**
 * What a consumer can read off `value`: its own enumerable properties
 * (which is where a plain payload's fields and a class's instance fields
 * both land) plus the getters on its class, less the names declared
 * internal.
 */
function publicProperties(value: object, internal: readonly string[]): string[] {
  const names = new Set(Object.keys(value));
  const proto: object | null = Object.getPrototypeOf(value) as object | null;
  if (proto !== null && proto !== Object.prototype) {
    for (const [name, d] of Object.entries(Object.getOwnPropertyDescriptors(proto))) {
      if (name !== "constructor" && typeof d.get === "function") names.add(name);
    }
  }
  for (const name of internal) names.delete(name);
  return [...names].sort();
}

describe("doc comments that describe a shape", () => {
  for (const c of CASES) {
    const label = c.declaration.replace(/^export (class|interface) /, "").replace(/ .*$/, "");

    describe(label, () => {
      const block = docCommentAbove(readSource(c.file), c.declaration);

      it("carries a doc comment ending in the machine-checked property line", () => {
        expect(block, `${c.file}: no doc comment above "${c.declaration}"`).toBeDefined();
        expect(block as string).toContain(MARKER);
      });

      it("hides nothing real behind its internal list", () => {
        const own = new Set(Object.keys(c.value));
        for (const name of c.internal ?? []) {
          expect(own.has(name), `${label}: "${name}" is declared internal but is not a property`)
            .toBe(true);
        }
      });

      it("names exactly the properties the real value carries", () => {
        const region = (block as string).slice((block as string).indexOf(MARKER) + MARKER.length);
        const documented = backtickedNames(region);
        const actual = publicProperties(c.value, c.internal ?? []);
        // A declared key set (an interface) is the authority, since its
        // optional members are absent from any one value; the value must
        // still be a subset of it, so neither can drift alone.
        if (c.declaredKeys !== undefined) {
          expect(
            actual.filter((n) => !c.declaredKeys?.includes(n)),
            `${label}: the value carries properties the interface does not declare`,
          ).toEqual([]);
        }
        const expected = [...(c.declaredKeys ?? actual)].sort();
        expect(
          documented,
          `${c.file}: the "${MARKER}" line of ${label} disagrees with the object — ` +
            `write: ${MARKER} ${expected.map((n) => `\`${n}\``).join(", ")}.`,
        ).toEqual(expected);
      });

      it("keeps the names readers guessed off the object, and says so", () => {
        for (const name of c.absent) {
          expect(name in c.value, `${label}.${name} exists; the doc calls it absent`).toBe(false);
          expect(block as string, `${c.file}: ${label}'s doc never mentions \`${name}\``).toContain(
            `\`${name}\``,
          );
        }
      });
    });
  }
});
