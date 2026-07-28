import { ChevronLeft, ChevronRight, PieChart } from 'lucide-react';
import { money, percent } from '../lib/format';
import { spendByCategory, spendSplit } from '../lib/transactions';
import type { TransactionView } from '../types';

interface Props {
  transactions: TransactionView[];
  year: number;
  month: number;
  onStep: (delta: number) => void;
  /** False on the current month — there is nothing to step forward into. */
  canStepForward: boolean;
  monthName: string;
}

/**
 * Where the month's money went, ranked.
 *
 * Deliberately one hue rather than a colour per category: each bar is already
 * labelled with its own name, so colour would carry no extra information and a
 * ten-category palette would be unreadable at a glance. Length does the work.
 */
export function SpendingBreakdown({
  transactions,
  year,
  month,
  onStep,
  canStepForward,
  monthName,
}: Props) {
  const categories = spendByCategory(transactions, year, month);
  const split = spendSplit(transactions, year, month);
  const largest = categories[0]?.amount ?? 0;

  return (
    <section className="rounded-[var(--radius-card)] bg-white p-5 sm:p-6 dark:bg-ink-900">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold tracking-tight">Where it went</h2>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => onStep(-1)}
            aria-label="Previous month"
            className="grid size-9 place-items-center rounded-full text-ink-900/50 transition-colors hover:bg-black/5 dark:text-white/50 dark:hover:bg-white/10"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="tabular min-w-[72px] text-center text-xs font-bold">
            {monthName}
          </span>
          <button
            type="button"
            onClick={() => onStep(1)}
            disabled={!canStepForward}
            aria-label="Next month"
            className="grid size-9 place-items-center rounded-full text-ink-900/50 transition-colors hover:bg-black/5 disabled:opacity-25 disabled:hover:bg-transparent dark:text-white/50 dark:hover:bg-white/10"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {split.total === 0 ? (
        <div className="py-10 text-center">
          <div className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-black/5 dark:bg-white/10">
            <PieChart className="size-5 text-ink-900/35 dark:text-white/35" />
          </div>
          <p className="text-sm text-ink-900/55 dark:text-white/50">
            Nothing spent in {monthName}.
          </p>
        </div>
      ) : (
        <>
          <p className="tabular mt-3 text-3xl font-bold tracking-tight">
            <span className="text-base font-semibold text-ink-900/45 dark:text-white/40">
              LKR{' '}
            </span>
            {money(split.total)}
          </p>

          {/* Personal versus claimable, as figures rather than another colour. */}
          <dl className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-[var(--radius-tile)] bg-black/[0.03] p-3 dark:bg-white/5">
              <dt className="text-[10px] font-bold tracking-wider text-ink-900/50 uppercase dark:text-white/45">
                Personal
              </dt>
              <dd className="tabular mt-1 text-lg font-bold">{money(split.personal)}</dd>
            </div>
            <div className="rounded-[var(--radius-tile)] bg-brand-50 p-3 dark:bg-brand-900/20">
              <dt className="text-[10px] font-bold tracking-wider text-brand-700 uppercase dark:text-brand-300">
                Business
              </dt>
              <dd className="tabular mt-1 text-lg font-bold text-brand-700 dark:text-brand-200">
                {money(split.business)}
              </dd>
            </div>
          </dl>

          <ul className="mt-5 space-y-3.5">
            {categories.map((category) => (
              <li key={category.name}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate text-sm font-semibold">
                      {category.name}
                    </span>
                    {category.business > 0 && (
                      <span className="shrink-0 rounded-full bg-brand-100 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-brand-700 uppercase dark:bg-brand-900/40 dark:text-brand-200">
                        Claimed
                      </span>
                    )}
                  </span>
                  <span className="tabular shrink-0 text-sm font-semibold">
                    {money(category.amount)}
                    <span className="ml-1.5 text-xs font-medium text-ink-900/45 dark:text-white/40">
                      {percent(category.share, 0)}
                    </span>
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/8">
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{
                      // Scaled against the largest category so the ranking reads
                      // clearly even when one category dominates the month.
                      width: `${largest > 0 ? (category.amount / largest) * 100 : 0}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
