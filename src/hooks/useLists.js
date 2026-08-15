import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { fetchProfilesByUserIds } from './useProfile';

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

export function useLists() {
  const { user } = useAuth();
  const [lists, setLists] = useState([]);
  const [sharedLists, setSharedLists] = useState([]);
  const [currentListId, setCurrentListIdState] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLists([]); setSharedLists([]); setCurrentListIdState(null); setLoading(false); return; }

    let cancelled = false;
    let channel = null;
    setLoading(true);

    // A realtime list_shares event can fire again before the previous
    // reload resolves — without this, a slower earlier call can resolve
    // after a faster later one and overwrite fresher state with a stale
    // snapshot.
    let latestSharedLoadId = 0;
    const reloadSharedLists = async () => {
      const loadId = ++latestSharedLoadId;
      const shared = await loadSharedLists(user.id);
      if (cancelled || loadId !== latestSharedLoadId) return;
      setSharedLists(shared);
    };

    (async () => {
      try {
        const { data, error } = await supabase.from('lists').select('*').eq('user_id', user.id).order('created_at');
        if (cancelled) return;
        if (error) { console.error('lists load error', error); setLoading(false); return; }

        let rows = data;
        if (rows.length === 0) {
          // Shouldn't happen for any account that existed before this feature
          // shipped (the 0003 migration backfills a default list for those) —
          // this only seeds a fresh one for a brand-new signup afterward.
          const seeded = {
            user_id: user.id,
            name: autoListName(user.user_metadata?.full_name),
            is_default: true,
          };
          const { data: created, error: seedError } = await supabase.from('lists').insert(seeded).select().single();
          if (cancelled) return;
          if (seedError) { console.error('seed list error', seedError); setLoading(false); return; }
          rows = [created];
        }

        const mapped = rows.map(listFromRow);
        setLists(mapped);
        await reloadSharedLists();
        if (cancelled) return;

        const savedId = localStorage.getItem(currentListStorageKey(user.id));
        const initial = mapped.find(l => l.id === savedId) || mapped.find(l => l.isDefault) || mapped[0];
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
      } catch (err) {
        console.error('lists load error', err);
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [user]);

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

  // If the account's display name changes and the default list's name still
  // matches the auto-generated pattern from the *old* name (i.e. it was
  // never manually renamed), carry the rename forward. A default list
  // that's since been customized to something else is left untouched.
  // Mirrors the same sync useItems.js used to do for settings.listName.
  const listsRef = useRef(lists);
  listsRef.current = lists;
  const renameListRef = useRef(renameList);
  renameListRef.current = renameList;
  const syncBaselineRef = useRef({ userId: null, name: undefined, ready: false });

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
    const defaultList = listsRef.current.find(l => l.isDefault);
    if (!defaultList || defaultList.name !== autoListName(prevName)) return;

    renameListRef.current(defaultList.id, autoListName(name));
  }, [user, loading]);

  const currentList = lists.find(l => l.id === currentListId)
    ? { ...lists.find(l => l.id === currentListId), isOwner: true }
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
  };
}
