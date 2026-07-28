import { describe, expect, it } from 'vitest';
import {
  daysUntil,
  deadlineKey,
  deadlinesForYa,
  isWithinYa,
  monthsElapsedInYa,
  relevantDeadlines,
  yaRange,
  yaStartYearForDate,
} from './periods';

describe('yaStartYearForDate', () => {
  it.each([
    ['2026-07-28', 2026],
    ['2026-04-01', 2026], // first day of YA 2026/27
    ['2026-03-31', 2025], // last day of YA 2025/26
    ['2026-01-15', 2025],
    ['2025-12-31', 2025],
  ])('maps %s to YA starting %i', (date, expected) => {
    const [y, m, d] = date.split('-').map(Number);
    expect(yaStartYearForDate(new Date(y, m - 1, d))).toBe(expected);
  });
});

describe('yaRange', () => {
  it('runs 1 April to 1 April exclusive', () => {
    const { start, end } = yaRange(2026);
    expect(start).toEqual(new Date(2026, 3, 1));
    expect(end).toEqual(new Date(2027, 3, 1));
  });

  it('includes the boundaries correctly', () => {
    expect(isWithinYa(new Date(2026, 3, 1), 2026)).toBe(true);
    expect(isWithinYa(new Date(2027, 2, 31), 2026)).toBe(true);
    expect(isWithinYa(new Date(2027, 3, 1), 2026)).toBe(false);
    expect(isWithinYa(new Date(2026, 2, 31), 2026)).toBe(false);
  });
});

describe('deadlinesForYa', () => {
  it('places the five YA 2026/27 deadlines on the statutory dates', () => {
    const deadlines = deadlinesForYa(2026);
    expect(deadlines.map((d) => [d.period, d.dueDate])).toEqual([
      ['Q1', new Date(2026, 7, 15)], // 15 Aug 2026
      ['Q2', new Date(2026, 10, 15)], // 15 Nov 2026
      ['Q3', new Date(2027, 1, 15)], // 15 Feb 2027
      ['Q4', new Date(2027, 4, 15)], // 15 May 2027
      ['RETURN', new Date(2027, 10, 30)], // 30 Nov 2027
    ]);
  });

  it('puts the YA 2025/26 return on 30 November 2026', () => {
    const ret = deadlinesForYa(2025).find((d) => d.period === 'RETURN');
    expect(ret?.dueDate).toEqual(new Date(2026, 10, 30));
  });

  it('describes what each instalment covers', () => {
    const q2 = deadlinesForYa(2026).find((d) => d.period === 'Q2');
    expect(q2?.covers).toBe('Jul – Sep 2026');
  });
});

describe('daysUntil', () => {
  it('counts 18 days from 28 July to 15 August 2026', () => {
    expect(daysUntil(new Date(2026, 7, 15), new Date(2026, 6, 28))).toBe(18);
  });

  it('is zero on the due date and negative once passed', () => {
    const due = new Date(2026, 7, 15);
    expect(daysUntil(due, new Date(2026, 7, 15))).toBe(0);
    expect(daysUntil(due, new Date(2026, 7, 16))).toBe(-1);
  });

  it('ignores time of day', () => {
    const due = new Date(2026, 7, 15);
    expect(daysUntil(due, new Date(2026, 7, 14, 23, 59))).toBe(1);
    expect(daysUntil(due, new Date(2026, 7, 14, 0, 1))).toBe(1);
  });
});

describe('monthsElapsedInYa', () => {
  it('counts three completed months by late July', () => {
    expect(monthsElapsedInYa(2026, new Date(2026, 6, 28))).toBe(3);
  });

  it('is zero before the year starts and twelve once closed', () => {
    expect(monthsElapsedInYa(2026, new Date(2026, 2, 31))).toBe(0);
    expect(monthsElapsedInYa(2026, new Date(2027, 3, 1))).toBe(12);
    expect(monthsElapsedInYa(2026, new Date(2030, 0, 1))).toBe(12);
  });
});

describe('relevantDeadlines', () => {
  const now = new Date(2026, 6, 28); // 28 July 2026

  it('puts the next instalment first and keeps chronological order', () => {
    const { upcoming } = relevantDeadlines(now);
    expect(upcoming[0].dueDate).toEqual(new Date(2026, 7, 15));
    expect(upcoming[0].yaStartYear).toBe(2026);

    const times = upcoming.map((d) => d.dueDate.getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it("orders the prior year's return after the current year's Q2", () => {
    const { upcoming } = relevantDeadlines(now);
    const q2 = upcoming.findIndex((d) => d.yaStartYear === 2026 && d.period === 'Q2');
    const priorReturn = upcoming.findIndex(
      (d) => d.yaStartYear === 2025 && d.period === 'RETURN',
    );
    expect(q2).toBeGreaterThanOrEqual(0);
    expect(priorReturn).toBeGreaterThan(q2);
  });

  it('reports passed dates as overdue', () => {
    const { overdue } = relevantDeadlines(now);
    expect(overdue.every((d) => d.dueDate < now)).toBe(true);
    expect(overdue.some((d) => d.yaStartYear === 2025 && d.period === 'Q4')).toBe(true);
  });

  it('excludes settled deadlines from both lists', () => {
    const completed = new Set(['2026:Q1']);
    const { upcoming } = relevantDeadlines(now, completed);
    expect(upcoming.some((d) => deadlineKey(d) === '2026:Q1')).toBe(false);
    expect(upcoming[0].dueDate).toEqual(new Date(2026, 10, 15));
  });
});
