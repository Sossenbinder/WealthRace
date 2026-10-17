<script lang="ts">
  import { onMount } from 'svelte'
  import {
    DEFAULT_ASSUMPTIONS,
    DEFAULT_INPUTS,
    simulate,
    type Assumptions,
    type Inputs,
    type YearPoint,
  } from './lib/calc/simulate'
  import { RACERS, type ChartSeries, type LaneEntry } from './lib/racers'
  import { formatEur } from './lib/format'
  import NumField from './lib/ui/NumField.svelte'
  import RaceTrack from './lib/ui/RaceTrack.svelte'
  import Leaderboard from './lib/ui/Leaderboard.svelte'
  import WealthChart from './lib/ui/WealthChart.svelte'
  import AssumptionsPanel from './lib/ui/AssumptionsPanel.svelte'

  const STORAGE_KEY = 'wealthrace:v1'
  const YEARS_PER_SECOND = 2.5
  const SPEEDS = [0.5, 1, 2, 4]
  const START_YEAR = new Date().getFullYear()

  function load(): { inputs: Inputs; a: Assumptions; real: boolean } {
    const fallback = { inputs: { ...DEFAULT_INPUTS }, a: { ...DEFAULT_ASSUMPTIONS }, real: false }
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return fallback
      const saved = JSON.parse(raw)
      return {
        inputs: { ...DEFAULT_INPUTS, ...saved.inputs },
        a: { ...DEFAULT_ASSUMPTIONS, ...saved.a },
        real: !!saved.real,
      }
    } catch {
      return fallback
    }
  }

  const initial = load()
  let inputs = $state<Inputs>(initial.inputs)
  let a = $state<Assumptions>(initial.a)
  let real = $state(initial.real)

  $effect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ inputs, a, real }))
  })

  const years = $derived(Math.max(1, Math.min(60, Math.round(inputs.years || 1))))
  const result = $derived(
    simulate(
      {
        startCapital: Math.max(0, inputs.startCapital),
        monthlySavings: Math.max(0, inputs.monthlySavings),
        years,
      },
      $state.snapshot(a),
    ),
  )

  const show = (v: number, year: number) => (real ? v / result.deflator[year] : v)
  const display = $derived(
    result.racers.map((r) => ({
      meta: RACERS[r.id],
      points: r.points,
      values: r.points.map((p, y) => show(p.net, y)),
    })),
  )
  const contributedShown = $derived(result.contributed.map((c, y) => show(c, y)))
  const scaleMax = $derived(Math.max(1, ...display.flatMap((d) => d.values)))

  // ——— race clock ———
  let t = $state(0)
  let playing = $state(false)
  let speed = $state(1)
  const finished = $derived(t >= years)

  $effect(() => {
    if (t > years) t = years
  })

  const lerp = (arr: number[], x: number) => {
    const f = Math.floor(x)
    if (f >= arr.length - 1) return arr[arr.length - 1]
    return arr[f] + (arr[f + 1] - arr[f]) * (x - f)
  }

  const current = $derived(display.map((d) => ({ meta: d.meta, value: lerp(d.values, t) })))
  const lanes = $derived.by((): LaneEntry[] => {
    const order = [...current].sort((x, y) => y.value - x.value).map((c) => c.meta.id)
    return current.map((c) => ({ ...c, rank: order.indexOf(c.meta.id) + 1 }))
  })
  const series = $derived(display.map((d): ChartSeries => ({ meta: d.meta, values: d.values })))

  const yearNow = $derived(Math.max(0, Math.min(years, Math.floor(t))))
  const boardRows = $derived(
    display.map((d) => {
      const p: YearPoint = d.points[yearNow]
      return {
        meta: d.meta,
        net: finished ? d.values[years] : lerp(d.values, t),
        taxes: show(p.taxesPaid, yearNow),
        exitTax: show(p.exitTax, yearNow),
      }
    }),
  )

  let raf = 0
  let last = 0
  function frame(now: number) {
    // rAF timestamps can precede the performance.now() taken in play(): never step backwards.
    const dt = Math.max(0, Math.min(0.25, (now - last) / 1000))
    last = now
    t = Math.min(years, t + dt * YEARS_PER_SECOND * speed)
    if (t >= years) {
      playing = false
      return
    }
    raf = requestAnimationFrame(frame)
  }

  function play() {
    if (t >= years) t = 0
    playing = true
    last = performance.now()
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(frame)
  }
  function pause() {
    playing = false
    cancelAnimationFrame(raf)
  }
  function restart() {
    t = 0
    play()
  }
  function scrub(e: Event) {
    pause()
    t = parseFloat((e.currentTarget as HTMLInputElement).value)
  }
  function resetAssumptions() {
    a = { ...DEFAULT_ASSUMPTIONS }
  }

  function onKey(e: KeyboardEvent) {
    const tag = (e.target as HTMLElement).tagName
    if (e.code !== 'Space' || tag === 'INPUT' || tag === 'BUTTON') return
    e.preventDefault()
    if (playing) pause()
    else play()
  }

  onMount(() => {
    const id = setTimeout(play, 500)
    return () => {
      clearTimeout(id)
      cancelAnimationFrame(raf)
    }
  })

  const leader = $derived([...current].sort((x, y) => y.value - x.value)[0])
</script>

<svelte:window onkeydown={onKey} />

<main>
  <header class="top">
    <div class="brand">
      <svg viewBox="0 0 32 32" width="34" height="34" aria-hidden="true">
        <rect x="3" y="7" width="18" height="4" rx="2" fill="#ff7eb6" />
        <rect x="3" y="14" width="12" height="4" rx="2" fill="#7ee0ff" />
        <rect x="3" y="21" width="26" height="4" rx="2" fill="#ffb86b" />
      </svg>
      <div>
        <h1>Wealth<span>Race</span></h1>
        <p>Der Zinseszins-Racer — wer hat nach {years} Jahren netto am meisten?</p>
      </div>
    </div>
  </header>

  <section class="card inputs">
    <NumField label="Startkapital" bind:value={inputs.startCapital} step={1000} min={0} unit="€" />
    <NumField label="Sparrate monatlich" bind:value={inputs.monthlySavings} step={50} min={0} unit="€" />
    <label class="horizon">
      <span class="lbl">Anlagehorizont <b>{years} Jahre</b></span>
      <input type="range" min="1" max="50" step="1" bind:value={inputs.years} />
    </label>
    <div class="seg-wrap">
      <span class="lbl">Inflation ({(a.inflation * 100).toLocaleString('de-DE')} % p. a.)</span>
      <div class="seg" role="group" aria-label="Real oder nominal">
        <button class:on={!real} onclick={() => (real = false)}>Nominal</button>
        <button class:on={real} onclick={() => (real = true)}>Real (heutige €)</button>
      </div>
    </div>
  </section>

  <section class="stage">
    <div class="card race">
      <div class="race-head">
        <div class="clock">
          <span class="yr">Jahr <b>{Math.floor(t)}</b><i>/ {years}</i></span>
          <span class="cal">{START_YEAR + Math.floor(t)} · Führung: <b style:color={leader.meta.color}>{leader.meta.name}</b></span>
        </div>
        <div class="controls">
          {#if playing}
            <button class="primary" onclick={pause} aria-label="Pause">❚❚ Pause</button>
          {:else}
            <button class="primary" onclick={play} aria-label="Start">▶ {finished ? 'Nochmal' : t > 0 ? 'Weiter' : 'Start'}</button>
          {/if}
          <button onclick={restart} aria-label="Neustart">↺ Neustart</button>
          <div class="seg small" role="group" aria-label="Geschwindigkeit">
            {#each SPEEDS as s (s)}
              <button class:on={speed === s} onclick={() => (speed = s)}>{s.toLocaleString('de-DE')}×</button>
            {/each}
          </div>
        </div>
      </div>

      <RaceTrack entries={lanes} {scaleMax} moving={playing} />

      <input class="scrub" type="range" min="0" max={years} step="0.01" value={t} oninput={scrub} aria-label="Jahr wählen" />
      <p class="note">
        Position = Nettovermögen nach Steuern bei Auflösung im jeweiligen Jahr{real ? ', in heutiger Kaufkraft' : ''}. Ziel =
        bestes Endergebnis ({formatEur(scaleMax)}).
      </p>
    </div>

    <div class="card">
      <Leaderboard
        rows={boardRows}
        contributed={finished ? contributedShown[years] : lerp(contributedShown, t)}
        {finished}
        yearLabel={`Jahr ${Math.floor(t)} · ${real ? 'real' : 'nominal'}`}
      />
    </div>
  </section>

  <section class="card">
    <h2 class="sec">Nettovermögen im Zeitverlauf <small>{real ? 'real, in heutigen Euro' : 'nominal'}</small></h2>
    <WealthChart {series} contributed={contributedShown} {t} />
  </section>

  <section class="card">
    <AssumptionsPanel bind:a onreset={resetAssumptions} />
  </section>

  <footer>
    Spielzeug, keine Anlageberatung. Vereinfachtes Modell: konstante Renditen, keine Kirchensteuer, Vorabpauschale
    vom Verrechnungskonto, Immobilien-Überschüsse/Fehlbeträge über ein Nebenkonto. Details im README.
  </footer>
</main>

<style>
  main {
    max-width: 1280px;
    margin: 0 auto;
    padding: 28px 24px 48px;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  h1 {
    margin: 0;
    font-size: 30px;
    letter-spacing: -0.02em;
    line-height: 1;
  }
  h1 span {
    color: var(--accent);
  }
  .brand p {
    margin: 6px 0 0;
    color: var(--text-dim);
    font-size: 14px;
  }
  .card {
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 20px;
    padding: 18px 20px;
  }
  .inputs {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
    align-items: end;
  }
  .lbl {
    font-size: 12px;
    color: var(--text-dim);
  }
  .lbl b {
    color: var(--text);
    font-family: var(--mono);
  }
  .horizon {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-bottom: 6px;
  }
  .seg-wrap {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .seg {
    display: flex;
    background: var(--field);
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 3px;
  }
  .seg button {
    flex: 1;
    border: 0;
    background: transparent;
    padding: 6px 10px;
    border-radius: 7px;
    color: var(--text-dim);
  }
  .seg button.on {
    background: var(--accent);
    color: #08090c;
    font-weight: 600;
  }
  .seg.small button {
    padding: 6px 9px;
    font-family: var(--mono);
    font-size: 12px;
  }
  .stage {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 360px;
    gap: 18px;
  }
  .race {
    display: flex;
    flex-direction: column;
    gap: 10px;
    background:
      radial-gradient(1200px 300px at 0% 0%, rgba(255, 126, 182, 0.07), transparent 60%),
      radial-gradient(800px 300px at 100% 100%, rgba(126, 224, 255, 0.05), transparent 60%),
      var(--panel);
  }
  .race-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .clock {
    display: flex;
    flex-direction: column;
  }
  .yr {
    font-size: 15px;
    color: var(--text-dim);
  }
  .yr b {
    font: 700 40px var(--mono);
    color: var(--text);
    margin: 0 4px;
    display: inline-block;
    min-width: 2ch;
    text-align: right;
  }
  .yr i {
    font-style: normal;
    font-family: var(--mono);
  }
  .cal {
    font-size: 12.5px;
    color: var(--text-faint);
  }
  .controls {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
  }
  .scrub {
    width: 100%;
  }
  .note {
    margin: 0;
    font-size: 12px;
    color: var(--text-faint);
  }
  .sec {
    margin: 0 0 12px;
    font-size: 15px;
    font-weight: 600;
  }
  .sec small {
    color: var(--text-faint);
    font-weight: 400;
    margin-left: 6px;
  }
  footer {
    color: var(--text-faint);
    font-size: 12px;
    text-align: center;
    max-width: 760px;
    margin: 0 auto;
    line-height: 1.5;
  }
  @media (max-width: 1020px) {
    .stage {
      grid-template-columns: 1fr;
    }
  }
  @media (max-width: 720px) {
    main {
      padding: 18px 12px 36px;
    }
    .inputs {
      grid-template-columns: 1fr 1fr;
    }
    .horizon,
    .seg-wrap {
      grid-column: 1 / -1;
    }
    h1 {
      font-size: 24px;
    }
    .yr b {
      font-size: 30px;
    }
  }
</style>
