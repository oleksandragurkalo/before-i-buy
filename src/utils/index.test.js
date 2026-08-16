import { describe, it, expect } from 'vitest';
import {
  computeHourlyRate,
  convertPayAmount,
  convertCurrency,
  coolingOffStatus,
  savingsPace,
  computeStreak,
  computeHeaderStats,
} from './index';

function daysFromNow(n) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

describe('computeHourlyRate', () => {
  it('returns the amount as-is for net hourly pay', () => {
    expect(computeHourlyRate({ payPeriod: 'hourly', payAmount: '25', payType: 'net', taxRate: 0, hoursPerWeek: 40 })).toBe(25);
  });

  it('applies the tax rate for gross pay', () => {
    const rate = computeHourlyRate({ payPeriod: 'hourly', payAmount: '100', payType: 'gross', taxRate: 30, hoursPerWeek: 40 });
    expect(rate).toBeCloseTo(70); // 100 * (1 - 0.30)
  });

  it('divides monthly pay by weeks-per-month * hours-per-week', () => {
    const rate = computeHourlyRate({ payPeriod: 'monthly', payAmount: '4000', payType: 'net', taxRate: 0, hoursPerWeek: 40 });
    // 4000 / (40 * 52/12) = 4000 / 173.333...
    expect(rate).toBeCloseTo(23.0769, 3);
  });

  it('divides annual pay by weeks-per-year * hours-per-week', () => {
    const rate = computeHourlyRate({ payPeriod: 'annually', payAmount: '52000', payType: 'net', taxRate: 0, hoursPerWeek: 40 });
    // 52000 / (40 * 52) = 25
    expect(rate).toBeCloseTo(25);
  });

  it('returns null for a zero or invalid amount', () => {
    expect(computeHourlyRate({ payPeriod: 'hourly', payAmount: '0', payType: 'net', taxRate: 0, hoursPerWeek: 40 })).toBeNull();
    expect(computeHourlyRate({ payPeriod: 'hourly', payAmount: 'not-a-number', payType: 'net', taxRate: 0, hoursPerWeek: 40 })).toBeNull();
  });
});

describe('convertPayAmount', () => {
  it('converts monthly pay down to an hourly rate', () => {
    // 4000 / (40 * 52/12) = 23.08 -> rounded to 23, then * 1
    expect(convertPayAmount(4000, 'monthly', 'hourly', 40)).toBe(23);
  });

  it('converts hourly pay up to a monthly amount', () => {
    // round(2000/1) = 2000, then * (40 * 52/12)
    expect(convertPayAmount(2000, 'hourly', 'monthly', 40)).toBeCloseTo(346666.6667, 3);
  });

  it('is not perfectly lossless for a same-period conversion, since it always round-trips through a rounded hourly rate', () => {
    // round(3000 / 173.333) = 17, then 17 * 173.333 = 2946.67 — not 3000.
    expect(convertPayAmount(3000, 'monthly', 'monthly', 40)).toBeCloseTo(2946.6667, 3);
  });
});

describe('convertCurrency', () => {
  const rates = { USD: 1, CAD: 1.36, EUR: 0.92 };

  it('returns the amount unchanged when currencies match', () => {
    expect(convertCurrency(100, 'CAD', 'CAD', rates)).toBe(100);
  });

  it('converts through USD-denominated rates', () => {
    expect(convertCurrency(100, 'USD', 'CAD', rates)).toBeCloseTo(136);
    expect(convertCurrency(100, 'CAD', 'USD', rates)).toBeCloseTo(73.5294, 3);
  });

  it('falls back to a rate of 1 for an unknown currency code', () => {
    expect(convertCurrency(50, 'XXX', 'USD', rates)).toBe(50);
  });
});

describe('coolingOffStatus', () => {
  it('is not ready while days remain', () => {
    const item = { addedAt: Date.now() - 3 * 24 * 60 * 60 * 1000 };
    const status = coolingOffStatus(item, 7);
    expect(status.elapsed).toBe(3);
    expect(status.remaining).toBe(4);
    expect(status.ready).toBe(false);
  });

  it('is ready exactly when the required days have elapsed', () => {
    const item = { addedAt: Date.now() - 3 * 24 * 60 * 60 * 1000 };
    expect(coolingOffStatus(item, 3).ready).toBe(true);
  });

  it('clamps remaining at zero once the wait is overshot', () => {
    const item = { addedAt: Date.now() - 10 * 24 * 60 * 60 * 1000 };
    const status = coolingOffStatus(item, 3);
    expect(status.remaining).toBe(0);
    expect(status.ready).toBe(true);
  });
});

describe('savingsPace', () => {
  it('returns null when there is no target date', () => {
    expect(savingsPace({ price: 100, savedAmount: 0, targetDate: null })).toBeNull();
  });

  it('reports fully saved once savedAmount reaches the price', () => {
    const result = savingsPace({ price: 100, savedAmount: 150, targetDate: daysFromNow(10) });
    expect(result).toEqual({ remaining: 0, fullySaved: true, overdue: false });
  });

  it('flags an overdue target date with remaining balance', () => {
    const result = savingsPace({ price: 100, savedAmount: 20, targetDate: daysFromNow(-2) });
    expect(result.overdue).toBe(true);
    expect(result.fullySaved).toBe(false);
    expect(result.remaining).toBe(80);
  });

  it('computes a per-day/per-week pace for a future target date', () => {
    const result = savingsPace({ price: 100, savedAmount: 30, targetDate: daysFromNow(7) });
    expect(result.overdue).toBe(false);
    expect(result.remaining).toBe(70);
    expect(result.daysLeft).toBe(7);
    expect(result.perDay).toBeCloseTo(10);
    expect(result.perWeek).toBeCloseTo(70);
  });
});

describe('computeStreak', () => {
  it('is zero for an empty history', () => {
    expect(computeStreak([])).toBe(0);
  });

  it('counts consecutive "passed" decisions from the most recent', () => {
    const history = [
      { status: 'passed', decidedAt: 3 },
      { status: 'passed', decidedAt: 2 },
      { status: 'bought', decidedAt: 1 },
    ];
    expect(computeStreak(history)).toBe(2);
  });

  it('is zero when the most recent decision broke the streak', () => {
    const history = [
      { status: 'bought', decidedAt: 3 },
      { status: 'passed', decidedAt: 2 },
    ];
    expect(computeStreak(history)).toBe(0);
  });
});

describe('computeHeaderStats', () => {
  const history = [
    { status: 'passed', price: 100, decidedAt: 1000, hourlyRateAtDecision: null },
    { status: 'passed', price: 50, decidedAt: 2000, hourlyRateAtDecision: 10 },
    { status: 'bought', price: 30, decidedAt: 1500, hourlyRateAtDecision: null },
  ];

  it('totals resisted and spent amounts separately', () => {
    const stats = computeHeaderStats(history, 25);
    expect(stats.totalSaved).toBe(150);
    expect(stats.resistedCount).toBe(2);
    expect(stats.totalSpent).toBe(30);
    expect(stats.spentCount).toBe(1);
  });

  it('falls back to the current hourlyRate when hourlyRateAtDecision is missing', () => {
    const stats = computeHeaderStats(history, 25);
    // item1: 100 / 25 (fallback) = 4; item2: 50 / 10 (its own rate) = 5
    expect(stats.hoursSaved).toBeCloseTo(9);
    // bought item: 30 / 25 (fallback) = 1.2
    expect(stats.hoursSpent).toBeCloseTo(1.2);
  });
});
