# WealthRace — the compound interest racer

A playful visual toy: five ways to save race against each other, year by year, **after German
taxes**. Enter your starting capital, monthly savings and horizon, press play and watch
compounding take over.

| Racer | What it models |
|---|---|
| **ETF Welt** | Accumulating equity world ETF (default 7 % p. a. before 0.2 % TER) |
| **Immobilie** | Property bought on day one with the starting capital as equity, rest financed |
| **Tagesgeld** | Savings account (default 2.5 %) |
| **Bausparvertrag** | Savings phase of a building-society contract, incl. Wohnungsbauprämie |
| **Matratze** | Cash under the mattress, 0 % |

Each racer is a separate "what if all my money went here" scenario with the same contributions.
The position on the track (and the leaderboard) is **net wealth if liquidated at that year's end,
after all taxes**. Toggle **nominal / real** (today's euros, deflated by the inflation
assumption). The chart shows the full path; hover it for exact values per year.

## Tax rules applied

All rates are editable in the *Annahmen* panel.

- **Abgeltungsteuer 25 % + Soli 5.5 %** → 26.375 % on capital income (no Kirchensteuer).
- **Sparerpauschbetrag** 1,000 € per year, per racer.
- **ETF:** Teilfreistellung 30 % (equity fund). **Vorabpauschale** each year: value at start ×
  Basiszins × 0.7, purchases during the year pro rata by month, capped at the actual value
  increase; taxed after Teilfreistellung and allowance. Already-taxed Vorabpauschalen are deducted
  from the gain on the final sale. Default Basiszins 2.53 % (2025), used for every year.
- **Tagesgeld / Bausparvertrag:** interest taxed yearly.
- **Immobilie:**
  - Kaufnebenkosten: Grunderwerbsteuer (default 6.5 %), Notar/Grundbuch 2 %, Makler 3.57 %.
  - Annuity mortgage (Sollzins + anfängliche Tilgung), maintenance as % of value p. a.,
    appreciation p. a.
  - *Selbst genutzt* (default): the saved rent is cash flow; sale always tax-free.
  - *Vermietet*: rent − interest − maintenance − AfA taxed at the personal rate (losses refund);
    sale **within ≤ 10 years** (Spekulationsfrist, § 23 EStG) taxed on the gain incl. AfA
    recapture, tax-free afterwards.
  - Monthly surplus (savings + rent − annuity − maintenance) goes to a side account at the
    Tagesgeld rate; deficits are financed at the mortgage rate.

## Simplifications

Constant returns, no volatility. Vorabpauschale tax is debited from the clearing account (it
reduces what gets invested) and is booked in the same year. The Bausparvertrag is modelled as its
savings phase only (no loan). Property: no Hausgeld/insurance, no Grundsteuer, sale costs default
to 0 %. This is a toy, not financial advice.

## Development

```sh
npm install
npm run dev      # dev server
npm run check    # svelte-check + tsc
npm test         # vitest (tax rules + simulation)
npm run build    # production build → dist/
```

The calculation core is pure TypeScript in `src/lib/calc/` (`tax.ts` for the rules,
`simulate.ts` for the year-by-year simulation) and tested in `src/lib/calc/tax.test.ts`.
Inputs and assumptions persist to `localStorage`.

### Docker

```sh
docker build -t wealthrace .
docker run --rm -p 8080:80 wealthrace   # → http://localhost:8080
```

CI (`.github/workflows/ci.yml`) runs check, test and build on every push/PR, and on `main`
pushes the image to `ghcr.io/sossenbinder/wealthrace`.

Stack: Vite · Svelte 5 · TypeScript · plain SVG (no chart library).
