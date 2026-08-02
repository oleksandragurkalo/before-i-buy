import { useState, useEffect } from 'react';
import { convertCurrency } from '../utils';

const STORAGE_KEY = 'bib-items';
const SETTINGS_KEY = 'bib-settings';

export const DEFAULT_SETTINGS = {
  listName: 'Waiting List',
  hourlyRate: 25,
  currency: 'CAD',
  currencySymbol: '$',
  payPeriod: 'hourly', // 'hourly' | 'monthly' | 'annually'
  payAmount: 25,
  payType: 'net',      // 'net' | 'gross'
  taxRate: 30,
  hoursPerWeek: 40,
};

export const DEFAULT_COOLING_OFF_DAYS = 7;
export const MIN_COOLING_OFF_DAYS = 0;
export const MAX_COOLING_OFF_DAYS = 60;

function clampCoolingOffDays(value) {
  const parsed = parseInt(value, 10);
  const safe = isNaN(parsed) ? DEFAULT_COOLING_OFF_DAYS : parsed;
  return Math.min(MAX_COOLING_OFF_DAYS, Math.max(MIN_COOLING_OFF_DAYS, safe));
}

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback;
    if (typeof fallback === 'object' && !Array.isArray(fallback) && (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))) {
      return fallback;
    }
    return parsed;
  } catch {
    return fallback;
  }
}

export function useItems() {
  const [items, setItems] = useState(() => {
    const loaded = load(STORAGE_KEY, []);
    const currentSettings = load(SETTINGS_KEY, DEFAULT_SETTINGS);
    return loaded.map(item =>
      item.status !== 'waiting' && item.hourlyRateAtDecision == null
        ? { ...item, hourlyRateAtDecision: currentSettings.hourlyRate }
        : item
    );
  });
  const [settings, setSettings] = useState(() => load(SETTINGS_KEY, DEFAULT_SETTINGS));

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  const addItem = (item) => {
    const newItem = {
      id: crypto.randomUUID(),
      name: item.name.trim(),
      price: parseFloat(item.price),
      category: item.category || 'other',
      note: item.note?.trim() || '',
      savedAmount: Math.max(0, parseFloat(item.savedAmount) || 0),
      coolingOffDays: clampCoolingOffDays(item.coolingOffDays),
      addedAt: Date.now(),
      status: 'waiting', // 'waiting' | 'bought' | 'passed'
      decidedAt: null,
    };
    setItems(prev => [newItem, ...prev]);
    return newItem.id;
  };

  const editItem = (id, updates) => {
    setItems(prev => prev.map(item =>
      item.id === id
        ? {
          ...item,
          name: updates.name.trim(),
          price: parseFloat(updates.price),
          category: updates.category || 'other',
          note: updates.note?.trim() || '',
          savedAmount: Math.max(0, parseFloat(updates.savedAmount) || 0),
          // Only present when the form showed the field (item still
          // waiting) — otherwise (editing a decided item) leave it as-is.
          coolingOffDays: updates.coolingOffDays != null
            ? clampCoolingOffDays(updates.coolingOffDays)
            : item.coolingOffDays,
          status: updates.status ?? item.status,
          // Moved back to "still deciding" from History — it's no longer
          // a decided item, so the decision timestamp/snapshot no longer
          // applies.
          decidedAt: updates.status === 'waiting' ? null : item.decidedAt,
          hourlyRateAtDecision: updates.status === 'waiting' ? null : item.hourlyRateAtDecision,
        }
        : item
    ));
  };

  const decide = (id, status) => {
    setItems(prev => prev.map(item =>
      item.id === id
        ? { ...item, status, decidedAt: Date.now(), hourlyRateAtDecision: settings.hourlyRate }
        : item
    ));
  };

  const removeItem = (id) => {
    const index = items.findIndex(item => item.id === id);
    if (index === -1) return null;
    const removed = items[index];
    setItems(prev => prev.filter(item => item.id !== id));
    return { item: removed, index };
  };

  // Puts a removed item back at its original position, for "Undo" — not a
  // general insert, so it only makes sense right after removeItem.
  const restoreItem = ({ item, index }) => {
    setItems(prev => {
      const next = [...prev];
      next.splice(Math.min(index, next.length), 0, item);
      return next;
    });
  };

  const updateSettings = (updates) => {
    if (updates.currency && updates.currency !== settings.currency) {
      const fromCode = settings.currency;
      const toCode = updates.currency;
      setItems(prev => prev.map(item => ({
        ...item,
        price: Math.round(convertCurrency(item.price, fromCode, toCode) * 100) / 100,
        savedAmount: item.savedAmount
          ? Math.round(convertCurrency(item.savedAmount, fromCode, toCode) * 100) / 100
          : item.savedAmount,
        // Keep the frozen hourly-rate snapshot in the same currency as the
        // (now-converted) price, so hours-of-work for History items still
        // computes correctly after a currency switch.
        hourlyRateAtDecision: item.hourlyRateAtDecision != null
          ? convertCurrency(item.hourlyRateAtDecision, fromCode, toCode)
          : item.hourlyRateAtDecision,
      })));
    }
    setSettings(prev => ({ ...prev, ...updates }));
  };

  const exportData = () => JSON.stringify({ items, settings, exportedAt: Date.now() }, null, 2);

  const importData = (parsed) => {
    if (!parsed || !Array.isArray(parsed.items)) return false;
    setItems(parsed.items);
    if (parsed.settings && typeof parsed.settings === 'object') {
      setSettings({ ...DEFAULT_SETTINGS, ...parsed.settings });
    }
    return true;
  };

  const waiting = items.filter(i => i.status === 'waiting');
  const history = items.filter(i => i.status !== 'waiting');
  const totalSaved = history
    .filter(i => i.status === 'passed')
    .reduce((sum, i) => sum + i.price, 0);
  const totalSpent = history
    .filter(i => i.status === 'bought')
    .reduce((sum, i) => sum + i.price, 0);

  return {
    waiting, history,
    totalSaved, totalSpent,
    settings, updateSettings,
    addItem, editItem, decide, removeItem, restoreItem,
    exportData, importData,
  };
}
