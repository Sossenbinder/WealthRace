<script lang="ts">
  import type { Assumptions } from '../calc/simulate'
  import { purchaseCosts, capitalTaxRate } from '../calc/tax'
  import { formatEur, formatPct } from '../format'
  import { RACERS } from '../racers'
  import NumField from './NumField.svelte'

  let { a = $bindable(), onreset }: { a: Assumptions; onreset: () => void } = $props()

  const costs = $derived(purchaseCosts(a.propertyPrice, a))
  const rate = $derived(capitalTaxRate(a.abgeltungsteuer, a.soli))
</script>

<section class="assumptions">
  <header>
    <div>
      <h2>Annahmen</h2>
      <p>Alle Werte sind Annahmen, keine Prognosen — ändere sie und Rennen, Ranking und Chart rechnen live neu.</p>
    </div>
    <button class="ghost" onclick={onreset}>Standardwerte</button>
  </header>

  <div class="groups">
    <fieldset>
      <legend>Allgemein & Steuern</legend>
      <NumField label="Inflation p. a." bind:value={a.inflation} scale={100} step={0.1} unit="%" />
      <NumField label="Sparrate steigt jährlich um" bind:value={a.savingsGrowth} scale={100} step={0.5} unit="%" />
      <NumField label="Abgeltungsteuer" bind:value={a.abgeltungsteuer} scale={100} step={0.5} unit="%" />
      <NumField label="Solidaritätszuschlag (auf die Steuer)" bind:value={a.soli} scale={100} step={0.5} unit="%" />
      <NumField
        label="Sparerpauschbetrag p. a."
        bind:value={a.sparerpauschbetrag}
        step={100}
        unit="€"
        hint="1.000 € Single, 2.000 € zusammenveranlagt"
      />
      <p class="calc">Kapitalertragsteuer effektiv: <b>{formatPct(rate)}</b> (ohne Kirchensteuer)</p>
    </fieldset>

    <fieldset style:--c={RACERS.etf.color}>
      <legend>{RACERS.etf.name}</legend>
      <NumField label="Rendite vor Kosten p. a." bind:value={a.etfReturn} scale={100} step={0.1} unit="%" />
      <NumField label="TER (laufende Kosten)" bind:value={a.etfTer} scale={100} step={0.05} unit="%" />
      <NumField
        label="Teilfreistellung"
        bind:value={a.teilfreistellung}
        scale={100}
        step={5}
        unit="%"
        hint="Aktienfonds 30 %, Mischfonds 15 %"
      />
      <NumField
        label="Basiszins (Vorabpauschale)"
        bind:value={a.basiszins}
        scale={100}
        step={0.01}
        unit="%"
        hint="BMF-Wert, 2025: 2,53 %. Gilt hier für alle Jahre."
      />
    </fieldset>

    <fieldset style:--c={RACERS.immobilie.color}>
      <legend>{RACERS.immobilie.name}</legend>
      <NumField label="Kaufpreis" bind:value={a.propertyPrice} step={10000} unit="€" />
      <NumField
        label="Grunderwerbsteuer"
        bind:value={a.grunderwerbsteuer}
        scale={100}
        step={0.5}
        unit="%"
        hint="Je nach Bundesland 3,5–6,5 %"
      />
      <NumField label="Notar & Grundbuch" bind:value={a.notar} scale={100} step={0.1} unit="%" />
      <NumField label="Makler (Käuferanteil)" bind:value={a.makler} scale={100} step={0.1} unit="%" />
      <NumField label="Kreditzins (Sollzins)" bind:value={a.mortgageRate} scale={100} step={0.1} unit="%" />
      <NumField label="Anfängliche Tilgung" bind:value={a.tilgung} scale={100} step={0.5} unit="%" />
      <NumField label="Wertsteigerung p. a." bind:value={a.appreciation} scale={100} step={0.1} unit="%" />
      <NumField
        label="Instandhaltung p. a."
        bind:value={a.maintenance}
        scale={100}
        step={0.1}
        unit="% vom Wert"
      />
      <NumField
        label={a.ownerOccupied ? 'Gesparte Kaltmiete / Monat' : 'Mieteinnahme kalt / Monat'}
        bind:value={a.monthlyRent}
        step={50}
        unit="€"
      />
      <NumField label="Mietsteigerung p. a." bind:value={a.rentGrowth} scale={100} step={0.1} unit="%" />
      <NumField label="Verkaufskosten" bind:value={a.saleCosts} scale={100} step={0.5} unit="%" hint="z. B. Makler beim Verkauf" />
      <label class="toggle">
        <input type="checkbox" bind:checked={a.ownerOccupied} />
        <span>Selbst genutzt <small>(Verkauf immer steuerfrei; sonst vermietet)</small></span>
      </label>
      {#if !a.ownerOccupied}
        <NumField label="Persönlicher Steuersatz" bind:value={a.personalTaxRate} scale={100} step={1} unit="%" />
        <NumField label="Gebäudeanteil (AfA-Basis)" bind:value={a.buildingShare} scale={100} step={5} unit="%" />
        <NumField label="AfA p. a." bind:value={a.afa} scale={100} step={0.5} unit="%" />
        <NumField label="Spekulationsfrist" bind:value={a.speculationYears} step={1} unit="Jahre" />
      {/if}
      <p class="calc">
        Nebenkosten: <b>{formatEur(costs.total)}</b> (davon GrESt {formatEur(costs.grunderwerbsteuer)})
      </p>
    </fieldset>

    <fieldset style:--c={RACERS.tagesgeld.color}>
      <legend>{RACERS.tagesgeld.name}</legend>
      <NumField label="Zins p. a." bind:value={a.tagesgeldRate} scale={100} step={0.1} unit="%" />
      <p class="calc">Zinsen werden jährlich versteuert. Überschüsse der Immobilie landen ebenfalls hier.</p>
    </fieldset>

    <fieldset style:--c={RACERS.bauspar.color}>
      <legend>{RACERS.bauspar.name}</legend>
      <NumField label="Guthabenzins p. a." bind:value={a.bausparRate} scale={100} step={0.1} unit="%" />
      <NumField label="Bausparsumme" bind:value={a.bausparSumme} step={5000} unit="€" />
      <NumField label="Abschlussgebühr" bind:value={a.bausparFee} scale={100} step={0.1} unit="% der Summe" />
      <NumField label="Kontogebühr p. a." bind:value={a.bausparAnnualFee} step={1} unit="€" />
      <label class="toggle">
        <input type="checkbox" bind:checked={a.wohnungsbaupraemie} />
        <span>Wohnungsbauprämie <small>(10 % auf max. 700 € p. a., Einkommensgrenze erfüllt)</small></span>
      </label>
    </fieldset>

    <fieldset style:--c={RACERS.matratze.color}>
      <legend>{RACERS.matratze.name}</legend>
      <p class="calc">0 % Zinsen, keine Steuern, keine Kosten. Verliert real nur durch Inflation.</p>
    </fieldset>
  </div>
</section>

<style>
  header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 16px;
  }
  h2 {
    margin: 0 0 4px;
    font-size: 18px;
  }
  header p {
    margin: 0;
    color: var(--text-dim);
    font-size: 13px;
  }
  .groups {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
    gap: 14px;
    align-items: start;
  }
  fieldset {
    --c: var(--text-dim);
    margin: 0;
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 10px 14px 14px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px 12px;
    background: rgba(255, 255, 255, 0.015);
  }
  legend {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 0 6px;
    font-weight: 600;
    font-size: 13px;
    color: var(--c);
  }
  legend::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--c);
    box-shadow: 0 0 8px var(--c);
  }
  .calc {
    grid-column: 1 / -1;
    margin: 2px 0 0;
    font-size: 12px;
    color: var(--text-faint);
  }
  .calc b {
    color: var(--text-dim);
    font-family: var(--mono);
  }
  .toggle {
    grid-column: 1 / -1;
    display: flex;
    gap: 8px;
    align-items: flex-start;
    font-size: 13px;
    cursor: pointer;
  }
  .toggle small {
    color: var(--text-faint);
  }
  .toggle input {
    accent-color: var(--accent);
    margin-top: 2px;
  }
</style>
