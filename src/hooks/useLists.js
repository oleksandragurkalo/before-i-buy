import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { fetchProfilesByUserIds } from './useProfile';
import { loadResource } from './loadResource';

function listFromRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    isDefault: row.is_default,
    createdAt: row.created_at,
    // 'private' | 'public' — purely a UI label kept in sync as shares are
    // added/removed (see shareList/unshareList below); actual read access
    // is still governed entirely by the list_shares rows + RLS, not this
    // flag. See supabase/migrations/0007_list_visibility.sql.
    visibility: row.visibility ?? 'private',
  };
}

async function loadSharedLists(userId) {
  const { data, error } = await supabase
    .from('list_shares')
    .select('list_id, lists(id, name, user_id)')
    .eq('shared_with_user_id', userId);
  if (error) { console.error('shared lists load error', error); return []; }

  // A share row can outlive visibility into its list (e.g. a race right
  // after the owner deletes the list, cascade not yet applied) — guard
  // rather than crash on the embed coming back null.
  const rows = data.filter(r => r.lists);
  const ownerIds = [...new Set(rows.map(r => r.lists.user_id))];
  const profiles = await fetchProfilesByUserIds(ownerIds);

  return rows.map(r => ({
    id: r.lists.id,
    name: r.lists.name,
    ownerUserId: r.lists.user_id,
    ownerUsername: profiles.get(r.lists.user_id)?.username ?? 'unknown',
    isOwner: false,
  }));
}

function currentListStorageKey(userId) {
  return `bib-current-list-${userId}`;
}

function autoListName(name) {
  return name ? `${name}'s Waiting List` : 'Waiting List';
}

// Folds a Realtime postgres_changes payload into the current lists array,
// mirroring the pattern useItems.js already uses for the items table.
function applyListChange(prev, payload) {
  if (payload.eventType === 'DELETE') {
    return prev.filter(l => l.id !== payload.old.id);
  }
  const next = listFromRow(payload.new);
  const idx = prev.findIndex(l => l.id === next.id);
  if (idx === -1) return [...prev, next];
  const copy = [...prev];
  copy[idx] = next;
  return copy;
}

export function useLists(username) {
  const { user } = useAuth();
  const [lists, setLists] = useState([]);
  const [sharedLists, setSharedLists] = useState([]);
  const [currentListId, setCurrentListIdState] = useState(null);
  const [loading, setLoading] = useState(true);
  // Only the *initial load* surfaces here (and via App.jsx's global Toast)
  // — deliberately not the actions below (createList/renameList/deleteList/
  // shareList/unshareList). Those are all awaited by whichever dialog
  // triggers them (ListSwitcher, ShareListModal, ...), which stays open
  // long enough to show the returned `{error}` right next to the field the
  // user was using — a global toast at the bottom of the screen would be
  // strictly worse feedback for a rename/create/share failure than the
  // inline message already sitting right there. useFriends.js follows the
  // same split, for the same reason.
  const [loadError, setLoadError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!user) { setLists([]); setSharedLists([]); setCurrentListIdState(null); setLoading(false); setLoadError(null); return; }

    let cancelled = false;
    let channel = null;
    setLoading(true);
    setLoadError(null);

    // A realtime list_shares event can fire again before the previous
    // reload resolves — without this, a slower earlier call can resolve
    // after a faster later one and overwrite fresher state with a stale
    // snapshot.
    let latestSharedLoadId = 0;
    const reloadSharedLists = async () => {
      const loadId = ++latestSharedLoadId;
      const shared = await loadSharedLists(user.id);
      if (cancelled || loadId !== latestSharedLoadId) return shared;
      setSharedLists(shared);
      return shared;
    };

    loadResource(async () => {
      // Neither query depends on the other's result (both only need
      // `user.id`) — running them together instead of one-after-the-other
      // saves a full network round-trip on every load.
      const [{ data, error }, shared] = await Promise.all([
        supabase.from('lists').select('*').eq('user_id', user.id).order('created_at'),
        reloadSharedLists(),
      ]);
      if (cancelled) return;
      if (error) {
        console.error('lists load error', error);
        setLoadError('Could not load your lists. Check your connection.');
        setLoading(false);
        return;
      }

      let rows = data;
      if (rows.length === 0) {
        // Shouldn't happen for any account that existed before this feature
        // shipped (the 0003 migration backfills a default list for those) —
        // this only seeds a fresh one for a brand-new signup afterward.
        const seeded = {
          user_id: user.id,
          name: autoListName(username),
          is_default: true,
        };
        const { data: created, error: seedError } = await supabase.from('lists').insert(seeded).select().single();
        if (cancelled) return;
        if (seedError) {
          console.error('seed list error', seedError);
          setLoadError('Could not set up your list. Check your connection.');
          setLoading(false);
          return;
        }
        rows = [created];
      }

      const mapped = rows.map(listFromRow);
      setLists(mapped);

      // A saved id may belong to a list shared *with* this user rather
      // than one they own — check both, otherwise reloading while viewing
      // a friend's shared list silently bounces back to your own default.
      const savedId = localStorage.getItem(currentListStorageKey(user.id));
      const initial = mapped.find(l => l.id === savedId) || (shared || []).find(l => l.id === savedId)
        || mapped.find(l => l.isDefault) || mapped[0];
      setCurrentListIdState(initial.id);
      setLoading(false);
      if (cancelled) return;

      channel = supabase
        .channel(`user-lists-${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'lists', filter: `user_id=eq.${user.id}` },
          (payload) => setLists(prev => applyListChange(prev, payload)))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'list_shares', filter: `shared_with_user_id=eq.${user.id}` },
          reloadSharedLists)
        .subscribe();
    }, {
      setLoading, setError: setLoadError,
      errorMessage: 'Could not load your lists. Check your connection.',
      isCancelled: () => cancelled,
    });

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [user, reloadKey]);

  // Lets App.jsx offer a real "Retry" when the initial load (including the
  // zero-lists seed-insert above) fails, instead of only a page reload — see
  // ListsLoadErrorScreen. Mirrors useProfile.js's retryProfile.
  const retryLists = useCallback(() => setReloadKey(k => k + 1), []);

  // The `lists` subscription above is filtered to rows this user owns, so it
  // never sees an owner's edit (e.g. a rename) to a list shared *with* this
  // user — subscribe separately to just those rows, re-subscribing whenever
  // the set of shared list ids changes.
  const sharedListIds = sharedLists.map(l => l.id).join(',');
  useEffect(() => {
    if (!user || !sharedListIds) return;
    const ids = sharedListIds.split(',');
    const channel = supabase
      .channel(`shared-lists-${user.id}-${sharedListIds}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'lists', filter: `id=in.(${ids.join(',')})` },
        (payload) => {
          const next = listFromRow(payload.new);
          setSharedLists(prev => prev.map(l => l.id === next.id ? { ...l, name: next.name } : l));
        })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user, sharedListIds]);

  const setCurrentListId = useCallback((id) => {
    setCurrentListIdState(id);
    if (user) localStorage.setItem(currentListStorageKey(user.id), id);
  }, [user]);

  const createList = useCallback(async (name) => {
    const trimmed = name.trim();
    if (!trimmed || !user) return { error: 'Give the list a name.' };
    const { data, error } = await supabase
      .from('lists')
      .insert({ user_id: user.id, name: trimmed, is_default: false })
      .select()
      .single();
    if (error) { console.error('createList error', error); return { error: 'Could not create the list.' }; }
    const created = listFromRow(data);
    setLists(prev => [...prev, created]);
    setCurrentListId(created.id);
    return { error: null, list: created };
  }, [user, setCurrentListId]);

  const renameList = useCallback(async (id, name) => {
    const trimmed = name.trim();
    if (!trimmed) return { error: null };
    const previous = lists.find(l => l.id === id);
    setLists(prev => prev.map(l => l.id === id ? { ...l, name: trimmed } : l));
    const { error } = await supabase.from('lists').update({ name: trimmed }).eq('id', id);
    if (error) {
      console.error('renameList error', error);
      // Roll back — the UI shouldn't keep showing a name the database
      // rejected until some unrelated change happens to re-sync the row.
      if (previous) setLists(prev => prev.map(l => l.id === id ? { ...l, name: previous.name } : l));
      return { error: 'Could not rename the list.' };
    }
    return { error: null };
  }, [lists]);

  const deleteList = useCallback(async (id) => {
    if (lists.length <= 1) return { error: "You need at least one list — can't delete your last one." };
    const { error } = await supabase.from('lists').delete().eq('id', id);
    if (error) { console.error('deleteList error', error); return { error: 'Could not delete the list.' }; }
    setLists(prev => prev.filter(l => l.id !== id));
    if (currentListId === id) {
      const fallback = lists.find(l => l.id !== id && l.isDefault) || lists.find(l => l.id !== id);
      if (fallback) setCurrentListId(fallback.id);
    }
    return { error: null };
  }, [lists, currentListId, setCurrentListId]);

  // Keeps `lists.visibility` in sync with whether a list actually has any
  // shares — a pure UI label (see listFromRow), not an access-control
  // mechanism, so a failure here is logged but not surfaced as the action's
  // error (the share/unshare itself already succeeded).
  const syncVisibility = useCallback(async (listId, visibility) => {
    setLists(prev => prev.map(l => l.id === listId && l.visibility !== visibility ? { ...l, visibility } : l));
    const { error } = await supabase.from('lists').update({ visibility }).eq('id', listId);
    if (error) console.error('sync list visibility error', error);
  }, []);

  const shareList = useCallback(async (listId, friendUserId) => {
    const { error } = await supabase.from('list_shares').insert({ list_id: listId, shared_with_user_id: friendUserId });
    if (error) {
      console.error('shareList error', error);
      // RLS (list_shares_owner_manage) rejects this insert unless the
      // target is an accepted friend — surface that as the likely cause
      // rather than a generic failure.
      return { error: 'Could not share the list. Make sure you\'re friends with them.' };
    }
    await syncVisibility(listId, 'public');
    return { error: null };
  }, [syncVisibility]);

  const unshareList = useCallback(async (listId, friendUserId) => {
    const { error } = await supabase.from('list_shares').delete().eq('list_id', listId).eq('shared_with_user_id', friendUserId);
    if (error) { console.error('unshareList error', error); return { error: 'Could not unshare the list.' }; }

    const { count, error: countError } = await supabase
      .from('list_shares')
      .select('shared_with_user_id', { count: 'exact', head: true })
      .eq('list_id', listId);
    if (countError) console.error('list_shares count error', countError);
    else if (count === 0) await syncVisibility(listId, 'private');

    return { error: null };
  }, [syncVisibility]);

  // If the account's username changes — including going from none to one,
  // right after ChooseUsernameScreen — and the default list's name still
  // matches the auto-generated pattern from the *old* username (i.e. it was
  // never manually renamed), carry the rename forward. A default list
  // that's since been customized to something else is left untouched.
  const listsRef = useRef(lists);
  listsRef.current = lists;
  const renameListRef = useRef(renameList);
  renameListRef.current = renameList;
  const syncBaselineRef = useRef({ userId: null, name: undefined, ready: false });

  useEffect(() => {
    const name = username;
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
    const defaultList = listsRef.current.find(l => l.isDefault);
    if (!defaultList || defaultList.name !== autoListName(prevName)) return;

    renameListRef.current(defaultList.id, autoListName(name));
  }, [user, loading, username]);

  const ownedCurrentList = lists.find(l => l.id === currentListId);
  const currentList = ownedCurrentList
    ? { ...ownedCurrentList, isOwner: true }
    : sharedLists.find(l => l.id === currentListId) ?? null;

  return {
    lists,
    sharedLists,
    currentListId,
    currentList,
    setCurrentListId,
    createList,
    renameList,
    deleteList,
    shareList,
    unshareList,
    loading,
    loadError,
    clearLoadError: () => setLoadError(null),
    retryLists,
  };
}
