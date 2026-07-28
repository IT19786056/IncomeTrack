/**
 * Year-of-assessment and payment-deadline arithmetic.
 *
 * Sri Lanka's year of assessment runs 1 April to 31 March. Individuals paying
 * by self-assessment owe four quarterly instalments plus an annual return:
 *
 *   Q1 (Apr–Jun)  due 15 August
 *   Q2 (Jul–Sep)  due 15 November
 *   Q3 (Oct–Dec)  due 15 February  (following calendar year)
 *   Q4 (Jan–Mar)  due 15 May       (following calendar year)
 *   Annual return due 30 November  (following calendar year)
 *
 * All dates are handled as local midnight so that "days remaining" never
 * drifts by one from a time-of-day component.
 */

import { yearLabel } from './rates';

/** April is month index 3 — the first month of a year of assessment. */
const YA_START_MONTH = 3;

export type FilingPeriod = 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'RETURN';

export interface Deadline {
  period: FilingPeriod;
  /** YA this deadline belongs to, as a start year. */
  yaStartYear: number;
  /** Short label, e.g. "Q2" or "Annual return". */
  label: string;
  /** What the payment covers, e.g. "Jul – Sep 2026". */
  covers: string;
  dueDate: Date;
}

/** Strip the time component so date maths is stable. */
export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** The YA start year a date falls in. 28 Jul 2026 → 2026; 15 Feb 2026 → 2025. */
export function yaStartYearForDate(d: Date): number {
  return d.getMonth() >= YA_START_MONTH ? d.getFullYear() : d.getFullYear() - 1;
}

/** Inclusive start and exclusive end of a year of assessment. */
export function yaRange(startYear: number): { start: Date; end: Date } {
  return {
    start: new Date(startYear, YA_START_MONTH, 1),
    // Exclusive upper bound: 1 April of the following year.
    end: new Date(startYear + 1, YA_START_MONTH, 1),
  };
}

/** True when `date` falls inside the given year of assessment. */
export function isWithinYa(date: Date, startYear: number): boolean {
  const { start, end } = yaRange(startYear);
  return date >= start && date < end;
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** All five deadlines for a year of assessment, in chronological order. */
export function deadlinesForYa(startYear: number): Deadline[] {
  const next = startYear + 1;
  return [
    {
      period: 'Q1',
      yaStartYear: startYear,
      label: 'Q1 instalment',
      covers: `Apr – Jun ${startYear}`,
      dueDate: new Date(startYear, 7, 15), // 15 August
    },
    {
      period: 'Q2',
      yaStartYear: startYear,
      label: 'Q2 instalment',
      covers: `Jul – Sep ${startYear}`,
      dueDate: new Date(startYear, 10, 15), // 15 November
    },
    {
      period: 'Q3',
      yaStartYear: startYear,
      label: 'Q3 instalment',
      covers: `Oct – Dec ${startYear}`,
      dueDate: new Date(next, 1, 15), // 15 February
    },
    {
      period: 'Q4',
      yaStartYear: startYear,
      label: 'Q4 instalment',
      covers: `Jan – Mar ${next}`,
      dueDate: new Date(next, 4, 15), // 15 May
    },
    {
      period: 'RETURN',
      yaStartYear: startYear,
      label: 'Annual return',
      covers: `YA ${yearLabel(startYear)}`,
      dueDate: new Date(next, 10, 30), // 30 November
    },
  ];
}

/** Whole days from `from` until `date`. Negative when the date has passed. */
export function daysUntil(date: Date, from: Date = new Date()): number {
  const MS_PER_DAY = 86_400_000;
  return Math.round(
    (startOfDay(date).getTime() - startOfDay(from).getTime()) / MS_PER_DAY,
  );
}

/**
 * Upcoming and overdue deadlines around a reference date.
 *
 * Spans the previous, current and next YA, because an annual return for a
 * closed year stays due until 30 November of the following year — long after
 * that year's instalments have passed.
 *
 * @param completed Keys of already-settled deadlines, as `${yaStartYear}:${period}`.
 */
export function relevantDeadlines(
  now: Date = new Date(),
  completed: ReadonlySet<string> = new Set(),
): { overdue: Deadline[]; upcoming: Deadline[] } {
  const currentYa = yaStartYearForDate(now);
  const all = [
    ...deadlinesForYa(currentYa - 1),
    ...deadlinesForYa(currentYa),
    ...deadlinesForYa(currentYa + 1),
  ]
    .filter((d) => !completed.has(deadlineKey(d)))
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  return {
    overdue: all.filter((d) => daysUntil(d.dueDate, now) < 0),
    upcoming: all.filter((d) => daysUntil(d.dueDate, now) >= 0),
  };
}

/** Stable identifier for a deadline, used to record it as settled. */
export function deadlineKey(d: Pick<Deadline, 'yaStartYear' | 'period'>): string {
  return `${d.yaStartYear}:${d.period}`;
}

/**
 * Months of a YA that have finished, used to annualise a part-year income.
 * A YA that has just begun returns 0; a closed YA returns 12.
 */
export function monthsElapsedInYa(startYear: number, now: Date = new Date()): number {
  const { start, end } = yaRange(startYear);
  if (now < start) return 0;
  if (now >= end) return 12;
  return (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
}

/** Short month-and-year label for a date, e.g. "Jul 2026". */
export function monthLabel(d: Date): string {
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}
