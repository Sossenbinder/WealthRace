// German number formatting helpers.

const eur0 = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const compact = new Intl.NumberFormat('de-DE', { notation: 'compact', maximumFractionDigits: 1 })
const pct = new Intl.NumberFormat('de-DE', { style: 'percent', maximumFractionDigits: 2 })
const num = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 })

/** 123.456 € */
export const formatEur = (v: number) => eur0.format(Math.round(v))

/** 1,2 Mio. € / 450.000 € — compact only from a million upwards. */
export function formatEurShort(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${compact.format(v)} €`
  return eur0.format(Math.round(v))
}

/** Axis labels: 250 Tsd. € / 1,5 Mio. € */
export function formatEurAxis(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${compact.format(v)} €`
  if (Math.abs(v) >= 1_000) return `${num.format(v / 1000)} Tsd. €`
  return `${num.format(v)} €`
}

export const formatPct = (v: number) => pct.format(v)
export const formatNum = (v: number) => num.format(v)
