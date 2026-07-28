import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Receipt, Trash2 } from 'lucide-react';
import type { TransactionView } from '../types';
import { compactDate, money } from '../lib/format';

interface Props {
  transactions: TransactionView[];
  onEdit: (transaction: TransactionView) => void;
  onDelete: (transaction: TransactionView) => Promise<void>;
  /** Cap the list; omit to show everything. */
  limit?: number;
  title: string;
  emptyMessage: string;
}

export function TransactionList({
  transactions,
  onEdit,
  onDelete,
  limit,
  title,
  emptyMessage,
}: Props) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const visible = limit ? transactions.slice(0, limit) : transactions;

  const handleDelete = async (transaction: TransactionView) => {
    setDeletingId(transaction.id);
    try {
      await onDelete(transaction);
    } finally {
      setDeletingId(null);
      setConfirmingId(null);
    }
  };

  return (
    <section className="rounded-[var(--radius-card)] bg-white p-5 sm:p-6 dark:bg-ink-900">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-base font-bold tracking-tight">{title}</h2>
        {limit && transactions.length > limit && (
          <span className="tabular text-xs text-ink-900/45 dark:text-white/40">
            {visible.length} of {transactions.length}
          </span>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="py-10 text-center">
          <div className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-black/5 dark:bg-white/10">
            <Receipt className="size-5 text-ink-900/35 dark:text-white/35" />
          </div>
          <p className="text-sm text-ink-900/55 dark:text-white/50">{emptyMessage}</p>
        </div>
      ) : (
        <ul className="divide-y divide-black/5 dark:divide-white/10">
          {visible.map((transaction) => {
            const isIncome = transaction.kind === 'income';
            const confirming = confirmingId === transaction.id;

            return (
              <li key={`${transaction.kind}-${transaction.id}`} className="py-2.5">
                {confirming ? (
                  <div className="flex items-center justify-between gap-3 py-1">
                    <p className="min-w-0 flex-1 truncate text-sm">
                      Delete{' '}
                      <span className="font-semibold">{transaction.label}</span>?
                    </p>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmingId(null)}
                        className="rounded-full px-3 py-2 text-xs font-semibold text-ink-900/60 hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/10"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(transaction)}
                        disabled={deletingId === transaction.id}
                        className="rounded-full bg-money-out px-3.5 py-2 text-xs font-bold text-white disabled:opacity-60"
                      >
                        {deletingId === transaction.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => onEdit(transaction)}
                      className="-mx-2 flex min-w-0 flex-1 items-center gap-3 rounded-[var(--radius-tile)] px-2 py-1.5 text-left transition-colors hover:bg-black/[0.03] dark:hover:bg-white/5"
                    >
                      <span
                        className={`grid size-10 shrink-0 place-items-center rounded-[0.875rem] ${
                          isIncome
                            ? 'bg-money-in/10 text-money-in'
                            : 'bg-money-out/10 text-money-out'
                        }`}
                      >
                        {isIncome ? (
                          <ArrowDownLeft className="size-5" />
                        ) : (
                          <ArrowUpRight className="size-5" />
                        )}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-semibold">
                            {transaction.label}
                          </span>
                          {transaction.deductible && (
                            <span className="shrink-0 rounded-full bg-brand-100 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-brand-700 uppercase dark:bg-brand-900/40 dark:text-brand-200">
                              Claimed
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-ink-900/50 dark:text-white/45">
                          {compactDate(transaction.date)}
                          {transaction.description && ` · ${transaction.description}`}
                        </span>
                      </span>

                      <span
                        className={`tabular shrink-0 text-sm font-bold ${
                          isIncome ? 'text-money-in' : 'text-money-out'
                        }`}
                      >
                        {isIncome ? '+' : '−'}
                        {money(transaction.amount)}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setConfirmingId(transaction.id)}
                      aria-label={`Delete ${transaction.label}`}
                      className="grid size-10 shrink-0 place-items-center rounded-full text-ink-900/30 transition-colors hover:bg-money-out/10 hover:text-money-out dark:text-white/30"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
