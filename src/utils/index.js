import { CATEGORIES, CURRENCY_DEFAULT_HOURLY, EXCHANGE_RATES_PER_USD } from '../config';

export function getCategory(key) {
  return CATEGORIES[key] || CATEGORIES.other;
}

export function hoursOfWork(price, netHourlyRate) {
  return price / netHourlyRate;
}

const WEEKS_PER_MONTH = 52 / 12;
const WEEKS_PER_YEAR = 52;

function periodToHourlyFactor(period, hoursPerWeek) {
  if (period === 'monthly') return hoursPerWeek * WEEKS_PER_MONTH;
  if (period === 'annually') return hoursPerWeek * WEEKS_PER_YEAR;
  return 1;
}

export function computeHourlyRate({ payPeriod, payAmount, payType, taxRate, hoursPerWeek }) {
  const amount = parseFloat(payAmount);
  if (isNaN(amount) || amount <= 0) return null;
  const net = payType === 'gross' ? amount * (1 - taxRate / 100) : amount;
  return net / periodToHourlyFactor(payPeriod, hoursPerWeek);
}

export function convertPayAmount(amount, fromPeriod, toPeriod, hoursPerWeek) {
  const asHourly = Math.round(amount / periodToHourlyFactor(fromPeriod, hoursPerWeek));
  return asHourly * periodToHourlyFactor(toPeriod, hoursPerWeek);
}

export function defaultPayAmountFor(payPeriod, currencyCode, hoursPerWeek) {
  const hourly = CURRENCY_DEFAULT_HOURLY[currencyCode] ?? 20;
  return Math.round(hourly * periodToHourlyFactor(payPeriod, hoursPerWeek));
}

export function convertCurrency(amount, fromCode, toCode, rates = EXCHANGE_RATES_PER_USD) {
  if (fromCode === toCode) return amount;
  const fromRate = rates[fromCode] ?? 1;
  const toRate = rates[toCode] ?? 1;
  return (amount / fromRate) * toRate;
}

export function formatHours(hours) {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 10) return `${hours.toFixed(1)} hrs`;
  return `${Math.round(hours)} hrs`;
}

export function formatPrice(price, symbol = '$') {
  return `${symbol} ${price.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function daysAgo(timestamp) {
  const diff = Date.now() - timestamp;
  const days = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  if (days === 0) return 'added today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

export function daysSince(timestamp) {
  return Math.max(0, Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24)));
}

export function coolingOffStatus(item, requiredDays) {
  const elapsed = daysSince(item.addedAt);
  const remaining = Math.max(0, requiredDays - elapsed);
  return { required: requiredDays, elapsed, remaining, ready: remaining === 0 };
}

// How much to save per day/week to hit an item's price by its target date.
// Returns null when there's no target date set (caller hides the UI).
export function savingsPace(item) {
  if (!item.targetDate) return null;

  const saved = Math.min(item.savedAmount || 0, item.price);
  const remaining = Math.max(0, item.price - saved);
  if (remaining <= 0) return { remaining: 0, fullySaved: true, overdue: false };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${item.targetDate}T00:00:00`);
  const daysLeft = Math.round((target - today) / (1000 * 60 * 60 * 24));

  if (daysLeft <= 0) return { remaining, daysLeft, overdue: true, fullySaved: false };

  return {
    remaining,
    daysLeft,
    perDay: remaining / daysLeft,
    perWeek: (remaining / daysLeft) * 7,
    overdue: false,
    fullySaved: false,
  };
}

export function formatDate(timestamp) {
  return new Date(timestamp).toLocaleDateString('en-CA', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
}

export function sortItems(items, sortBy, dateField = 'addedAt') {
  const sorted = [...items];
  switch (sortBy) {
    case 'oldest':
      return sorted.sort((a, b) => a[dateField] - b[dateField]);
    case 'price-desc':
      return sorted.sort((a, b) => b.price - a.price);
    case 'price-asc':
      return sorted.sort((a, b) => a.price - b.price);
    case 'newest':
    default:
      return sorted.sort((a, b) => b[dateField] - a[dateField]);
  }
}

export function groupByCategory(items) {
  const map = new Map();
  for (const item of items) {
    const key = item.category || 'other';
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return [...map.entries()]
    .map(([category, groupItems]) => ({ category, items: groupItems, ...getCategory(category) }))
    .sort((a, b) => b.items.length - a.items.length);
}

export function computeInsights(waiting, history) {
  const all = [...waiting, ...history];

  const decided = history.length;
  const passed = history.filter(i => i.status === 'passed').length;
  const resistanceRate = decided > 0 ? Math.round((passed / decided) * 100) : null;

  const byCategory = new Map();
  for (const item of all) {
    const key = item.category || 'other';
    const entry = byCategory.get(key) || { category: key, count: 0, total: 0 };
    entry.count += 1;
    entry.total += item.price;
    byCategory.set(key, entry);
  }
  const categoryBreakdown = [...byCategory.values()]
    .map(entry => ({ ...entry, ...getCategory(entry.category) }))
    .sort((a, b) => b.total - a.total);

  const topTemptations = [...all]
    .sort((a, b) => b.price - a.price)
    .slice(0, 3);

  return { resistanceRate, categoryBreakdown, topTemptations, totalItems: all.length };
}

export function computeStreak(history) {
  const decided = [...history].sort((a, b) => b.decidedAt - a.decidedAt);
  let streak = 0;
  for (const item of decided) {
    if (item.status !== 'passed') break;
    streak++;
  }
  return streak;
}

// `history` is always this account's own decisions (see useItems.js) — an
// item's stored `hourlyRateAtDecision`, or `hourlyRate` as its fallback,
// is therefore always this account's own rate too, never a friend's.
export function computeHeaderStats(history, hourlyRate) {
  const passed = history.filter(i => i.status === 'passed');
  const bought = history.filter(i => i.status === 'bought');

  const hoursForItem = (item) => hoursOfWork(item.price, item.hourlyRateAtDecision ?? hourlyRate);
  const hoursSaved = passed.reduce((sum, i) => sum + hoursForItem(i), 0);
  const hoursSpent = bought.reduce((sum, i) => sum + hoursForItem(i), 0);

  return {
    totalSaved: passed.reduce((sum, i) => sum + i.price, 0),
    resistedCount: passed.length,
    totalSpent: bought.reduce((sum, i) => sum + i.price, 0),
    spentCount: bought.length,
    hoursSaved,
    hoursSpent,
  };
}
