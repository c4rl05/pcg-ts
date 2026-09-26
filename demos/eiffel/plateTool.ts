/// <reference types="vite/client" />
/**
 * The plate overlay's door: an AUDIT TOOL on the dev server, not a feature
 * of the published page (the owner's decision, 2026-09-26).
 *
 * `npm run examples` and `?plate=<id>` open it (`&opacity=0.4` sets the
 * scan's opacity, so a link or a capture script reproduces a frame, and
 * the panel's "save frame" writes the current frame to a PNG). Anywhere
 * else it does nothing and costs nothing: `import.meta.hot` is the dev
 * server's own hallmark, and a build replaces it with `undefined`, so the
 * branch that imports `plateView.ts` — the camera, the quad, the panel
 * section, the e-rara scans — is dead code the bundler drops, chunk and
 * all. Checked by building the pages into a scratch directory, with
 * NODE_ENV unset and set to "development", and searching the output for
 * e-rara and the modules' names (SOURCES.md §33).
 *
 * NOT `import.meta.env.DEV`: vite folds `NODE_ENV` into it, and this
 * machine's shell exports `NODE_ENV=development`, which made a production
 * build keep the tool (measured: a `plateView-*.js` chunk in the output).
 * `vite.config.ts` and `demos/racetrack/kit.ts` record the same trap, and
 * the second one why `import.meta.env?.DEV` is no better.
 */
import type { Scene, WebGLRenderer } from "three";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";

export interface PlateOverlay {
  /** True while a plate is shown: the page's loop calls `render` instead of its own. */
  readonly active: boolean;
  /** Draw the model through the plate's camera, and the plate over it. */
  render(): void;
}

/**
 * Load the tool when the dev server serves the page with `?plate`, else
 * undefined. `slot` is called only then, so the published page's panel
 * carries no trace of it.
 */
export function loadPlateTool(opts: {
  renderer: WebGLRenderer;
  scene: Scene;
  controls: OrbitControls;
  slot: () => HTMLElement;
  report: (problem: string) => void;
}): Promise<PlateOverlay> | undefined {
  if (import.meta.hot === undefined) return undefined;
  if (!new URLSearchParams(location.search).has("plate")) return undefined;
  return import("./plateView.js").then(({ attachPlates }) =>
    attachPlates({
      renderer: opts.renderer,
      scene: opts.scene,
      controls: opts.controls,
      into: opts.slot(),
      report: opts.report,
    }),
  );
}
