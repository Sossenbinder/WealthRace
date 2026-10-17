import type { RacerId } from './calc/simulate'

export interface RacerMeta {
  id: RacerId
  name: string
  short: string
  color: string
  blurb: string
}

export const RACERS: Record<RacerId, RacerMeta> = {
  etf: {
    id: 'etf',
    name: 'ETF Welt',
    short: 'ETF',
    color: '#ff7eb6',
    blurb: 'Thesaurierender Aktien-ETF (MSCI-World-artig)',
  },
  immobilie: {
    id: 'immobilie',
    name: 'Immobilie',
    short: 'IMMO',
    color: '#ffb86b',
    blurb: 'Kauf mit Kredit, Startkapital als Eigenkapital',
  },
  tagesgeld: {
    id: 'tagesgeld',
    name: 'Tagesgeld',
    short: 'TG',
    color: '#7ee0ff',
    blurb: 'Verzinstes Tagesgeldkonto',
  },
  bauspar: {
    id: 'bauspar',
    name: 'Bausparvertrag',
    short: 'BSV',
    color: '#b79bff',
    blurb: 'Sparphase mit Guthabenzins & Prämie',
  },
  matratze: {
    id: 'matratze',
    name: 'Matratze',
    short: 'CASH',
    color: '#c6ff7e',
    blurb: 'Bargeld unterm Kopfkissen, 0 %',
  },
}

export interface LaneEntry {
  meta: RacerMeta
  /** Displayed net wealth (nominal or real). */
  value: number
  rank: number
}

export interface ChartSeries {
  meta: RacerMeta
  values: number[]
}
