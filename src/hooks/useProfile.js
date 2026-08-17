import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { loadResource } from './loadResource';

function profileFromRow(row) {
  return { userId: row.user_id, username: row.username };
}

// Shared by useFriends.js and useLists.js — both need to turn a batch of
// auth user ids into display usernames (friend-request rows, shared-list
// owners), and there's no direct FK PostgREST can embed across for either.
export async function fetchProfilesByUserIds(userIds) {
  if (userIds.length === 0) return new Map();
  const { data, error } = await supabase.from('profiles').select('user_id, username').in('user_id', userIds);
  if (error) { console.error('profiles lookup error', error); return new Map(); }
  return new Map(data.map(p => [p.user_id, { username: p.username }]));
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
  //
  // A boolean here, not a message string like useLists/useFriends'
  // `loadError` — deliberately not part of that convention, and not wired
  // into App.jsx's global Toast chain either. Profile load failure is a
  // blocking-gate condition (App.jsx returns a dedicated
  // ProfileLoadErrorScreen with its own Retry button before anything else
  // in the app renders), not a background load a toast can just sit on top
  // of — createProfile/updateProfile below, on the other hand, *do* follow
  // the usual inline-`{error}` convention (ChooseUsernameScreen and
  // AccountSettingsModal both await them and show the message right there).
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!user) { setProfile(null); setLoading(false); setLoadFailed(false); return; }

    let cancelled = false;
    setLoading(true);
    setLoadFailed(false);

    loadResource(async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
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
    }, {
      setLoading,
      // A genuine rejection (not a returned {error}) would otherwise leave
      // loading stuck true forever — and since App.jsx blocks its entire
      // render on profileLoading, that freezes the whole app on the loading
      // screen for this user, not just this hook. loadFailed is a boolean
      // here (not a message string like the other hooks' error state), so
      // the errorMessage argument is unused — setError just flips it.
      setError: () => setLoadFailed(true),
      errorMessage: null,
      isCancelled: () => cancelled,
    });

    return () => { cancelled = true; };
  }, [user, reloadKey]);

  const retryProfile = useCallback(() => setReloadKey(k => k + 1), []);

  const createProfile = useCallback(async (username) => {
    if (!user) return { error: 'Not signed in.' };
    const { data, error } = await supabase
      .from('profiles')
      .insert({ user_id: user.id, username })
      .select()
      .single();
    if (error) return { error: friendlyProfileError(error) };
    setProfile(profileFromRow(data));
    return { error: null };
  }, [user]);

  const updateProfile = useCallback(async (username) => {
    if (!user) return { error: 'Not signed in.' };
    const { data, error } = await supabase
      .from('profiles')
      .update({ username })
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
    loadFailed,
    retryProfile,
    createProfile,
    updateProfile,
  };
}
