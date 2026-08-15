import { Check } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useShareToggles } from '../../hooks/useShareToggles';
import { Modal } from '../Modal/Modal';
import { Button } from '../Button/Button';
import styles from '../ListSwitcher/ListSwitcher.module.css';

export function ShareWithFriendModal({ friend, lists, onShare, onUnshare, onClose }) {
  const { sharedIds: sharedListIds, loadError, pending, error, toggle } = useShareToggles({
    dep: friend.userId,
    loadSharedIds: async () => {
      const { data, error: fetchError } = await supabase
        .from('list_shares').select('list_id').eq('shared_with_user_id', friend.userId);
      if (fetchError) throw fetchError;
      return new Set(data.map(r => r.list_id));
    },
    toggleAction: (listId, isShared) =>
      isShared ? onUnshare(listId, friend.userId) : onShare(listId, friend.userId),
  });

  return (
    <Modal title={`Share a list with @${friend.username}`} onClose={onClose} zIndex={300}>
      <div className={styles.deleteBody}>
        <p className={styles.deleteWarning}>
          They'll be able to view the list's items — they can't edit or decide on them.
        </p>

        {lists.length === 0 && (
          <p className={styles.muted}>Create a list first, then come back here to share it.</p>
        )}

        {lists.length > 0 && sharedListIds === null && !loadError && (
          <p className={styles.muted}>Checking which lists are already shared…</p>
        )}

        {loadError && (
          <p className={styles.error}>Couldn't load sharing status. Close and reopen this dialog to try again.</p>
        )}

        {sharedListIds && lists.map(list => {
          const isShared = sharedListIds.has(list.id);
          const isPending = pending === list.id;
          return (
            <div key={list.id} className={styles.row}>
              <span className={styles.username}>{list.name}</span>
              <Button
                variant={isShared ? 'secondary' : 'primary'}
                disabled={isPending}
                onClick={() => toggle(list.id, isShared)}
                aria-label={isShared ? `Unshare "${list.name}"` : `Share "${list.name}"`}
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
