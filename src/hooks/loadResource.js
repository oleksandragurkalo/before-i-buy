// Every data-loading hook in this app (useItems, useLists, useFriends,
// useProfile, useSettings) reimplemented the same skeleton by hand: run an
// async load inside a useEffect, guard against a stale response landing
// after a newer one (via a `cancelled` flag), and make sure a genuine
// promise rejection (a network-level failure, not a Postgrest {error})
// still resolves `loading` and surfaces something — instead of hanging the
// hook in `loading: true` forever with no trace. That last part was a real
// bug in useItems.js at one point; this is that fix, extracted once instead
// of copy-pasted per hook.
//
// This is a plain function, not a hook — each caller still owns its own
// useState/useEffect (the actual queries, seeding, and realtime
// subscriptions differ too much per resource to share a single generic
// data-fetching hook without forcing an awkward one-size-fits-all shape).
// `task` is the resource-specific fetch/subscribe logic; `isCancelled` must
// reflect the same `cancelled` flag the caller's effect cleanup sets.
export async function loadResource(task, { setLoading, setError, errorMessage, isCancelled }) {
  try {
    await task();
  } catch (err) {
    console.error('resource load error', err);
    if (!isCancelled()) {
      setError(errorMessage);
      setLoading(false);
    }
  }
}
