<script lang="ts">
  import type { ChartSeries } from '../racers'
  import { formatEur, formatEurAxis } from '../format'
  import { niceTicks } from './ticks'

  let {
    series,
    contributed,
    t,
  }: { series: ChartSeries[]; contributed: number[]; t: number } = $props()

  // The viewBox follows the rendered width so text stays at true pixel size on phones.
  let width = $state(1000)
  const W = $derived(Math.max(300, width))
  const H = $derived(W < 640 ? 260 : 360)
  const PAD = $derived({ l: W < 640 ? 88 : 96, r: 36, t: 16, b: 34 })
  const years = $derived(contributed.length - 1)
  const all = $derived(series.flatMap((s) => s.values).concat(contributed))
  const yMinRaw = $derived(Math.min(0, ...all))
  const ticks = $derived(niceTicks(Math.max(...all), 5))
  const yMax = $derived(ticks[ticks.length - 1])
  const negTicks = $derived(yMinRaw < 0 ? niceTicks(-yMinRaw, 2).filter((v) => v > 0).map((v) => -v) : [])
  const yMin = $derived(negTicks.length ? negTicks[negTicks.length - 1] : 0)
  const allTicks = $derived([...negTicks, ...ticks])
  const xs = (year: number) => PAD.l + (year / Math.max(1, years)) * (W - PAD.l - PAD.r)
  const ys = (v: number) => PAD.t + (1 - (v - yMin) / (yMax - yMin || 1)) * (H - PAD.t - PAD.b)
  const xTicks = $derived(niceTicks(years, Math.min(W < 640 ? 3 : 6, years)).filter((y) => y <= years))

  function path(values: number[], upTo: number): string {
    const full = Math.floor(upTo)
    let d = ''
    for (let i = 0; i <= Math.min(full, values.length - 1); i++) d += `${i ? 'L' : 'M'}${xs(i)},${ys(values[i])}`
    if (upTo > full && full + 1 < values.length) {
      const f = upTo - full
      d += `L${xs(upTo)},${ys(values[full] + (values[full + 1] - values[full]) * f)}`
    }
    return d
  }

  let hover = $state<number | null>(null)
  let svgEl: SVGSVGElement | undefined = $state()

  function onMove(e: PointerEvent) {
    if (!svgEl) return
    const r = svgEl.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * W
    const year = Math.round(((x - PAD.l) / (W - PAD.l - PAD.r)) * years)
    hover = Math.max(0, Math.min(years, year))
  }

  const hoverRows = $derived(
    hover === null
      ? []
      : series
          .map((s) => ({ meta: s.meta, v: s.values[hover!] }))
          .sort((a, b) => b.v - a.v),
  )
  const tipLeft = $derived(hover !== null && xs(hover) > W * 0.62)
</script>

<div class="wrap">
  <ul class="legend">
    {#each series as s (s.meta.id)}
      <li><span class="sw" style:background={s.meta.color}></span>{s.meta.name}</li>
    {/each}
    <li><span class="sw dash"></span>Eingezahlt</li>
  </ul>

  <div class="plot" bind:clientWidth={width}>
    <svg
      bind:this={svgEl}
      viewBox="0 0 {W} {H}"
      role="img"
      aria-label="Nettovermögen nach Jahren"
      onpointermove={onMove}
      onpointerleave={() => (hover = null)}
    >
      {#each allTicks as v (v)}
        <line x1={PAD.l} x2={W - PAD.r} y1={ys(v)} y2={ys(v)} class="grid" class:zero={v === 0} />
        <text x={PAD.l - 10} y={ys(v) + 4} text-anchor="end" class="axis">{formatEurAxis(v)}</text>
      {/each}
      {#each xTicks as y (y)}
        <text x={xs(y)} y={H - 10} text-anchor="middle" class="axis">Jahr {y}</text>
      {/each}

      <path d={path(contributed, years)} class="contrib" />
      {#each series as s (s.meta.id)}
        <path d={path(s.values, years)} stroke={s.meta.color} class="ghost" />
      {/each}
      {#each series as s (s.meta.id)}
        <path d={path(s.values, t)} stroke={s.meta.color} class="line" />
      {/each}
      {#if t < years}
        <line x1={xs(t)} x2={xs(t)} y1={PAD.t} y2={H - PAD.b} class="cursor" />
      {/if}
      {#each series as s (s.meta.id)}
        {@const f = Math.floor(t)}
        {@const v = f + 1 < s.values.length ? s.values[f] + (s.values[f + 1] - s.values[f]) * (t - f) : s.values[f]}
        <circle cx={xs(t)} cy={ys(v)} r="4.5" fill={s.meta.color} stroke="#08090c" stroke-width="2" />
      {/each}

      {#if hover !== null}
        <line x1={xs(hover)} x2={xs(hover)} y1={PAD.t} y2={H - PAD.b} class="cross" />
        {#each series as s (s.meta.id)}
          <circle cx={xs(hover)} cy={ys(s.values[hover])} r="4" fill={s.meta.color} stroke="#08090c" stroke-width="2" />
        {/each}
      {/if}
      <rect x={PAD.l} y={PAD.t} width={W - PAD.l - PAD.r} height={H - PAD.t - PAD.b} fill="transparent" />
    </svg>

    {#if hover !== null}
      <div
        class="tip"
        style:left="{(xs(hover) / W) * 100}%"
        style:transform={tipLeft ? 'translateX(calc(-100% - 14px))' : 'translateX(14px)'}
      >
        <div class="tip-h">Jahr {hover}</div>
        {#each hoverRows as r (r.meta.id)}
          <div class="tip-r"><span class="sw" style:background={r.meta.color}></span>{r.meta.name}<b>{formatEur(r.v)}</b></div>
        {/each}
        <div class="tip-r dim"><span class="sw dash"></span>Eingezahlt<b>{formatEur(contributed[hover])}</b></div>
      </div>
    {/if}
  </div>
</div>

<style>
  .wrap {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 16px;
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 12.5px;
    color: var(--text-dim);
  }
  .legend li {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .sw {
    width: 12px;
    height: 3px;
    border-radius: 2px;
    display: inline-block;
    flex: none;
  }
  .sw.dash {
    background: repeating-linear-gradient(90deg, var(--text-dim) 0 3px, transparent 3px 5px);
  }
  .plot {
    position: relative;
  }
  svg {
    width: 100%;
    height: auto;
    display: block;
    touch-action: pan-y;
  }
  .grid {
    stroke: rgba(255, 255, 255, 0.06);
  }
  .grid.zero {
    stroke: rgba(255, 255, 255, 0.22);
  }
  .axis {
    fill: var(--text-faint);
    font: 500 12px var(--mono);
  }
  .contrib {
    fill: none;
    stroke: rgba(230, 234, 240, 0.4);
    stroke-width: 1.5;
    stroke-dasharray: 4 4;
  }
  .ghost {
    fill: none;
    stroke-width: 1.5;
    opacity: 0.14;
  }
  .line {
    fill: none;
    stroke-width: 2.5;
    stroke-linejoin: round;
    stroke-linecap: round;
  }
  .cursor {
    stroke: rgba(255, 255, 255, 0.18);
    stroke-dasharray: 3 4;
  }
  .cross {
    stroke: rgba(255, 255, 255, 0.35);
  }
  .tip {
    position: absolute;
    top: 8px;
    pointer-events: none;
    background: rgba(16, 18, 24, 0.96);
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 10px 12px;
    font-size: 12.5px;
    min-width: 220px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  }
  .tip-h {
    font-weight: 600;
    margin-bottom: 6px;
  }
  .tip-r {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-dim);
    line-height: 1.7;
  }
  .tip-r b {
    margin-left: auto;
    color: var(--text);
    font: 600 12.5px var(--mono);
  }
</style>
