import { useState, useEffect } from 'react';

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
      savedAmount: parseFloat(item.savedAmount) || 0,
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
          savedAmount: parseFloat(updates.savedAmount) || 0,
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
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const updateSettings = (updates) => {
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
    addItem, editItem, decide, removeItem,
    exportData, importData,
  };
}
