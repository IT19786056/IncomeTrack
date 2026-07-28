import { useMemo } from 'react';
import type { TaxProfile, TransactionView } from '../types';
import {
  Deadline,
  TaxComputation,
  computeTax,
  daysUntil,
  deadlineKey,
  deadlinesForYa,
  relevantDeadlines,
  yaStartYearForDate,
} from '../lib/tax';
import type { TaxRegime } from '../lib/tax';
import { projectYear, totals, withinYa, type YearProjection } from '../lib/transactions';

/**
 * Assumed until the user confirms their setup. Chosen because it is the
 * stricter reading for a consultant billing abroad; `needsSetup` prompts for
 * confirmation rather than letting the assumption go unnoticed.
 */
const DEFAULT_REGIME: TaxRegime = 'service-export';

export interface DeadlineStatus {
  deadline: Deadline;
  /** Instalment amount, or the full-year liability for an annual return. */
  amountDue: number;
  settled: boolean;
  daysRemaining: number;
  /** True when this period carries no liability, so it needs no payment. */
  nothingToPay: boolean;
}

export interface TaxOverview {
  yaStartYear: number;
  regime: TaxRegime;
  /** True while the user has not confirmed their tax setup. */
  needsSetup: boolean;
  /** Tax on the records as they stand — what would be owed if the year ended now. */
  current: TaxComputation;
  /** Tax on the estimated full year. Equals `current` once the year is closed. */
  projected: TaxComputation;
  /** How the full-year estimate was arrived at. */
  projection: YearProjection;
  /** The next thing actually requiring money or a filing, if any. */
  nextAction: DeadlineStatus | null;
  /** Passed deadlines that carried a liability and are unsettled. */
  overdue: DeadlineStatus[];
  upcoming: DeadlineStatus[];
  /**
   * All five deadlines for the selected year, settled ones included, so they
   * stay listed and can be un-marked.
   */
  yearDeadlines: DeadlineStatus[];
}

/**
 * Derives the whole tax picture from transactions.
 *
 * Nothing here is stored — editing or back-dating a transaction immediately
 * changes every figure, so a saved number can never drift from the records
 * behind it.
 */
export function useTaxOverview(
  transactions: TransactionView[],
  taxProfile: TaxProfile | null,
  settledDeadlines: ReadonlySet<string>,
  yaStartYear: number = yaStartYearForDate(new Date()),
  now: Date = new Date(),
): TaxOverview {
  const regime = taxProfile?.regime ?? DEFAULT_REGIME;

  return useMemo(() => {
    /** Tax on what has actually been logged for a year of assessment. */
    const actualFor = (year: number): TaxComputation => {
      const { income, deductibleExpenses } = totals(withinYa(transactions, year));
      return computeTax({
        yaStartYear: year,
        regime,
        grossIncome: income,
        deductibleExpenses,
      });
    };

    /** Tax on the estimated full year, which is what instalments are based on. */
    const projectedFor = (year: number) => {
      const estimate = projectYear(
        transactions,
        year,
        now,
        taxProfile?.expectedMonthlyIncome,
      );
      return {
        estimate,
        computation: computeTax({
          yaStartYear: year,
          regime,
          grossIncome: estimate.income,
          deductibleExpenses: estimate.deductibleExpenses,
        }),
      };
    };

    const current = actualFor(yaStartYear);
    const { estimate: projection, computation: projected } = projectedFor(yaStartYear);

    // Cache per year: several deadlines share a year of assessment.
    const byYear = new Map<number, TaxComputation>();
    const cachedComputation = (year: number) => {
      if (year === yaStartYear) return projected;
      const existing = byYear.get(year);
      if (existing) return existing;
      const computed = projectedFor(year).computation;
      byYear.set(year, computed);
      return computed;
    };

    const describe = (deadline: Deadline): DeadlineStatus => {
      // Instalments are a quarter of the estimated year, not of tax so far.
      const computation = cachedComputation(deadline.yaStartYear);
      const amountDue =
        deadline.period === 'RETURN'
          ? computation.totalTax
          : computation.quarterlyInstalment;

      return {
        deadline,
        amountDue,
        settled: settledDeadlines.has(deadlineKey(deadline)),
        daysRemaining: daysUntil(deadline.dueDate, now),
        // A return is still worth filing at zero; an instalment of zero is not.
        nothingToPay: amountDue <= 0 && deadline.period !== 'RETURN',
      };
    };

    // Alerting deliberately ignores settled deadlines; the year listing does not.
    const { overdue, upcoming } = relevantDeadlines(now, settledDeadlines);

    const describedOverdue = overdue.map(describe).filter((d) => !d.nothingToPay);
    const describedUpcoming = upcoming.map(describe);

    // An unsettled overdue item outranks anything still in the future.
    const nextAction =
      describedOverdue[0] ?? describedUpcoming.find((d) => !d.nothingToPay) ?? null;

    return {
      yaStartYear,
      regime,
      needsSetup: taxProfile === null,
      current,
      projected,
      projection,
      nextAction,
      overdue: describedOverdue,
      upcoming: describedUpcoming,
      yearDeadlines: deadlinesForYa(yaStartYear).map(describe),
    };
    // `now` is intentionally excluded: it changes identity every render, and
    // day-level output does not need to react to it within a session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, regime, taxProfile, settledDeadlines, yaStartYear]);
}
