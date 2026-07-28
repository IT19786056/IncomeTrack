/**
 * Normalising and aggregating Firestore records.
 *
 * Everything the dashboard and the tax engine read goes through here, so date
 * handling and income/expense discrimination happen exactly once instead of at
 * every render site.
 */

import type {
  Category,
  Expense,
  FirestoreDate,
  Income,
  TransactionView,
} from '../types';
import {
  isWithinYa,
  monthsElapsedInYa,
  yaRange,
  yaStartYearForDate,
} from './tax';

/**
 * Best available date for a record.
 *
 * `date` is always written as a concrete Timestamp, but `createdAt` uses
 * serverTimestamp() and echoes back null from the local cache for a moment
 * before the server value arrives. Falling back keeps a freshly added
 * transaction visible instead of throwing on `.toDate()` — the old dashboard
 * crashed here.
 */
export function toDate(date: FirestoreDate, fallback?: FirestoreDate): Date | null {
  if (date) return date.toDate();
  if (fallback) return fallback.toDate();
  return null;
}

export function normalizeExpenses(expenses: Expense[]): TransactionView[] {
  return expenses.flatMap((expense) => {
    const date = toDate(expense.date, expense.createdAt);
    if (!date || !expense.id) return [];
    return [
      {
        id: expense.id,
        kind: 'expense' as const,
        amount: expense.amount,
        label: expense.category,
        description: expense.description,
        date,
        // Legacy records predate the field; absent means not claimed.
        deductible: expense.deductible === true,
        isSalary: false,
      },
    ];
  });
}

export function normalizeIncome(income: Income[]): TransactionView[] {
  return income.flatMap((entry) => {
    const date = toDate(entry.date, entry.createdAt);
    if (!date || !entry.id) return [];
    return [
      {
        id: entry.id,
        kind: 'income' as const,
        amount: entry.amount,
        label: entry.source,
        description: entry.description,
        date,
        deductible: false,
        isSalary: entry.isSalary === true,
      },
    ];
  });
}

/** Newest first. */
export function sortByDateDesc(transactions: TransactionView[]): TransactionView[] {
  return [...transactions].sort((a, b) => b.date.getTime() - a.date.getTime());
}

export function withinYa(
  transactions: TransactionView[],
  yaStartYear: number,
): TransactionView[] {
  return transactions.filter((t) => isWithinYa(t.date, yaStartYear));
}

export function withinMonth(
  transactions: TransactionView[],
  year: number,
  month: number,
): TransactionView[] {
  return transactions.filter(
    (t) => t.date.getFullYear() === year && t.date.getMonth() === month,
  );
}

export interface Totals {
  income: number;
  expenses: number;
  /** Expenses flagged as claimable against business income. */
  deductibleExpenses: number;
  /** Income less all expenses — actual cash position. */
  net: number;
}

export function totals(transactions: TransactionView[]): Totals {
  let income = 0;
  let expenses = 0;
  let deductibleExpenses = 0;

  for (const t of transactions) {
    if (t.kind === 'income') {
      income += t.amount;
    } else {
      expenses += t.amount;
      if (t.deductible) deductibleExpenses += t.amount;
    }
  }

  return { income, expenses, deductibleExpenses, net: income - expenses };
}

export interface OtherIncome {
  total: number;
  /** The individual entries, newest first, for showing what made up the total. */
  entries: TransactionView[];
}

/**
 * Income in a year of assessment that the salary schedule does not already
 * cover — bonuses, one-off projects, interest.
 *
 * Entries flagged as salary are excluded on purpose: the schedule is the source
 * of truth for salary, so counting a logged payslip as well would double it.
 */
export function otherIncomeForYa(
  transactions: TransactionView[],
  yaStartYear: number,
): OtherIncome {
  const entries = sortByDateDesc(
    withinYa(transactions, yaStartYear).filter(
      (t) => t.kind === 'income' && !t.isSalary,
    ),
  );
  return {
    total: entries.reduce((sum, t) => sum + t.amount, 0),
    entries,
  };
}

/** Years of assessment that actually contain data, newest first. */
export function yearsWithActivity(
  transactions: TransactionView[],
  now = new Date(),
): number[] {
  const years = new Set<number>([yaStartYearForDate(now)]);
  for (const t of transactions) years.add(yaStartYearForDate(t.date));
  return [...years].sort((a, b) => b - a);
}

export interface CategoryBudget {
  name: string;
  budget: number;
  spent: number;
  /** Fraction of budget used. Uncapped, so overspend is visible. */
  ratio: number;
}

/** Budget-versus-actual for one month. Categories without a budget are skipped. */
export function categoryBudgets(
  categories: Category[],
  transactions: TransactionView[],
  year: number,
  month: number,
): CategoryBudget[] {
  const monthly = withinMonth(transactions, year, month);

  const spentByCategory = new Map<string, number>();
  for (const t of monthly) {
    if (t.kind !== 'expense') continue;
    spentByCategory.set(t.label, (spentByCategory.get(t.label) ?? 0) + t.amount);
  }

  return categories
    .filter((c) => c.budget > 0)
    .map((c) => {
      const spent = spentByCategory.get(c.name) ?? 0;
      return { name: c.name, budget: c.budget, spent, ratio: spent / c.budget };
    })
    .sort((a, b) => b.ratio - a.ratio);
}

/** Monthly income and expense series for a year of assessment, Apr → Mar. */
export function monthlySeries(
  transactions: TransactionView[],
  yaStartYear: number,
): { label: string; income: number; expenses: number }[] {
  const MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

  return MONTHS.map((label, offset) => {
    const monthIndex = (3 + offset) % 12;
    const year = yaStartYear + (3 + offset >= 12 ? 1 : 0);
    const { income, expenses } = totals(withinMonth(transactions, year, monthIndex));
    return { label, income, expenses };
  });
}

export interface CategorySpend {
  name: string;
  amount: number;
  /** Portion of this category claimed as a business expense. */
  business: number;
  /** Share of the month's total spending, 0–1. */
  share: number;
}

/**
 * Spending per category for one month, largest first.
 *
 * Built from the transactions themselves rather than the categories collection,
 * so a category typed straight into an expense still shows up. `categoryBudgets`
 * deliberately covers only categories carrying a budget; this covers everything.
 */
export function spendByCategory(
  transactions: TransactionView[],
  year: number,
  month: number,
): CategorySpend[] {
  const monthly = withinMonth(transactions, year, month);

  const byName = new Map<string, { amount: number; business: number }>();
  let total = 0;

  for (const t of monthly) {
    if (t.kind !== 'expense') continue;
    const entry = byName.get(t.label) ?? { amount: 0, business: 0 };
    entry.amount += t.amount;
    if (t.deductible) entry.business += t.amount;
    byName.set(t.label, entry);
    total += t.amount;
  }

  return [...byName.entries()]
    .map(([name, entry]) => ({
      name,
      amount: entry.amount,
      business: entry.business,
      share: total > 0 ? entry.amount / total : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export interface SpendSplit {
  personal: number;
  business: number;
  total: number;
}

/** How a month's spending divides between personal and claimable business costs. */
export function spendSplit(
  transactions: TransactionView[],
  year: number,
  month: number,
): SpendSplit {
  const { expenses, deductibleExpenses } = totals(
    withinMonth(transactions, year, month),
  );
  return {
    personal: expenses - deductibleExpenses,
    business: deductibleExpenses,
    total: expenses,
  };
}

export interface SavingsPoint {
  label: string;
  income: number;
  expenses: number;
  /** Net for this month alone. */
  saved: number;
  /** Running total from the start of the year of assessment. */
  cumulative: number;
}

export interface Savings {
  income: number;
  expenses: number;
  /** Income less expenses across the year so far. */
  saved: number;
  /** Saved as a fraction of income. Zero when nothing was earned. */
  rate: number;
  /** Best and worst months so far, or null when there is no data yet. */
  bestMonth: SavingsPoint | null;
  worstMonth: SavingsPoint | null;
  /** Month-by-month running total, truncated at the current month. */
  series: SavingsPoint[];
}

/**
 * Savings across a year of assessment.
 *
 * The series stops at the current month rather than running to March: plotting
 * unreached months as zero would draw a flat line to the axis and read as
 * "saved nothing" instead of "not yet happened".
 */
export function savings(
  transactions: TransactionView[],
  yaStartYear: number,
  now: Date = new Date(),
): Savings {
  const { start, end } = yaRange(yaStartYear);

  const monthsToShow =
    now >= end ? 12 : now < start ? 0 : monthsElapsedInYa(yaStartYear, now) + 1;

  let running = 0;
  const series: SavingsPoint[] = monthlySeries(transactions, yaStartYear)
    .slice(0, monthsToShow)
    .map((month) => {
      const saved = month.income - month.expenses;
      running += saved;
      return { ...month, saved, cumulative: running };
    });

  const yearTotals = totals(withinYa(transactions, yaStartYear));
  const withActivity = series.filter((p) => p.income > 0 || p.expenses > 0);

  return {
    income: yearTotals.income,
    expenses: yearTotals.expenses,
    saved: yearTotals.net,
    rate: yearTotals.income > 0 ? yearTotals.net / yearTotals.income : 0,
    bestMonth:
      withActivity.length > 0
        ? withActivity.reduce((a, b) => (b.saved > a.saved ? b : a))
        : null,
    worstMonth:
      withActivity.length > 0
        ? withActivity.reduce((a, b) => (b.saved < a.saved ? b : a))
        : null,
    series,
  };
}
