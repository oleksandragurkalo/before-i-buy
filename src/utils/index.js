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

export function formatHours(hours) {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 10) return `${hours.toFixed(1)} hrs`;
  return `${Math.round(hours)} hrs`;
}

export function formatPrice(price, symbol = '$') {
  return `${symbol}${price.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function daysAgo(timestamp) {
  const diff = Date.now() - timestamp;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'added today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

export function formatDate(timestamp) {
  return new Date(timestamp).toLocaleDateString('en-CA', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
}
