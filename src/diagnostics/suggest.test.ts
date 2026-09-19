import { describe, expect, it } from "vitest";

import { closestNames, editDistance } from "./suggest.js";

describe("editDistance", () => {
  it("is Levenshtein distance", () => {
    expect(editDistance("", "")).toBe(0);
    expect(editDistance("abc", "")).toBe(3);
    expect(editDistance("", "abc")).toBe(3);
    expect(editDistance("kitten", "sitting")).toBe(3);
    expect(editDistance("flaw", "lawn")).toBe(2);
  });

  it("is case-sensitive; closestNames lowers both sides itself", () => {
    expect(editDistance("Abc", "abc")).toBe(1);
  });
});

describe("closestNames", () => {
  it("keeps candidates within a third of the name's length", () => {
    // "perlinNoise" has 11 code units: a limit of 3.
    const within = "pXrXinXoise"; // three substitutions
    const beyond = "pXrXiXXoise"; // four
    expect(closestNames("perlinNoise", [within, beyond])).toEqual([within]);
  });

  it("never lets the limit fall below 2, so short names still get suggestions", () => {
    expect(closestNames("sn", ["sin"])).toEqual(["sin"]); // distance 1
    expect(closestNames("x", ["abc"])).toEqual([]); // distance 3
    expect(closestNames("ab", ["xy"])).toEqual(["xy"]); // distance 2 is still in
  });

  it("measures distance case-insensitively and puts case-only matches first", () => {
    // "Beta" sorts before "zeta" in code units, and is one edit away; the
    // case-only match still leads because its distance is zero.
    expect(closestNames("Zeta", ["Beta", "zeta"])).toEqual(["zeta", "Beta"]);
    expect(closestNames("SIN", ["sign", "sin"])).toEqual(["sin", "sign"]);
  });

  it("breaks ties by code-unit order, not by locale collation", () => {
    // Both at distance 1 from "abx". Code units put "D" (0x44) before "c"
    // (0x63); collation compares letters first and puts "abc" first.
    const candidates = ["abc", "abD"];
    expect("abc".localeCompare("abD", "en")).toBeLessThan(0);
    expect(closestNames("abx", candidates)).toEqual(["abD", "abc"]);
    expect(closestNames("abx", [...candidates].reverse())).toEqual(["abD", "abc"]);
  });

  it("returns at most `max`, nearest first", () => {
    const candidates = ["abcd", "abce", "abcf", "abcg", "abcdx"];
    // Four candidates tie at distance 1; code-unit order puts "abcdx"
    // ("d" < "e") ahead of "abce".
    expect(closestNames("abcd", candidates)).toEqual(["abcd", "abcdx", "abce"]);
    expect(closestNames("abcd", candidates, 1)).toEqual(["abcd"]);
    expect(closestNames("abcd", candidates, 5)).toEqual(["abcd", "abcdx", "abce", "abcf", "abcg"]);
    expect(closestNames("abcd", candidates, 0)).toEqual([]);
  });

  it("keeps a whole-prefix near miss that edit distance throws away", () => {
    // The `--out` / `--output` case. Three edits is outside the limit for a
    // six-letter name (max(2, 6/3) = 2), so without the prefix rule these
    // all come back empty and the reader is told only what IS valid.
    expect(editDistance("output", "out")).toBe(3);
    expect(closestNames("output", ["out", "seed", "stats"])).toEqual(["out"]);
    expect(closestNames("outputs", ["out"])).toEqual(["out"]);
    // Either direction: the refused name may be the shorter one.
    expect(closestNames("scatter", ["scatterPoints"])).toEqual(["scatterPoints"]);
  });

  it("caps how much longer the full name may be than the stub", () => {
    // The cap, not a character floor, is what keeps this rule honest.
    // MEASURED against the real registries: a bare prefix rule made "exp"
    // a suggestion for "expression" — an author who writes "expression"
    // means an expression, not the exponential — and let "att" reach
    // "attributeRemap", eleven edits away, as a did-you-mean.
    expect(closestNames("expression", ["exp"])).toEqual([]);
    expect(closestNames("att", ["attributeRemap"])).toEqual([]);
    // 3x is the line, and it keeps every case the rule exists for.
    expect(closestNames("exponent", ["exp"])).toEqual(["exp"]); // 8 <= 3*3
    expect(closestNames("input", ["in"])).toEqual(["in"]); // 5 <= 3*2
    expect(closestNames("inbound", ["in"])).toEqual([]); // 7 > 3*2
    // A prefix of equal length is the same name, handled by distance 0.
    expect(closestNames("out", ["out"])).toEqual(["out"]);
  });

  it("ranks a prefix near miss by its real distance, behind any true typo", () => {
    // The prefix rule admits a candidate; it never promotes one. A
    // one-letter slip still leads, and `suggestNames` keeps only that tier.
    expect(closestNames("output", ["out", "outputs"])).toEqual(["outputs", "out"]);
  });

  it("accepts any iterable and is stable across calls", () => {
    const set = new Set(["fbm", "fract", "floor"]);
    const first = closestNames("fmb", set.keys());
    expect(first).toEqual(closestNames("fmb", [...set]));
    expect(first[0]).toBe("fbm");
  });
});
