import { Plus, Target } from 'lucide-react';
import { money } from '../lib/format';
import type { CategoryBudget } from '../lib/transactions';

interface Props {
  budgets: CategoryBudget[];
  monthName: string;
  onAddCategory: () => void;
}

/**
 * Budget versus actual for the current month.
 *
 * The `budget` field has existed on categories from the start but was never
 * read anywhere — this is where it finally does something.
 */
export function BudgetList({ budgets, monthName, onAddCategory }: Props) {
  return (
    <section className="rounded-[var(--radius-card)] bg-white p-5 sm:p-6 dark:bg-ink-900">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold tracking-tight">Budgets</h2>
          <p className="mt-0.5 text-xs text-ink-900/55 dark:text-white/50">
            Spending against plan · {monthName}
          </p>
        </div>
        <button
          type="button"
          onClick={onAddCategory}
          aria-label="Add a category"
          className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-700 transition-colors hover:bg-brand-200 dark:bg-brand-900/40 dark:text-brand-200"
        >
          <Plus className="size-5" />
        </button>
      </div>

      {budgets.length === 0 ? (
        <div className="py-8 text-center">
          <div className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-black/5 dark:bg-white/10">
            <Target className="size-5 text-ink-900/35 dark:text-white/35" />
          </div>
          <p className="text-sm text-ink-900/55 dark:text-white/50">
            Create a category with a monthly budget to track it here.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {budgets.map((budget) => {
            const over = budget.spent > budget.budget;
            const width = Math.min(100, budget.ratio * 100);

            return (
              <li key={budget.name}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <span className="truncate text-sm font-semibold">{budget.name}</span>
                  <span
                    className={`tabular shrink-0 text-xs font-semibold ${
                      over
                        ? 'text-money-out-ink dark:text-money-out-ink-dark'
                        : 'text-ink-900/55 dark:text-white/50'
                    }`}
                  >
                    {money(budget.spent)} / {money(budget.budget)}
                  </span>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full bg-black/8 dark:bg-white/10"
                  role="progressbar"
                  aria-valuenow={Math.round(budget.ratio * 100)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${budget.name} budget used`}
                >
                  <div
                    className={`h-full rounded-full transition-[width] ${
                      over ? 'bg-money-out' : 'bg-brand-500'
                    }`}
                    style={{ width: `${width}%` }}
                  />
                </div>
                {over && (
                  <p className="tabular mt-1 text-xs text-money-out-ink dark:text-money-out-ink-dark">
                    Over by {money(budget.spent - budget.budget)}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
