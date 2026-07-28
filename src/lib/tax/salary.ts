/**
 * Salary declared as a schedule of monthly rates.
 *
 * Salary is known in advance, so it is stated rather than inferred: each entry
 * says "from this month I earn this much per month", and stays in force until
 * the next entry. That removes the guesswork entirely — averaging logged months
 * cannot see a pay rise, and extrapolating from one month cannot see the months
 * before it.
 *
 * Anything that is not salary — a bonus, a one-off project, interest — is
 * counted from the transactions actually logged, and added on top.
 */

export interface SalaryPeriod {
  /** First month this rate applies, as "YYYY-MM". In force until the next entry. */
  from: string;
  /** Gross salary per month, in LKR. */
  monthlyAmount: number;
}

export interface SalaryMonth {
  year: number;
  /** Zero-based, matching Date. */
  month: number;
  /** e.g. "Apr 2026". */
  label: string;
  amount: number;
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** "YYYY-MM" for a calendar month. Sorts lexicographically, which we rely on. */
export function monthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

/** Parse "YYYY-MM" into a year and zero-based month, or null if malformed. */
export function parseMonthKey(key: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(key);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  if (month < 0 || month > 11) return null;
  return { year, month };
}

/** Drop malformed or non-positive entries and sort oldest first. */
export function normalizeSchedule(schedule: SalaryPeriod[]): SalaryPeriod[] {
  return schedule
    .filter(
      (period) =>
        parseMonthKey(period.from) !== null &&
        Number.isFinite(period.monthlyAmount) &&
        period.monthlyAmount >= 0,
    )
    .sort((a, b) => a.from.localeCompare(b.from));
}

/**
 * The rate in force for a calendar month.
 *
 * Months before the first entry return zero: the schedule cannot know about
 * earnings from before the user started recording them, and inventing a rate
 * would silently inflate an earlier year of assessment.
 */
export function rateForMonth(
  schedule: SalaryPeriod[],
  year: number,
  month: number,
): number {
  const key = monthKey(year, month);
  let rate = 0;
  for (const period of normalizeSchedule(schedule)) {
    if (period.from <= key) rate = period.monthlyAmount;
    else break;
  }
  return rate;
}

/** The twelve months of a year of assessment, April through March. */
export function salaryMonthsForYa(
  schedule: SalaryPeriod[],
  yaStartYear: number,
): SalaryMonth[] {
  return Array.from({ length: 12 }, (_, offset) => {
    const monthIndex = (3 + offset) % 12;
    const year = yaStartYear + (3 + offset >= 12 ? 1 : 0);
    return {
      year,
      month: monthIndex,
      label: `${MONTH_NAMES[monthIndex]} ${year}`,
      amount: rateForMonth(schedule, year, monthIndex),
    };
  });
}

/** Total salary across a year of assessment. */
export function salaryForYa(schedule: SalaryPeriod[], yaStartYear: number): number {
  return salaryMonthsForYa(schedule, yaStartYear).reduce(
    (sum, month) => sum + month.amount,
    0,
  );
}

/**
 * Total salary across a calendar year.
 *
 * Not used for tax — it exists so the app can show the January-to-December
 * figure alongside the April-to-March one, since that mismatch is the most
 * common reason a Sri Lankan tax number looks wrong at first glance.
 */
export function salaryForCalendarYear(
  schedule: SalaryPeriod[],
  year: number,
): number {
  return Array.from({ length: 12 }, (_, month) =>
    rateForMonth(schedule, year, month),
  ).reduce((sum, amount) => sum + amount, 0);
}

/** True when no usable rate has been entered. */
export function isScheduleEmpty(schedule: SalaryPeriod[] | undefined): boolean {
  return normalizeSchedule(schedule ?? []).every((p) => p.monthlyAmount === 0);
}
