import { useState } from 'react';
import { Search, UserPlus, UserX, Check, X, Users, Share2, List } from 'lucide-react';
import { Button } from '../Button/Button';
import { ShareWithFriendModal } from './ShareWithFriendModal';
import { RemoveFriendModal } from './RemoveFriendModal';
import formStyles from '../../styles/form.module.css';
import styles from './FriendsPage.module.css';

function statusFor(userId, { friends, outgoingRequests, incomingRequests }) {
  if (friends.some(f => f.userId === userId)) return 'friends';
  if (outgoingRequests.some(r => r.userId === userId)) return 'outgoing';
  if (incomingRequests.some(r => r.userId === userId)) return 'incoming';
  return null;
}

export function FriendsPage({
  friends, incomingRequests, outgoingRequests, loading,
  searchUsers, sendRequest, acceptRequest, declineRequest, cancelRequest, removeFriend,
  lists = [], onShare, onUnshare,
  sharedLists = [], onViewList,
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [pendingAction, setPendingAction] = useState(null);
  const [shareTarget, setShareTarget] = useState(null);
  const [removeTarget, setRemoveTarget] = useState(null);

  const runSearch = async (e) => {
    e.preventDefault();
    setError('');
    const trimmed = query.trim();
    if (!trimmed) { setResults(null); return; }
    setSearching(true);
    try {
      const found = await searchUsers(trimmed);
      setResults(found);
    } catch (err) {
      console.error('searchUsers error', err);
      setError('Could not search. Check your connection.');
    } finally {
      setSearching(false);
    }
  };

  const withPending = async (key, action) => {
    setPendingAction(key);
    setError('');
    try {
      const { error: actionError } = await action();
      if (actionError) setError(actionError);
    } catch (err) {
      console.error('friend action error', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <section className={styles.section} aria-label="Friends">
      <form className={styles.searchRow} onSubmit={runSearch}>
        <div className={styles.searchInputWrap}>
          <Search size={14} className={styles.searchIcon} aria-hidden="true" />
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Search by username or name"
            aria-label="Search by username or name"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoComplete="off"
            maxLength={20}
          />
        </div>
        <Button type="submit" disabled={searching}>{searching ? 'Searching…' : 'Search'}</Button>
      </form>

      {error && <p className={formStyles.errorBanner}>{error}</p>}

      {results && (
        <div className={styles.card}>
          <p className={styles.cardTitle}>Results</p>
          {results.length === 0 && <p className={styles.muted}>No one found with that username or name.</p>}
          {results.map(person => {
            const status = statusFor(person.userId, { friends, outgoingRequests, incomingRequests });
            const key = `send-${person.userId}`;
            return (
              <div key={person.userId} className={styles.row}>
                <span className={styles.username}>@{person.username}</span>
                {status === 'friends' && <span className={styles.badge}>Friends</span>}
                {status === 'outgoing' && <span className={styles.badge}>Requested</span>}
                {status === 'incoming' && <span className={styles.badge}>Wants to be friends</span>}
                {status === null && (
                  <Button
                    icon={<UserPlus size={13} />}
                    disabled={pendingAction === key}
                    onClick={() => withPending(key, () => sendRequest(person.userId))}
                  >
                    Add
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {(incomingRequests.length > 0 || outgoingRequests.length > 0) && (
        <div className={styles.card}>
          <p className={styles.cardTitle}>Requests</p>
          {incomingRequests.map(req => {
            const acceptKey = `accept-${req.requestId}`;
            const declineKey = `decline-${req.requestId}`;
            return (
              <div key={req.requestId} className={styles.row}>
                <span className={styles.username}>@{req.username}</span>
                <div className={styles.rowActions}>
                  <Button
                    variant="icon"
                    disabled={pendingAction === acceptKey}
                    onClick={() => withPending(acceptKey, () => acceptRequest(req.requestId))}
                    aria-label={`Accept ${req.username}`}
                  >
                    <Check size={14} />
                  </Button>
                  <Button
                    variant="icon"
                    tone="danger"
                    disabled={pendingAction === declineKey}
                    onClick={() => withPending(declineKey, () => declineRequest(req.requestId))}
                    aria-label={`Decline ${req.username}`}
                  >
                    <X size={14} />
                  </Button>
                </div>
              </div>
            );
          })}
          {outgoingRequests.map(req => {
            const cancelKey = `cancel-${req.requestId}`;
            return (
              <div key={req.requestId} className={styles.row}>
                <span className={styles.username}>@{req.username}</span>
                <div className={styles.rowActions}>
                  <span className={styles.badge}>Pending</span>
                  <Button
                    variant="text"
                    disabled={pendingAction === cancelKey}
                    onClick={() => withPending(cancelKey, () => cancelRequest(req.requestId))}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className={styles.card}>
        <p className={styles.cardTitle}>Friends</p>
        {!loading && friends.length === 0 && (
          <div className={styles.emptyState}>
            <Users size={28} className={styles.emptyIcon} aria-hidden="true" />
            <p className={styles.emptyTitle}>No friends yet</p>
            <p className={styles.muted}>Search for a username above to send a friend request.</p>
          </div>
        )}
        {friends.map(friend => {
          const friendLists = sharedLists.filter(l => l.ownerUserId === friend.userId);
          return (
            <div key={friend.userId} className={styles.row}>
              <div className={styles.friendIdentity}>
                <span className={styles.username}>@{friend.username}</span>
                {friendLists.map(list => (
                  <button
                    key={list.id}
                    type="button"
                    className={styles.listLink}
                    onClick={() => onViewList(list.id)}
                  >
                    <List size={11} aria-hidden="true" className={styles.listLinkIcon} />
                    <span className={styles.listLinkText}>{list.name}</span>
                  </button>
                ))}
              </div>
              <div className={styles.rowActions}>
                <Button
                  variant="text"
                  icon={<Share2 size={13} />}
                  onClick={() => setShareTarget(friend)}
                >
                  Share a list
                </Button>
                <Button
                  variant="icon"
                  tone="danger"
                  onClick={() => setRemoveTarget(friend)}
                  aria-label={`Remove ${friend.username}`}
                >
                  <UserX size={13} />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {shareTarget && (
        <ShareWithFriendModal
          friend={shareTarget}
          lists={lists}
          onShare={onShare}
          onUnshare={onUnshare}
          onClose={() => setShareTarget(null)}
        />
      )}

      {removeTarget && (
        <RemoveFriendModal
          friend={removeTarget}
          onConfirm={removeFriend}
          onClose={() => setRemoveTarget(null)}
        />
      )}
    </section>
  );
}
