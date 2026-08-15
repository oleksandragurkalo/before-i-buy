import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { fetchProfilesByUserIds } from './useProfile';

function requestFromRow(row) {
  return {
    id: row.id,
    fromUserId: row.from_user_id,
    toUserId: row.to_user_id,
    status: row.status,
    createdAt: row.created_at,
  };
}

export function useFriends() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [profilesById, setProfilesById] = useState(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setRequests([]); setProfilesById(new Map()); setLoading(false); return; }

    let cancelled = false;
    let channel = null;
    // A realtime event can fire again before the previous load() resolves —
    // without this, a slower earlier call can resolve after a faster later
    // one and overwrite fresher state with a stale snapshot.
    let latestLoadId = 0;

    const load = async () => {
      const loadId = ++latestLoadId;
      const { data, error } = await supabase
        .from('friend_requests')
        .select('*')
        .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`);
      if (cancelled || loadId !== latestLoadId) return;
      if (error) { console.error('friend_requests load error', error); return; }

      const rows = data.map(requestFromRow);
      setRequests(rows);

      const otherIds = [...new Set(rows.map(r => r.fromUserId === user.id ? r.toUserId : r.fromUserId))];
      const profiles = await fetchProfilesByUserIds(otherIds);
      if (cancelled || loadId !== latestLoadId) return;
      setProfilesById(profiles);
    };

    setLoading(true);
    (async () => {
      try {
        await load();
      } catch (err) {
        console.error('friend_requests load error', err);
      }
      if (cancelled) return;
      setLoading(false);

      // A row change can involve either side of the friendship, and each
      // change may introduce a not-yet-seen profile — simplest and most
      // reliable is a full reload rather than trying to patch rows +
      // backfill profiles incrementally for a table this small.
      channel = supabase
        .channel(`friend-requests-${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests', filter: `from_user_id=eq.${user.id}` }, load)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests', filter: `to_user_id=eq.${user.id}` }, load)
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [user]);

  const searchUsers = useCallback(async (query) => {
    const trimmed = query.trim();
    if (!trimmed || !user) return [];

    // Two separate ilike queries merged client-side, rather than a single
    // .or() filter — .or()'s filter string is comma/paren-delimited, so a
    // search term containing those characters (plausible for a name search,
    // e.g. "Smith, Jo") would corrupt the query instead of just matching
    // nothing.
    const base = () => supabase.from('profiles').select('user_id, username, display_name').neq('user_id', user.id).limit(20);
    const [byUsername, byName] = await Promise.all([
      base().ilike('username', `%${trimmed}%`),
      base().ilike('display_name', `%${trimmed}%`),
    ]);
    if (byUsername.error) console.error('searchUsers error', byUsername.error);
    if (byName.error) console.error('searchUsers error', byName.error);

    const merged = new Map();
    for (const row of [...(byUsername.data || []), ...(byName.data || [])]) merged.set(row.user_id, row);
    return [...merged.values()]
      .slice(0, 20)
      .map(p => ({ userId: p.user_id, username: p.username, displayName: p.display_name }));
  }, [user]);

  // These mutations also patch `requests` locally instead of waiting on the
  // postgres_changes subscription to round-trip — otherwise the action looks
  // like it did nothing until the realtime event lands, inviting a repeat
  // click that then fails on the unique(from_user_id, to_user_id) index.
  const acceptRequest = useCallback(async (requestId) => {
    const { error } = await supabase
      .from('friend_requests')
      .update({ status: 'accepted', responded_at: new Date().toISOString() })
      .eq('id', requestId);
    if (error) { console.error('acceptRequest error', error); return { error: 'Could not accept request.' }; }
    setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'accepted' } : r));
    return { error: null };
  }, []);

  const declineRequest = useCallback(async (requestId) => {
    const { error } = await supabase
      .from('friend_requests')
      .update({ status: 'declined', responded_at: new Date().toISOString() })
      .eq('id', requestId);
    if (error) { console.error('declineRequest error', error); return { error: 'Could not decline request.' }; }
    setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'declined' } : r));
    return { error: null };
  }, []);

  const cancelRequest = useCallback(async (requestId) => {
    const { error } = await supabase.from('friend_requests').delete().eq('id', requestId);
    if (error) { console.error('cancelRequest error', error); return { error: 'Could not cancel request.' }; }
    setRequests(prev => prev.filter(r => r.id !== requestId));
    return { error: null };
  }, []);

  const removeFriend = useCallback(async (requestId) => {
    const { error } = await supabase.from('friend_requests').delete().eq('id', requestId);
    if (error) { console.error('removeFriend error', error); return { error: 'Could not remove friend.' }; }
    setRequests(prev => prev.filter(r => r.id !== requestId));
    return { error: null };
  }, []);

  const sendRequest = useCallback(async (targetUserId) => {
    if (!user) return { error: 'Not signed in.' };

    const existing = requests.find(r =>
      (r.fromUserId === user.id && r.toUserId === targetUserId) ||
      (r.fromUserId === targetUserId && r.toUserId === user.id));

    if (existing) {
      if (existing.status === 'accepted') return { error: 'Already friends.' };
      if (existing.status === 'declined') {
        // Let a new request supersede a stale declined one instead of
        // getting stuck behind the unique(from_user_id, to_user_id) index.
        const { error: cleanupError } = await supabase.from('friend_requests').delete().eq('id', existing.id);
        if (cleanupError) console.error('sendRequest cleanup error', cleanupError);
        setRequests(prev => prev.filter(r => r.id !== existing.id));
      } else if (existing.fromUserId === targetUserId) {
        // They already sent a pending request the other way — accept it
        // instead of inserting a second row (the unique constraint only
        // catches exact-direction duplicates, not the reverse direction).
        return acceptRequest(existing.id);
      } else {
        return { error: 'Friend request already pending.' };
      }
    }

    const { data, error } = await supabase
      .from('friend_requests')
      .insert({ from_user_id: user.id, to_user_id: targetUserId, status: 'pending' })
      .select()
      .single();
    if (error) { console.error('sendRequest error', error); return { error: 'Could not send friend request.' }; }

    setRequests(prev => [...prev, requestFromRow(data)]);
    if (!profilesById.has(targetUserId)) {
      const profiles = await fetchProfilesByUserIds([targetUserId]);
      setProfilesById(prev => new Map([...prev, ...profiles]));
    }
    return { error: null };
  }, [user, requests, acceptRequest, profilesById]);

  const friends = requests
    .filter(r => r.status === 'accepted')
    .map(r => {
      const otherId = r.fromUserId === user?.id ? r.toUserId : r.fromUserId;
      const profile = profilesById.get(otherId);
      return { requestId: r.id, userId: otherId, username: profile?.username ?? 'unknown', displayName: profile?.displayName ?? null };
    });

  const incomingRequests = requests
    .filter(r => r.status === 'pending' && r.toUserId === user?.id)
    .map(r => ({ requestId: r.id, userId: r.fromUserId, username: profilesById.get(r.fromUserId)?.username ?? 'unknown' }));

  const outgoingRequests = requests
    .filter(r => r.status === 'pending' && r.fromUserId === user?.id)
    .map(r => ({ requestId: r.id, userId: r.toUserId, username: profilesById.get(r.toUserId)?.username ?? 'unknown' }));

  return {
    friends,
    incomingRequests,
    outgoingRequests,
    loading,
    searchUsers,
    sendRequest,
    acceptRequest,
    declineRequest,
    cancelRequest,
    removeFriend,
  };
}
