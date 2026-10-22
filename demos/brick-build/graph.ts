/// <reference types="vite/client" />
/**
 * The graph: the corpus' brick house, with three channels let out.
 *
 * THIS IS THE CORPUS GRAPH, NOT A COPY OF IT. `graphs/examples-brick-house.json`
 * is read as text at build time and four things are changed on the way
 * into `deserializeGraph`, each named below and each checked, so an edit
 * upstream that moves one is refused here by name instead of drawing a
 * house that plays back wrong. A frozen copy of its 290 KB in this
 * directory would stop being the corpus house the first time the corpus
 * changed, and nothing would say so.
 *
 * WHY IT HAS TO CHANGE AT ALL. The corpus graph answers "what stands after
 * step t" by FILTERING: `built` keeps the bricks whose `step` is at most
 * its `buildStep` param, and `showing` keeps the studs that stand on a
 * placed brick and are not yet covered. That is the right shape for a
 * graph, which has no clock, and the wrong one for playback: every step
 * would be a cook. So this page cooks once, with every brick and every
 * stud kept, and moves the filter into the vertex shader, which needs the
 * numbers the filter read. The spawners carry none of them
 * (`instanceAttrs: []`), so:
 *
 *   1. `bricks` carries `step` — the build step `brickConnectivity` gave
 *      the brick, -1 for one no order can attach.
 *   2. `studs` carries `step`, `stepAbove` and `brickAbove` — the step of
 *      the brick it stands on, of the brick resting on it, and whether
 *      there is one at all. `stepAbove` alone cannot tell "nothing rests
 *      here" (always showing) from "what rests here is never attached"
 *      (covered only in the whole build), and the corpus graph's own
 *      `showing` filter tells them apart by `brickAbove`, so the shader
 *      has to as well.
 *   3. `pots` carries `step`, the step of the chimney brick it stands on.
 *   4. `showing` keeps every stud. At the graph's whole build it drops the
 *      covered ones, which are exactly the studs a partial build shows.
 *
 * And `buildStep` is pinned to its declared maximum, the whole build, so
 * `built` keeps every brick, including the step -1 ones the page shows
 * only in the finished house — which is what the graph does too.
 */
import HOUSE_TEXT from "../../graphs/examples-brick-house.json?raw";
import { type Graph, deserializeGraph } from "pcg-ts";

/** The corpus file this page builds, for messages. */
const SOURCE = "graphs/examples-brick-house.json";

/** The named outputs a cook of this graph produces. */
export const OUTPUTS = {
  bricks: "bricks",
  studs: "studs",
  pots: "pots",
} as const;

/**
 * The per-instance channels, by the names the graph writes them under.
 * `step` and `stepAbove` are `brickConnectivity`'s `stepAttr` and
 * `stepAboveAttr` (checked against its params below); `brickAbove` is
 * `packBricks`' own stud column. All three are i32.
 */
export const CHANNELS = {
  step: "step",
  stepAbove: "stepAbove",
  brickAbove: "brickAbove",
} as const;

/** One declared graph param, as the file states it. */
export interface HouseParam {
  readonly name: string;
  readonly value: number;
  readonly min?: number;
  readonly max?: number;
  readonly description?: string;
}

/** One declared output: `role: "asset"` marks a mesh the graph supplies. */
export interface HouseOutput {
  readonly name: string;
  readonly role?: string;
}

interface SerializedNode {
  readonly id: string;
  readonly type: string;
  params: Record<string, unknown>;
}

/** A declared param as parsed, before the page sets its value. */
type MutableParam = { -readonly [K in keyof HouseParam]: HouseParam[K] };

interface SerializedHouse {
  seed: number;
  params: MutableParam[];
  nodes: SerializedNode[];
  outputs: HouseOutput[];
  meta?: { title?: string };
}

const parse = (): SerializedHouse => JSON.parse(HOUSE_TEXT) as SerializedHouse;

/** Parsed once for what the page reads without cooking. */
const DECLARED = parse();

/** The seed the corpus file cooks at. */
export const DEFAULT_SEED: number = DECLARED.seed;

/** Every param the graph declares, as declared. */
export const HOUSE_PARAMS: readonly HouseParam[] = DECLARED.params;

/** The graph's declared outputs, for resolving its asset meshes. */
export const HOUSE_OUTPUTS: readonly HouseOutput[] = DECLARED.outputs;

/** The param the corpus filters the build by; held at its maximum here. */
const BUILD_STEP = "buildStep";

function nodeOf(json: SerializedHouse, id: string, type: string): SerializedNode {
  const node = json.nodes.find((n) => n.id === id);
  if (node === undefined) {
    throw new Error(
      `brick-build: ${SOURCE} has no node "${id}" (a ${type}); this page lets the build-step ` +
        `channels out through it. Update demos/brick-build/graph.ts to the graph's new node ids.`,
    );
  }
  if (node.type !== type) {
    throw new Error(
      `brick-build: node "${id}" in ${SOURCE} is a ${node.type}, not the ${type} this page patches; ` +
        `update demos/brick-build/graph.ts.`,
    );
  }
  return node;
}

/** What the page can turn: the seed, and any declared param by name. */
export interface HouseOptions {
  readonly seed?: number;
  readonly params?: Readonly<Record<string, number>>;
}

/** The corpus house, ready to cook once and play back. */
export function buildHouseGraph(opts: HouseOptions = {}): Graph {
  const json = parse();
  if (opts.seed !== undefined) json.seed = opts.seed >>> 0;

  for (const [name, value] of Object.entries(opts.params ?? {})) {
    const param = json.params.find((p) => p.name === name);
    if (param === undefined) {
      throw new Error(
        `brick-build: ${SOURCE} declares no param "${name}"; it declares ` +
          json.params.map((p) => p.name).join(", "),
      );
    }
    param.value = value;
  }
  const buildStep = json.params.find((p) => p.name === BUILD_STEP);
  if (buildStep === undefined || buildStep.max === undefined) {
    throw new Error(
      `brick-build: ${SOURCE} has no "${BUILD_STEP}" param with a max; the page pins it to the ` +
        `whole build so every brick is cooked.`,
    );
  }
  buildStep.value = buildStep.max;

  // The channel names are the connectivity node's, so check they are
  // still the ones the shader declares.
  const connect = nodeOf(json, "connect", "brickConnectivity");
  for (const [param, name] of [
    ["stepAttr", CHANNELS.step],
    ["stepAboveAttr", CHANNELS.stepAbove],
  ] as const) {
    if (connect.params[param] !== name) {
      throw new Error(
        `brick-build: node "connect" writes ${param} = ${JSON.stringify(connect.params[param])}, ` +
          `but the page reads the channel "${name}"; update CHANNELS in demos/brick-build/graph.ts.`,
      );
    }
  }

  nodeOf(json, OUTPUTS.bricks, "spawnInstances").params.instanceAttrs = [CHANNELS.step];
  nodeOf(json, OUTPUTS.studs, "spawnInstances").params.instanceAttrs = [
    CHANNELS.step,
    CHANNELS.stepAbove,
    CHANNELS.brickAbove,
  ];
  nodeOf(json, OUTPUTS.pots, "spawnInstances").params.instanceAttrs = [CHANNELS.step];
  // Every stud, covered or not: the shader decides which show.
  nodeOf(json, "showing", "filterByExpression").params.predicate = 1;

  return deserializeGraph(json);
}
