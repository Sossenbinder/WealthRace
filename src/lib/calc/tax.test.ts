import { describe, expect, it } from 'vitest'
import {
  capitalTaxRate,
  fundSaleTax,
  monthlyAnnuity,
  propertySaleTax,
  purchaseCosts,
  taxCapitalIncome,
  vorabpauschale,
} from './tax'
import {
  DEFAULT_ASSUMPTIONS,
  simulate,
  simulateEtf,
  simulateMattress,
  simulateProperty,
  simulateSavingsAccount,
  type Assumptions,
  type Inputs,
} from './simulate'

const RATE = 0.26375

describe('Abgeltungsteuer + Soli', () => {
  it('is 26.375 %', () => {
    expect(capitalTaxRate(0.25, 0.055)).toBeCloseTo(RATE, 10)
  })
})

describe('Sparerpauschbetrag', () => {
  it('income below the allowance is tax-free', () => {
    expect(taxCapitalIncome(800, 1000, RATE)).toEqual({ tax: 0, allowanceUsed: 800 })
  })
  it('only the excess over 1000 € is taxed', () => {
    const r = taxCapitalIncome(3000, 1000, RATE)
    expect(r.allowanceUsed).toBe(1000)
    expect(r.tax).toBeCloseTo(2000 * RATE, 8)
  })
  it('partially used allowance carries within the year', () => {
    expect(taxCapitalIncome(1000, 400, RATE).tax).toBeCloseTo(600 * RATE, 8)
  })
  it('losses cost nothing and consume no allowance', () => {
    expect(taxCapitalIncome(-500, 1000, RATE)).toEqual({ tax: 0, allowanceUsed: 0 })
  })
})

describe('Vorabpauschale', () => {
  it('is value × Basiszins × 0.7 when the fund rose enough', () => {
    // 100k fund, Basiszins 2.53 % → Basisertrag 1771 €, fund gained 7k
    expect(vorabpauschale(100_000, 107_000, [], 0.0253)).toBeCloseTo(1771, 6)
  })
  it('is capped by the actual increase', () => {
    expect(vorabpauschale(100_000, 100_500, [], 0.0253)).toBeCloseTo(500, 6)
  })
  it('is zero in a down year', () => {
    expect(vorabpauschale(100_000, 90_000, [], 0.0253)).toBe(0)
  })
  it('is zero with a non-positive Basiszins', () => {
    expect(vorabpauschale(100_000, 120_000, [], 0)).toBe(0)
  })
  it('counts purchases during the year pro rata by month', () => {
    // Bought 12k in March: 10/12 of the year counts. Increase excludes the purchase.
    const vp = vorabpauschale(0, 13_000, [{ amount: 12_000, month: 3 }], 0.03)
    expect(vp).toBeCloseTo(12_000 * 0.03 * 0.7 * (10 / 12), 6)
  })
  it('a January purchase counts fully, a December one 1/12', () => {
    expect(vorabpauschale(0, 2_000, [{ amount: 1_000, month: 1 }], 0.03)).toBeCloseTo(21, 6)
    expect(vorabpauschale(0, 2_000, [{ amount: 1_200, month: 12 }], 0.03)).toBeCloseTo(2.1, 6)
  })
})

describe('Teilfreistellung on fund sale', () => {
  it('taxes only 70 % of the gain of an equity ETF', () => {
    // gain 50k → 35k taxable → minus 1000 allowance
    expect(fundSaleTax(150_000, 100_000, 0, 0.3, 1000, RATE)).toBeCloseTo(34_000 * RATE, 6)
  })
  it('already taxed Vorabpauschalen are deducted from the gain', () => {
    expect(fundSaleTax(150_000, 100_000, 10_000, 0.3, 0, RATE)).toBeCloseTo(28_000 * RATE, 6)
  })
  it('a loss is not taxed', () => {
    expect(fundSaleTax(90_000, 100_000, 0, 0.3, 0, RATE)).toBe(0)
  })
})

describe('Property purchase & sale', () => {
  it('Grunderwerbsteuer, Notar and Makler on the price', () => {
    const c = purchaseCosts(400_000, { grunderwerbsteuer: 0.065, notar: 0.02, makler: 0.0357 })
    expect(c.grunderwerbsteuer).toBeCloseTo(26_000, 6)
    expect(c.notar).toBeCloseTo(8_000, 6)
    expect(c.makler).toBeCloseTo(14_280, 6)
    expect(c.total).toBeCloseTo(48_280, 6)
  })

  const sale = {
    salePrice: 500_000,
    saleCosts: 0,
    acquisitionCost: 420_000,
    depreciationClaimed: 20_000,
    speculationYears: 10,
    ownerOccupied: false,
    personalRate: 0.4,
  }
  it('rented property sold within 10 years: gain (incl. AfA recapture) taxed at personal rate', () => {
    expect(propertySaleTax({ ...sale, yearsHeld: 5 })).toBeCloseTo(100_000 * 0.4, 6)
  })
  it('exactly 10 years is still inside the Spekulationsfrist', () => {
    expect(propertySaleTax({ ...sale, yearsHeld: 10 })).toBeGreaterThan(0)
  })
  it('after more than 10 years the sale is tax-free', () => {
    expect(propertySaleTax({ ...sale, yearsHeld: 11 })).toBe(0)
  })
  it('owner-occupied property is always tax-free', () => {
    expect(propertySaleTax({ ...sale, yearsHeld: 2, ownerOccupied: true })).toBe(0)
  })
  it('a loss on sale costs no tax', () => {
    expect(propertySaleTax({ ...sale, salePrice: 300_000, yearsHeld: 3 })).toBe(0)
  })
  it('annuity = loan × (rate + Tilgung) / 12', () => {
    expect(monthlyAnnuity(300_000, 0.04, 0.02)).toBeCloseTo(1500, 8)
  })
})

describe('simulation', () => {
  const inputs: Inputs = { startCapital: 10_000, monthlySavings: 100, years: 10 }
  const a: Assumptions = { ...DEFAULT_ASSUMPTIONS }

  it('mattress just sums the deposits', () => {
    const p = simulateMattress(inputs, a)
    expect(p).toHaveLength(11)
    expect(p[10].net).toBe(10_000 + 100 * 12 * 10)
  })

  it('Tagesgeld under the allowance pays no tax and matches compound interest', () => {
    const p = simulateSavingsAccount({ startCapital: 10_000, monthlySavings: 0, years: 1 }, a, 0.025)
    expect(p[1].taxesPaid).toBe(0)
    expect(p[1].net).toBeCloseTo(10_250, 6)
  })

  it('Tagesgeld interest above the allowance is taxed at 26.375 %', () => {
    const p = simulateSavingsAccount({ startCapital: 100_000, monthlySavings: 0, years: 1 }, a, 0.025)
    expect(p[1].taxesPaid).toBeCloseTo(1500 * RATE, 6)
    expect(p[1].net).toBeCloseTo(102_500 - 1500 * RATE, 6)
  })

  it('ETF: no tax at all while gains stay within the allowance', () => {
    const p = simulateEtf({ startCapital: 5_000, monthlySavings: 0, years: 1 }, a)
    expect(p[1].taxesPaid).toBe(0)
    expect(p[1].exitTax).toBe(0)
    expect(p[1].net).toBeCloseTo(5_000 * (1 + a.etfReturn - a.etfTer), 6)
  })

  it('ETF: Vorabpauschale is taxed yearly and the exit tax respects Teilfreistellung', () => {
    const p = simulateEtf({ startCapital: 1_000_000, monthlySavings: 0, years: 1 }, { ...a, etfTer: 0 })
    const vp = 1_000_000 * a.basiszins * 0.7
    const vpTax = (vp * 0.7 - 1000) * RATE
    expect(p[1].taxesPaid).toBeCloseTo(vpTax, 4)
    const value = 1_070_000 - vpTax
    const exitGain = value - (1_000_000 - vpTax) - vp
    expect(p[1].exitTax).toBeCloseTo(exitGain * 0.7 * RATE, 4)
    expect(p[1].net).toBeCloseTo(value - p[1].exitTax, 4)
  })

  it('property starts behind by its Nebenkosten', () => {
    const p = simulateProperty(inputs, a)
    const costs = a.propertyPrice * (a.grunderwerbsteuer + a.notar + a.makler)
    expect(p[0].net).toBeCloseTo(10_000 - costs, 6)
  })

  it('rented property: sale tax applies inside the Spekulationsfrist, not after', () => {
    const p = simulateProperty({ ...inputs, years: 12 }, { ...a, ownerOccupied: false, appreciation: 0.05 })
    expect(p[10].exitTax).toBeGreaterThan(0)
    expect(p[11].exitTax).toBe(0)
  })

  it('owner-occupied property never pays sale tax', () => {
    const p = simulateProperty(inputs, { ...a, appreciation: 0.05 })
    expect(p.every((pt) => pt.exitTax === 0)).toBe(true)
  })

  it('mortgage is paid off eventually and the loan never goes negative', () => {
    const p = simulateProperty({ startCapital: 100_000, monthlySavings: 500, years: 40 }, a)
    // After payoff, wealth ≥ property value (no debt left, side account positive).
    const last = p[40]
    expect(last.gross).toBeGreaterThan(a.propertyPrice * Math.pow(1 + a.appreciation, 40) * 0.99)
  })

  it('simulate returns all five racers with years + 1 points and a deflator', () => {
    const r = simulate(inputs, a)
    expect(r.racers.map((x) => x.id).sort()).toEqual(['bauspar', 'etf', 'immobilie', 'matratze', 'tagesgeld'])
    for (const racer of r.racers) expect(racer.points).toHaveLength(11)
    expect(r.contributed[10]).toBe(22_000)
    expect(r.deflator[10]).toBeCloseTo(Math.pow(1.02, 10), 10)
  })
})
