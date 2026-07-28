import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PiggyBank } from 'lucide-react';
import { money, moneyCompact, percent } from '../lib/format';
import { savings, type SavingsPoint } from '../lib/transactions';
import { yearLabel } from '../lib/tax';
import type { TransactionView } from '../types';

interface Props {
  transactions: TransactionView[];
  yaStartYear: number;
}

/** brand-500: clears 3:1 against both the light and dark chart surfaces. */
const LINE = '#8b5cf6';

function SavingsTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: SavingsPoint }[];
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;

  return (
    <div className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs shadow-lg dark:border-white/15 dark:bg-ink-800">
      <p className="mb-1.5 font-bold">{point.label}</p>
      <dl className="tabular space-y-0.5">
        <div className="flex justify-between gap-4">
          <dt className="text-ink-900/55 dark:text-white/55">Saved this month</dt>
          <dd className="font-semibold">
            {point.saved >= 0 ? '+' : '−'}
            {money(Math.abs(point.saved))}
          </dd>
        </div>
        <div className="mt-1 flex justify-between gap-4 border-t border-black/10 pt-1 dark:border-white/15">
          <dt className="font-semibold">Running total</dt>
          <dd className="font-bold">{money(point.cumulative)}</dd>
        </div>
      </dl>
    </div>
  );
}

/**
 * Cumulative savings across a year of assessment.
 *
 * A running total rather than per-month bars, because the question is "how much
 * have I put aside", which is a position and not a rate. The series stops at the
 * current month so unreached months don't read as months where nothing was kept.
 */
export function SavingsChart({ transactions, yaStartYear }: Props) {
  const result = savings(transactions, yaStartYear);
  const hasData = result.series.some((p) => p.income > 0 || p.expenses > 0);
  const everNegative = result.series.some((p) => p.cumulative < 0);

  return (
    <section className="rounded-[var(--radius-card)] bg-white p-5 sm:p-6 dark:bg-ink-900">
      <h2 className="text-base font-bold tracking-tight">What you kept</h2>
      <p className="mt-1 text-xs text-ink-900/55 dark:text-white/50">
        Running total of income less spending · YA {yearLabel(yaStartYear)}
      </p>

      {!hasData ? (
        <div className="py-10 text-center">
          <div className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-black/5 dark:bg-white/10">
            <PiggyBank className="size-5 text-ink-900/35 dark:text-white/35" />
          </div>
          <p className="text-sm text-ink-900/55 dark:text-white/50">
            Log income and expenses to see what you're keeping.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="tabular text-3xl font-bold tracking-tight">
              <span className="text-base font-semibold text-ink-900/45 dark:text-white/40">
                LKR{' '}
              </span>
              {money(result.saved)}
            </p>
            <p className="tabular text-sm font-semibold text-ink-900/50 dark:text-white/45">
              {percent(result.rate, 1)} of what you earned
            </p>
          </div>

          <div className="mt-4 -ml-2 h-[180px] sm:h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={result.series} accessibilityLayer>
                <defs>
                  <linearGradient id="savingsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={LINE} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={LINE} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  stroke="currentColor"
                  className="text-black/8 dark:text-white/10"
                />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: 'currentColor' }}
                  className="text-ink-900/50 dark:text-white/45"
                />
                <YAxis
                  width={38}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value: number) => moneyCompact(value)}
                  tick={{ fontSize: 10, fill: 'currentColor' }}
                  className="tabular text-ink-900/50 dark:text-white/45"
                />
                {everNegative && (
                  <ReferenceLine
                    y={0}
                    stroke="currentColor"
                    className="text-black/25 dark:text-white/30"
                  />
                )}
                <Tooltip content={<SavingsTooltip />} />
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  stroke={LINE}
                  strokeWidth={2}
                  fill="url(#savingsFill)"
                  dot={{ r: 3, fill: LINE, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {result.bestMonth && result.worstMonth && (
            <dl className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-[var(--radius-tile)] bg-black/[0.03] p-3 dark:bg-white/5">
                <dt className="text-[10px] font-bold tracking-wider text-ink-900/50 uppercase dark:text-white/45">
                  Best month
                </dt>
                <dd className="tabular mt-1 text-sm font-bold">
                  {result.bestMonth.label} · {money(result.bestMonth.saved)}
                </dd>
              </div>
              <div className="rounded-[var(--radius-tile)] bg-black/[0.03] p-3 dark:bg-white/5">
                <dt className="text-[10px] font-bold tracking-wider text-ink-900/50 uppercase dark:text-white/45">
                  Tightest month
                </dt>
                <dd className="tabular mt-1 text-sm font-bold">
                  {result.worstMonth.label} · {money(result.worstMonth.saved)}
                </dd>
              </div>
            </dl>
          )}
        </>
      )}
    </section>
  );
}
