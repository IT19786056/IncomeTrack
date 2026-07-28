/**
 * Pure Sri Lanka personal income tax computation.
 *
 * Nothing here touches Firestore, React or the clock — the same inputs always
 * produce the same output, which is what makes tax figures worth trusting.
 * Tax is always derived from the underlying records, never stored, so a
 * back-dated edit can never leave a stale number on screen.
 *
 * The computation, per IRD rules for an individual:
 *
 *   gross income
 *   − allowable business expenses
 *   = net business income
 *   − personal relief
 *   = taxable income
 *   → progressive bands, each capped at 15% for foreign service income
 */

import {
  TaxBand,
  TaxRegime,
  YearOfAssessmentRates,
  ratesForYear,
  yearLabel,
} from './rates';

export interface BandCharge {
  /** Lower bound of this band within taxable income. */
  from: number;
  /** Upper bound, or null for the top band. */
  to: number | null;
  rate: number;
  /** Portion of taxable income falling in this band. */
  amount: number;
  /** Tax charged on that portion. */
  tax: number;
}

export interface NextThreshold {
  /** The marginal rate that begins at this threshold. */
  rate: number;
  /** Taxable income at which the higher rate starts. */
  taxableAt: number;
  /** Gross income at which the higher rate starts, given current expenses. */
  grossAt: number;
  /** Additional gross income before crossing. Never negative. */
  remaining: number;
}

export interface TaxComputation {
  yaStartYear: number;
  yaLabel: string;
  regime: TaxRegime;
  grossIncome: number;
  deductibleExpenses: number;
  netBusinessIncome: number;
  personalRelief: number;
  /** Relief actually used — capped at net income, so never creates a loss. */
  reliefApplied: number;
  taxableIncome: number;
  bands: BandCharge[];
  totalTax: number;
  /** Tax as a fraction of gross income. Zero when there is no income. */
  effectiveRate: number;
  monthlyEquivalent: number;
  quarterlyInstalment: number;
  /** True when this income was outside the tax net for this year. */
  exempt: boolean;
  /** Set when rates for this year are carried forward from an earlier year. */
  ratesEstimated: boolean;
  /** The next marginal rate boundary, or null if already in the top band. */
  nextThreshold: NextThreshold | null;
  /** Tax that would be owed with no expenses claimed, for the saving figure. */
  taxBeforeDeductions: number;
}

export interface TaxInput {
  yaStartYear: number;
  regime: TaxRegime;
  grossIncome: number;
  deductibleExpenses: number;
}

/** Round to whole cents, clearing binary floating-point noise. */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Bands after applying the service-export cap, with adjacent equal-rate bands
 * merged. Merging matters: capping 18/24/30/36% at 15% would otherwise report
 * four separate 15% bands and a "next threshold" where the rate never changes.
 */
export function effectiveBands(
  rates: YearOfAssessmentRates,
  regime: TaxRegime,
): TaxBand[] {
  const cap = regime === 'service-export' ? rates.serviceExportCapRate : null;

  const merged: TaxBand[] = [];
  for (const band of rates.bands) {
    const rate = cap === null ? band.rate : Math.min(band.rate, cap);
    const previous = merged[merged.length - 1];

    if (previous && previous.rate === rate) {
      // An unbounded band absorbs everything above it.
      previous.width =
        previous.width === null || band.width === null
          ? null
          : previous.width + band.width;
    } else {
      merged.push({ width: band.width, rate });
    }
  }
  return merged;
}

/** Charge taxable income against the bands, keeping a per-band breakdown. */
function chargeBands(taxableIncome: number, bands: TaxBand[]): BandCharge[] {
  const charges: BandCharge[] = [];
  let remaining = taxableIncome;
  let cursor = 0;

  for (const band of bands) {
    if (remaining <= 0) break;

    const amount = band.width === null ? remaining : Math.min(remaining, band.width);
    charges.push({
      from: cursor,
      to: band.width === null ? null : cursor + band.width,
      rate: band.rate,
      amount: round(amount),
      tax: round(amount * band.rate),
    });

    remaining -= amount;
    cursor += amount;
  }

  return charges;
}

/**
 * Where the next higher marginal rate begins.
 *
 * Below the relief threshold this reports the point at which tax starts at
 * all, which is the number that actually matters to someone not yet liable.
 */
function findNextThreshold(
  taxableIncome: number,
  bands: TaxBand[],
  personalRelief: number,
  deductibleExpenses: number,
  grossIncome: number,
): NextThreshold | null {
  const toGross = (taxable: number) => taxable + personalRelief + deductibleExpenses;

  // Not yet liable: the next event is tax beginning at the relief threshold.
  if (taxableIncome <= 0) {
    const grossAt = toGross(0);
    return {
      rate: bands[0]?.rate ?? 0,
      taxableAt: 0,
      grossAt,
      remaining: Math.max(0, round(grossAt - grossIncome)),
    };
  }

  let boundary = 0;
  for (const band of bands) {
    if (band.width === null) return null; // already in the top band
    boundary += band.width;
    if (taxableIncome < boundary) {
      const nextBand = bands[bands.indexOf(band) + 1];
      if (!nextBand) return null;
      const grossAt = toGross(boundary);
      return {
        rate: nextBand.rate,
        taxableAt: boundary,
        grossAt,
        remaining: Math.max(0, round(grossAt - grossIncome)),
      };
    }
  }
  return null;
}

/** Compute income tax for one year of assessment. */
export function computeTax(input: TaxInput): TaxComputation {
  const { yaStartYear, regime } = input;
  const { rates, isEstimated } = ratesForYear(yaStartYear);

  const grossIncome = Math.max(0, input.grossIncome);
  const deductibleExpenses = Math.max(0, input.deductibleExpenses);

  // Expenses cannot push income below zero — we don't model loss carry-forward.
  const netBusinessIncome = Math.max(0, grossIncome - deductibleExpenses);
  const reliefApplied = Math.min(netBusinessIncome, rates.personalRelief);
  const taxableIncome = Math.max(0, netBusinessIncome - rates.personalRelief);

  const exempt = regime === 'service-export' && rates.serviceExportExempt;
  const bands = effectiveBands(rates, regime);

  const charges = exempt ? [] : chargeBands(taxableIncome, bands);
  const totalTax = round(charges.reduce((sum, c) => sum + c.tax, 0));

  // What the same income would cost with nothing claimed, so the UI can show
  // what the expense tracking is actually worth.
  const taxableBeforeDeductions = Math.max(0, grossIncome - rates.personalRelief);
  const taxBeforeDeductions = exempt
    ? 0
    : round(
        chargeBands(taxableBeforeDeductions, bands).reduce((sum, c) => sum + c.tax, 0),
      );

  return {
    yaStartYear,
    yaLabel: yearLabel(yaStartYear),
    regime,
    grossIncome: round(grossIncome),
    deductibleExpenses: round(deductibleExpenses),
    netBusinessIncome: round(netBusinessIncome),
    personalRelief: rates.personalRelief,
    reliefApplied: round(reliefApplied),
    taxableIncome: round(taxableIncome),
    bands: charges,
    totalTax,
    effectiveRate: grossIncome > 0 ? totalTax / grossIncome : 0,
    monthlyEquivalent: round(totalTax / 12),
    quarterlyInstalment: round(totalTax / 4),
    exempt,
    ratesEstimated: isEstimated,
    nextThreshold: exempt
      ? null
      : findNextThreshold(
          taxableIncome,
          bands,
          rates.personalRelief,
          deductibleExpenses,
          grossIncome,
        ),
    taxBeforeDeductions,
  };
}

/** How much tax the claimed expenses have avoided. */
export function deductionSaving(computation: TaxComputation): number {
  return round(computation.taxBeforeDeductions - computation.totalTax);
}
