import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

function profileFromRow(row) {
  return { userId: row.user_id, username: row.username, displayName: row.display_name };
}

// Shared by useFriends.js and useLists.js — both need to turn a batch of
// auth user ids into display usernames (friend-request rows, shared-list
// owners), and there's no direct FK PostgREST can embed across for either.
export async function fetchProfilesByUserIds(userIds) {
  if (userIds.length === 0) return new Map();
  const { data, error } = await supabase.from('profiles').select('user_id, username, display_name').in('user_id', userIds);
  if (error) { console.error('profiles lookup error', error); return new Map(); }
  return new Map(data.map(p => [p.user_id, { username: p.username, displayName: p.display_name }]));
}

// Postgres error codes: 23505 = unique_violation, 23514 = check_violation.
function friendlyProfileError(error) {
  if (error.code === '23505') return 'That username is taken.';
  if (error.code === '23514') return 'Usernames must be 3-20 characters: letters, numbers, underscores only.';
  console.error('profile save error', error);
  return 'Could not save your username. Check your connection.';
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  // Distinct from "no profile row exists" — a fetch failure must never be
  // treated the same way, or a transient network/DB error sends an existing
  // user back through the "pick a username" gate, and resubmitting their
  // real username then fails on the user_id unique constraint (not the
  // username one), surfacing a confusing "That username is taken."
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (!user) { setProfile(null); setLoading(false); setLoadFailed(false); return; }

    let cancelled = false;
    setLoading(true);
    setLoadFailed(false);
    supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error('profile load error', error);
          setLoadFailed(true);
          setLoading(false);
          return;
        }

        const loaded = data ? profileFromRow(data) : null;
        setProfile(loaded);
        setLoading(false);

        // Self-healing backfill: accounts that set their name before
        // display_name existed as a synced field (i.e. everyone, before
        // this shipped) would otherwise never get it populated — nothing
        // else ever revisits an unedited name, so friend search-by-name
        // would silently find no one. Runs quietly on every load where the
        // two are out of sync, no user action required.
        const authName = (user.user_metadata?.full_name || '').trim() || null;
        if (loaded && authName && loaded.displayName !== authName) {
          supabase.from('profiles').update({ display_name: authName }).eq('user_id', user.id)
            .then(({ error: syncError }) => {
              if (cancelled) return;
              if (syncError) { console.error('display_name backfill error', syncError); return; }
              setProfile(prev => prev ? { ...prev, displayName: authName } : prev);
            });
        }
      })
      .catch((err) => {
        // A genuine rejection (not a returned {error}) would otherwise
        // leave loading stuck true forever — and since App.jsx blocks its
        // entire render on profileLoading, that freezes the whole app on
        // the loading screen for this user, not just this hook.
        if (cancelled) return;
        console.error('profile load error', err);
        setLoadFailed(true);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [user]);

  const createProfile = useCallback(async (username, displayName) => {
    if (!user) return { error: 'Not signed in.' };
    // Seed from the signup name when the caller doesn't pass one explicitly,
    // so a profile has a searchable display name from the moment it exists.
    const resolvedDisplayName = displayName !== undefined ? displayName : user.user_metadata?.full_name;
    const { data, error } = await supabase
      .from('profiles')
      .insert({ user_id: user.id, username, display_name: resolvedDisplayName || null })
      .select()
      .single();
    if (error) return { error: friendlyProfileError(error) };
    setProfile(profileFromRow(data));
    return { error: null };
  }, [user]);

  const updateProfile = useCallback(async (username, displayName) => {
    if (!user) return { error: 'Not signed in.' };
    const updates = { username };
    if (displayName !== undefined) updates.display_name = displayName || null;
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', user.id)
      .select()
      .single();
    if (error) return { error: friendlyProfileError(error) };
    setProfile(profileFromRow(data));
    return { error: null };
  }, [user]);

  return {
    profile,
    loading,
    // Only true once the initial load has actually resolved and come back
    // empty — avoids a flash of the gate while the profile is still loading.
    // Also requires the load to have actually succeeded — a failed fetch
    // is not evidence the profile doesn't exist.
    needsUsername: !loading && !!user && !profile && !loadFailed,
    createProfile,
    updateProfile,
  };
}
