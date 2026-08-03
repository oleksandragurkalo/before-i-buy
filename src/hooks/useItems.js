import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { convertCurrency } from '../utils';
import { DEFAULT_SETTINGS, DEFAULT_COOLING_OFF_DAYS, COOLING_OFF_PRESETS } from '../config';
import { useExchangeRates } from './useExchangeRates';

const COOLING_OFF_VALUES = COOLING_OFF_PRESETS.map(p => p.value);
const MIN_COOLING_OFF_DAYS = Math.min(...COOLING_OFF_VALUES);
const MAX_COOLING_OFF_DAYS = Math.max(...COOLING_OFF_VALUES);

function clampCoolingOffDays(value) {
  const parsed = parseInt(value, 10);
  const safe = isNaN(parsed) ? DEFAULT_COOLING_OFF_DAYS : parsed;
  return Math.min(MAX_COOLING_OFF_DAYS, Math.max(MIN_COOLING_OFF_DAYS, safe));
}

function autoListName(name) {
  return name ? `${name}'s Waiting List` : DEFAULT_SETTINGS.listName;
}

// Postgres `numeric`/`bigint` columns come back from PostgREST as strings
// (it avoids silently losing precision in JSON) — these map DB rows to/from
// the camelCase shape the rest of the app already expects, converting those
// back to numbers at the boundary.
function itemFromRow(row) {
  return {
    id: row.id,
    name: row.name,
    price: Number(row.price),
    category: row.category,
    note: row.note,
    savedAmount: Number(row.saved_amount),
    coolingOffDays: row.cooling_off_days,
    addedAt: Number(row.added_at),
    status: row.status,
    decidedAt: row.decided_at != null ? Number(row.decided_at) : null,
    hourlyRateAtDecision: row.hourly_rate_at_decision != null ? Number(row.hourly_rate_at_decision) : null,
  };
}

function itemToRow(item, userId) {
  return {
    id: item.id,
    user_id: userId,
    name: item.name,
    price: item.price,
    category: item.category,
    note: item.note,
    saved_amount: item.savedAmount,
    cooling_off_days: item.coolingOffDays,
    added_at: item.addedAt,
    status: item.status,
    decided_at: item.decidedAt,
    hourly_rate_at_decision: item.hourlyRateAtDecision,
  };
}

function settingsFromRow(row) {
  return {
    listName: row.list_name,
    hourlyRate: Number(row.hourly_rate),
    currency: row.currency,
    currencySymbol: row.currency_symbol,
    payPeriod: row.pay_period,
    payAmount: Number(row.pay_amount),
    payType: row.pay_type,
    taxRate: Number(row.tax_rate),
    hoursPerWeek: Number(row.hours_per_week),
  };
}

function settingsToRow(settings, userId) {
  return {
    user_id: userId,
    list_name: settings.listName,
    hourly_rate: settings.hourlyRate,
    currency: settings.currency,
    currency_symbol: settings.currencySymbol,
    pay_period: settings.payPeriod,
    pay_amount: settings.payAmount,
    pay_type: settings.payType,
    tax_rate: settings.taxRate,
    hours_per_week: settings.hoursPerWeek,
  };
}

// Folds a Realtime postgres_changes payload into the current items array.
function applyItemChange(prev, payload) {
  if (payload.eventType === 'DELETE') {
    return prev.filter(i => i.id !== payload.old.id);
  }
  const next = itemFromRow(payload.new);
  const idx = prev.findIndex(i => i.id === next.id);
  if (idx === -1) return [...prev, next];
  const copy = [...prev];
  copy[idx] = next;
  return copy;
}

export function useItems() {
  const { user } = useAuth();
  const exchangeRates = useExchangeRates();

  const [items, setItems] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Initial load + realtime subscription ─────────────────────────────────
  useEffect(() => {
    if (!user) { setLoading(false); return; }

    setLoading(true);
    let cancelled = false;
    let channel = null;

    (async () => {
      const [itemsRes, settingsRes] = await Promise.all([
        supabase.from('items').select('*').eq('user_id', user.id),
        supabase.from('settings').select('*').eq('user_id', user.id).maybeSingle(),
      ]);
      if (cancelled) return;

      if (itemsRes.error) {
        console.error('items load error', itemsRes.error);
        setError('Could not load your items. Check your connection.');
      } else {
        setItems(itemsRes.data.map(itemFromRow));
      }

      if (settingsRes.error) {
        console.error('settings load error', settingsRes.error);
        setError('Could not load your settings. Check your connection.');
      } else if (settingsRes.data) {
        setSettings(settingsFromRow(settingsRes.data));
      } else {
        // Brand-new account, no settings row yet — seed one with a
        // personalized list name instead of the generic default, and
        // persist it so it isn't lost/regenerated on the next load.
        const initial = { ...DEFAULT_SETTINGS, listName: autoListName(user.user_metadata?.full_name) };
        setSettings(initial);
        supabase.from('settings').insert(settingsToRow(initial, user.id)).then(({ error: seedError }) => {
          if (seedError) console.error('seed settings error', seedError);
        });
      }

      setLoading(false);
      if (cancelled) return;

      // Only start listening for changes once the initial snapshot has
      // landed — subscribing earlier risks a change arriving mid-fetch,
      // getting applied, and then silently overwritten when the initial
      // (now slightly stale) snapshot resolves a moment later.
      channel = supabase
        .channel(`user-data-${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'items', filter: `user_id=eq.${user.id}` },
          (payload) => setItems(prev => applyItemChange(prev, payload)))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'settings', filter: `user_id=eq.${user.id}` },
          (payload) => { if (payload.eventType !== 'DELETE') setSettings(settingsFromRow(payload.new)); })
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [user]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const saveItem = useCallback(async (item) => {
    if (!user) return;
    try {
      setError(null);
      const { error: saveError } = await supabase.from('items').upsert(itemToRow(item, user.id));
      if (saveError) throw saveError;
    } catch (e) {
      console.error('saveItem error', e);
      setError('Could not save. Check your connection.');
    }
  }, [user]);

  const deleteItem = useCallback(async (id) => {
    if (!user) return;
    try {
      setError(null);
      const { error: deleteError } = await supabase.from('items').delete().eq('id', id);
      if (deleteError) throw deleteError;
    } catch (e) {
      console.error('deleteItem error', e);
      setError('Could not delete. Check your connection.');
    }
  }, [user]);

  const saveSettings = useCallback(async (next) => {
    if (!user) return;
    try {
      setError(null);
      const { error: saveError } = await supabase.from('settings').upsert(settingsToRow(next, user.id));
      if (saveError) throw saveError;
    } catch (e) {
      console.error('saveSettings error', e);
      setError('Could not save settings. Check your connection.');
    }
  }, [user]);

  // Kept fresh every render (not a dependency) purely so the effect below
  // can read the latest settings/saveSettings without re-running whenever
  // they change — it should only react to an actual display-name change.
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const saveSettingsRef = useRef(saveSettings);
  saveSettingsRef.current = saveSettings;

  // Baseline for detecting a genuine display-name change. Deliberately not
  // captured at hook-mount: `settings` starts out as DEFAULT_SETTINGS before
  // the initial load finishes, so comparing against it before `loading`
  // clears would compare against defaults instead of the real listName and
  // could misfire. The baseline is (re)established the first time loading
  // clears for a given user, and reset if the signed-in account changes.
  const syncBaselineRef = useRef({ userId: null, name: undefined, ready: false });

  // If the account name changes and the list name still matches the
  // auto-generated pattern from the *old* name (i.e. it was never manually
  // renamed), carry the rename forward. A list name that's since been
  // customized to something else is left untouched.
  useEffect(() => {
    const name = user?.user_metadata?.full_name;
    if (loading || !user) {
      syncBaselineRef.current = { userId: user?.id ?? null, name, ready: false };
      return;
    }

    const baseline = syncBaselineRef.current;
    if (baseline.userId !== user.id || !baseline.ready) {
      syncBaselineRef.current = { userId: user.id, name, ready: true };
      return;
    }

    const prevName = baseline.name;
    syncBaselineRef.current = { userId: user.id, name, ready: true };

    if (prevName === name) return;
    if (settingsRef.current.listName !== autoListName(prevName)) return;

    const nextSettings = { ...settingsRef.current, listName: autoListName(name) };
    setSettings(nextSettings);
    saveSettingsRef.current(nextSettings);
  }, [user, loading]);

  // ── Public API ───────────────────────────────────────────────────────────
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
      status: 'waiting',
      decidedAt: null,
      hourlyRateAtDecision: null,
    };
    setItems(prev => [...prev, newItem]);
    saveItem(newItem);
    return newItem.id;
  };

  const editItem = (id, updates) => {
    const existing = items.find(i => i.id === id);
    if (!existing) return;
    const updated = {
      ...existing,
      name: updates.name.trim(),
      price: parseFloat(updates.price),
      category: updates.category || 'other',
      note: updates.note?.trim() || '',
      savedAmount: Math.max(0, parseFloat(updates.savedAmount) || 0),
      coolingOffDays: updates.coolingOffDays != null
        ? clampCoolingOffDays(updates.coolingOffDays)
        : existing.coolingOffDays,
      status: updates.status ?? existing.status,
      decidedAt: updates.status === 'waiting' ? null : existing.decidedAt,
      hourlyRateAtDecision: updates.status === 'waiting' ? null : existing.hourlyRateAtDecision,
    };
    setItems(prev => prev.map(i => i.id === id ? updated : i));
    saveItem(updated);
  };

  const decide = (id, status) => {
    const existing = items.find(i => i.id === id);
    if (!existing) return;
    const updated = { ...existing, status, decidedAt: Date.now(), hourlyRateAtDecision: settings.hourlyRate };
    setItems(prev => prev.map(i => i.id === id ? updated : i));
    saveItem(updated);
  };

  const removeItem = (id) => {
    const index = items.findIndex(i => i.id === id);
    if (index === -1) return null;
    const removed = items[index];
    setItems(prev => prev.filter(i => i.id !== id));
    deleteItem(id);
    return { item: removed, index };
  };

  const restoreItem = ({ item }) => {
    setItems(prev => [...prev, item]);
    saveItem(item);
  };

  const updateSettings = (updates) => {
    let nextItems = items;
    if (updates.currency && updates.currency !== settings.currency) {
      const fromCode = settings.currency;
      const toCode = updates.currency;
      nextItems = items.map(item => ({
        ...item,
        price: Math.round(convertCurrency(item.price, fromCode, toCode, exchangeRates) * 100) / 100,
        savedAmount: item.savedAmount
          ? Math.round(convertCurrency(item.savedAmount, fromCode, toCode, exchangeRates) * 100) / 100
          : item.savedAmount,
        hourlyRateAtDecision: item.hourlyRateAtDecision != null
          ? convertCurrency(item.hourlyRateAtDecision, fromCode, toCode, exchangeRates)
          : item.hourlyRateAtDecision,
      }));
      setItems(nextItems);
      nextItems.forEach(item => saveItem(item));
    }
    const nextSettings = { ...settings, ...updates };
    setSettings(nextSettings);
    saveSettings(nextSettings);
  };

  const exportData = () => JSON.stringify({ items, settings, exportedAt: Date.now() }, null, 2);

  const importData = (parsed) => {
    if (!parsed || !Array.isArray(parsed.items)) return false;
    setItems(parsed.items);
    parsed.items.forEach(item => saveItem(item));
    if (parsed.settings && typeof parsed.settings === 'object') {
      const nextSettings = { ...DEFAULT_SETTINGS, ...parsed.settings };
      setSettings(nextSettings);
      saveSettings(nextSettings);
    }
    return true;
  };

  const waiting = items.filter(i => i.status === 'waiting');
  const history = items.filter(i => i.status !== 'waiting');

  return {
    waiting, history,
    settings, updateSettings,
    addItem, editItem, decide, removeItem, restoreItem,
    exportData, importData,
    loading, error, clearError: () => setError(null),
  };
}
