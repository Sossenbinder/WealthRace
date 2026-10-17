<script lang="ts">
  import { flip } from 'svelte/animate'
  import type { RacerMeta } from '../racers'
  import { formatEur, formatNum } from '../format'

  interface Row {
    meta: RacerMeta
    net: number
    taxes: number
    exitTax: number
  }

  let {
    rows,
    contributed,
    finished,
    yearLabel,
  }: { rows: Row[]; contributed: number; finished: boolean; yearLabel: string } = $props()

  const sorted = $derived([...rows].sort((a, b) => b.net - a.net))
  const medals = ['gold', 'silver', 'bronze']
</script>

<section class="board" class:finished>
  <header>
    <h2>{finished ? 'Endstand' : 'Live-Ranking'}</h2>
    <span class="year">{yearLabel}</span>
  </header>
  <ol>
    {#each sorted as r, i (r.meta.id)}
      <li animate:flip={{ duration: 350 }} style:--c={r.meta.color}>
        <span class="pos {finished && i < 3 ? medals[i] : ''}">{i + 1}</span>
        <span class="name">
          <span class="dot"></span>
          <span>{r.meta.name}<small>{r.meta.blurb}</small></span>
        </span>
        <span class="val">
          <b class:neg={r.net < 0}>{formatEur(r.net)}</b>
          <small>{contributed > 0 ? `${formatNum(r.net / contributed)}× Einzahlung` : ''}</small>
          {#if finished}<small>Steuern {formatEur(r.taxes + r.exitTax)}</small>{/if}
        </span>
      </li>
    {/each}
  </ol>
  <p class="foot">Eingezahlt: <b>{formatEur(contributed)}</b> · Netto = nach allen Steuern bei Verkauf/Auflösung</p>
</section>

<style>
  .board {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  h2 {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
  }
  .year {
    font: 500 12px var(--mono);
    color: var(--text-dim);
  }
  ol {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  li {
    display: grid;
    grid-template-columns: 28px minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    padding: 9px 12px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid rgba(255, 255, 255, 0.05);
  }
  li:first-child {
    border-color: color-mix(in srgb, var(--c) 45%, transparent);
    background: color-mix(in srgb, var(--c) 8%, transparent);
  }
  .pos {
    font: 700 14px var(--mono);
    color: var(--text-dim);
    text-align: center;
  }
  .pos.gold,
  .pos.silver,
  .pos.bronze {
    width: 26px;
    height: 26px;
    line-height: 26px;
    border-radius: 50%;
    color: #08090c;
  }
  .pos.gold {
    background: linear-gradient(135deg, #ffe08a, #e0a82e);
  }
  .pos.silver {
    background: linear-gradient(135deg, #f1f3f7, #a7aebb);
  }
  .pos.bronze {
    background: linear-gradient(135deg, #f0b98a, #a8683b);
  }
  .name {
    display: flex;
    align-items: center;
    gap: 9px;
    font-weight: 600;
    font-size: 14px;
    min-width: 0;
  }
  .name small,
  .val small {
    display: block;
    font-weight: 400;
    font-size: 11px;
    color: var(--text-faint);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .name > span:last-child {
    min-width: 0;
  }
  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--c);
    box-shadow: 0 0 10px var(--c);
    flex: none;
  }
  .val {
    text-align: right;
  }
  .val b {
    font: 600 15px var(--mono);
  }
  .val b.neg {
    color: #ff6b6b;
  }
  .foot {
    margin: 2px 0 0;
    font-size: 11.5px;
    color: var(--text-faint);
  }
  .foot b {
    color: var(--text-dim);
    font-family: var(--mono);
  }
</style>
