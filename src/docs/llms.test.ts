/**
 * `llms.txt` names every node type, primitive and field function the
 * library ships — and nothing regenerates it, so the only thing keeping
 * that true is this file.
 *
 * The guide is the agent-form documentation: it is what `README.md`,
 * `docs/index.html` and every `skills/*\/SKILL.md` point an agent at, and
 * it is the one documentation surface `npm run docs` does not touch and
 * CI does not diff. When it was first measured, one whole wave of work —
 * the path and network nodes — was missing from it, so an agent reading
 * it would have concluded the library could not do what it had shipped a
 * release earlier.
 *
 * Coverage only. The prose beside each name is hand-written compression
 * that no generator can produce (see the header of `llms.ts`), so a
 * failure here means "write the sentence", never "run the generator".
 * The registry is imported from source, so `npm test` checks the library
 * in the working tree with no build in between.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import "../primitives/index.js";
import { listFieldFns, listNodeTypes, listSubgraphs } from "../index.js";
import {
  GRAMMAR_SECTION,
  LLMS_TXT,
  NODE_SECTION,
  PRIMITIVE_SECTION,
  documentedFieldFns,
  extractNodeNames,
  missingPrimitives,
  outOfOrder,
  sectionOf,
  specFieldFns,
} from "./llms.js";

/**
 * Normalized the way every other doc test normalizes a committed file:
 * `autocrlf` decides the bytes on disk, and a check about content must
 * not depend on which platform checked out the tree.
 */
function readRepoFile(relative: string): string {
  const path = fileURLToPath(new URL(`../../${relative}`, import.meta.url));
  return readFileSync(path, "utf8").replaceAll("\r\n", "\n");
}

const GUIDE = readRepoFile(LLMS_TXT);

/**
 * Captured at module load, before any other suite runs. Sibling tests
 * register `test/` primitives and throwaway node types into the same
 * process-wide registries, and a name invented by a test is not a name
 * the guide owes anyone a sentence about.
 */
const NODES: readonly string[] = listNodeTypes()
  .map((t) => t.type)
  .sort();
const PRIMITIVES: readonly string[] = listSubgraphs()
  .map((p) => p.name)
  .sort();
const FIELD_FNS: readonly string[] = [...listFieldFns()].sort();

/** What to do about a name the guide has never described. */
const WRITE_IT = [
  "",
  `Fix: write the missing entry in ${LLMS_TXT}. The prose there is a hand`,
  "compression that states things the registry description does not, so",
  "nothing generates it and nothing will write it for you. Match the",
  "surrounding voice: what the node does, the params that matter, and the",
  "edge that makes it different from its neighbour.",
];

describe("llms.txt covers the node registry", () => {
  it(`has a "## ${NODE_SECTION}" section to read`, () => {
    expect(
      sectionOf(GUIDE, NODE_SECTION),
      `${LLMS_TXT} has no "## ${NODE_SECTION}" heading. Every check below reads that\n` +
        "section, so they would all pass against nothing until it comes back.",
    ).toBeTypeOf("string");
  });

  it("describes every registered node type", () => {
    const listed = extractNodeNames(GUIDE);
    expect(listed, `${LLMS_TXT}: the ${NODE_SECTION} section is missing`).toBeDefined();
    const names = new Set((listed ?? []).map((l) => l.name));
    const missing = NODES.filter((n) => !names.has(n));
    if (missing.length > 0) {
      throw new Error(
        [
          `${LLMS_TXT} describes ${names.size} node types; listNodeTypes() reports ${NODES.length}.`,
          `Undescribed (${missing.length}):`,
          ...missing.map((n) => `  ${n}`),
          ...WRITE_IT,
        ].join("\n"),
      );
    }
  });

  it("describes no node type that does not exist", () => {
    const listed = extractNodeNames(GUIDE) ?? [];
    const real = new Set(NODES);
    const phantom = listed.filter((l) => !real.has(l.name));
    if (phantom.length > 0) {
      throw new Error(
        [
          `${LLMS_TXT} describes node types the registry does not have.`,
          "A renamed node leaves its old name here, and an agent reads a bullet",
          "for something it can never construct:",
          ...phantom.map((p) => `  ${LLMS_TXT}:${p.line} — ${p.name}`),
          "",
          "Fix: rename the bullet, or delete it if the node is gone.",
        ].join("\n"),
      );
    }
  });

  it("keeps the node list alphabetical", () => {
    const listed = extractNodeNames(GUIDE) ?? [];
    const wrong = outOfOrder(listed);
    if (wrong.length > 0) {
      throw new Error(
        [
          `${LLMS_TXT}: the ${NODE_SECTION} list is out of alphabetical order.`,
          ...wrong.map((w) => `  ${w.name} comes after ${w.after}`),
          "",
          "Fix: move each one into place. A name appended at the end is present,",
          "findable by search, and invisible to anyone reading down the list —",
          "which is how a node gets described twice.",
        ].join("\n"),
      );
    }
  });
});

describe("llms.txt covers the field grammar", () => {
  it(`has a "## ${GRAMMAR_SECTION}" section to read`, () => {
    expect(sectionOf(GUIDE, GRAMMAR_SECTION), `${LLMS_TXT}: section missing`).toBeTypeOf("string");
  });

  it("shows a spec for every registered field function", () => {
    const listed = documentedFieldFns(GUIDE);
    expect(listed, `${LLMS_TXT}: the ${GRAMMAR_SECTION} section is missing`).toBeDefined();
    const names = new Set((listed ?? []).map((l) => l.name));
    const missing = FIELD_FNS.filter((n) => !names.has(n));
    if (missing.length > 0) {
      throw new Error(
        [
          `${LLMS_TXT} shows ${names.size} field fns; listFieldFns() reports ${FIELD_FNS.length}.`,
          `Undocumented (${missing.length}):`,
          ...missing.map((n) => `  ${n}`),
          "",
          "Fix: add each to the grammar section as the spec that calls it —",
          '`{ fn: "name", ...args }` — in the group it belongs to. An agent',
          "copies the shape, so a mention in a sentence is not enough.",
        ].join("\n"),
      );
    }
  });

  it("shows no field function the grammar cannot parse", () => {
    const listed = specFieldFns(GUIDE) ?? [];
    const real = new Set(FIELD_FNS);
    const phantom = listed.filter((l) => !real.has(l.name));
    if (phantom.length > 0) {
      throw new Error(
        [
          `${LLMS_TXT} shows field fns that fieldFromJson() would refuse:`,
          ...phantom.map((p) => `  ${LLMS_TXT}:${p.line} — ${p.name}`),
          "",
          "Fix: correct the spelling, or delete the example. A spec printed here",
          "is one an agent will paste into a graph.",
        ].join("\n"),
      );
    }
  });
});

describe("llms.txt covers the primitive library", () => {
  it(`has a "## ${PRIMITIVE_SECTION}" section to read`, () => {
    expect(sectionOf(GUIDE, PRIMITIVE_SECTION), `${LLMS_TXT}: section missing`).toBeTypeOf("string");
  });

  it("names every registered primitive under its family", () => {
    const missing = missingPrimitives(GUIDE, PRIMITIVES);
    if (missing.length > 0) {
      throw new Error(
        [
          `${LLMS_TXT} names ${PRIMITIVES.length - missing.length} of ${PRIMITIVES.length} primitives.`,
          `Unnamed (${missing.length}):`,
          ...missing.map((n) => `  ${n}`),
          "",
          "Fix: add each short name to its family's bullet, and bump that family's",
          "count in the same line — the count is a separate claim, checked by",
          "COUNT_CLAIMS in src/docs/site.ts, and it will fail next if you skip it.",
        ].join("\n"),
      );
    }
  });
});
