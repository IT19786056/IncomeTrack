import { ChevronRight, Landmark, TriangleAlert } from 'lucide-react';
import type { TaxOverview } from '../hooks/useTaxOverview';
import { money, percent, relativeDays, shortDate } from '../lib/format';
import { deductionSaving } from '../lib/tax';

interface Props {
  overview: TaxOverview;
  onOpenDetail: () => void;
}

/**
 * The tax card — the one place in this app allowed to be loud.
 *
 * Figures are set in tabular monospace and separated by hairline rules,
 * borrowing from the tax return it ultimately feeds. Everything else in the
 * dashboard stays quiet so this reads as the centre of gravity.
 */
export function TaxSummaryCard({ overview, onOpenDetail }: Props) {
  const { current, projected, projection, nextAction } = overview;

  // Lead with the estimated year: that is what instalments are based on, and
  // what "how much will I owe" actually means part-way through a year.
  const headline = projection.isProjection ? projected : current;
  const saving = deductionSaving(headline);
  const owesNothing = headline.totalTax <= 0;

  const urgency =
    nextAction == null
      ? 'none'
      : nextAction.daysRemaining < 0
        ? 'overdue'
        : nextAction.daysRemaining <= 14
          ? 'soon'
          : 'later';

  return (
    <section className="overflow-hidden rounded-[var(--radius-card)] bg-ink-900 text-white shadow-lg shadow-brand-200/50 dark:shadow-none">
      <button
        type="button"
        onClick={onOpenDetail}
        className="w-full px-5 pt-5 pb-4 text-left sm:px-7 sm:pt-6"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Landmark className="size-4 shrink-0 text-brand-400" />
            <span className="truncate text-[11px] font-bold tracking-[0.12em] text-white/55 uppercase">
              Income tax · YA {current.yaLabel}
            </span>
          </div>
          <ChevronRight className="size-5 shrink-0 text-white/40" />
        </div>

        <div className="mt-4">
          <p className="text-xs font-medium text-white/50">
            {projection.isProjection
              ? 'Estimated for the full year'
              : owesNothing
                ? 'Nothing owed'
                : 'Owed for this year'}
          </p>
          <p className="tabular mt-1 flex items-baseline gap-1.5 font-mono text-4xl font-bold tracking-tight sm:text-5xl">
            <span className="text-lg font-semibold text-white/50 sm:text-xl">LKR</span>
            {money(headline.totalTax)}
          </p>

          {projection.isProjection ? (
            <p className="tabular mt-1.5 text-xs text-white/45">
              {projection.basis === 'expected'
                ? `Assumes ${money(projection.expectedMonthlyIncome ?? 0)}/month ahead`
                : `Averaged from ${projection.monthsWithIncome} ${
                    projection.monthsWithIncome === 1 ? 'month' : 'months'
                  } at ${money(projection.monthlyAverageIncome)}/month`}
              {!owesNothing && ` · ${percent(headline.effectiveRate)} effective`}
            </p>
          ) : (
            !owesNothing && (
              <p className="tabular mt-1.5 text-xs text-white/45">
                {percent(headline.effectiveRate)} of {money(headline.grossIncome)}{' '}
                received
              </p>
            )
          )}

          {projection.isProjection && (
            <p className="tabular mt-1 text-xs text-white/35">
              Logged so far: {money(current.grossIncome)} · tax {money(current.totalTax)}
            </p>
          )}
        </div>
      </button>

      {/* The countdown: the single element this screen is remembered by. */}
      {nextAction && (
        <div className="border-t border-white/10 px-5 py-4 sm:px-7">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-bold tracking-[0.12em] text-white/45 uppercase">
                {nextAction.deadline.period === 'RETURN' ? 'Next filing' : 'Next payment'}
              </p>
              <p className="mt-1 truncate text-sm font-semibold">
                {nextAction.deadline.label}
              </p>
              <p className="tabular mt-0.5 text-xs text-white/50">
                {nextAction.amountDue > 0 && `LKR ${money(nextAction.amountDue)} · `}
                {shortDate(nextAction.deadline.dueDate)}
              </p>
            </div>

            <div
              className={`shrink-0 rounded-[var(--radius-tile)] px-3 py-2 text-center ${
                urgency === 'overdue'
                  ? 'bg-money-out/20 text-rose-300'
                  : urgency === 'soon'
                    ? 'bg-warn/20 text-amber-300'
                    : 'bg-white/10 text-white/70'
              }`}
            >
              {urgency === 'overdue' ? (
                <TriangleAlert className="mx-auto size-5" />
              ) : (
                <span className="tabular block font-mono text-2xl leading-none font-bold">
                  {nextAction.daysRemaining}
                </span>
              )}
              <span className="mt-1 block text-[10px] font-bold tracking-wider uppercase">
                {urgency === 'overdue'
                  ? relativeDays(nextAction.daysRemaining)
                  : nextAction.daysRemaining === 1
                    ? 'day'
                    : 'days'}
              </span>
            </div>
          </div>
        </div>
      )}

      {saving > 0 && (
        <div className="tabular border-t border-white/10 bg-white/[0.04] px-5 py-3 text-xs text-white/60 sm:px-7">
          Claiming {money(headline.deductibleExpenses)} in expenses{' '}
          {projection.isProjection ? 'is set to save' : 'has saved'} you{' '}
          <span className="font-semibold text-emerald-300">LKR {money(saving)}</span>.
        </div>
      )}

      {owesNothing && headline.nextThreshold && headline.nextThreshold.remaining > 0 && (
        <div className="tabular border-t border-white/10 bg-white/[0.04] px-5 py-3 text-xs text-white/60 sm:px-7">
          Tax starts once your {projection.isProjection ? 'yearly' : ''} income reaches{' '}
          <span className="font-semibold text-white/85">
            LKR {money(headline.nextThreshold.grossAt)}
          </span>
          .
        </div>
      )}
    </section>
  );
}
