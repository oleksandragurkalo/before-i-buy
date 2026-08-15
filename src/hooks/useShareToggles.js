import { useEffect, useState } from 'react';

// Shared by ShareListModal (anchored to a list, toggling friends) and
// ShareWithFriendModal (anchored to a friend, toggling lists) — both are
// the same load/toggle/error state machine over list_shares, just keyed by
// a different column, so keeping the logic in one place avoids the two
// drifting out of sync with each other over time.
export function useShareToggles({ dep, loadSharedIds, toggleAction }) {
  const [sharedIds, setSharedIds] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [pending, setPending] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setSharedIds(null);
    setLoadError(false);
    loadSharedIds()
      .then((ids) => { if (!cancelled) setSharedIds(ids); })
      .catch((err) => {
        // Don't default to an empty set on failure — that would render
        // everything as "not shared" even when some genuinely are,
        // inviting a duplicate-share attempt with a misleading error.
        if (cancelled) return;
        console.error('shares load error', err);
        setLoadError(true);
      });
    return () => { cancelled = true; };
    // Intentionally keyed by `dep` alone — loadSharedIds/toggleAction are
    // fresh closures every render but only need to re-run when the anchor
    // (list or friend) actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dep]);

  const toggle = async (otherId, isShared) => {
    setPending(otherId);
    setError('');
    try {
      const { error: actionError } = await toggleAction(otherId, isShared);
      if (actionError) {
        setError(actionError);
      } else {
        setSharedIds(prev => {
          const next = new Set(prev);
          if (isShared) next.delete(otherId); else next.add(otherId);
          return next;
        });
      }
    } catch (err) {
      console.error('toggle share error', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setPending(null);
    }
  };

  return { sharedIds, loadError, pending, error, toggle };
}
