import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { money, moneyCompact } from '../lib/format';
import type { TransactionView } from '../types';
import { monthlySeries } from '../lib/transactions';
import { yearLabel } from '../lib/tax';

interface Props {
  transactions: TransactionView[];
  yaStartYear: number;
}

const IN_MARK = 'var(--color-money-in)';
const OUT_MARK = 'var(--color-money-out)';

interface Point {
  label: string;
  income: number;
  expenses: number;
  net: number;
}

/**
 * Rounds only the outer end of each bar and leaves the baseline end square,
 * so a surplus rounds at the top and a deficit rounds at the bottom. Recharts'
 * own `radius` always rounds the rect's top, which is the wrong end below zero.
 */
function DivergingBar(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
  payload?: Point;
}) {
  const { x = 0, y = 0, width = 0, height = 0, fill, payload } = props;
  if (!height) return null;

  const r = Math.min(4, width / 2, height);
  const positive = (payload?.net ?? 0) >= 0;

  // Two rounded corners on the far end, square where the bar meets zero.
  const path = positive
    ? `M${x},${y + height} L${x},${y + r} Q${x},${y} ${x + r},${y}
       L${x + width - r},${y} Q${x + width},${y} ${x + width},${y + r}
       L${x + width},${y + height} Z`
    : `M${x},${y} L${x},${y + height - r} Q${x},${y + height} ${x + r},${y + height}
       L${x + width - r},${y + height} Q${x + width},${y + height} ${x + width},${y + height - r}
       L${x + width},${y} Z`;

  return <path d={path} fill={fill} />;
}

function FlowTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: Point }[];
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;

  return (
    <div className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs shadow-lg dark:border-white/15 dark:bg-ink-800">
      <p className="mb-1.5 font-bold">{point.label}</p>
      <dl className="tabular space-y-0.5">
        <div className="flex justify-between gap-4">
          <dt className="text-ink-900/55 dark:text-white/55">In</dt>
          <dd className="font-semibold">{money(point.income)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-900/55 dark:text-white/55">Out</dt>
          <dd className="font-semibold">{money(point.expenses)}</dd>
        </div>
        <div className="mt-1 flex justify-between gap-4 border-t border-black/10 pt-1 dark:border-white/15">
          <dt className="font-semibold">Net</dt>
          <dd
            className={`font-bold ${
              point.net >= 0
                ? 'text-money-in-ink dark:text-money-in-ink-dark'
                : 'text-money-out-ink dark:text-money-out-ink-dark'
            }`}
          >
            {point.net >= 0 ? '+' : '−'}
            {money(Math.abs(point.net))}
          </dd>
        </div>
      </dl>
    </div>
  );
}

/**
 * Net cash flow per month across a year of assessment.
 *
 * One diverging series rather than two grouped ones: 24 bars will not read on a
 * 360px screen, and "did I save this month" is the question a consultant
 * actually has. Sign is carried by bar direction as well as hue, so the chart
 * still works without colour.
 */
export function MonthlyFlowChart({ transactions, yaStartYear }: Props) {
  const data: Point[] = monthlySeries(transactions, yaStartYear).map((month) => ({
    ...month,
    net: month.income - month.expenses,
  }));

  const hasData = data.some((d) => d.income > 0 || d.expenses > 0);

  return (
    <section className="rounded-[var(--radius-card)] bg-white p-5 sm:p-6 dark:bg-ink-900">
      <h2 className="text-base font-bold tracking-tight">Net each month</h2>
      <p className="mt-1 text-xs text-ink-900/55 dark:text-white/50">
        Income less expenses, April to March · YA {yearLabel(yaStartYear)}
      </p>

      {!hasData ? (
        <p className="py-10 text-center text-sm text-ink-900/50 dark:text-white/45">
          Add income and expenses to see your monthly position.
        </p>
      ) : (
        <div className="mt-4 -ml-2 h-[180px] sm:h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barCategoryGap="18%" accessibilityLayer>
              <CartesianGrid
                vertical={false}
                stroke="currentColor"
                className="text-black/8 dark:text-white/10"
              />
              <XAxis
                dataKey="label"
                interval={1}
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
              <ReferenceLine y={0} stroke="currentColor" className="text-black/25 dark:text-white/30" />
              <Tooltip
                content={<FlowTooltip />}
                cursor={{ fill: 'currentColor', className: 'text-black/5 dark:text-white/5' }}
              />
              <Bar dataKey="net" shape={<DivergingBar />} isAnimationActive={false}>
                {data.map((point, index) => (
                  <Cell key={index} fill={point.net >= 0 ? IN_MARK : OUT_MARK} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
