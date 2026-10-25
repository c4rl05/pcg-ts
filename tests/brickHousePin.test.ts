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
  "339ed4356ae0bf56", "07f8654a014863dc", "a1c6b56adf98552d", "671503bdbf953602",
  "7b3d0513b2c86cac", "3d6010222ebce31a", "cced58092b1a49c8", "6aae25559890b00b",
  "574502eb229a508f", "68806fee269c7ba8", "4f25af5f09b4685a", "ad4f71311affdf80",
  "c5a51bc99db9a0b1", "758d5ce432cd16cc", "3417b389c3603995", "7452ae81b7bbfeaf",
  "45017afb5c8ff9fb", "127a5629d9af3af6", "05bc4c4659824320", "86ca89db36101d97",
  "64ed38e75a5d6c0e", "9c6e95043649a743", "a39bdededcf29615", "4b47b45b494b92a6",
  "d20f49531034c88b", "68fb4bdaa945502e", "9f88e4a07e5beb38", "499cd5e5ce7a17a7",
  "aa85dad09791754b", "ce99d51a4452c428", "a0894d8204b1d7e7", "68d9ebd0175a5fd2",
  "ac5890a6c9fb8fd3", "c46d6ee653616906", "cc4a87a8a2bb6cf3", "43b9b1461c747027",
  "d59f035a6e7db3f8", "ac72178bc711f700", "11b1214e006ea3b1", "1936a79df64122d2",
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
