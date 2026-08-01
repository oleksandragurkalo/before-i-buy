export const CATEGORIES = {
  tech:     { label: 'Tech',     emoji: '💻' },
  clothing: { label: 'Clothing', emoji: '👕' },
  food:     { label: 'Food',     emoji: '🍔' },
  home:     { label: 'Home',     emoji: '🏠' },
  fitness:  { label: 'Fitness',  emoji: '🏃' },
  beauty:   { label: 'Beauty',   emoji: '✨' },
  other:    { label: 'Other',    emoji: '📦' },
};

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

// Rough "typical net take-home" starting points per currency, so switching
// currency suggests a sane figure instead of carrying over a number from
// a completely different economy. Editable by the user either way.
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
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'added today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

export function daysSince(timestamp) {
  return Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24));
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
    .map(([category, groupItems]) => ({ category, items: groupItems, ...(CATEGORIES[category] || CATEGORIES.other) }))
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
    .map(entry => ({ ...entry, ...(CATEGORIES[entry.category] || CATEGORIES.other) }))
    .sort((a, b) => b.total - a.total);

  const topTemptations = [...all]
    .sort((a, b) => b.price - a.price)
    .slice(0, 3);

  return { resistanceRate, categoryBreakdown, topTemptations, totalItems: all.length };
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
