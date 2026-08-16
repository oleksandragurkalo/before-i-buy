import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { convertCurrency } from '../utils';
import { DEFAULT_SETTINGS, DEFAULT_COOLING_OFF_DAYS, COOLING_OFF_PRESETS } from '../config';
import { useExchangeRates } from './useExchangeRates';
import { settingsFromRow } from './useSettings';
import { loadResource } from './loadResource';

const COOLING_OFF_VALUES = COOLING_OFF_PRESETS.map(p => p.value);
const MIN_COOLING_OFF_DAYS = Math.min(...COOLING_OFF_VALUES);
const MAX_COOLING_OFF_DAYS = Math.max(...COOLING_OFF_VALUES);

function clampCoolingOffDays(value) {
  const parsed = parseInt(value, 10);
  const safe = isNaN(parsed) ? DEFAULT_COOLING_OFF_DAYS : parsed;
  return Math.min(MAX_COOLING_OFF_DAYS, Math.max(MIN_COOLING_OFF_DAYS, safe));
}

// Postgres `numeric`/`bigint` columns come back from PostgREST as strings
// (it avoids silently losing precision in JSON) — these map DB rows to/from
// the camelCase shape the rest of the app already expects, converting those
// back to numbers at the boundary.
function itemFromRow(row) {
  return {
    id: row.id,
    listId: row.list_id,
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
    targetDate: row.target_date ?? null,
  };
}

function itemToRow(item, userId, listId) {
  return {
    id: item.id,
    user_id: userId,
    list_id: listId,
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
    target_date: item.targetDate || null,
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

// `listId` is the *active* list — it scopes `waiting` (and where a new item
// is added/saved to) but never `history`: decision history is account-wide
// by design (a user's track record of resisting/buying isn't really "per
// list", and never someone else's — see the two load effects below) and
// `onImportSettings` lets importData() restore a full settings object on
// top of it. `ownerId` is the list owner's user id, needed only for a
// read-only (shared) list — see the ownerSettings effect below.
export function useItems(listId, {
  readOnly = false,
  ownerId = null,
  accountSettings = DEFAULT_SETTINGS,
  onImportSettings = () => {},
} = {}) {
  const { user } = useAuth();
  const exchangeRates = useExchangeRates();

  // Always this account's own items, across every list it owns — never a
  // friend's, and independent of which list is active. Powers `history`
  // unconditionally, and `waiting` whenever this account owns the active
  // list (i.e. not viewing a friend's shared list — see `friendItems`
  // below for that case).
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  // One shared error string for both the initial load and every action
  // below (add/edit/decide/remove/...), surfaced via App.jsx's global
  // Toast — intentional, not an inconsistency with useLists/useFriends'
  // split shape. This hook's actions are optimistic and fire-and-forget
  // (e.g. addItem/editItem update local state and close their form
  // immediately, without awaiting the save) — by the time a failure could
  // happen, the triggering UI is usually already gone, so there's no
  // inline location left to show it. useLists/useFriends' actions are
  // awaited by their caller instead, which keeps the triggering dialog
  // open long enough to show the error right there — see the loadError
  // comment in those hooks.
  const [error, setError] = useState(null);
  const [ownerSettings, setOwnerSettings] = useState(null);
  // Tracks which owner `ownerSettings` was actually fetched for, so a stale
  // read from a previous owner can never be shown against a new one — see
  // the effect below.
  const [ownerSettingsOwnerId, setOwnerSettingsOwnerId] = useState(null);

  useEffect(() => {
    if (!user) { setItems([]); setLoading(false); return; }
    setLoading(true);
    let cancelled = false;
    let channel = null;

    loadResource(async () => {
      const { data, error: itemsError } = await supabase.from('items').select('*').eq('user_id', user.id);
      if (cancelled) return;

      if (itemsError) {
        console.error('items load error', itemsError);
        setError('Could not load your items. Check your connection.');
      } else {
        setItems(data.map(itemFromRow));
      }

      setLoading(false);
      if (cancelled) return;

      // Only start listening for changes once the initial snapshot has
      // landed — subscribing earlier risks a change arriving mid-fetch,
      // getting applied, and then silently overwritten when the initial
      // (now slightly stale) snapshot resolves a moment later.
      channel = supabase
        .channel(`user-items-${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'items', filter: `user_id=eq.${user.id}` },
          (payload) => setItems(prev => applyItemChange(prev, payload)))
        .subscribe();
    }, {
      setLoading, setError,
      errorMessage: 'Could not load your items. Check your connection.',
      isCancelled: () => cancelled,
    });

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [user]);

  // ── A friend's shared list, for the read-only Waiting view ────────────────
  // Only fetched while actually viewing a friend's list. `waiting` reads
  // from here instead of `items` in that case — `history` never does: it's
  // always this account's own decisions, regardless of which list (yours or
  // a friend's) happens to be active.
  const [friendItems, setFriendItems] = useState([]);
  const [friendLoading, setFriendLoading] = useState(false);
  // Tracks which list `friendItems` was actually fetched for, so a stale
  // read from a previous friend's list can never be shown against a new
  // one — mirrors the `ownerSettingsOwnerId` guard below.
  const [friendItemsListId, setFriendItemsListId] = useState(null);

  useEffect(() => {
    if (!readOnly || !listId) { setFriendItems([]); setFriendItemsListId(null); setFriendLoading(false); return; }
    setFriendLoading(true);
    let cancelled = false;
    let channel = null;

    loadResource(async () => {
      const { data, error: itemsError } = await supabase.from('items').select('*').eq('list_id', listId);
      if (cancelled) return;

      if (itemsError) {
        console.error('friend items load error', itemsError);
        setError('Could not load this list. Check your connection.');
        setFriendItems([]);
      } else {
        setFriendItems(data.map(itemFromRow));
      }
      setFriendItemsListId(listId);

      setFriendLoading(false);
      if (cancelled) return;

      channel = supabase
        .channel(`list-items-${listId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'items', filter: `list_id=eq.${listId}` },
          (payload) => setFriendItems(prev => applyItemChange(prev, payload)))
        .subscribe();
    }, {
      setLoading: setFriendLoading, setError,
      errorMessage: 'Could not load this list. Check your connection.',
      isCancelled: () => cancelled,
    });

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [readOnly, listId]);

  // ── Owner settings, for shared/read-only lists ────────────────────────────
  // An item's `price` is the list owner's raw number, in the owner's
  // currency — computing "hours of work" or formatting it with the
  // *viewer's* hourlyRate/currency (accountSettings) silently mixes two
  // accounts' numbers into something meaningless. Requires an RLS policy on
  // `settings` that lets a user with an accepted list_shares row read the
  // owner's settings row — without it this falls back to the viewer's own
  // settings, same as before this fix.
  useEffect(() => {
    if (!readOnly || !ownerId) { setOwnerSettings(null); setOwnerSettingsOwnerId(null); return; }
    let cancelled = false;
    supabase.from('settings').select('*').eq('user_id', ownerId).maybeSingle()
      .then(({ data, error: ownerError }) => {
        if (cancelled) return;
        if (ownerError) console.error('owner settings load error', ownerError);
        // `data` is also null when RLS blocks the row (not just when it
        // genuinely doesn't exist) — PostgREST can't distinguish the two.
        // Falling back to null here (not DEFAULT_SETTINGS) lets displaySettings
        // fall through to the viewer's own accountSettings in either case,
        // instead of silently showing fabricated numbers no one actually has.
        setOwnerSettings(!ownerError && data ? settingsFromRow(data) : null);
        setOwnerSettingsOwnerId(ownerId);
      })
      .catch((err) => { if (!cancelled) { console.error('owner settings load error', err); setOwnerSettingsOwnerId(ownerId); } });
    return () => { cancelled = true; };
  }, [readOnly, ownerId]);

  // Guarding on `ownerSettingsOwnerId === ownerId` (not just truthy
  // `ownerSettings`) means that when `ownerId` changes to a different owner,
  // the still-in-flight fetch's stale result from the *previous* owner can
  // never be shown against the new owner's items — this falls through to
  // the viewer's own accountSettings (same fallback as the RLS-blocked case
  // above) until the new owner's settings actually land.
  const displaySettings = readOnly && ownerSettings && ownerSettingsOwnerId === ownerId
    ? ownerSettings
    : accountSettings;

  // ── Helpers ──────────────────────────────────────────────────────────────
  const saveItem = useCallback(async (item, targetListId = listId) => {
    if (!user || !targetListId) return;
    try {
      setError(null);
      const { error: saveError } = await supabase.from('items').upsert(itemToRow(item, user.id, targetListId));
      if (saveError) throw saveError;
    } catch (e) {
      console.error('saveItem error', e);
      setError('Could not save. Check your connection.');
    }
  }, [user, listId]);

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

  // ── Public API ───────────────────────────────────────────────────────────
  // Wrapped in useCallback (not just for its own sake, but because these
  // are handed straight to ItemCard/HistoryItem as onDecide/onRemove/onEdit
  // — those are wrapped in React.memo, and a memo is only as good as the
  // stability of the props it's comparing. A fresh closure here on every
  // render would make every card re-render every time regardless.
  const addItem = useCallback((item) => {
    const newItem = {
      id: crypto.randomUUID(),
      listId,
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
      targetDate: item.targetDate || null,
    };
    setItems(prev => [...prev, newItem]);
    saveItem(newItem);
    return newItem.id;
  }, [listId, saveItem]);

  const editItem = useCallback((id, updates) => {
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
      targetDate: updates.targetDate !== undefined ? (updates.targetDate || null) : existing.targetDate,
      status: updates.status ?? existing.status,
      decidedAt: updates.status === 'waiting' ? null : existing.decidedAt,
      hourlyRateAtDecision: updates.status === 'waiting' ? null : existing.hourlyRateAtDecision,
    };
    setItems(prev => prev.map(i => i.id === id ? updated : i));
    // `items` now spans every list this account owns (history is
    // account-wide) — save back to the item's own list, not whichever list
    // happens to be active right now.
    saveItem(updated, existing.listId);
  }, [items, saveItem]);

  const decide = useCallback((id, status) => {
    const existing = items.find(i => i.id === id);
    if (!existing) return;
    const updated = { ...existing, status, decidedAt: Date.now(), hourlyRateAtDecision: accountSettings.hourlyRate };
    setItems(prev => prev.map(i => i.id === id ? updated : i));
    saveItem(updated, existing.listId);
  }, [items, accountSettings, saveItem]);

  const removeItem = useCallback((id) => {
    const index = items.findIndex(i => i.id === id);
    if (index === -1) return null;
    const removed = items[index];
    setItems(prev => prev.filter(i => i.id !== id));
    deleteItem(id);
    // `removed.listId`, not this hook's own `listId` — `items` spans every
    // list this account owns (history is account-wide), so the item being
    // removed isn't necessarily on the currently active list.
    return { item: removed, index, listId: removed.listId };
  }, [items, deleteItem]);

  // `originalListId` is the list the item was removed *from*, which may
  // differ from whichever list is active by the time Undo is clicked — the
  // item must be saved back to where it actually came from, not wherever is
  // currently active. `items` spans every list this account owns, so it's
  // always added back to local state regardless of which list is active.
  const restoreItem = useCallback(({ item, listId: originalListId }) => {
    const targetListId = originalListId ?? listId;
    setItems(prev => [...prev, item]);
    saveItem(item, targetListId);
  }, [listId, saveItem]);

  // Rewrites every item's price/savedAmount/hourlyRateAtDecision from one
  // currency to another — called when the account's currency preference
  // changes (see App.jsx). `readOnly` short-circuits this instead of
  // relying on `items` being scoped to this account's own lists (it no
  // longer is — see the load effect) — a friend's shared list currently
  // active must never have its items rewritten by this account.
  const convertItemsCurrency = useCallback((fromCode, toCode) => {
    if (readOnly) return;
    const nextItems = items.map(item => ({
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
    // `items` spans every list this account owns — save each item back to
    // its own list, not whichever list happens to be active right now.
    nextItems.forEach(item => saveItem(item, item.listId));
  }, [readOnly, items, exchangeRates, saveItem]);

  const exportData = useCallback(
    () => JSON.stringify({ items, settings: accountSettings, exportedAt: Date.now() }, null, 2),
    [items, accountSettings]
  );

  const importData = useCallback((parsed) => {
    if (!parsed || !Array.isArray(parsed.items)) return false;
    // Default to the active list for an import with no `listId` on its
    // items (an older export predating multi-list support, or a hand-edited
    // file) — a re-import of this account's own export already carries its
    // items' real listId and lands back on the lists they came from.
    const imported = parsed.items.map(item => ({ listId, ...item }));
    // `items` spans every list this account owns — merge rather than
    // replace, so importing doesn't make every other list's items locally
    // disappear until the next reload brings them back.
    const importedIds = new Set(imported.map(i => i.id));
    setItems(prev => [...prev.filter(i => !importedIds.has(i.id)), ...imported]);
    imported.forEach(item => saveItem(item, item.listId));
    if (parsed.settings && typeof parsed.settings === 'object') {
      onImportSettings({ ...DEFAULT_SETTINGS, ...parsed.settings });
    }
    return true;
  }, [listId, saveItem, onImportSettings]);

  // Guarding on `friendItemsListId === listId` (not just truthy
  // `friendItems`) means that when `listId` changes to a different friend's
  // list, the still-in-flight (or not-yet-started) fetch's stale result
  // from the *previous* friend's list can never be shown against the new
  // one for even a single render — same reasoning as `ownerSettingsOwnerId`
  // above.
  const friendItemsReady = friendItemsListId === listId;

  // `waiting` is a per-list wishlist — this account's own active list, or
  // (read-only) a friend's shared one. `history` never is: it's always this
  // account's own decisions, from `items` alone, regardless of which list —
  // yours or a friend's — happens to be active.
  const waiting = readOnly
    ? (friendItemsReady ? friendItems.filter(i => i.status === 'waiting') : [])
    : items.filter(i => i.status === 'waiting' && i.listId === listId);
  const history = items.filter(i => i.status !== 'waiting');

  return {
    waiting, history,
    displaySettings,
    addItem, editItem, decide, removeItem, restoreItem,
    convertItemsCurrency,
    exportData, importData,
    // `loading` reflects whichever source `waiting` above draws from,
    // since that's what gates the Waiting page. `historyLoading` is always
    // this account's own load, for the (never read-only) History page.
    loading: readOnly ? (friendLoading || !friendItemsReady) : loading,
    historyLoading: loading,
    error, clearError: () => setError(null),
  };
}
