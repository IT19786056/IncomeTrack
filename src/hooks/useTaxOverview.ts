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
import { totals, withinYa } from '../lib/transactions';

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
  current: TaxComputation;
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
    /** Tax for any year of assessment, computed from that year's records. */
    const computeFor = (year: number): TaxComputation => {
      const yearTransactions = withinYa(transactions, year);
      const { income, deductibleExpenses } = totals(yearTransactions);
      return computeTax({
        yaStartYear: year,
        regime,
        grossIncome: income,
        deductibleExpenses,
      });
    };

    const current = computeFor(yaStartYear);

    // Cache per year: several deadlines share a year of assessment.
    const byYear = new Map<number, TaxComputation>();
    const cachedComputation = (year: number) => {
      const existing = byYear.get(year);
      if (existing) return existing;
      const computed = year === yaStartYear ? current : computeFor(year);
      byYear.set(year, computed);
      return computed;
    };

    const describe = (deadline: Deadline): DeadlineStatus => {
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
