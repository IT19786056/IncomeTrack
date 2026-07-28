import { Plus, Trash2 } from 'lucide-react';
import { money } from '../../lib/format';
import { normalizeSchedule, salaryForYa, yearLabel } from '../../lib/tax';
import type { SalaryPeriod } from '../../lib/tax';

interface Props {
  value: SalaryPeriod[];
  onChange: (schedule: SalaryPeriod[]) => void;
  /** Year of assessment used for the running total shown underneath. */
  previewYaStartYear: number;
}

/**
 * Salary entered as rates rather than transactions.
 *
 * Each row says "from this month I earned this much per month", and stays in
 * force until the next row. Two rows cover a single pay rise; adding a third
 * covers the next one without any code change.
 */
export function SalaryScheduleFields({
  value,
  onChange,
  previewYaStartYear,
}: Props) {
  const rows = value.length > 0 ? value : [{ from: '', monthlyAmount: 0 }];

  const update = (index: number, patch: Partial<SalaryPeriod>) => {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const addRow = () => onChange([...rows, { from: '', monthlyAmount: 0 }]);

  const removeRow = (index: number) =>
    onChange(rows.filter((_, i) => i !== index));

  const yearTotal = salaryForYa(normalizeSchedule(rows), previewYaStartYear);

  return (
    <div>
      <p className="mb-1.5 block text-xs font-semibold tracking-wide text-ink-900/60 uppercase dark:text-white/50">
        Salary per month
      </p>
      <p className="mb-3 text-xs text-ink-900/50 dark:text-white/45">
        Each rate applies from the month you set until the next one. Add a row
        each time your salary changes.
      </p>

      <div className="space-y-2.5">
        {rows.map((row, index) => (
          <div key={index} className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <label
                htmlFor={`salary-from-${index}`}
                className="mb-1 block text-[10px] font-bold tracking-wider text-ink-900/45 uppercase dark:text-white/40"
              >
                From
              </label>
              <input
                id={`salary-from-${index}`}
                type="month"
                value={row.from}
                onChange={(event) => update(index, { from: event.target.value })}
                className="tabular w-full rounded-[var(--radius-tile)] border border-black/10 bg-black/[0.03] px-3 py-3 text-base focus:border-brand-500 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:focus:bg-white/10"
              />
            </div>

            <div className="min-w-0 flex-1">
              <label
                htmlFor={`salary-amount-${index}`}
                className="mb-1 block text-[10px] font-bold tracking-wider text-ink-900/45 uppercase dark:text-white/40"
              >
                LKR / month
              </label>
              <input
                id={`salary-amount-${index}`}
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={row.monthlyAmount === 0 ? '' : String(row.monthlyAmount)}
                onChange={(event) =>
                  update(index, { monthlyAmount: Number(event.target.value) || 0 })
                }
                placeholder="0"
                className="tabular w-full rounded-[var(--radius-tile)] border border-black/10 bg-black/[0.03] px-3 py-3 text-base font-semibold focus:border-brand-500 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:focus:bg-white/10"
              />
            </div>

            <button
              type="button"
              onClick={() => removeRow(index)}
              disabled={rows.length === 1}
              aria-label={`Remove salary rate ${index + 1}`}
              className="mb-1 grid size-11 shrink-0 place-items-center rounded-full text-ink-900/35 transition-colors hover:bg-money-out/10 hover:text-money-out-ink disabled:opacity-25 disabled:hover:bg-transparent dark:text-white/35"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addRow}
        className="mt-2.5 flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold text-brand-700 transition-colors hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-900/20"
      >
        <Plus className="size-4" />
        Add a salary change
      </button>

      {yearTotal > 0 && (
        <p className="tabular mt-3 rounded-[var(--radius-tile)] bg-black/[0.03] p-3 text-xs text-ink-900/65 dark:bg-white/5 dark:text-white/60">
          Salary for YA {yearLabel(previewYaStartYear)} (April to March):{' '}
          <span className="font-bold">LKR {money(yearTotal)}</span>
        </p>
      )}
    </div>
  );
}
