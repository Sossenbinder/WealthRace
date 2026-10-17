<script lang="ts">
  // Labelled numeric input. `scale` maps stored values to displayed ones (100 for %).
  let {
    label,
    value = $bindable(),
    unit = '',
    scale = 1,
    step = 1,
    min = undefined,
    max = undefined,
    hint = '',
  }: {
    label: string
    value: number
    unit?: string
    scale?: number
    step?: number
    min?: number
    max?: number
    hint?: string
  } = $props()

  const shown = $derived(Math.round(value * scale * 1e6) / 1e6)

  function onInput(e: Event) {
    const raw = (e.currentTarget as HTMLInputElement).value.replace(',', '.')
    const n = parseFloat(raw)
    if (Number.isFinite(n)) value = n / scale
  }
</script>

<label class="field" title={hint}>
  <span class="lbl">{label}</span>
  <span class="input">
    <input type="number" value={shown} {step} {min} {max} oninput={onInput} />
    {#if unit}<span class="unit">{unit}</span>{/if}
  </span>
  {#if hint}<span class="hint">{hint}</span>{/if}
</label>

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }
  .lbl {
    font-size: 12px;
    color: var(--text-dim);
  }
  .input {
    display: flex;
    align-items: center;
    background: var(--field);
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 0 10px;
    transition: border-color 0.15s;
  }
  .input:focus-within {
    border-color: var(--accent);
  }
  input {
    flex: 1;
    min-width: 0;
    background: transparent;
    border: 0;
    outline: 0;
    color: var(--text);
    font: 500 14px var(--mono);
    padding: 8px 0;
    -moz-appearance: textfield;
    appearance: textfield;
  }
  input::-webkit-inner-spin-button,
  input::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  .unit {
    font-size: 12px;
    color: var(--text-dim);
    margin-left: 6px;
  }
  .hint {
    font-size: 11px;
    color: var(--text-faint);
    line-height: 1.3;
  }
</style>
