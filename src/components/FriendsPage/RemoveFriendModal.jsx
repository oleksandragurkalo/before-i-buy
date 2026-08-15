import { useState } from 'react';
import { Modal } from '../Modal/Modal';
import { Button } from '../Button/Button';
import styles from '../ListSwitcher/ListSwitcher.module.css';

export function RemoveFriendModal({ friend, onConfirm, onClose }) {
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState('');

  const handleRemove = async () => {
    setRemoving(true);
    setError('');
    const { error: removeError } = await onConfirm(friend.requestId);
    setRemoving(false);
    if (removeError) { setError(removeError); return; }
    onClose();
  };

  return (
    <Modal title={`Remove @${friend.username}?`} onClose={onClose} zIndex={300}>
      <div className={styles.deleteBody}>
        <p className={styles.deleteWarning}>
          You'll stop being friends. They'll need to send a new friend request if you want to reconnect later.
        </p>
        {error && <p className={styles.error}>{error}</p>}
        <Button variant="danger" onClick={handleRemove} disabled={removing} fullWidth>
          {removing ? 'Removing…' : 'Remove friend'}
        </Button>
      </div>
    </Modal>
  );
}
