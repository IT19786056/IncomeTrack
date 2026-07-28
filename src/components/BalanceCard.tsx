import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { money, moneyCompact } from '../lib/format';
import type { Totals } from '../lib/transactions';

interface Props {
  /** Everything ever logged — the actual cash position. */
  allTime: Totals;
  /** The current calendar month, for the in/out figures. */
  thisMonth: Totals;
  monthName: string;
  onAddIncome: () => void;
  onAddExpense: () => void;
}

export function BalanceCard({
  allTime,
  thisMonth,
  monthName,
  onAddIncome,
  onAddExpense,
}: Props) {
  return (
    <section className="rounded-[var(--radius-card)] bg-brand-600 p-5 text-white shadow-lg shadow-brand-200/60 sm:p-7 dark:shadow-none">
      <p className="text-[11px] font-bold tracking-[0.12em] text-white/60 uppercase">
        Cash position
      </p>
      <p className="tabular mt-1.5 flex items-baseline gap-1.5 text-4xl font-bold tracking-tight sm:text-5xl">
        <span className="text-lg font-semibold text-white/60 sm:text-xl">LKR</span>
        {money(allTime.net)}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-[var(--radius-tile)] bg-white/12 p-3">
          <p className="text-[10px] font-bold tracking-wider text-white/60 uppercase">
            In · {monthName}
          </p>
          <p className="tabular mt-1 text-lg font-bold">
            {moneyCompact(thisMonth.income)}
          </p>
        </div>
        <div className="rounded-[var(--radius-tile)] bg-white/12 p-3">
          <p className="text-[10px] font-bold tracking-wider text-white/60 uppercase">
            Out · {monthName}
          </p>
          <p className="tabular mt-1 text-lg font-bold">
            {moneyCompact(thisMonth.expenses)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex gap-3">
        <button
          type="button"
          onClick={onAddIncome}
          className="flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-tile)] bg-white/15 py-3.5 text-sm font-bold backdrop-blur-sm transition-colors hover:bg-white/25 active:scale-[0.98]"
        >
          <ArrowDownLeft className="size-4" />
          Income
        </button>
        <button
          type="button"
          onClick={onAddExpense}
          className="flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-tile)] bg-white/15 py-3.5 text-sm font-bold backdrop-blur-sm transition-colors hover:bg-white/25 active:scale-[0.98]"
        >
          <ArrowUpRight className="size-4" />
          Expense
        </button>
      </div>
    </section>
  );
}
