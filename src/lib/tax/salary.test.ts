import { describe, expect, it } from 'vitest';
import {
  isScheduleEmpty,
  normalizeSchedule,
  rateForMonth,
  salaryForCalendarYear,
  salaryForYa,
  salaryMonthsForYa,
} from './salary';

/**
 * The reference case throughout: 136,000/month from January 2026, rising to
 * 160,000/month from July 2026.
 */
const SCHEDULE = [
  { from: '2026-01', monthlyAmount: 136_000 },
  { from: '2026-07', monthlyAmount: 160_000 },
];

describe('rateForMonth', () => {
  it.each([
    ['Dec 2025', 2025, 11, 0], // before the first entry
    ['Jan 2026', 2026, 0, 136_000], // the month it starts
    ['Jun 2026', 2026, 5, 136_000], // last month of the old rate
    ['Jul 2026', 2026, 6, 160_000], // the raise
    ['Mar 2027', 2027, 2, 160_000], // still in force a year later
    ['Sep 2030', 2030, 8, 160_000], // and indefinitely after
  ])('%s', (_label, year, month, expected) => {
    expect(rateForMonth(SCHEDULE, year, month)).toBe(expected);
  });

  it('returns zero for an empty schedule', () => {
    expect(rateForMonth([], 2026, 6)).toBe(0);
  });

  it('is unaffected by the order entries are given in', () => {
    const reversed = [...SCHEDULE].reverse();
    expect(rateForMonth(reversed, 2026, 6)).toBe(160_000);
    expect(rateForMonth(reversed, 2026, 5)).toBe(136_000);
  });
});

describe('salaryForYa', () => {
  it('splits the year of assessment at April, not January', () => {
    // YA 2026/27 gets three months at the old rate and nine at the new one.
    expect(salaryForYa(SCHEDULE, 2026)).toBe(3 * 136_000 + 9 * 160_000);
    expect(salaryForYa(SCHEDULE, 2026)).toBe(1_848_000);
  });

  it('puts January to March 2026 in the previous year of assessment', () => {
    // YA 2025/26 runs Apr 2025 – Mar 2026, so only Jan/Feb/Mar are covered.
    expect(salaryForYa(SCHEDULE, 2025)).toBe(3 * 136_000);
    expect(salaryForYa(SCHEDULE, 2025)).toBe(408_000);
  });

  it('carries the latest rate through a full following year', () => {
    expect(salaryForYa(SCHEDULE, 2027)).toBe(12 * 160_000);
  });

  it('labels the months April through March in order', () => {
    const months = salaryMonthsForYa(SCHEDULE, 2026);
    expect(months.map((m) => m.label)).toEqual([
      'Apr 2026', 'May 2026', 'Jun 2026',
      'Jul 2026', 'Aug 2026', 'Sep 2026',
      'Oct 2026', 'Nov 2026', 'Dec 2026',
      'Jan 2027', 'Feb 2027', 'Mar 2027',
    ]);
  });

  it('marks the month the raise takes effect', () => {
    const months = salaryMonthsForYa(SCHEDULE, 2026);
    expect(months.find((m) => m.label === 'Jun 2026')?.amount).toBe(136_000);
    expect(months.find((m) => m.label === 'Jul 2026')?.amount).toBe(160_000);
  });
});

describe('salaryForCalendarYear', () => {
  it('differs from the year of assessment, which is the usual confusion', () => {
    // Jan–Jun at 136,000 plus Jul–Dec at 160,000.
    expect(salaryForCalendarYear(SCHEDULE, 2026)).toBe(6 * 136_000 + 6 * 160_000);
    expect(salaryForCalendarYear(SCHEDULE, 2026)).toBe(1_776_000);

    // The tax year is 72,000 higher, because it swaps three months of the old
    // rate for three of the new one.
    expect(salaryForYa(SCHEDULE, 2026) - salaryForCalendarYear(SCHEDULE, 2026)).toBe(
      72_000,
    );
  });
});

describe('normalizeSchedule', () => {
  it('sorts oldest first and drops unusable rows', () => {
    const result = normalizeSchedule([
      { from: '2026-07', monthlyAmount: 160_000 },
      { from: 'nonsense', monthlyAmount: 50_000 },
      { from: '2026-13', monthlyAmount: 50_000 }, // no month 13
      { from: '2026-01', monthlyAmount: 136_000 },
      { from: '2026-04', monthlyAmount: Number.NaN },
      { from: '2026-05', monthlyAmount: -1 },
    ]);

    expect(result).toEqual([
      { from: '2026-01', monthlyAmount: 136_000 },
      { from: '2026-07', monthlyAmount: 160_000 },
    ]);
  });

  it('keeps a deliberate zero, which means unpaid rather than unknown', () => {
    expect(normalizeSchedule([{ from: '2026-01', monthlyAmount: 0 }])).toHaveLength(1);
  });
});

describe('isScheduleEmpty', () => {
  it('is true when undefined, empty, or all zeroes', () => {
    expect(isScheduleEmpty(undefined)).toBe(true);
    expect(isScheduleEmpty([])).toBe(true);
    expect(isScheduleEmpty([{ from: '2026-01', monthlyAmount: 0 }])).toBe(true);
  });

  it('is false once a real rate is set', () => {
    expect(isScheduleEmpty(SCHEDULE)).toBe(false);
  });
});
