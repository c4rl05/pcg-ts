/**
 * The brick house pinned over 60 configurations: seeds 1-20 at the default
 * params, then 40 that draw every graph param (see
 * tests/support/brickHousePin.ts for what is hashed and why). The corpus
 * golden pins the default seed's counts and bounds; this pins the bytes,
 * and the stages placeBox and offsetBox write, everywhere else.
 *
 * The digests were computed from the SETBOUNDS house the box nodes
 * replaced (graphs/examples-brick-house.json at 19ab534f) and equal the
 * box-node house's, so a failure here is a change to what those five
 * stages write. If the house is changed ON PURPOSE, regenerate the list
 * from the new graph and say why in the commit.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { cook, deserializeGraph } from "../src/index.js";
import { houseConfigs, houseDigest } from "./support/brickHousePin.js";

const HOUSE = fileURLToPath(new URL("../graphs/examples-brick-house.json", import.meta.url));

const PINNED = [
  "9a6853b6dfd1ac7b", "6acfea49c93b2156", "745eb6d9179767b1", "f36cb491f5001eff",
  "8c2f4753b8ff485e", "336b62ae295f4b09", "8b42bdbab9c62996", "b3df521d44437f11",
  "41eef25fc1c0def9", "78cafac0325a2e2d", "2b7e55c3a006b1f6", "671fc9b5857c9250",
  "45c0b77e7865d99d", "1a887e654b0748f5", "b9a2a0d0f7bc7e4c", "70564bce5a306b1f",
  "fa0c3a1af90d06ae", "fa20957bcda940d1", "d8101d83349076f8", "6ee4182921da2249",
  "be406e11d434bd13", "e25a156237bb58d2", "a0cbe70d2a931b43", "0867569894607d18",
  "ed894046925d9354", "4d034ed314e52e08", "dad04b0c2ddab504", "a587db494c6b9005",
  "ca402271be3c2fe9", "33d3b02386d024f9", "bcef6e65f10e25ab", "9890aaa1fbbf2a32",
  "3083a5a371a89e75", "9b9b22a73407a737", "ad0110e80a06e4d1", "c3c9968704dc3472",
  "fa8c89d9f7a28dd1", "4c11be0f79a72381", "94f17cd0035e0ade", "7416facec5c7cb63",
  "cb86c2f057f92fa7", "b791f4861852f715", "6a2a23368802eb27", "5aebae9497eed857",
  "476dc9466528e085", "1ffbb57599e5d4c0", "621c6df1ce952248", "55090c44cd72989f",
  "eec27ea841f5630e", "c617bf7fafc51eac", "f0ce285fec53859f", "de55cbe796bcb671",
  "68d09f1d04ff99e1", "d9ce5e257b05da33", "b28717fe0f2c151c", "fe164052f0899465",
  "5d45b11d93857f69", "49d0e8d0fc0d1bec", "e3e50d8ccfb56d16", "9d181d91910842bb",
];

const load = () => JSON.parse(readFileSync(HOUSE, "utf8"));

async function digests(house: Parameters<typeof houseConfigs>[0]): Promise<string[]> {
  const out: string[] = [];
  for (const g of houseConfigs(house, 20, 40)) out.push(houseDigest((await cook(deserializeGraph(g))).outputs));
  return out;
}

describe("the brick house, pinned over seeds and graph params", () => {
  it("cooks to the pinned bytes on all 60 configurations", async () => {
    expect(await digests(load())).toEqual(PINNED);
  }, 60_000);

  it("the pin can fail: the chimney shadow left unclipped (fit \"allow\") changes it", async () => {
    const g = load();
    const walk = (nodes: { id: string; params: Record<string, unknown>; subgraph?: { graph: { nodes: never[] } } }[]): void => {
      for (const n of nodes) {
        if (n.id === "chimShadow") n.params.fit = "allow";
        if (n.subgraph) walk(n.subgraph.graph.nodes);
      }
    };
    walk(g.nodes);
    const got = await digests(g);
    expect(got.filter((d, i) => d !== PINNED[i]).length).toBeGreaterThan(0);
  }, 60_000);
});
