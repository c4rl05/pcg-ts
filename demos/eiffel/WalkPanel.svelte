<script lang="ts">
  /**
   * The walk's section of the eiffel panel (`walkView.ts`): where the
   * walker is (the step of 1,710, the run and flight, the cote), play and
   * pause, the pace, a scrubber along the whole path, a step and a flight
   * at a time, and whether the shadow is fitted round the walker. A view
   * only: `walkView.ts` owns the camera and hears every choice through the
   * callbacks.
   *
   * Rows reuse the panel's own `.pcg-row` and range-input look
   * (`shared/overlay.ts` styles them for everything inside the panel).
   */
  let {
    length,
    steps,
    speed: initialSpeed,
    nearShadow: initialNear,
    onPlay,
    onSpeed,
    onScrub,
    onStep,
    onFlight,
    onNearShadow,
    onLevel,
  }: {
    length: number;
    steps: number;
    speed: number;
    nearShadow: boolean;
    onPlay: (on: boolean) => void;
    onSpeed: (value: number) => void;
    onScrub: (dist: number) => void;
    onStep: (by: number) => void;
    onFlight: (by: number) => void;
    onNearShadow: (on: boolean) => void;
    onLevel: () => void;
  } = $props();

  let dist = $state(0);
  let step = $state(0);
  let label = $state("");
  let cote = $state(0);
  let playing = $state(false);
  let texel = $state(0);
  // svelte-ignore state_referenced_locally
  let pace = $state(Math.log2(initialSpeed));
  // svelte-ignore state_referenced_locally
  let near = $state(initialNear);

  /** The page says where the walker is, once a frame. */
  export function update(s: { dist: number; step: number; label: string; cote: number; playing: boolean; texel: number }): void {
    dist = s.dist;
    step = s.step;
    label = s.label;
    cote = s.cote;
    playing = s.playing;
    texel = s.texel;
  }

  function toggle(): void {
    playing = !playing;
    onPlay(playing);
  }

  function scrub(e: Event): void {
    dist = Number((e.currentTarget as HTMLInputElement).value);
    onScrub(dist);
  }

  function slidePace(e: Event): void {
    pace = Number((e.currentTarget as HTMLInputElement).value);
    onSpeed(2 ** pace);
  }

  function nearToggle(e: Event): void {
    near = (e.currentTarget as HTMLInputElement).checked;
    onNearShadow(near);
  }
</script>

<div class="walk">
  <p class="where">
    <span class="figure">{step.toLocaleString("en")}</span> of {steps.toLocaleString("en")} steps ·
    cote {cote.toFixed(2)}
  </p>
  <p class="flight">{label}</p>
  <div class="pcg-row">
    <label for="eiffel-walk-at">Path</label>
    <input
      id="eiffel-walk-at"
      type="range"
      min="0"
      max={length}
      step="0.05"
      value={dist}
      style="--p: {(dist / length) * 100}%"
      oninput={scrub}
    />
  </div>
  <div class="pcg-row">
    <label for="eiffel-walk-pace">Pace</label>
    <input
      id="eiffel-walk-pace"
      type="range"
      min="-1"
      max="5"
      step="0.25"
      value={pace}
      style="--p: {((pace + 1) / 6) * 100}%"
      oninput={slidePace}
    />
    <span class="figure">×{(2 ** pace).toFixed(2 ** pace < 10 ? 2 : 0)}</span>
  </div>
  <div class="buttons">
    <button type="button" onclick={() => onFlight(-1)} title="The last flight (PageDown)">⏮</button>
    <button type="button" onclick={() => onStep(-1)} title="A step down (↓)">−1</button>
    <button type="button" class="play" onclick={toggle} title="Climb (Space)">{playing ? "Pause" : "Climb"}</button>
    <button type="button" onclick={() => onStep(1)} title="A step up (↑)">+1</button>
    <button type="button" onclick={() => onFlight(1)} title="The next flight (PageUp)">⏭</button>
    <button type="button" onclick={onLevel} title="Look along the path again (R)">Level</button>
  </div>
  <div class="pcg-row">
    <label for="eiffel-walk-near">Near shadow</label>
    <input id="eiffel-walk-near" type="checkbox" checked={near} onchange={nearToggle} />
    <span class="note">{texel > 0 ? `Texel ${(texel * 100).toFixed(1)} cm` : ""}</span>
  </div>
  <p class="help">Drag to look, double-click to lock the pointer. Space climbs, ↑ ↓ step, PageUp PageDown skip a flight.</p>
</div>

<style>
  .walk {
    display: block;
  }
  .where,
  .flight {
    margin: 0 0 4px;
    font-size: 12px;
    line-height: 1.4;
  }
  .flight {
    color: var(--ed-ink-dim);
  }
  .figure {
    font: 12px ui-monospace, monospace;
    color: var(--ed-figure);
  }
  .pcg-row .figure {
    flex: 0 0 38px;
    text-align: right;
  }
  .buttons {
    display: flex;
    gap: 4px;
    margin: 4px 0 2px;
  }
  .buttons button {
    padding: 4px 8px;
    background: var(--ed-raised);
    color: var(--ed-action);
    border: 1px solid var(--ed-edge);
    border-radius: var(--ed-radius);
    font: 12px system-ui, sans-serif;
    cursor: pointer;
  }
  .buttons button.play {
    flex: 1;
  }
  .buttons button:hover {
    background: var(--ed-raised-hi);
  }
  .note {
    font: 11px ui-monospace, monospace;
    color: var(--ed-ink-dim);
  }
  .help {
    margin: 6px 0 0;
    font-size: 11px;
    line-height: 1.4;
    color: var(--ed-ink-dim);
  }
</style>
