/**
 * `pcg render` with PNG output: the format follows `--out`'s extension, a
 * PNG is never written to stdout, the SVG refuses what only frames can do
 * and says why, and a host io without `writeBytes` is a named failure.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EXIT_FAILURE, EXIT_OK, EXIT_USAGE, runCli } from "./index.js";
import type { CliIo } from "./io.js";

const GRAPH = "/g/forest.json";
const FOREST = readFileSync(new URL("../../graphs/examples-forest.json", import.meta.url), "utf8");

interface FakeIo {
  readonly io: CliIo;
  readonly files: Record<string, string>;
  readonly bytes: Record<string, Uint8Array>;
  stdout(): string;
  stderr(): string;
}

function fakeIo(opts: { binary?: boolean } = {}): FakeIo {
  const out: string[] = [];
  const err: string[] = [];
  const files: Record<string, string> = { [GRAPH]: FOREST };
  const bytes: Record<string, Uint8Array> = {};
  const io: CliIo = {
    out: (text) => void out.push(text),
    err: (text) => void err.push(text),
    readFile: (path) => {
      const content = files[path];
      if (content === undefined) throw new Error(`ENOENT: no such file or directory, open '${path}'`);
      return content;
    },
    writeFile: (path, data) => void (files[path] = data),
    ...(opts.binary === false ? {} : { writeBytes: (path: string, data: Uint8Array) => void (bytes[path] = data) }),
  };
  return { io, files, bytes, stdout: () => out.join(""), stderr: () => err.join("") };
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

describe("pcg render — PNG", () => {
  it("writes PNG bytes when --out ends in .png, and reports views, framing and counts", async () => {
    const io = fakeIo();
    expect(await runCli(["render", GRAPH, "--out", "/out/forest.png"], io.io)).toBe(EXIT_OK);
    const png = io.bytes["/out/forest.png"];
    expect(png).toBeDefined();
    expect([...png.subarray(0, 8)]).toEqual(PNG_SIGNATURE);
    // Never through the text channel, where a string would mangle the bytes.
    expect(io.files["/out/forest.png"]).toBeUndefined();
    const text = io.stdout();
    expect(text).toContain("wrote /out/forest.png  1280x960  sheet: hero, ground, top, side");
    expect(text).toContain("framing: extent 250 (from the content)");
    expect(text).toMatch(/instances as pyramid proxies/);
    expect(text).toMatch(/^views:$/m);
    expect(text).toMatch(/^ {2}ground +perspective +position \[/m);
    expect(text).toMatch(/pixel hash [0-9a-f]{16}/);
  });

  it("gives the same machine-readable report as the text, poses included", async () => {
    const io = fakeIo();
    expect(
      await runCli(["render", GRAPH, "--out", "/f.png", "--view", "top", "--size", "320x200", "--json"], io.io),
    ).toBe(EXIT_OK);
    const json = JSON.parse(io.stdout());
    expect(json).toMatchObject({ format: "png", out: "/f.png", width: 320, height: 200, view: "top" });
    expect(json.views).toHaveLength(1);
    expect(json.views[0]).toMatchObject({ name: "top", projection: "orthographic", up: [0, 0, -1] });
    expect(json.framing).toMatchObject({ extent: 250, pinned: false, eye: 1.7 });
    expect(json.counts.instances).toBeGreaterThan(1000);
    expect(json.legend.map((l: { name: string }) => l.name)).toContain("terrain");
    expect(json.comparable).toBeUndefined();
    expect(io.bytes["/f.png"].length).toBe(json.bytes);
  });

  it("is byte-identical across runs, and a pinned --extent that disagrees with the content says so", async () => {
    const a = fakeIo();
    const b = fakeIo();
    await runCli(["render", GRAPH, "--out", "/a.png", "--size", "200x150"], a.io);
    await runCli(["render", GRAPH, "--out", "/b.png", "--size", "200x150"], b.io);
    expect(Buffer.from(a.bytes["/a.png"]).equals(Buffer.from(b.bytes["/b.png"]))).toBe(true);

    const pinned = fakeIo();
    expect(
      await runCli(["render", GRAPH, "--out", "/p.png", "--size", "200x150", "--extent", "100", "--json"], pinned.io),
    ).toBe(EXIT_OK);
    const json = JSON.parse(pinned.stdout());
    expect(json.framing).toMatchObject({ extent: 100, pinned: true, autoExtent: 250 });
    expect(json.comparable).toMatchObject({ extent: 100, autoExtent: 250 });
    expect(json.comparable.note).toMatch(/overflows the pinned extent 100/);
    const text = fakeIo();
    await runCli(["render", GRAPH, "--out", "/p.png", "--size", "200x150", "--extent", "100"], text.io);
    expect(text.stdout()).toContain("framing: extent 100 (pinned by --extent)");
    expect(text.stdout()).toMatch(/not comparable as pinned: the content alone frames at 250/);

    const agreeing = fakeIo();
    await runCli(["render", GRAPH, "--out", "/q.png", "--size", "200x150", "--extent", "250", "--json"], agreeing.io);
    expect(JSON.parse(agreeing.stdout()).comparable).toBeUndefined();
  });

  it("refuses to write a PNG to stdout, naming the flag that asked for one", async () => {
    for (const argv of [
      ["render", GRAPH, "--view", "hero"],
      ["render", GRAPH, "--size", "320x240"],
      ["render", GRAPH, "--points"],
    ]) {
      const io = fakeIo();
      expect(await runCli(argv, io.io)).toBe(EXIT_USAGE);
      expect(io.stderr()).toMatch(/a PNG is binary, so it is never written to stdout; pass --out <file>\.png/);
      expect(io.stderr()).toContain(argv[2]);
      expect(io.stdout()).toBe("");
    }
    // `--view top` without --out is still the SVG on stdout.
    const top = fakeIo();
    expect(await runCli(["render", GRAPH, "--view", "top", "--max-primitives", "10"], top.io)).toBe(EXIT_OK);
    expect(top.stdout().startsWith("<svg")).toBe(true);
  });

  it("exits 2 on an --out extension that is neither .svg nor .png, naming both", async () => {
    for (const out of ["/x.jpg", "/x", "/dir.png/x"]) {
      const io = fakeIo();
      expect(await runCli(["render", GRAPH, "--out", out], io.io)).toBe(EXIT_USAGE);
      expect(io.stderr()).toMatch(/the format follows the extension: \.svg .* or \.png/);
      expect(io.stderr()).toContain(out);
    }
    const upper = fakeIo();
    expect(await runCli(["render", GRAPH, "--out", "/X.PNG", "--size", "64x48"], upper.io)).toBe(EXIT_OK);
    expect(upper.bytes["/X.PNG"]).toBeDefined();
  });

  it("exits 2 on a view the SVG cannot draw, and says why", async () => {
    const io = fakeIo();
    expect(await runCli(["render", GRAPH, "--out", "/s.svg", "--view", "side"], io.io)).toBe(EXIT_USAGE);
    expect(io.stderr()).toMatch(
      /--view side needs PNG output — the SVG is a flat plan of positions \(x right, z down\) with no camera or depth/,
    );
    expect(io.stderr()).toContain("--out <file>.png");
    const ok = fakeIo();
    expect(await runCli(["render", GRAPH, "--out", "/s.svg", "--view", "top", "--max-primitives", "10"], ok.io)).toBe(
      EXIT_OK,
    );
  });

  it("refuses flags that belong to the other format, and bad values, by name", async () => {
    const cases: readonly (readonly [readonly string[], RegExp])[] = [
      [["--out", "/s.svg", "--extent", "10"], /--extent applies only to PNG frames, and --out \/s\.svg writes an SVG/],
      [["--out", "/s.svg", "--eye", "2", "--points"], /--eye, --points apply only to PNG frames/],
      [["--out", "/f.png", "--width", "300"], /--width sizes the SVG; .* takes --size WxH/],
      [["--out", "/f.png", "--radius", "2"], /--radius sizes the SVG's circles/],
      [["--out", "/f.png", "--view", "front"], /flag "--view" got "front"; valid views: top, side, hero, ground, sheet/],
      [["--out", "/f.png", "--size", "big"], /flag "--size" expects WxH in pixels/],
      [["--out", "/f.png", "--size", "2000x1000"], /"--size" width 2000 is out of range for a sheet: .*32\.\.1280/],
      [["--out", "/f.png", "--view", "hero", "--size", "5000x100"], /out of range for --view hero: each edge must be 16\.\.4096/],
      [["--out", "/f.png", "--extent", "0"], /flag "--extent" expects a number greater than 0/],
      [["--out", "/f.png", "--eye", "-1"], /flag "--eye" expects a number greater than 0/],
      [["--out", "/f.png", "--attr-domain", "vertex", "--attr", "P"], /valid domains: point, primitive/],
    ];
    for (const [flags, message] of cases) {
      const io = fakeIo();
      expect(await runCli(["render", GRAPH, ...flags], io.io), flags.join(" ")).toBe(EXIT_USAGE);
      expect(io.stderr(), flags.join(" ")).toMatch(message);
    }
  });

  it("exits 1 naming the gap when the io cannot write bytes, before cooking anything", async () => {
    const io = fakeIo({ binary: false });
    expect(await runCli(["render", "/missing.json", "--out", "/f.png"], io.io)).toBe(EXIT_FAILURE);
    expect(io.stderr()).toMatch(/this CliIo has no writeBytes, so the PNG for --out \/f\.png cannot be written/);
    expect(io.stderr()).toContain("--out <file>.svg");
  });

  it("documents the formats, the new flags and what the frames draw in its help", async () => {
    const io = fakeIo();
    expect(await runCli(["render", "--help"], io.io)).toBe(EXIT_OK);
    const help = io.stdout();
    for (const needle of [
      "--view",
      "--size",
      "--extent",
      "--eye",
      "--points",
      ".png",
      ".svg",
      "sheet",
      "square-pyramid proxies (not the assets)",
      "a cross on each apex in top, side and hero",
      "ground grid",
    ]) {
      expect(help).toContain(needle);
    }
  });

  it("states in text and JSON what the marks are: proxies, apex crosses, the grid, the labels", async () => {
    const text = fakeIo();
    await runCli(["render", GRAPH, "--out", "/d.png", "--size", "200x150"], text.io);
    expect(text.stdout()).toMatch(
      /^drawn as: instances are upright square-pyramid proxies .*top, side and hero also mark each apex with a cross.*ground grid.*corner label/m,
    );
    const json = fakeIo();
    await runCli(["render", GRAPH, "--out", "/d.png", "--size", "200x150", "--json"], json.io);
    const report = JSON.parse(json.stdout());
    expect(report.drawing.markerViews).toEqual(["top", "side", "hero"]);
    expect(report.drawing.grid.views).toEqual(["hero", "ground"]);
    expect(typeof report.drawing.grid.y).toBe("number");
    expect(report.views.map((v: { label: string }) => v.label)).toEqual([
      "HERO",
      "GROUND eye 1.7",
      "TOP x→ z↓",
      "SIDE x→ y↑",
    ]);
    // The forest's ground view looks across open terrain: no occlusion line.
    expect(report.groundView.occluded).toBe(false);
    expect(text.stdout()).not.toContain("ground view: occluded");
  });

  it("reports an occluded ground view in text and JSON instead of passing it off as a picture of the scene", async () => {
    const files: Record<string, string> = {
      "/g/cave.json": readFileSync(new URL("../../graphs/basics-mesh-from-field.json", import.meta.url), "utf8"),
    };
    const io = fakeIo();
    Object.assign(io.files, files);
    expect(await runCli(["render", "/g/cave.json", "--out", "/c.png", "--view", "ground", "--size", "160x120"], io.io)).toBe(
      EXIT_OK,
    );
    expect(io.stdout()).toMatch(
      /^ground view: occluded at [\d.]+ m — \d+% of the view that flat ground would leave open past [\d.]+ m is blocked/m,
    );
    const json = fakeIo();
    Object.assign(json.files, files);
    await runCli(["render", "/g/cave.json", "--out", "/c.png", "--view", "ground", "--size", "160x120", "--json"], json.io);
    expect(JSON.parse(json.stdout()).groundView).toMatchObject({ occluded: true });
  });
});
