import { useEffect, useRef, useState } from 'react';
import { CURRENCIES, EXCHANGE_RATES_PER_USD } from '../config';

const CACHE_KEY = 'bib-live-rates';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

// Free, keyless, CORS-friendly — served as a static JSON file, updated
// daily. Verified it covers all 5 currencies this app supports (including
// UAH, which the more common ECB-based feeds don't).
const SOURCE_URL = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json';

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.rates || !parsed?.fetchedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

// The feed keys currencies lowercase ("cad"); everything else in this app
// (EXCHANGE_RATES_PER_USD, item.currency, etc.) uses uppercase codes.
function toRateTable(usdRates) {
  const rates = {};
  for (const { code } of CURRENCIES) {
    const rate = usdRates[code.toLowerCase()];
    if (rate != null) rates[code] = rate;
  }
  return rates;
}

// Live exchange rates as a progressive enhancement, not a hard dependency —
// this app otherwise works fully offline. Falls back to a cached copy, then
// the static EXCHANGE_RATES_PER_USD table, if the fetch ever fails.
export function useExchangeRates() {
  // Stashed by the lazy useState initializer below (called exactly once)
  // so the effect can reuse the same read instead of hitting localStorage
  // and re-parsing JSON a second time on every mount.
  const cacheRef = useRef();
  const [rates, setRates] = useState(() => {
    const cached = loadCache();
    cacheRef.current = cached;
    return cached?.rates ?? EXCHANGE_RATES_PER_USD;
  });

  useEffect(() => {
    const cached = cacheRef.current;
    if (cached && Date.now() - cached.fetchedAt < MAX_AGE_MS) return;

    let cancelled = false;
    fetch(SOURCE_URL)
      .then(res => (res.ok ? res.json() : Promise.reject(new Error('bad response'))))
      .then(data => {
        if (cancelled || !data?.usd) return;
        const liveRates = toRateTable(data.usd);
        setRates(liveRates);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ rates: liveRates, fetchedAt: Date.now() }));
      })
      .catch((err) => {
        // Offline, CDN unreachable, etc. — keep whatever's already in state
        // (cached or static); never block or error the app over this, but
        // still leave a trace so a real bug here isn't invisible.
        console.error('Failed to fetch live exchange rates:', err);
      });

    return () => { cancelled = true; };
  }, []);

  return rates;
}
