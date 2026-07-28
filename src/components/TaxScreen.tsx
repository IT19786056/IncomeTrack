import { Check, Info, RotateCcw, Settings2, TriangleAlert } from 'lucide-react';
import type { DeadlineStatus, TaxOverview } from '../hooks/useTaxOverview';
import { compactDate, money, moneyPrecise, percent, relativeDays, shortDate } from '../lib/format';
import { deductionSaving, yearLabel, type FilingPeriod } from '../lib/tax';

interface Props {
  overview: TaxOverview;
  availableYears: number[];
  onChangeYear: (yaStartYear: number) => void;
  onSettle: (yaStartYear: number, period: FilingPeriod, amount: number) => void;
  onUnsettle: (yaStartYear: number, period: FilingPeriod) => void;
  onOpenSetup: () => void;
}

const REGIME_LABELS = {
  'service-export': 'Foreign clients, remitted via a Sri Lankan bank',
  'local-business': 'Sri Lankan clients / local business',
  employment: 'Employment income (APIT withheld)',
} as const;

/** One line of the computation, with a hairline rule between rows. */
function Row({
  label,
  value,
  note,
  emphasis,
  negative,
}: {
  label: string;
  value: string;
  note?: string;
  emphasis?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-black/5 py-3 last:border-b-0 dark:border-white/10">
      <div className="min-w-0">
        <p className={`text-sm ${emphasis ? 'font-bold' : 'font-medium'}`}>{label}</p>
        {note && (
          <p className="mt-0.5 text-xs text-ink-900/50 dark:text-white/45">{note}</p>
        )}
      </div>
      <p
        className={`tabular shrink-0 font-mono ${
          emphasis ? 'text-base font-bold' : 'text-sm'
        } ${negative ? 'text-money-out-ink dark:text-money-out-ink-dark' : ''}`}
      >
        {negative && '−'}
        {value}
      </p>
    </div>
  );
}

function DeadlineRow({
  status,
  onSettle,
  onUnsettle,
}: {
  status: DeadlineStatus;
  onSettle: () => void;
  onUnsettle: () => void;
}) {
  const { deadline, amountDue, settled, daysRemaining, nothingToPay } = status;
  const overdue = daysRemaining < 0 && !settled && !nothingToPay;

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-[var(--radius-tile)] border p-4 ${
        overdue
          ? 'border-money-out/30 bg-money-out/5'
          : settled
            ? 'border-money-in/25 bg-money-in/5'
            : 'border-black/8 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.03]'
      }`}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{deadline.label}</p>
        <p className="mt-0.5 text-xs text-ink-900/55 dark:text-white/50">
          {deadline.covers} · due {shortDate(deadline.dueDate)}
        </p>
        <p
          className={`tabular mt-1 text-xs font-semibold ${
            overdue
              ? 'text-money-out-ink dark:text-money-out-ink-dark'
              : settled
                ? 'text-money-in-ink dark:text-money-in-ink-dark'
                : 'text-ink-900/60 dark:text-white/55'
          }`}
        >
          {settled
            ? 'Settled'
            : nothingToPay
              ? 'Nothing to pay'
              : `LKR ${money(amountDue)} · ${relativeDays(daysRemaining)}`}
        </p>
      </div>

      {settled ? (
        <button
          type="button"
          onClick={onUnsettle}
          aria-label={`Mark ${deadline.label} as unpaid`}
          className="grid size-11 shrink-0 place-items-center rounded-full text-ink-900/45 transition-colors hover:bg-black/5 dark:text-white/45 dark:hover:bg-white/10"
        >
          <RotateCcw className="size-4" />
        </button>
      ) : (
        !nothingToPay && (
          <button
            type="button"
            onClick={onSettle}
            className="shrink-0 rounded-full bg-brand-600 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-brand-700"
          >
            {deadline.period === 'RETURN' ? 'Filed' : 'Paid'}
          </button>
        )
      )}
    </div>
  );
}

export function TaxScreen({
  overview,
  availableYears,
  onChangeYear,
  onSettle,
  onUnsettle,
  onOpenSetup,
}: Props) {
  const { computation, income, regime, yearDeadlines, needsSetup, needsSalary } =
    overview;
  const saving = deductionSaving(computation);

  // The month the rate changes, so the split can be shown rather than asserted.
  const rateChanges = income.salaryMonths.filter(
    (month, index) =>
      index > 0 && month.amount !== income.salaryMonths[index - 1].amount,
  );

  return (
    <div className="space-y-5">
      {needsSalary && (
        <button
          type="button"
          onClick={onOpenSetup}
          className="flex w-full items-center gap-3 rounded-[var(--radius-tile)] border border-warn/30 bg-warn/10 p-4 text-left"
        >
          <TriangleAlert className="size-5 shrink-0 text-warn" />
          <span className="min-w-0 flex-1 text-sm">
            <span className="font-semibold">Add your salary.</span>{' '}
            <span className="text-ink-900/65 dark:text-white/60">
              Set what you earn a month and from when — everything here depends on it.
            </span>
          </span>
          <Settings2 className="size-4 shrink-0 text-warn" />
        </button>
      )}

      {needsSetup && !needsSalary && (
        <button
          type="button"
          onClick={onOpenSetup}
          className="flex w-full items-center gap-3 rounded-[var(--radius-tile)] border border-warn/30 bg-warn/10 p-4 text-left"
        >
          <Info className="size-5 shrink-0 text-warn" />
          <span className="min-w-0 flex-1 text-sm">
            <span className="font-semibold">Confirm your tax setup.</span>{' '}
            <span className="text-ink-900/65 dark:text-white/60">
              Figures assume foreign clients paid through a Sri Lankan bank.
            </span>
          </span>
          <Settings2 className="size-4 shrink-0 text-warn" />
        </button>
      )}

      {/* Year of assessment selector */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 no-scrollbar">
        {availableYears.map((year) => (
          <button
            key={year}
            type="button"
            onClick={() => onChangeYear(year)}
            className={`tabular shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              year === computation.yaStartYear
                ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-900'
                : 'bg-black/5 text-ink-900/65 hover:bg-black/10 dark:bg-white/10 dark:text-white/65'
            }`}
          >
            {yearLabel(year)}
          </button>
        ))}
      </div>

      {computation.ratesEstimated && (
        <p className="flex items-start gap-2 rounded-[var(--radius-tile)] bg-warn/10 p-3 text-xs text-warn">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          Rates for YA {computation.yaLabel} have not been published yet. These
          figures carry forward the most recent published rates.
        </p>
      )}

      {computation.exempt && (
        <p className="flex items-start gap-2 rounded-[var(--radius-tile)] bg-money-in/10 p-3 text-xs text-money-in-ink dark:text-money-in-ink-dark">
          <Info className="mt-0.5 size-4 shrink-0" />
          Foreign-currency service income was exempt in YA {computation.yaLabel}.
          The exemption ended on 1 April 2025.
        </p>
      )}

      {/* Where the income comes from */}
      <section className="rounded-[var(--radius-card)] bg-white p-5 sm:p-6 dark:bg-ink-900">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-bold tracking-tight">Your income</h2>
            <p className="mt-0.5 text-xs text-ink-900/55 dark:text-white/50">
              April {computation.yaStartYear} to March {computation.yaStartYear + 1}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenSetup}
            className="shrink-0 rounded-full p-2 text-ink-900/45 transition-colors hover:bg-black/5 dark:text-white/45 dark:hover:bg-white/10"
            aria-label="Tax settings"
          >
            <Settings2 className="size-4" />
          </button>
        </div>

        <Row
          label="Salary"
          value={money(income.salary)}
          note={
            rateChanges.length > 0
              ? `Rate changed in ${rateChanges.map((m) => m.label).join(', ')}`
              : 'From the rates in your tax setup'
          }
        />
        <Row
          label="Other income"
          value={money(income.other)}
          note={
            income.otherEntries.length > 0
              ? `${income.otherEntries.length} entr${income.otherEntries.length === 1 ? 'y' : 'ies'} logged`
              : 'Bonuses and one-off work you log'
          }
        />
        <Row label="Total income" value={money(income.gross)} emphasis />

        {income.otherEntries.length > 0 && (
          <ul className="mt-3 space-y-1.5 rounded-[var(--radius-tile)] bg-black/[0.03] p-3 dark:bg-white/5">
            {income.otherEntries.map((entry) => (
              <li
                key={entry.id}
                className="tabular flex items-baseline justify-between gap-3 text-xs"
              >
                <span className="min-w-0 truncate text-ink-900/60 dark:text-white/55">
                  {entry.label} · {compactDate(entry.date)}
                </span>
                <span className="shrink-0 font-semibold">{money(entry.amount)}</span>
              </li>
            ))}
          </ul>
        )}

        {income.calendarYearSalary > 0 &&
          income.calendarYearSalary !== income.salary && (
            <p className="mt-3 rounded-[var(--radius-tile)] bg-black/[0.03] p-3 text-xs leading-relaxed text-ink-900/60 dark:bg-white/5 dark:text-white/55">
              The same salary over January to December{' '}
              {computation.yaStartYear} would be{' '}
              <span className="tabular font-semibold">
                LKR {money(income.calendarYearSalary)}
              </span>
              . Tax uses the April-to-March year, which is why the two differ.
            </p>
          )}
      </section>

      {/* The computation */}
      <section className="rounded-[var(--radius-card)] bg-white p-5 sm:p-6 dark:bg-ink-900">
        <h2 className="text-base font-bold tracking-tight">How this is worked out</h2>
        <p className="mt-0.5 mb-3 text-xs text-ink-900/55 dark:text-white/50">
          {REGIME_LABELS[regime]}
        </p>

        <Row label="Total income" value={money(computation.grossIncome)} />
        <Row
          label="Deductible expenses"
          value={money(computation.deductibleExpenses)}
          note="Expenses you flagged as business costs, as logged"
          negative={computation.deductibleExpenses > 0}
        />
        <Row
          label="Net business income"
          value={money(computation.netBusinessIncome)}
          emphasis
        />
        <Row
          label="Personal relief"
          value={money(computation.reliefApplied)}
          note={`Up to LKR ${money(computation.personalRelief)} per year`}
          negative={computation.reliefApplied > 0}
        />
        <Row label="Taxable income" value={money(computation.taxableIncome)} emphasis />

        {computation.bands.length > 0 && (
          <div className="mt-4 space-y-2 rounded-[var(--radius-tile)] bg-black/[0.03] p-4 dark:bg-white/5">
            <p className="text-[11px] font-bold tracking-wider text-ink-900/50 uppercase dark:text-white/45">
              Bands applied
            </p>
            {computation.bands.map((band, index) => (
              <div
                key={index}
                className="tabular flex items-baseline justify-between gap-3 font-mono text-xs"
              >
                <span className="text-ink-900/60 dark:text-white/55">
                  {money(band.amount)} @ {percent(band.rate)}
                </span>
                <span className="font-semibold">{moneyPrecise(band.tax)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-baseline justify-between gap-4 border-t-2 border-ink-900/10 pt-4 dark:border-white/15">
          <div>
            <p className="text-sm font-bold">Tax for the year</p>
            <p className="tabular mt-0.5 text-xs text-ink-900/50 dark:text-white/45">
              {percent(computation.effectiveRate)} effective · LKR{' '}
              {money(computation.monthlyEquivalent)}/month
            </p>
          </div>
          <p className="tabular shrink-0 font-mono text-xl font-bold">
            {money(computation.totalTax)}
          </p>
        </div>

        {saving > 0 && (
          <p className="tabular mt-3 flex items-center gap-2 text-xs text-money-in-ink dark:text-money-in-ink-dark">
            <Check className="size-4 shrink-0" />
            Your claimed expenses saved LKR {money(saving)} this year.
          </p>
        )}

        {overview.claimsToReachZero > 0 && (
          <p className="tabular mt-3 text-xs text-ink-900/55 dark:text-white/50">
            Claiming another LKR {money(overview.claimsToReachZero)} in business
            expenses this year would bring this to zero.
          </p>
        )}

        {computation.nextThreshold && computation.taxableIncome > 0 && (
          <p className="tabular mt-2 text-xs text-ink-900/55 dark:text-white/50">
            The {percent(computation.nextThreshold.rate)} band starts at LKR{' '}
            {money(computation.nextThreshold.grossAt)} — another LKR{' '}
            {money(computation.nextThreshold.remaining)} to go.
          </p>
        )}
      </section>

      {/* Deadlines */}
      <section className="rounded-[var(--radius-card)] bg-white p-5 sm:p-6 dark:bg-ink-900">
        <h2 className="text-base font-bold tracking-tight">Payments and filings</h2>
        <p className="mt-1 mb-4 text-xs text-ink-900/55 dark:text-white/50">
          Each instalment is a quarter of the year's tax. Due 15 August,
          15 November, 15 February and 15 May, with the return on 30 November.
        </p>
        <div className="space-y-2.5">
          {yearDeadlines.map((status) => (
            <DeadlineRow
              key={`${status.deadline.yaStartYear}:${status.deadline.period}`}
              status={status}
              onSettle={() =>
                onSettle(
                  status.deadline.yaStartYear,
                  status.deadline.period,
                  status.amountDue,
                )
              }
              onUnsettle={() =>
                onUnsettle(status.deadline.yaStartYear, status.deadline.period)
              }
            />
          ))}
        </div>
      </section>

      <p className="px-2 pb-2 text-xs leading-relaxed text-ink-900/45 dark:text-white/40">
        These figures are computed from the salary you entered and the records
        you have logged, using published IRD rates. They are an estimate to plan
        with, not tax advice — confirm anything material with a qualified adviser
        before you file.
      </p>
    </div>
  );
}
