import { Check } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useShareToggles } from '../../hooks/useShareToggles';
import { Modal, NESTED_MODAL_Z_INDEX } from '../Modal/Modal';
import { Button } from '../Button/Button';
import styles from './ListSwitcher.module.css';

export function ShareListModal({ list, friends, onShare, onUnshare, onClose }) {
  const { sharedIds: sharedWith, loadError, pending, error, toggle } = useShareToggles({
    dep: list.id,
    loadSharedIds: async () => {
      const { data, error: fetchError } = await supabase
        .from('list_shares').select('shared_with_user_id').eq('list_id', list.id);
      if (fetchError) throw fetchError;
      return new Set(data.map(r => r.shared_with_user_id));
    },
    toggleAction: (friendUserId, isShared) =>
      isShared ? onUnshare(list.id, friendUserId) : onShare(list.id, friendUserId),
  });

  return (
    <Modal title={`Share "${list.name}"`} onClose={onClose} zIndex={NESTED_MODAL_Z_INDEX}>
      <div className={styles.deleteBody}>
        <p className={styles.deleteWarning}>
          Friends you share this list with can view its items — they can't edit or decide on them.
        </p>

        {friends.length === 0 && (
          <p className={styles.muted}>Add some friends first, then come back here to share this list.</p>
        )}

        {friends.length > 0 && sharedWith === null && !loadError && (
          <p className={styles.muted}>Checking who this is already shared with…</p>
        )}

        {loadError && (
          <p className={styles.error}>Couldn't load sharing status. Close and reopen this dialog to try again.</p>
        )}

        {sharedWith && friends.map(friend => {
          const isShared = sharedWith.has(friend.userId);
          const isPending = pending === friend.userId;
          return (
            <div key={friend.userId} className={styles.row}>
              <span className={styles.username}>@{friend.username}</span>
              <Button
                variant={isShared ? 'secondary' : 'primary'}
                disabled={isPending}
                onClick={() => toggle(friend.userId, isShared)}
                aria-label={isShared ? `Unshare with @${friend.username}` : `Share with @${friend.username}`}
              >
                {isShared && !isPending && <Check size={13} />}
                {isPending ? (isShared ? 'Unsharing…' : 'Sharing…') : (isShared ? 'Shared' : 'Share')}
              </Button>
            </div>
          );
        })}

        {error && <p className={styles.error}>{error}</p>}
      </div>
    </Modal>
  );
}
