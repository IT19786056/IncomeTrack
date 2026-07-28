export type { TaxRegime, TaxBand, YearOfAssessmentRates } from './rates';
export {
  RATE_TABLES,
  LATEST_RATE_TABLE,
  EARLIEST_RATE_TABLE,
  ratesForYear,
  yearLabel,
} from './rates';

export type { SalaryPeriod, SalaryMonth } from './salary';
export {
  monthKey,
  parseMonthKey,
  normalizeSchedule,
  rateForMonth,
  salaryMonthsForYa,
  salaryForYa,
  salaryForCalendarYear,
  isScheduleEmpty,
} from './salary';

export type { FilingPeriod, Deadline } from './periods';
export {
  yaStartYearForDate,
  yaRange,
  isWithinYa,
  deadlinesForYa,
  daysUntil,
  relevantDeadlines,
  deadlineKey,
  monthsElapsedInYa,
  monthLabel,
  startOfDay,
} from './periods';

export type {
  BandCharge,
  NextThreshold,
  TaxComputation,
  TaxInput,
} from './calculate';
export { computeTax, deductionSaving, effectiveBands } from './calculate';
