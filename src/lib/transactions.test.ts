import { describe, expect, it } from 'vitest';
import {
  otherIncomeForYa,
  savings,
  spendByCategory,
  spendSplit,
} from './transactions';
import type { TransactionView } from '../types';

let nextId = 0;

function expense(
  date: Date,
  amount: number,
  label: string,
  deductible = false,
): TransactionView {
  return {
    id: `e${nextId++}`,
    kind: 'expense',
    amount,
    label,
    date,
    deductible,
    isSalary: false,
  };
}

function income(
  date: Date,
  amount: number,
  label = 'Client',
  isSalary = false,
): TransactionView {
  return {
    id: `i${nextId++}`,
    kind: 'income',
    amount,
    label,
    date,
    deductible: false,
    isSalary,
  };
}

const JUL_2026 = { year: 2026, month: 6 };

describe('spendByCategory', () => {
  const transactions = [
    expense(new Date(2026, 6, 2), 12_000, 'Food'),
    expense(new Date(2026, 6, 15), 8_000, 'Food'),
    expense(new Date(2026, 6, 9), 25_000, 'Internet & phone', true),
    expense(new Date(2026, 6, 20), 5_000, 'Leisure'),
    income(new Date(2026, 6, 1), 160_000),
    // Outside the month — must not be counted.
    expense(new Date(2026, 5, 30), 99_000, 'Food'),
  ];

  it('groups spending per category, largest first', () => {
    const result = spendByCategory(transactions, JUL_2026.year, JUL_2026.month);
    expect(result.map((c) => [c.name, c.amount])).toEqual([
      ['Internet & phone', 25_000],
      ['Food', 20_000],
      ['Leisure', 5_000],
    ]);
  });

  it('reports each category share of the month', () => {
    const result = spendByCategory(transactions, JUL_2026.year, JUL_2026.month);
    // 50,000 spent in total.
    expect(result.find((c) => c.name === 'Food')?.share).toBeCloseTo(0.4, 6);
    expect(result.reduce((sum, c) => sum + c.share, 0)).toBeCloseTo(1, 6);
  });

  it('separates the claimable portion within a category', () => {
    const result = spendByCategory(transactions, JUL_2026.year, JUL_2026.month);
    expect(result.find((c) => c.name === 'Internet & phone')?.business).toBe(25_000);
    expect(result.find((c) => c.name === 'Food')?.business).toBe(0);
  });

  it('includes categories that were never formally created', () => {
    // 'Leisure' exists only on the transaction, not in any categories document.
    const result = spendByCategory(transactions, JUL_2026.year, JUL_2026.month);
    expect(result.some((c) => c.name === 'Leisure')).toBe(true);
  });

  it('ignores income and returns nothing for an empty month', () => {
    expect(spendByCategory(transactions, 2026, 0)).toEqual([]);
  });
});

describe('spendSplit', () => {
  it('divides a month between personal and business spending', () => {
    const transactions = [
      expense(new Date(2026, 6, 2), 30_000, 'Food'),
      expense(new Date(2026, 6, 9), 20_000, 'Software', true),
      income(new Date(2026, 6, 1), 160_000),
    ];

    expect(spendSplit(transactions, JUL_2026.year, JUL_2026.month)).toEqual({
      personal: 30_000,
      business: 20_000,
      total: 50_000,
    });
  });

  it('is all zeroes for a month with no spending', () => {
    expect(spendSplit([], 2026, 6)).toEqual({ personal: 0, business: 0, total: 0 });
  });
});

describe('otherIncomeForYa', () => {
  it('excludes salary, which the schedule already covers', () => {
    const result = otherIncomeForYa(
      [
        income(new Date(2026, 6, 5), 160_000, 'Employer', true),
        income(new Date(2026, 8, 12), 75_000, 'Side project'),
      ],
      2026,
    );

    expect(result.total).toBe(75_000);
    expect(result.entries.map((e) => e.label)).toEqual(['Side project']);
  });

  it('ignores expenses and other years of assessment', () => {
    const result = otherIncomeForYa(
      [
        income(new Date(2026, 8, 12), 75_000, 'Bonus'),
        income(new Date(2026, 1, 12), 50_000, 'Old year'), // Feb 2026 → YA 2025/26
        expense(new Date(2026, 8, 14), 20_000, 'Food'),
      ],
      2026,
    );

    expect(result.total).toBe(75_000);
  });

  it('treats income with no salary flag as extra income', () => {
    // Legacy records predate the flag; counting them is the safe reading.
    const result = otherIncomeForYa([income(new Date(2026, 6, 5), 40_000)], 2026);
    expect(result.total).toBe(40_000);
  });

  it('is zero when nothing but salary was logged', () => {
    const result = otherIncomeForYa(
      [income(new Date(2026, 6, 5), 160_000, 'Employer', true)],
      2026,
    );
    expect(result.total).toBe(0);
    expect(result.entries).toEqual([]);
  });
});

describe('savings', () => {
  // April to July of YA 2026/27, with July running at a deficit.
  const transactions = [
    income(new Date(2026, 3, 5), 140_000),
    expense(new Date(2026, 3, 20), 40_000, 'Food'),
    income(new Date(2026, 4, 5), 140_000),
    expense(new Date(2026, 4, 20), 60_000, 'Food'),
    income(new Date(2026, 5, 5), 140_000),
    expense(new Date(2026, 5, 20), 50_000, 'Food'),
    income(new Date(2026, 6, 5), 160_000),
    expense(new Date(2026, 6, 20), 200_000, 'Equipment', true),
  ];

  const now = new Date(2026, 6, 28); // 28 July 2026

  it('totals income, spending and what is left', () => {
    const result = savings(transactions, 2026, now);
    expect(result.income).toBe(580_000);
    expect(result.expenses).toBe(350_000);
    expect(result.saved).toBe(230_000);
    expect(result.rate).toBeCloseTo(230_000 / 580_000, 6);
  });

  it('stops the series at the current month rather than running to March', () => {
    const result = savings(transactions, 2026, now);
    expect(result.series.map((p) => p.label)).toEqual(['Apr', 'May', 'Jun', 'Jul']);
  });

  it('accumulates the running total across months', () => {
    const result = savings(transactions, 2026, now);
    expect(result.series.map((p) => p.cumulative)).toEqual([
      100_000, // Apr: +100,000
      180_000, // May: +80,000
      270_000, // Jun: +90,000
      230_000, // Jul: −40,000
    ]);
  });

  it('identifies the best and worst months', () => {
    const result = savings(transactions, 2026, now);
    expect(result.bestMonth?.label).toBe('Apr');
    expect(result.worstMonth?.label).toBe('Jul');
    expect(result.worstMonth?.saved).toBe(-40_000);
  });

  it('shows the full year once it has closed', () => {
    const result = savings(transactions, 2026, new Date(2027, 5, 1));
    expect(result.series).toHaveLength(12);
    expect(result.series.at(-1)?.cumulative).toBe(230_000);
  });

  it('shows nothing for a year that has not started', () => {
    const result = savings(transactions, 2027, new Date(2026, 6, 28));
    expect(result.series).toEqual([]);
    expect(result.bestMonth).toBeNull();
  });

  it('reports a zero rate rather than dividing by zero', () => {
    const result = savings(
      [expense(new Date(2026, 6, 2), 5_000, 'Food')],
      2026,
      now,
    );
    expect(result.income).toBe(0);
    expect(result.rate).toBe(0);
    expect(result.saved).toBe(-5_000);
  });
});
