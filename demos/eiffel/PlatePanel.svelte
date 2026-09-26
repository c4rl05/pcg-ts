<script lang="ts">
  /**
   * The plate overlay's section of the eiffel panel, on the dev server only
   * (`plateTool.ts`): a figure picker, the scan's opacity, a way back to the
   * orbit, a frame to disk, what the registration came to, and whose scan
   * it is. A view only: `plateView.ts` owns the camera and
   * the quad, and hears every choice through the callbacks.
   *
   * Rows reuse the panel's own `.pcg-row` and range-input look
   * (`shared/overlay.ts` styles them for everything inside the panel), so
   * this section reads as part of the same card.
   */
  let {
    figures,
    opacity: initialOpacity,
    credit,
    onPick,
    onOpacity,
    onBack,
    onSave,
  }: {
    figures: ReadonlyArray<{ id: string; label: string }>;
    opacity: number;
    credit: { work: string; holder: string; via: string; doi: string };
    onPick: (id: string) => void;
    onOpacity: (value: number) => void;
    onBack: () => void;
    onSave: () => void;
  } = $props();

  let current = $state("");
  let status = $state("");
  // svelte-ignore state_referenced_locally
  let opacity = $state(initialOpacity);

  /** The page says which figure is up (a `?plate` link, or back to orbit). */
  export function setCurrent(id: string): void {
    current = id;
  }

  /** Loading, failed, or what the registration came to. */
  export function setStatus(text: string): void {
    status = text;
  }

  function pick(e: Event): void {
    const id = (e.currentTarget as HTMLSelectElement).value;
    current = id;
    onPick(id);
  }

  function slide(e: Event): void {
    opacity = Number((e.currentTarget as HTMLInputElement).value);
    onOpacity(opacity);
  }
</script>

<div class="plates">
  <div class="pcg-row">
    <label for="eiffel-plate">plate</label>
    <select id="eiffel-plate" value={current} onchange={pick}>
      <option value="">— the model, orbiting</option>
      {#each figures as f (f.id)}
        <option value={f.id}>{f.label}</option>
      {/each}
    </select>
  </div>
  {#if current !== ""}
    <div class="pcg-row">
      <label for="eiffel-plate-opacity">scan</label>
      <input
        id="eiffel-plate-opacity"
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={opacity}
        style="--p: {opacity * 100}%"
        oninput={slide}
      />
      <span class="figure">{Math.round(opacity * 100)}%</span>
    </div>
    <div class="buttons">
      <button type="button" onclick={onBack}>back to orbit</button>
      <button type="button" onclick={onSave} title="the frame as it stands, pan and zoom included">save frame</button>
    </div>
    {#if status !== ""}<p class="status">{status}</p>{/if}
    <p class="credit">
      {credit.work}. {credit.holder}, via {credit.via}:
      <a href={credit.doi} target="_blank" rel="noopener">{credit.doi.replace("https://", "")}</a>.
      Drag pans, the wheel zooms.
    </p>
  {/if}
</div>

<style>
  .plates {
    display: block;
  }
  .figure {
    flex: 0 0 38px;
    text-align: right;
    font: 12px ui-monospace, monospace;
    color: var(--ed-figure);
  }
  .buttons {
    display: flex;
    gap: 6px;
    margin: 4px 0 2px;
  }
  .buttons button {
    padding: 4px 10px;
    background: var(--ed-raised);
    color: var(--ed-action);
    border: 1px solid var(--ed-edge);
    border-radius: var(--ed-radius);
    font: 12px system-ui, sans-serif;
    cursor: pointer;
  }
  .buttons button:hover {
    background: var(--ed-raised-hi);
  }
  .status,
  .credit {
    margin: 6px 0 0;
    font-size: 11px;
    line-height: 1.4;
    color: var(--ed-ink-dim);
  }
  .credit a {
    color: inherit;
    text-underline-offset: 3px;
  }
</style>
