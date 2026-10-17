// German tax rules used by the racers. Pure functions, no state — see tax.test.ts.

/** Abgeltungsteuer + Solidaritätszuschlag (no Kirchensteuer): 25 % × 1.055 = 26.375 %. */
export function capitalTaxRate(abgeltungsteuer: number, soli: number): number {
  return abgeltungsteuer * (1 + soli)
}

export interface AllowanceResult {
  /** Tax due after the allowance. */
  tax: number
  /** Part of the allowance consumed by this income. */
  allowanceUsed: number
}

/**
 * Tax on capital income (already after Teilfreistellung) with the remaining
 * Sparerpauschbetrag of the year. Losses / zero income cost nothing and use nothing.
 */
export function taxCapitalIncome(taxable: number, allowanceLeft: number, rate: number): AllowanceResult {
  if (taxable <= 0) return { tax: 0, allowanceUsed: 0 }
  const allowanceUsed = Math.min(taxable, Math.max(0, allowanceLeft))
  return { tax: (taxable - allowanceUsed) * rate, allowanceUsed }
}

export interface Contribution {
  amount: number
  /** Calendar month of purchase, 1 = January … 12 = December. */
  month: number
}

/**
 * Vorabpauschale (§ 18 InvStG) for an accumulating fund, before Teilfreistellung.
 *
 * Basisertrag = value at start of year × Basiszins × 0.7; units bought during the
 * year count pro rata (reduced by 1/12 for every full month before purchase).
 * The Vorabpauschale is capped by the actual value increase of the year
 * (end − start − purchases) and never negative.
 */
export function vorabpauschale(
  valueStart: number,
  valueEnd: number,
  contributions: Contribution[],
  basiszins: number,
): number {
  if (basiszins <= 0) return 0
  let basisertrag = valueStart * basiszins * 0.7
  let purchased = 0
  for (const c of contributions) {
    purchased += c.amount
    basisertrag += c.amount * basiszins * 0.7 * ((13 - c.month) / 12)
  }
  const increase = valueEnd - valueStart - purchased
  return Math.max(0, Math.min(basisertrag, increase))
}

/**
 * Tax when selling fund units: gain minus Vorabpauschalen already taxed,
 * Teilfreistellung applied, then Sparerpauschbetrag.
 */
export function fundSaleTax(
  value: number,
  costBasis: number,
  taxedVorabpauschalen: number,
  teilfreistellung: number,
  allowanceLeft: number,
  rate: number,
): number {
  const gain = value - costBasis - taxedVorabpauschalen
  if (gain <= 0) return 0
  return taxCapitalIncome(gain * (1 - teilfreistellung), allowanceLeft, rate).tax
}

export interface PurchaseCosts {
  grunderwerbsteuer: number
  notar: number
  makler: number
  total: number
}

/** Kaufnebenkosten as shares of the purchase price. */
export function purchaseCosts(
  price: number,
  rates: { grunderwerbsteuer: number; notar: number; makler: number },
): PurchaseCosts {
  const grunderwerbsteuer = price * rates.grunderwerbsteuer
  const notar = price * rates.notar
  const makler = price * rates.makler
  return { grunderwerbsteuer, notar, makler, total: grunderwerbsteuer + notar + makler }
}

/**
 * Private Veräußerungsgeschäft (§ 23 EStG): a property sale is taxable at the
 * personal rate if bought and sold within ≤ `speculationYears` years — unless it
 * was owner-occupied (in the year of sale and the two years before), then it is
 * always tax-free.
 */
export function propertySaleTax(opts: {
  salePrice: number
  saleCosts: number
  /** Purchase price + Nebenkosten. */
  acquisitionCost: number
  /** Depreciation (AfA) already claimed — reduces the tax basis. */
  depreciationClaimed: number
  yearsHeld: number
  speculationYears: number
  ownerOccupied: boolean
  personalRate: number
}): number {
  if (opts.ownerOccupied) return 0
  if (opts.yearsHeld > opts.speculationYears) return 0
  const basis = opts.acquisitionCost - opts.depreciationClaimed
  const gain = opts.salePrice - opts.saleCosts - basis
  return gain > 0 ? gain * opts.personalRate : 0
}

/** Monthly annuity for a loan with initial Tilgung (German "Zins + anfängliche Tilgung"). */
export function monthlyAnnuity(loan: number, rate: number, tilgung: number): number {
  return (loan * (rate + tilgung)) / 12
}
