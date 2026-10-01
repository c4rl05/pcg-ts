/**
 * The plate overlay, the page's half (`plates.ts` is the data and the
 * math): an orthographic camera put on a figure's projection, the scanned
 * figure laid over the model as one textured quad, and the panel section
 * that picks the figure, sets its opacity and saves the frame.
 *
 * AN AUDIT TOOL ON THE DEV SERVER, NOT A FEATURE OF THE PAGE (the owner's
 * decision, 2026-09-26): `plateTool.ts` imports this module only when the
 * dev server serves the page with `?plate`, and a build drops it.
 *
 * THE CAMERA. The page's own camera is a perspective one under orbit
 * controls, feeding the rig's composer (occlusion, vignette). A plate is an
 * orthographic projection, so while one is shown this module draws the
 * scene itself, straight to the screen through its own orthographic camera,
 * and the page's camera, controls and composer are left exactly as they
 * were, to be taken up again by "back to orbit". The drawn frame loses the
 * composer's occlusion, which is the right trade for a comparison with a
 * line drawing. Fog is lifted while a plate is up (an orthographic camera
 * stands hundreds of metres off, and the fog would grey the tower by that
 * distance), and the sky's cube, which an orthographic camera cannot draw,
 * gives way to a paper tone; both come back on the way out. Pan and zoom
 * work on the plate's camera (left drag pans, the wheel zooms to the
 * cursor); it does not rotate, because a rotated view is no longer the
 * plate's projection.
 *
 * THE QUAD is in world space, in front of the model inside the frustum,
 * and drawn in a second pass with no depth test, so it lies over
 * everything. Its corners are the figure's region mapped through the fitted
 * affine, so the scan stays on the model under any pan or zoom. Not tone
 * mapped: the scan's paper is shown as the library photographed it.
 *
 * THE IMAGE is requested from e-rara's IIIF server at runtime with CORS
 * (the server allows any origin), region and size only — see `plates.ts`.
 *
 * `?plate=<id>` opens on a figure (`?plate` alone opens the picker) and
 * `&opacity=` sets the scan's opacity; choosing either writes it back into
 * the URL with `replaceState`, so the address bar always reproduces the
 * frame on screen, up to pan and zoom. "save frame" writes the frame as it
 * stands, pan and zoom included, to a PNG. A scripted capture reads
 * `document.body.dataset.plate`: "loading", then "ready" once the texture is
 * on the quad, or "failed".
 */
import { mount } from "svelte";
import {
  BufferGeometry,
  Color,
  type CubeTexture,
  Float32BufferAttribute,
  type Fog,
  MOUSE,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  Plane,
  SRGBColorSpace,
  Scene,
  type Texture,
  TextureLoader,
  TOUCH,
  Vector3,
  type WebGLRenderer,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import PlatePanel from "./PlatePanel.svelte";
import type { PlateOverlay } from "./plateTool.js";
import {
  PLATE_CREDIT,
  PLATE_FIGURES,
  type PlateFigure,
  fitPlate,
  plateCamera,
  plateCorners,
  plateFromQuery,
  plateOpacity,
  plateUrl,
  viewBasis,
  viewToWorld,
  worldToView,
} from "./plates.js";


/** The paper the sky gives way to: the scan's own tone, a little lighter. */
const PAPER = new Color(0xece5d8);

/** Keeps y ≥ −2 cm: an elevation's ground, which the model's ground plane, edge-on, cannot draw. */
const GROUND_CLIP = [new Plane(new Vector3(0, 1, 0), 0.02)];


/** What the panel component exposes (see `PlatePanel.svelte`). */
interface PanelApi {
  setCurrent(id: string): void;
  setStatus(text: string): void;
}

export function attachPlates(opts: {
  renderer: WebGLRenderer;
  scene: Scene;
  /** The page's orbit controls: disabled while a plate is up, restored after. */
  controls: OrbitControls;
  /** A slot in the page's panel. */
  into: HTMLElement;
  /** Where a problem is said, where the person judging will see it. */
  report: (problem: string) => void;
}): PlateOverlay {
  const { renderer, scene, controls } = opts;

  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.01, 1000);
  /**
   * Pan and zoom for the plate's camera, made on the first pick so that a
   * page nobody picks a plate on has no second set of listeners on its
   * canvas at all.
   */
  let panControls: OrbitControls | undefined;
  function panner(): OrbitControls {
    if (panControls !== undefined) return panControls;
    const c = new OrbitControls(camera, renderer.domElement);
    c.enableRotate = false;
    c.enableDamping = false;
    c.screenSpacePanning = true;
    c.zoomToCursor = true;
    c.mouseButtons = { LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN };
    c.touches = { ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_PAN };
    panControls = c;
    return c;
  }

  const overlayScene = new Scene();
  const material = new MeshBasicMaterial({
    transparent: true,
    opacity: plateOpacity(location.search),
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(new Float32Array(12), 3));
  // Top-left, top-right, bottom-right, bottom-left of the image, as
  // `plateCorners` orders them; a texture's v runs up.
  geometry.setAttribute("uv", new Float32BufferAttribute([0, 1, 1, 1, 1, 0, 0, 0], 2));
  geometry.setIndex([0, 3, 1, 1, 3, 2]);
  const quad = new Mesh(geometry, material);
  quad.frustumCulled = false;
  quad.visible = false;
  overlayScene.add(quad);

  const loader = new TextureLoader();
  loader.setCrossOrigin("anonymous");

  let current: PlateFigure | undefined;
  /** Bumped on every pick, so a slow texture for a figure left behind is dropped. */
  let ticket = 0;
  let saved: { fog: Fog | null; background: Color | CubeTexture | Texture | null } | undefined;

  function frame(fig: PlateFigure): void {
    const fit = fitPlate(fig);
    // Framed in the part of the screen the panel leaves free, so the figure
    // is not half under it: the frustum spans the whole window, and the
    // camera moves left by the panel's share of it.
    const w = window.innerWidth;
    const h = window.innerHeight;
    const inset = panelInset();
    const cam = plateCamera(fig, fit, (w - inset) / h);
    const halfWidth = (cam.halfHeight * w) / h;
    const shift = (inset / w) * halfWidth;
    const right = viewBasis(fig.view).right;
    camera.left = -halfWidth;
    camera.right = halfWidth;
    camera.top = cam.halfHeight;
    camera.bottom = -cam.halfHeight;
    camera.near = cam.near;
    camera.far = cam.far;
    camera.zoom = 1;
    camera.up.set(cam.up[0], cam.up[1], cam.up[2]);
    camera.position.set(
      cam.position[0] - right[0] * shift,
      cam.position[1] - right[1] * shift,
      cam.position[2] - right[2] * shift,
    );
    const pan = panner();
    pan.target.set(cam.target[0] - right[0] * shift, cam.target[1] - right[1] * shift, cam.target[2] - right[2] * shift);
    camera.lookAt(pan.target);
    camera.updateProjectionMatrix();
    pan.update();

    // The quad, `quadDepth` in front of the camera: the camera's own
    // depth coordinate less that.
    const position = geometry.getAttribute("position") as Float32BufferAttribute;
    const view = fig.view;
    const depth = worldToView(view, cam.position)[2] - cam.quadDepth;
    plateCorners(fig, fit).forEach(([r, u], i) => {
      const p = viewToWorld(view, r, u, depth);
      position.setXYZ(i, p[0], p[1], p[2]);
    });
    position.needsUpdate = true;
    geometry.computeBoundingSphere();
  }

  /**
   * The width the page's panel takes at the left, in CSS px: its right edge
   * while it is a side card, 0 once it is a bottom sheet across the screen.
   */
  function panelInset(): number {
    const card = opts.into.closest(".pcg-overlay");
    if (card === null) return 0;
    const r = card.getBoundingClientRect();
    return r.width > window.innerWidth * 0.5 ? 0 : Math.min(r.right + 12, window.innerWidth * 0.4);
  }

  function show(fig: PlateFigure): void {
    const mine = ++ticket;
    if (current === undefined) {
      controls.enabled = false;
      saved = { fog: scene.fog as Fog | null, background: scene.background };
      scene.fog = null;
      scene.background = PAPER;
      panner().enabled = true;
    }
    current = fig;
    frame(fig);
    quad.visible = false;
    panel.setCurrent(fig.id);
    panel.setStatus("Loading the scan from e-rara…");
    document.body.dataset.plate = "loading";
    setQuery(fig.id);
    loader.load(
      plateUrl(fig),
      (texture) => {
        if (mine !== ticket) {
          texture.dispose();
          return;
        }
        texture.colorSpace = SRGBColorSpace;
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        material.map?.dispose();
        material.map = texture;
        material.needsUpdate = true;
        quad.visible = true;
        const fit = fitPlate(fig);
        panel.setStatus(
          `Registered on ${fig.controls.length} points: rms ${fit.rms.toFixed(2)} m, ` +
            `worst ${fit.max.toFixed(2)} m`,
        );
        document.body.dataset.plate = "ready";
      },
      undefined,
      () => {
        if (mine !== ticket) return;
        panel.setStatus("The scan did not load (offline, or e-rara unreachable); the model is in the plate's view");
        document.body.dataset.plate = "failed";
      },
    );
  }

  function hide(): void {
    ticket++;
    if (current === undefined) return;
    current = undefined;
    quad.visible = false;
    if (panControls !== undefined) panControls.enabled = false;
    controls.enabled = true;
    if (saved !== undefined) {
      scene.fog = saved.fog;
      scene.background = saved.background;
      saved = undefined;
    }
    panel.setCurrent("");
    panel.setStatus("");
    delete document.body.dataset.plate;
    setQuery(undefined);
  }

  function setQuery(id: string | undefined): void {
    const q = new URLSearchParams(location.search);
    if (id === undefined) {
      q.set("plate", "");
      q.delete("opacity");
    } else {
      q.set("plate", id);
      q.set("opacity", material.opacity.toFixed(2));
    }
    // A flag the page reads by presence (`still`, `plate` alone) stays a
    // bare flag rather than coming back as `still=`.
    const s = q.toString().replace(/=(?=&|$)/g, "");
    history.replaceState(null, "", `${location.pathname}${s === "" ? "" : `?${s}`}${location.hash}`);
  }

  /**
   * Write the frame on screen to a PNG: drawn again and read back in the
   * same task, so the canvas needs no preserved drawing buffer (the scan
   * came with CORS, so the canvas is not tainted by it).
   */
  function save(): void {
    if (current === undefined) return;
    const fig = current;
    draw();
    renderer.domElement.toBlob((blob) => {
      if (blob === null) {
        panel.setStatus("The frame could not be read back from the canvas");
        return;
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `eiffel-plate-${fig.id}-${Math.round(material.opacity * 100)}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, "image/png");
  }

  const host = document.createElement("div");
  opts.into.appendChild(host);
  const app = mount(PlatePanel, {
    target: host,
    props: {
      figures: PLATE_FIGURES.map((f) => ({ id: f.id, label: `Pl. ${f.plate} ${f.fig} — ${f.title}` })),
      opacity: material.opacity,
      credit: PLATE_CREDIT,
      onPick: (id: string) => {
        const fig = PLATE_FIGURES.find((f) => f.id === id);
        if (fig === undefined) hide();
        else show(fig);
      },
      onOpacity: (v: number) => {
        material.opacity = v;
        if (current !== undefined) setQuery(current.id);
      },
      onBack: hide,
      onSave: save,
    },
  });
  const panel = app as unknown as PanelApi;

  window.addEventListener("resize", () => {
    if (current !== undefined) {
      // Keep the pan and zoom: reframe only the frustum's aspect.
      const aspect = window.innerWidth / window.innerHeight;
      const hh = camera.top;
      camera.left = -hh * aspect;
      camera.right = hh * aspect;
      camera.updateProjectionMatrix();
    }
  });

  const { figure, asked } = plateFromQuery(location.search);
  if (figure !== undefined) show(figure);
  else if (asked !== undefined) {
    opts.report(
      `?plate=${asked}: no such figure; the registered ones are ${PLATE_FIGURES.map((f) => f.id).join(", ")}`,
    );
  }

  /** Draw the model through the plate's camera, and the plate over it. */
  function draw(): void {
    panControls?.update();
    const view = current?.view;
    const clip = view?.kind === "elevation" && view.below !== true;
    const planes = renderer.clippingPlanes;
    if (clip) renderer.clippingPlanes = GROUND_CLIP;
    renderer.render(scene, camera);
    if (!quad.visible) {
      renderer.clippingPlanes = planes;
      return;
    }
    // The scan is drawn whole: the section's plane (section.ts) is the
    // renderer's global one while it is open, and would cut the quad.
    renderer.clippingPlanes = [];
    const autoClear = renderer.autoClear;
    renderer.autoClear = false;
    renderer.render(overlayScene, camera);
    renderer.autoClear = autoClear;
    renderer.clippingPlanes = planes;
  }

  return {
    get active() {
      return current !== undefined;
    },
    render: draw,
  };
}
