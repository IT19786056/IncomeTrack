import { useMemo } from 'react';
import type { TaxProfile, TransactionView } from '../types';
import {
  Deadline,
  TaxComputation,
  computeTax,
  daysUntil,
  deadlineKey,
  deadlinesForYa,
  isScheduleEmpty,
  relevantDeadlines,
  salaryForCalendarYear,
  salaryForYa,
  salaryMonthsForYa,
  yaStartYearForDate,
  type SalaryMonth,
  type SalaryPeriod,
  type TaxRegime,
} from '../lib/tax';
import { otherIncomeForYa, totals, withinYa } from '../lib/transactions';

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

export interface IncomeBreakdown {
  /** Salary for the year, from the schedule. */
  salary: number;
  /** Everything else logged and not flagged as salary. */
  other: number;
  /** The entries making up `other`, newest first. */
  otherEntries: TransactionView[];
  /** salary + other. */
  gross: number;
  /** Per-month salary across April to March, for showing where the rate changes. */
  salaryMonths: SalaryMonth[];
  /** The same salary summed January to December, purely to explain the gap. */
  calendarYearSalary: number;
  /** True when no salary rate has been entered yet. */
  scheduleEmpty: boolean;
}

export interface TaxOverview {
  yaStartYear: number;
  regime: TaxRegime;
  /** True while the user has not confirmed their tax setup. */
  needsSetup: boolean;
  /** True when a salary rate still needs entering for figures to mean anything. */
  needsSalary: boolean;
  computation: TaxComputation;
  income: IncomeBreakdown;
  /** Extra deductible expenses that would bring the bill to zero. Zero if already nil. */
  claimsToReachZero: number;
  /** The next thing actually requiring money or a filing, if any. */
  nextAction: DeadlineStatus | null;
  /** Passed deadlines that carried a liability and are unsettled. */
  overdue: DeadlineStatus[];
  upcoming: DeadlineStatus[];
  /** All five deadlines for the selected year, settled ones included. */
  yearDeadlines: DeadlineStatus[];
}

/**
 * Derives the whole tax picture.
 *
 * Salary comes from the schedule the user states, so a full year is known from
 * the first day rather than guessed from however many months happen to be
 * logged. Everything else — bonuses, one-off work — is counted from the
 * transactions actually recorded, and added on top. Deductible expenses are
 * counted as claimed, never extrapolated, which errs towards overstating the
 * bill rather than promising a deduction that has not happened.
 *
 * Nothing is stored: editing a transaction or the schedule changes every figure
 * immediately, so a saved number can never drift from the records behind it.
 */
export function useTaxOverview(
  transactions: TransactionView[],
  taxProfile: TaxProfile | null,
  settledDeadlines: ReadonlySet<string>,
  yaStartYear: number = yaStartYearForDate(new Date()),
  now: Date = new Date(),
): TaxOverview {
  const regime = taxProfile?.regime ?? DEFAULT_REGIME;
  const schedule: SalaryPeriod[] = taxProfile?.salarySchedule ?? [];

  return useMemo(() => {
    const computeFor = (year: number) => {
      const salary = salaryForYa(schedule, year);
      const other = otherIncomeForYa(transactions, year);
      const { deductibleExpenses } = totals(withinYa(transactions, year));

      return {
        salary,
        other,
        deductibleExpenses,
        computation: computeTax({
          yaStartYear: year,
          regime,
          grossIncome: salary + other.total,
          deductibleExpenses,
        }),
      };
    };

    const selected = computeFor(yaStartYear);
    const { computation } = selected;

    // Cache per year: several deadlines share a year of assessment.
    const byYear = new Map<number, TaxComputation>();
    const cachedComputation = (year: number) => {
      if (year === yaStartYear) return computation;
      const existing = byYear.get(year);
      if (existing) return existing;
      const computed = computeFor(year).computation;
      byYear.set(year, computed);
      return computed;
    };

    const describe = (deadline: Deadline): DeadlineStatus => {
      // Instalments are a quarter of the year's estimated tax.
      const yearTax = cachedComputation(deadline.yaStartYear);
      const amountDue =
        deadline.period === 'RETURN'
          ? yearTax.totalTax
          : yearTax.quarterlyInstalment;

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
      needsSalary: isScheduleEmpty(schedule),
      computation,
      income: {
        salary: selected.salary,
        other: selected.other.total,
        otherEntries: selected.other.entries,
        gross: selected.salary + selected.other.total,
        salaryMonths: salaryMonthsForYa(schedule, yaStartYear),
        calendarYearSalary: salaryForCalendarYear(schedule, yaStartYear),
        scheduleEmpty: isScheduleEmpty(schedule),
      },
      // Taxable income is what sits above the relief, so claiming that much
      // more in business costs cancels the bill exactly.
      claimsToReachZero: computation.taxableIncome,
      nextAction,
      overdue: describedOverdue,
      upcoming: describedUpcoming,
      yearDeadlines: deadlinesForYa(yaStartYear).map(describe),
    };
    // `now` is intentionally excluded: it changes identity every render, and
    // day-level output does not need to react to it within a session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, regime, schedule, taxProfile, settledDeadlines, yaStartYear]);
}
