/** Display formatting helpers. Kept separate so components stay presentational. */

const GROUPED = new Intl.NumberFormat('en-LK', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const GROUPED_PRECISE = new Intl.NumberFormat('en-LK', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Whole rupees with thousands separators: 1920000 → "1,920,000". */
export function money(amount: number): string {
  return GROUPED.format(Math.round(amount));
}

/** Rupees and cents, for figures where the decimals carry meaning. */
export function moneyPrecise(amount: number): string {
  return GROUPED_PRECISE.format(amount);
}

/**
 * Abbreviated amounts for tight spaces on small screens:
 * 1_920_000 → "1.92M", 45_000 → "45.0K".
 */
export function moneyCompact(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M`;
  if (abs >= 10_000) return `${(amount / 1_000).toFixed(1)}K`;
  return money(amount);
}

/** A rate as a percentage: 0.06 → "6%", 0.00375 → "0.38%". */
export function percent(rate: number, maxDecimals = 2): string {
  const asPercent = rate * 100;
  const decimals = Number.isInteger(asPercent) ? 0 : maxDecimals;
  return `${asPercent.toFixed(decimals)}%`;
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** "15 Aug 2026" — unambiguous, and short enough for a phone. */
export function shortDate(d: Date): string {
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "15 Aug" for dates in the current year, full date otherwise. */
export function compactDate(d: Date, now = new Date()): string {
  return d.getFullYear() === now.getFullYear()
    ? `${d.getDate()} ${MONTHS[d.getMonth()]}`
    : shortDate(d);
}

/** Local date as the yyyy-mm-dd an <input type="date"> expects. */
export function toDateInputValue(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

/**
 * Parse a yyyy-mm-dd input value as a local date.
 * `new Date('2026-07-28')` parses as UTC midnight, which becomes the previous
 * day in negative offsets — hence the explicit construction.
 */
export function fromDateInputValue(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "in 18 days", "today", "3 days overdue". */
export function relativeDays(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days > 0) return `in ${days} days`;
  const overdue = Math.abs(days);
  return `${overdue} ${overdue === 1 ? 'day' : 'days'} overdue`;
}
