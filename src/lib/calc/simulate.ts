// Year-by-year simulation of all racers. Internally monthly; snapshots at each year end.
// Every racer is a separate "what if I put everything here" scenario with the same
// starting capital and monthly savings, so each gets its own Sparerpauschbetrag.

import {
  capitalTaxRate,
  fundSaleTax,
  monthlyAnnuity,
  propertySaleTax,
  purchaseCosts,
  taxCapitalIncome,
  vorabpauschale,
  type Contribution,
} from './tax'

export type RacerId = 'etf' | 'tagesgeld' | 'immobilie' | 'bauspar' | 'matratze'

export interface Inputs {
  startCapital: number
  monthlySavings: number
  years: number
}

export interface Assumptions {
  // General
  inflation: number
  savingsGrowth: number
  // Capital income tax
  abgeltungsteuer: number
  soli: number
  sparerpauschbetrag: number
  // ETF
  etfReturn: number
  etfTer: number
  teilfreistellung: number
  basiszins: number
  // Tagesgeld
  tagesgeldRate: number
  // Bausparvertrag
  bausparRate: number
  bausparSumme: number
  bausparFee: number
  bausparAnnualFee: number
  wohnungsbaupraemie: boolean
  // Immobilie
  propertyPrice: number
  grunderwerbsteuer: number
  notar: number
  makler: number
  mortgageRate: number
  tilgung: number
  ownerOccupied: boolean
  monthlyRent: number
  rentGrowth: number
  maintenance: number
  appreciation: number
  saleCosts: number
  personalTaxRate: number
  buildingShare: number
  afa: number
  speculationYears: number
}

export const DEFAULT_INPUTS: Inputs = {
  startCapital: 50_000,
  monthlySavings: 500,
  years: 30,
}

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  inflation: 0.02,
  savingsGrowth: 0,
  abgeltungsteuer: 0.25,
  soli: 0.055,
  sparerpauschbetrag: 1000,
  etfReturn: 0.07,
  etfTer: 0.002,
  teilfreistellung: 0.3,
  basiszins: 0.0253,
  tagesgeldRate: 0.025,
  bausparRate: 0.005,
  bausparSumme: 50_000,
  bausparFee: 0.01,
  bausparAnnualFee: 12,
  wohnungsbaupraemie: true,
  propertyPrice: 300_000,
  grunderwerbsteuer: 0.065,
  notar: 0.02,
  makler: 0.0357,
  mortgageRate: 0.037,
  tilgung: 0.02,
  ownerOccupied: true,
  monthlyRent: 1000,
  rentGrowth: 0.02,
  maintenance: 0.01,
  appreciation: 0.02,
  saleCosts: 0,
  personalTaxRate: 0.35,
  buildingShare: 0.8,
  afa: 0.02,
  speculationYears: 10,
}

export interface YearPoint {
  year: number
  /** Net wealth if everything were liquidated at year end, after all taxes. */
  net: number
  /** Gross market value before the hypothetical liquidation tax. */
  gross: number
  /** Taxes actually paid so far (running), excluding the liquidation tax. */
  taxesPaid: number
  /** Tax that a sale at this year end would trigger. */
  exitTax: number
}

export interface RacerResult {
  id: RacerId
  points: YearPoint[]
}

export interface SimulationResult {
  /** Own money paid in so far, per year (same for every racer). */
  contributed: number[]
  /** Inflation deflator per year: divide nominal by this to get today's euros. */
  deflator: number[]
  racers: RacerResult[]
}

const monthlyRate = (annual: number) => Math.pow(1 + annual, 1 / 12) - 1

function savingsFor(inputs: Inputs, a: Assumptions, year: number): number {
  return inputs.monthlySavings * Math.pow(1 + a.savingsGrowth, year - 1)
}

export function simulateEtf(inputs: Inputs, a: Assumptions): YearPoint[] {
  const rate = capitalTaxRate(a.abgeltungsteuer, a.soli)
  const mr = monthlyRate(a.etfReturn - a.etfTer)
  let value = inputs.startCapital
  let basis = inputs.startCapital
  let taxedVp = 0
  let taxesPaid = 0
  const points: YearPoint[] = [{ year: 0, net: value, gross: value, taxesPaid: 0, exitTax: 0 }]

  for (let y = 1; y <= inputs.years; y++) {
    const valueStart = value
    const contributions: Contribution[] = []
    const s = savingsFor(inputs, a, y)
    for (let m = 1; m <= 12; m++) {
      value += s
      basis += s
      contributions.push({ amount: s, month: m })
      value *= 1 + mr
    }
    const vp = vorabpauschale(valueStart, value, contributions, a.basiszins)
    const { tax, allowanceUsed } = taxCapitalIncome(vp * (1 - a.teilfreistellung), a.sparerpauschbetrag, rate)
    taxedVp += vp
    // The tax is debited from the clearing account, i.e. it shrinks what got invested.
    value -= tax
    basis -= tax
    taxesPaid += tax
    const exitTax = fundSaleTax(value, basis, taxedVp, a.teilfreistellung, a.sparerpauschbetrag - allowanceUsed, rate)
    points.push({ year: y, net: value - exitTax, gross: value, taxesPaid, exitTax })
  }
  return points
}

/** Interest-bearing account, interest taxed yearly. Used by Tagesgeld. */
export function simulateSavingsAccount(inputs: Inputs, a: Assumptions, annualRate: number): YearPoint[] {
  const rate = capitalTaxRate(a.abgeltungsteuer, a.soli)
  const mr = monthlyRate(annualRate)
  let value = inputs.startCapital
  let taxesPaid = 0
  const points: YearPoint[] = [{ year: 0, net: value, gross: value, taxesPaid: 0, exitTax: 0 }]
  for (let y = 1; y <= inputs.years; y++) {
    const s = savingsFor(inputs, a, y)
    let interest = 0
    for (let m = 1; m <= 12; m++) {
      value += s
      const i = value * mr
      interest += i
      value += i
    }
    const { tax } = taxCapitalIncome(interest, a.sparerpauschbetrag, rate)
    value -= tax
    taxesPaid += tax
    points.push({ year: y, net: value, gross: value, taxesPaid, exitTax: 0 })
  }
  return points
}

export function simulateBauspar(inputs: Inputs, a: Assumptions): YearPoint[] {
  const rate = capitalTaxRate(a.abgeltungsteuer, a.soli)
  const mr = monthlyRate(a.bausparRate)
  // Abschlussgebühr on the contract sum, paid from the first deposit.
  let value = inputs.startCapital - a.bausparSumme * a.bausparFee
  let taxesPaid = 0
  const points: YearPoint[] = [{ year: 0, net: value, gross: value, taxesPaid: 0, exitTax: 0 }]
  for (let y = 1; y <= inputs.years; y++) {
    const s = savingsFor(inputs, a, y)
    let interest = 0
    let deposits = 0
    for (let m = 1; m <= 12; m++) {
      value += s
      deposits += s
      const i = value * mr
      interest += i
      value += i
    }
    value -= a.bausparAnnualFee
    // Wohnungsbauprämie: 10 % on up to 700 € deposits per year (income limits assumed met).
    if (a.wohnungsbaupraemie) value += Math.min(deposits, 700) * 0.1
    const { tax } = taxCapitalIncome(interest, a.sparerpauschbetrag, rate)
    value -= tax
    taxesPaid += tax
    points.push({ year: y, net: value, gross: value, taxesPaid, exitTax: 0 })
  }
  return points
}

export function simulateMattress(inputs: Inputs, a: Assumptions): YearPoint[] {
  let value = inputs.startCapital
  const points: YearPoint[] = [{ year: 0, net: value, gross: value, taxesPaid: 0, exitTax: 0 }]
  for (let y = 1; y <= inputs.years; y++) {
    value += savingsFor(inputs, a, y) * 12
    points.push({ year: y, net: value, gross: value, taxesPaid: 0, exitTax: 0 })
  }
  return points
}

/**
 * Property bought on day one with the starting capital as equity. Every month the
 * household has its savings plus the rent (saved rent if owner-occupied, rental
 * income otherwise) and pays the annuity and maintenance from it. Surplus lands in a
 * side account at the Tagesgeld rate; a deficit is financed at the mortgage rate.
 */
export function simulateProperty(inputs: Inputs, a: Assumptions): YearPoint[] {
  const capRate = capitalTaxRate(a.abgeltungsteuer, a.soli)
  const costs = purchaseCosts(a.propertyPrice, a)
  const acquisitionCost = a.propertyPrice + costs.total
  let loan = Math.max(0, acquisitionCost - inputs.startCapital)
  let side = Math.max(0, inputs.startCapital - acquisitionCost)
  const annuity = monthlyAnnuity(loan, a.mortgageRate, a.tilgung)
  const mMortgage = a.mortgageRate / 12
  const mSidePlus = monthlyRate(a.tagesgeldRate)
  const mSideMinus = monthlyRate(a.mortgageRate)
  const afaPerYear = acquisitionCost * a.buildingShare * a.afa
  let propertyValue = a.propertyPrice
  let depreciation = 0
  let taxesPaid = costs.grunderwerbsteuer

  const exit = (yearsHeld: number) => {
    const saleCosts = propertyValue * a.saleCosts
    const tax = propertySaleTax({
      salePrice: propertyValue,
      saleCosts,
      acquisitionCost,
      depreciationClaimed: depreciation,
      yearsHeld,
      speculationYears: a.speculationYears,
      ownerOccupied: a.ownerOccupied,
      personalRate: a.personalTaxRate,
    })
    return { saleCosts, tax }
  }

  const point = (year: number): YearPoint => {
    const { saleCosts, tax } = exit(year)
    const gross = propertyValue - loan + side
    return { year, gross, net: gross - saleCosts - tax, taxesPaid, exitTax: tax }
  }

  const points: YearPoint[] = [point(0)]
  for (let y = 1; y <= inputs.years; y++) {
    const s = savingsFor(inputs, a, y)
    const rent = a.monthlyRent * Math.pow(1 + a.rentGrowth, y - 1)
    const maintenance = (propertyValue * a.maintenance) / 12
    let interestPaid = 0
    let sideInterest = 0
    for (let m = 1; m <= 12; m++) {
      let payment = 0
      if (loan > 0) {
        const interest = loan * mMortgage
        payment = Math.min(annuity, loan + interest)
        loan = loan + interest - payment
        interestPaid += interest
        if (loan < 0.005) loan = 0
      }
      side += s + rent - payment - maintenance
      const i = side * (side >= 0 ? mSidePlus : mSideMinus)
      if (side >= 0) sideInterest += i
      side += i
    }
    propertyValue *= 1 + a.appreciation
    if (!a.ownerOccupied) {
      // Einkünfte aus Vermietung: rent − interest − maintenance − AfA at the personal rate.
      // Losses reduce other income tax, so they come back as a refund.
      const afa = Math.min(afaPerYear, acquisitionCost * a.buildingShare - depreciation)
      depreciation += afa
      const taxable = rent * 12 - interestPaid - maintenance * 12 - afa
      const tax = taxable * a.personalTaxRate
      side -= tax
      taxesPaid += tax
    }
    const { tax } = taxCapitalIncome(sideInterest, a.sparerpauschbetrag, capRate)
    side -= tax
    taxesPaid += tax
    points.push(point(y))
  }
  return points
}

export function simulate(inputs: Inputs, a: Assumptions): SimulationResult {
  const contributed: number[] = [inputs.startCapital]
  const deflator: number[] = [1]
  for (let y = 1; y <= inputs.years; y++) {
    contributed.push(contributed[y - 1] + savingsFor(inputs, a, y) * 12)
    deflator.push(Math.pow(1 + a.inflation, y))
  }
  return {
    contributed,
    deflator,
    racers: [
      { id: 'etf', points: simulateEtf(inputs, a) },
      { id: 'immobilie', points: simulateProperty(inputs, a) },
      { id: 'tagesgeld', points: simulateSavingsAccount(inputs, a, a.tagesgeldRate) },
      { id: 'bauspar', points: simulateBauspar(inputs, a) },
      { id: 'matratze', points: simulateMattress(inputs, a) },
    ],
  }
}
