// Shared, cross-cutting domain data — the app's fixed reference lists and
// defaults. Pure data only; computation/formatting logic lives in ./utils.

export const CATEGORIES = {
  tech:     { label: 'Tech',     emoji: '💻' },
  clothing: { label: 'Clothing', emoji: '👕' },
  food:     { label: 'Food',     emoji: '🍔' },
  home:     { label: 'Home',     emoji: '🏠' },
  fitness:  { label: 'Fitness',  emoji: '🏃' },
  beauty:   { label: 'Beauty',   emoji: '✨' },
  other:    { label: 'Other',    emoji: '📦' },
};

export const DECISION_LABELS = {
  passed: 'Resisted',
  bought: 'Bought anyway',
};

// Single source of truth for the cooling-off period options — the add/edit
// form's preset chips render this list, and DEFAULT_COOLING_OFF_DAYS/clamp
// bounds derive from it, so they can never drift apart.
export const COOLING_OFF_PRESETS = [
  { value: 0, label: 'No wait' },
  { value: 3, label: '3d' },
  { value: 7, label: '7d' },
  { value: 14, label: '14d' },
  { value: 30, label: '30d' },
];

export const DEFAULT_COOLING_OFF_DAYS = 7;

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

export const EXCHANGE_RATES_PER_USD = {
  USD: 1,
  CAD: 1.36,
  EUR: 0.92,
  PLN: 3.95,
  UAH: 41.5,
};

export const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;

export const DEFAULT_SETTINGS = {
  hourlyRate: 25,
  currency: 'CAD',
  currencySymbol: '$',
  payPeriod: 'hourly',
  payAmount: 25,
  payType: 'net',
  taxRate: 30,
  hoursPerWeek: 40,
};
