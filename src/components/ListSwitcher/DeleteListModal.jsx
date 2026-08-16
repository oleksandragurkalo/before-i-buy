import { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { Modal, NESTED_MODAL_Z_INDEX } from '../Modal/Modal';
import { Button } from '../Button/Button';
import styles from './ListSwitcher.module.css';

export function DeleteListModal({ list, onConfirm, onClose }) {
  const [count, setCount] = useState(null);
  const [countError, setCountError] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    supabase.from('items').select('id', { count: 'exact', head: true }).eq('list_id', list.id)
      .then(({ count: itemCount, error: loadError }) => {
        if (cancelled) return;
        // Don't default a failed count to 0 — that would tell the user this
        // list is empty right before an irreversible delete when we simply
        // don't know either way.
        if (loadError) { console.error('item count load error', loadError); setCountError(true); return; }
        setCount(itemCount ?? 0);
      });
    return () => { cancelled = true; };
  }, [list.id]);

  const handleDelete = async () => {
    setDeleting(true);
    setError('');
    const { error: deleteError } = await onConfirm(list.id);
    setDeleting(false);
    if (deleteError) { setError(deleteError); return; }
    onClose();
  };

  return (
    <Modal title={`Delete "${list.name}"?`} onClose={onClose} zIndex={NESTED_MODAL_Z_INDEX}>
      <div className={styles.deleteBody}>
        <p className={styles.deleteWarning}>
          {countError
            ? "Couldn't check how many items are on this list, but deleting it will remove them all. This can't be undone."
            : count === null
              ? 'Checking how many items are on this list…'
              : count === 0
                ? "This list is empty. This can't be undone."
                : `This permanently deletes ${count} item${count === 1 ? '' : 's'} on this list. This can't be undone.`}
        </p>
        {error && <p className={styles.error}>{error}</p>}
        <Button variant="danger" onClick={handleDelete} disabled={(count === null && !countError) || deleting} fullWidth>
          {deleting ? 'Deleting…' : 'Delete list'}
        </Button>
      </div>
    </Modal>
  );
}
