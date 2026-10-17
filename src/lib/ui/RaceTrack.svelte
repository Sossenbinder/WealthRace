<script lang="ts">
  import type { LaneEntry } from '../racers'
  import { formatEurAxis, formatEurShort } from '../format'
  import { niceTicks } from './ticks'

  let {
    entries,
    scaleMax,
    moving,
  }: { entries: LaneEntry[]; scaleMax: number; moving: boolean } = $props()

  // The viewBox follows the rendered width so text stays at true pixel size on phones.
  let width = $state(1000)
  const W = $derived(Math.max(320, width))
  const compact = $derived(W < 640)
  const LANE = $derived(compact ? 64 : 76)
  const TOP = 40
  const X0 = 24
  const X1 = $derived(W - 70)
  // Zero sits one car length in, so a racer at 0 € is fully on the track.
  const START = X0 + 76
  const H = $derived(TOP + entries.length * LANE + 10)
  const ticks = $derived(niceTicks(scaleMax, compact ? 2 : 5).filter((t) => t <= scaleMax))
  const xOf = (v: number) => START + Math.max(0, Math.min(1, v / scaleMax)) * (X1 - START)
</script>

<div class="track-wrap" bind:clientWidth={width}>
<svg viewBox="0 0 {W} {H}" class="track" class:moving class:compact role="img" aria-label="Rennstrecke">
  <defs>
    {#each entries as e (e.meta.id)}
      <linearGradient id="trail-{e.meta.id}" x1="0" x2="1">
        <stop offset="0" stop-color={e.meta.color} stop-opacity="0" />
        <stop offset="1" stop-color={e.meta.color} stop-opacity="0.55" />
      </linearGradient>
    {/each}
    <pattern id="checker" width="8" height="8" patternUnits="userSpaceOnUse">
      <rect width="8" height="8" fill="#08090c" />
      <rect width="4" height="4" fill="#f4f4f6" />
      <rect x="4" y="4" width="4" height="4" fill="#f4f4f6" />
    </pattern>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="6" />
    </filter>
  </defs>

  <!-- scale -->
  {#each ticks as t (t)}
    <line x1={xOf(t)} x2={xOf(t)} y1={TOP - 6} y2={H - 6} class="grid" />
    <text x={xOf(t)} y={TOP - 16} class="tick" text-anchor="middle">{formatEurAxis(t)}</text>
  {/each}

  <!-- finish line -->
  <rect x={X1 + 8} y={TOP - 6} width="16" height={H - TOP} fill="url(#checker)" opacity="0.85" />

  {#each entries as e, i (e.meta.id)}
    {@const y = TOP + i * LANE}
    {@const cy = y + LANE / 2 + 6}
    {@const x = xOf(e.value)}
    {@const labelRight = x < X1 - 200}
    <g class="lane">
      <line x1={X0} x2={X1} y1={y + LANE} y2={y + LANE} class="lane-line" />
      <text x={X0} y={y + 18} class="lane-name" fill={e.meta.color}>{e.meta.name}</text>

      <rect x={X0} y={cy - 3} width={Math.max(0, x - X0)} height="6" rx="3" fill="url(#trail-{e.meta.id})" />
      <circle cx={x - 18} cy={cy} r="14" fill={e.meta.color} opacity="0.35" filter="url(#glow)" />

      <g transform="translate({x}, {cy})" class="car">
        <g class="body">
          <rect x="-74" y="-15" width="74" height="30" rx="15" fill={e.meta.color} />
          <circle cx="-15" cy="0" r="10.5" fill="#08090c" opacity="0.85" />
          <text x="-15" y="4.5" text-anchor="middle" class="rank" fill={e.meta.color}>{e.rank}</text>
          <text x="-63" y="4.5" class="short">{e.meta.short}</text>
          <g class="speed" stroke={e.meta.color}>
            <line x1="-86" x2="-100" y1="-6" y2="-6" />
            <line x1="-82" x2="-108" y1="0" y2="0" />
            <line x1="-86" x2="-96" y1="6" y2="6" />
          </g>
        </g>
      </g>
      <text
        x={compact ? X1 : labelRight ? x + 12 : x}
        y={compact ? y + 18 : labelRight ? cy + 5 : cy - 22}
        text-anchor={labelRight && !compact ? 'start' : 'end'}
        class="value"
        class:neg={e.value < 0}>{formatEurShort(e.value)}</text
      >
    </g>
  {/each}
</svg>
</div>

<style>
  .track-wrap {
    width: 100%;
  }
  .track {
    width: 100%;
    height: auto;
    display: block;
    overflow: visible;
  }
  .grid {
    stroke: rgba(255, 255, 255, 0.05);
    stroke-dasharray: 2 6;
  }
  .tick {
    fill: var(--text-faint);
    font: 500 13px var(--mono);
  }
  .lane-line {
    stroke: rgba(255, 255, 255, 0.07);
    stroke-dasharray: 18 12;
  }
  .lane-name {
    font: 600 16px var(--sans);
    letter-spacing: 0.02em;
  }
  .short {
    font: 700 12px var(--mono);
    fill: #08090c;
    letter-spacing: 0.04em;
  }
  .rank {
    font: 700 12.5px var(--mono);
  }
  .value {
    font: 600 17px var(--mono);
    fill: var(--text);
    paint-order: stroke;
    stroke: #08090c;
    stroke-width: 4px;
  }
  .compact .value {
    font-size: 14px;
  }
  .compact .lane-name {
    font-size: 14px;
  }
  .value.neg {
    fill: #ff6b6b;
  }
  .speed {
    stroke-width: 2;
    stroke-linecap: round;
    opacity: 0;
    transition: opacity 0.3s;
  }
  .moving .speed {
    opacity: 0.6;
  }
  .moving .body {
    animation: bob 0.32s ease-in-out infinite alternate;
  }
  .lane:nth-child(2n) .body {
    animation-delay: -0.16s;
  }
  @keyframes bob {
    from {
      transform: translateY(-1px);
    }
    to {
      transform: translateY(1.2px);
    }
  }
</style>
