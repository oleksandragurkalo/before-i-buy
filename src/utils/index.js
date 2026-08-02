export const  CATEGORIES = {
  tech:     { label: 'Tech',     emoji: '💻' },
  clothing: { label: 'Clothing', emoji: '👕' },
  food:     { label: 'Food',     emoji: '🍔' },
  home:     { label: 'Home',     emoji: '🏠' },
  fitness:  { label: 'Fitness',  emoji: '🏃' },
  beauty:   { label: 'Beauty',   emoji: '✨' },
  other:    { label: 'Other',    emoji: '📦' },
};

export function getCategory(key) {
  return CATEGORIES[key] || CATEGORIES.other;
}

export const DECISION_LABELS = {
  passed: 'Resisted',
  bought: 'Bought anyway',
};

// Single source of truth for the cooling-off period options — the add/edit
// form's preset chips render this list, and useItems.js derives its
// min/max clamp bounds from it, so the two can never drift apart.
export const COOLING_OFF_PRESETS = [
  { value: 0, label: 'No wait' },
  { value: 3, label: '3d' },
  { value: 7, label: '7d' },
  { value: 14, label: '14d' },
  { value: 30, label: '30d' },
];

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

export const CURRENCIES = [
  { code: 'CAD', symbol: '$', label: 'CAD — Canadian dollar' },
  { code: 'USD', symbol: '$', label: 'USD — US dollar' },
  { code: 'EUR', symbol: '€', label: 'EUR — Euro' },
  { code: 'PLN', symbol: 'zł', label: 'PLN — Polish złoty' },
  { code: 'UAH', symbol: '₴', label: 'UAH — Ukrainian hryvnia' },
];

export const CURRENCY_DEFAULT_HOURLY = {
  CAD: 25,
  USD: 22,
  EUR: 20,
  PLN: 35,
  UAH: 100,
};

export function defaultPayAmountFor(payPeriod, currencyCode, hoursPerWeek) {
  const hourly = CURRENCY_DEFAULT_HOURLY[currencyCode] ?? 20;
  return Math.round(hourly * periodToHourlyFactor(payPeriod, hoursPerWeek));
}

export const EXCHANGE_RATES_PER_USD = {
  USD: 1,
  CAD: 1.36,
  EUR: 0.92,
  PLN: 3.95,
  UAH: 41.5,
};

export function convertCurrency(amount, fromCode, toCode) {
  if (fromCode === toCode) return amount;
  const fromRate = EXCHANGE_RATES_PER_USD[fromCode] ?? 1;
  const toRate = EXCHANGE_RATES_PER_USD[toCode] ?? 1;
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

function series(items, valueFn, cap = 8) {
  const values = items.map(valueFn);
  return values.length >= 2 ? values.slice(-cap) : null;
}

export function computeHeaderStats(waiting, history, hourlyRate) {
  const passed = [...history.filter(i => i.status === 'passed')].sort((a, b) => a.decidedAt - b.decidedAt);
  const bought = [...history.filter(i => i.status === 'bought')].sort((a, b) => a.decidedAt - b.decidedAt);

  let runningSaved = 0;
  const resistedSeries = series(passed, i => (runningSaved += i.price));
  runningSaved = 0;

  let runningSpent = 0;
  const spentSeries = series(bought, i => (runningSpent += i.price));
  runningSpent = 0;

  const hoursForItem = (item) => hoursOfWork(item.price, item.hourlyRateAtDecision ?? hourlyRate);
  const hoursSeries = series(passed, hoursForItem);
  const hoursSaved = passed.reduce((sum, i) => sum + hoursForItem(i), 0);
  const hoursSpent = bought.reduce((sum, i) => sum + hoursForItem(i), 0);

  return {
    totalSaved: passed.reduce((sum, i) => sum + i.price, 0),
    resistedCount: passed.length,
    resistedSeries,
    totalSpent: bought.reduce((sum, i) => sum + i.price, 0),
    spentCount: bought.length,
    spentSeries,
    hoursSaved,
    hoursSpent,
    hoursSeries,
  };
}
