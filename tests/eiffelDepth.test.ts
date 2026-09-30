/**
 * The eiffel page's depth query (demos/eiffel/depth.ts): what each URL
 * cooks and streams, and that the panel's "apply" writes a URL that reads
 * back as the depth it was asked for.
 */
import { describe, expect, it } from "vitest";
import { DEPTHS, type Depth, cookedDetail, depthParams, pageDepth, streamed } from "../demos/eiffel/depth.js";

const at = (d: Depth): number => DEPTHS.indexOf(d);
/** Every pair the page allows: rivets never further than the lacing. */
const ALLOWED = DEPTHS.flatMap((laced) =>
  DEPTHS.filter((rivets) => at(rivets) <= at(laced)).map((rivets) => ({ laced, rivets })),
);

describe("eiffel page depth", () => {
  it("allows six pairs", () => {
    expect(ALLOWED).toHaveLength(6);
  });

  it("reads back every pair apply writes, and the radii beside a streamed one", () => {
    for (const { laced, rivets } of ALLOWED) {
      const q = depthParams(laced, rivets).join("&");
      expect(pageDepth(q), q).toMatchObject({ laced, rivets, fullRivets: false });
      // Apply carries `bands=` only while something streams: alone, it is
      // still the old spelling of "stream both".
      if (laced === "streamed" || rivets === "streamed") {
        expect(pageDepth(`${q}&bands=90,30`), q).toMatchObject({ laced, rivets });
      }
    }
  });

  it("keeps the old URLs", () => {
    expect(pageDepth("")).toMatchObject({ laced: "off", rivets: "off" });
    expect(pageDepth("?laced")).toMatchObject({ laced: "whole", rivets: "off" });
    expect(pageDepth("?rivets")).toMatchObject({ laced: "whole", rivets: "whole", fullRivets: false });
    expect(pageDepth("?rivets=full")).toMatchObject({ laced: "whole", rivets: "whole", fullRivets: true });
    expect(pageDepth("?bands")).toMatchObject({ laced: "streamed", rivets: "streamed" });
    expect(pageDepth("?bands=150,50")).toMatchObject({ laced: "streamed", rivets: "streamed" });
  });

  it("reads =off as off, and any other value as whole", () => {
    expect(pageDepth("?laced=off&rivets=off")).toMatchObject({ laced: "off", rivets: "off" });
    expect(pageDepth("?laced=whole")).toMatchObject({ laced: "whole", rivets: "off" });
  });

  it("writes whole rivets as ?rivets, and keeps =full when asked", () => {
    expect(depthParams("whole", "whole")).toEqual(["rivets"]);
    expect(depthParams("whole", "whole", true)).toEqual(["rivets=full"]);
    expect(depthParams("whole", "streamed", true)).toEqual(["laced", "rivets=streamed"]);
    expect(depthParams("off", "off")).toEqual([]);
  });

  it("raises the lacing to the rivets in a hand-written URL", () => {
    expect(pageDepth("?rivets=streamed")).toMatchObject({ laced: "streamed", rivets: "streamed" });
    expect(pageDepth("?laced=streamed&rivets")).toMatchObject({ laced: "whole", rivets: "whole" });
  });

  it("streams nothing under ?build", () => {
    const d = pageDepth("?bands&build");
    expect(d).toMatchObject({ laced: "off", rivets: "off", build: true });
    expect(streamed(d)).toBeUndefined();
    expect(pageDepth("?laced&rivets=streamed&build")).toMatchObject({ laced: "whole", rivets: "off" });
  });

  it("cooks the depth below a streamed axis whole, and streams the rest", () => {
    const b = pageDepth("?laced&rivets=streamed");
    expect(cookedDetail(b)).toMatchObject({ lacedWeb: true, rivets: false });
    expect(streamed(b)).toEqual({ laced: false, rivets: true });
    const a = pageDepth("?laced=streamed");
    expect(cookedDetail(a)).toMatchObject({ lacedWeb: false, rivets: false });
    expect(streamed(a)).toEqual({ laced: true, rivets: false });
    expect(streamed(pageDepth("?rivets"))).toBeUndefined();
  });
});
