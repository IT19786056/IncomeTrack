import { describe, expect, it } from 'vitest';
import { computeTax, deductionSaving, effectiveBands } from './calculate';
import { ratesForYear } from './rates';

/**
 * The service-export figures below are anchored on published worked examples
 * for Sri Lankan individual service exporters (foreign currency remitted
 * through a licensed local bank), cross-checked across two independent
 * calculators. If a rate table changes and these break, the table changed —
 * re-verify against the IRD before editing the expectations.
 */

const SERVICE_EXPORT = {
  yaStartYear: 2026,
  regime: 'service-export' as const,
};

describe('effectiveBands', () => {
  it('collapses the capped bands into 6% then 15% for service exporters', () => {
    const { rates } = ratesForYear(2026);
    expect(effectiveBands(rates, 'service-export')).toEqual([
      { width: 1_000_000, rate: 0.06 },
      { width: null, rate: 0.15 },
    ]);
  });

  it('leaves the full progressive ladder intact for local business income', () => {
    const { rates } = ratesForYear(2026);
    const bands = effectiveBands(rates, 'local-business');
    expect(bands.map((b) => b.rate)).toEqual([0.06, 0.18, 0.24, 0.3, 0.36]);
  });
});

describe('computeTax — service exporter, YA 2026/27', () => {
  it('charges 6% on income just over the relief threshold', () => {
    // 160,000/month for a full year, nothing claimed.
    const result = computeTax({
      ...SERVICE_EXPORT,
      grossIncome: 1_920_000,
      deductibleExpenses: 0,
    });

    expect(result.netBusinessIncome).toBe(1_920_000);
    expect(result.taxableIncome).toBe(120_000);
    expect(result.totalTax).toBe(7_200);
    expect(result.monthlyEquivalent).toBe(600);
    expect(result.quarterlyInstalment).toBe(1_800);
    expect(result.effectiveRate).toBeCloseTo(0.00375, 6);
  });

  it('reaches zero tax once deductions absorb the taxable slice', () => {
    const result = computeTax({
      ...SERVICE_EXPORT,
      grossIncome: 1_920_000,
      deductibleExpenses: 120_000, // 10,000/month
    });

    expect(result.taxableIncome).toBe(0);
    expect(result.totalTax).toBe(0);
    expect(result.bands).toEqual([]);
    expect(deductionSaving(result)).toBe(7_200);
  });

  it('owes nothing at or below the relief threshold', () => {
    const result = computeTax({
      ...SERVICE_EXPORT,
      grossIncome: 1_800_000,
      deductibleExpenses: 0,
    });
    expect(result.totalTax).toBe(0);
    expect(result.reliefApplied).toBe(1_800_000);
  });

  it('never lets relief or deductions create a negative liability', () => {
    const result = computeTax({
      ...SERVICE_EXPORT,
      grossIncome: 400_000,
      deductibleExpenses: 900_000,
    });
    expect(result.netBusinessIncome).toBe(0);
    expect(result.taxableIncome).toBe(0);
    expect(result.totalTax).toBe(0);
    expect(result.reliefApplied).toBe(0);
  });

  // Published worked example: 3,600,000 gross → 180,000 tax, 5.0% effective.
  it('matches the published 3.6M example', () => {
    const result = computeTax({
      ...SERVICE_EXPORT,
      grossIncome: 3_600_000,
      deductibleExpenses: 0,
    });
    expect(result.taxableIncome).toBe(1_800_000);
    expect(result.totalTax).toBe(180_000); // 60,000 @6% + 120,000 @15%
    expect(result.effectiveRate).toBeCloseTo(0.05, 6);
  });

  // Published worked example: 6,000,000 gross → 540,000 tax, 9.0% effective.
  it('matches the published 6M example', () => {
    const result = computeTax({
      ...SERVICE_EXPORT,
      grossIncome: 6_000_000,
      deductibleExpenses: 0,
    });
    expect(result.taxableIncome).toBe(4_200_000);
    expect(result.totalTax).toBe(540_000);
    expect(result.effectiveRate).toBeCloseTo(0.09, 6);
  });

  // Published worked example: 21.6M gross less 500k expenses → 2,805,000 tax,
  // 701,250 per quarterly instalment.
  it('matches the published 21.6M example including expenses', () => {
    const result = computeTax({
      ...SERVICE_EXPORT,
      grossIncome: 21_600_000,
      deductibleExpenses: 500_000,
    });
    expect(result.netBusinessIncome).toBe(21_100_000);
    expect(result.taxableIncome).toBe(19_300_000);
    expect(result.totalTax).toBe(2_805_000);
    expect(result.quarterlyInstalment).toBe(701_250);
  });

  it('caps the top marginal rate at 15%', () => {
    const result = computeTax({
      ...SERVICE_EXPORT,
      grossIncome: 50_000_000,
      deductibleExpenses: 0,
    });
    expect(Math.max(...result.bands.map((b) => b.rate))).toBe(0.15);
  });
});

describe('computeTax — the 15% cap is a concession, not a flat rate', () => {
  it('saves 492,000 against standard rates at 6M, as published', () => {
    const serviceExport = computeTax({
      ...SERVICE_EXPORT,
      grossIncome: 6_000_000,
      deductibleExpenses: 0,
    });
    const localBusiness = computeTax({
      yaStartYear: 2026,
      regime: 'local-business',
      grossIncome: 6_000_000,
      deductibleExpenses: 0,
    });

    expect(localBusiness.totalTax).toBe(1_032_000);
    expect(localBusiness.totalTax - serviceExport.totalTax).toBe(492_000);
  });

  it('gives the same result as standard rates below the cap', () => {
    // At 6% the cap cannot bite, so both regimes must agree exactly.
    const shared = { grossIncome: 1_920_000, deductibleExpenses: 0, yaStartYear: 2026 };
    expect(computeTax({ ...shared, regime: 'service-export' }).totalTax).toBe(
      computeTax({ ...shared, regime: 'local-business' }).totalTax,
    );
  });
});

describe('computeTax — historic years', () => {
  it('treats foreign service income as exempt in YA 2024/25', () => {
    const result = computeTax({
      yaStartYear: 2024,
      regime: 'service-export',
      grossIncome: 5_000_000,
      deductibleExpenses: 0,
    });
    expect(result.exempt).toBe(true);
    expect(result.totalTax).toBe(0);
    expect(result.nextThreshold).toBeNull();
  });

  it('still taxes local business income in YA 2024/25 on the old ladder', () => {
    const result = computeTax({
      yaStartYear: 2024,
      regime: 'local-business',
      grossIncome: 2_000_000,
      deductibleExpenses: 0,
    });
    expect(result.exempt).toBe(false);
    expect(result.personalRelief).toBe(1_200_000);
    // 800,000 taxable: 500,000 @6% = 30,000, then 300,000 @12% = 36,000.
    expect(result.totalTax).toBe(66_000);
  });

  it('flags rates carried forward for years we have no table for', () => {
    const result = computeTax({
      yaStartYear: 2031,
      regime: 'service-export',
      grossIncome: 1_920_000,
      deductibleExpenses: 0,
    });
    expect(result.ratesEstimated).toBe(true);
    expect(result.totalTax).toBe(7_200);
  });
});

describe('nextThreshold', () => {
  it('reports the distance to the 15% band', () => {
    const result = computeTax({
      ...SERVICE_EXPORT,
      grossIncome: 1_920_000,
      deductibleExpenses: 0,
    });

    expect(result.nextThreshold).toEqual({
      rate: 0.15,
      taxableAt: 1_000_000,
      grossAt: 2_800_000,
      remaining: 880_000,
    });
  });

  it('reports where tax begins when not yet liable', () => {
    const result = computeTax({
      ...SERVICE_EXPORT,
      grossIncome: 1_500_000,
      deductibleExpenses: 0,
    });

    expect(result.nextThreshold).toEqual({
      rate: 0.06,
      taxableAt: 0,
      grossAt: 1_800_000,
      remaining: 300_000,
    });
  });

  it('shifts the threshold up by the expenses claimed', () => {
    const result = computeTax({
      ...SERVICE_EXPORT,
      grossIncome: 1_920_000,
      deductibleExpenses: 200_000,
    });
    // Relief plus expenses: 1,800,000 + 200,000.
    expect(result.nextThreshold?.grossAt).toBe(2_000_000);
    expect(result.nextThreshold?.rate).toBe(0.06);
  });

  it('returns null once inside the top band', () => {
    const result = computeTax({
      ...SERVICE_EXPORT,
      grossIncome: 10_000_000,
      deductibleExpenses: 0,
    });
    expect(result.nextThreshold).toBeNull();
  });
});
