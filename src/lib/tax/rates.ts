/**
 * Sri Lanka personal income tax rate tables, keyed by year of assessment.
 *
 * A year of assessment (YA) runs 1 April to 31 March. `startYear` is the
 * calendar year the YA begins in, so YA 2026/27 has startYear 2026.
 *
 * Adding a future year is a data change only — no calculation logic should
 * ever need to know about a specific year. When the IRD publishes new rates,
 * append a table here and set `verifiedOn`.
 *
 * Sources (verified 2026-07-28):
 *  - IRD notice PN/IT/2025-01 (26.03.2025): personal relief raised to
 *    LKR 1,800,000 and the 12% band removed, effective 1 April 2025.
 *  - Foreign-currency service income remitted through a licensed Sri Lankan
 *    bank was exempt up to YA 2024/25, and from 1 April 2025 is taxed at a
 *    MAXIMUM rate of 15% (a cap on the progressive bands, not a flat rate).
 */

/** How a taxpayer's income is characterised for tax purposes. */
export type TaxRegime =
  /** Foreign clients, paid in forex, remitted through a licensed SL bank. */
  | 'service-export'
  /** Sri Lankan clients / local business income. */
  | 'local-business'
  /** Employment income (APIT / PAYE withheld by an employer). */
  | 'employment';

export interface TaxBand {
  /** Width of this band in LKR, or null for "all remaining income". */
  width: number | null;
  /** Marginal rate as a fraction, e.g. 0.06 for 6%. */
  rate: number;
}

export interface YearOfAssessmentRates {
  /** Calendar year the YA starts in. YA 2026/27 → 2026. */
  startYear: number;
  /** Display label, e.g. "2026/27". */
  label: string;
  /** Personal relief deducted from net income before applying bands. */
  personalRelief: number;
  /** Progressive bands applied to taxable income, in order. */
  bands: TaxBand[];
  /**
   * Maximum marginal rate for foreign-currency service income remitted
   * through a licensed bank. Each band's rate is capped at this value.
   * Null means no concessionary cap exists for this year.
   */
  serviceExportCapRate: number | null;
  /** True when foreign service income was fully exempt in this YA. */
  serviceExportExempt: boolean;
  /** When these figures were last checked against a source. */
  verifiedOn: string;
}

/** Bands in force from YA 2025/26 onward (12% band removed). */
const BANDS_FROM_2025: TaxBand[] = [
  { width: 1_000_000, rate: 0.06 },
  { width: 500_000, rate: 0.18 },
  { width: 500_000, rate: 0.24 },
  { width: 500_000, rate: 0.3 },
  { width: null, rate: 0.36 },
];

/** Bands in force up to YA 2024/25. */
const BANDS_TO_2024: TaxBand[] = [
  { width: 500_000, rate: 0.06 },
  { width: 500_000, rate: 0.12 },
  { width: 500_000, rate: 0.18 },
  { width: 500_000, rate: 0.24 },
  { width: 500_000, rate: 0.3 },
  { width: null, rate: 0.36 },
];

export const RATE_TABLES: YearOfAssessmentRates[] = [
  {
    startYear: 2023,
    label: '2023/24',
    personalRelief: 1_200_000,
    bands: BANDS_TO_2024,
    serviceExportCapRate: null,
    serviceExportExempt: true,
    verifiedOn: '2026-07-28',
  },
  {
    startYear: 2024,
    label: '2024/25',
    personalRelief: 1_200_000,
    bands: BANDS_TO_2024,
    serviceExportCapRate: null,
    serviceExportExempt: true,
    verifiedOn: '2026-07-28',
  },
  {
    startYear: 2025,
    label: '2025/26',
    personalRelief: 1_800_000,
    bands: BANDS_FROM_2025,
    serviceExportCapRate: 0.15,
    serviceExportExempt: false,
    verifiedOn: '2026-07-28',
  },
  {
    startYear: 2026,
    label: '2026/27',
    personalRelief: 1_800_000,
    bands: BANDS_FROM_2025,
    serviceExportCapRate: 0.15,
    serviceExportExempt: false,
    verifiedOn: '2026-07-28',
  },
];

/** The most recent year we hold rates for. */
export const LATEST_RATE_TABLE = RATE_TABLES[RATE_TABLES.length - 1];

/** The earliest year we hold rates for. */
export const EARLIEST_RATE_TABLE = RATE_TABLES[0];

/**
 * Rates for a year of assessment.
 *
 * Years beyond our tables fall back to the latest known rates, because
 * carrying last year's rates forward is far more useful than refusing to
 * show a number. Callers can detect this via `isEstimated`.
 */
export function ratesForYear(startYear: number): {
  rates: YearOfAssessmentRates;
  isEstimated: boolean;
} {
  const exact = RATE_TABLES.find((t) => t.startYear === startYear);
  if (exact) return { rates: exact, isEstimated: false };

  if (startYear < EARLIEST_RATE_TABLE.startYear) {
    return { rates: EARLIEST_RATE_TABLE, isEstimated: true };
  }
  return { rates: LATEST_RATE_TABLE, isEstimated: true };
}

/** Human-readable label for a YA start year, e.g. 2026 → "2026/27". */
export function yearLabel(startYear: number): string {
  const next = (startYear + 1) % 100;
  return `${startYear}/${String(next).padStart(2, '0')}`;
}
