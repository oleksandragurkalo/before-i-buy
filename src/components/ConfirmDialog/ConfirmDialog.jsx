import { Modal } from '../Modal/Modal';
import { Button } from '../Button/Button';
import styles from './ConfirmDialog.module.css';

export function ConfirmDialog({ title = 'Are you sure?', message, confirmLabel = 'Remove', onConfirm, onCancel }) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      role="alertdialog"
      maxWidth={380}
      zIndex={300}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} fullWidth>Cancel</Button>
          <Button variant="dangerOutline" onClick={onConfirm} autoFocus fullWidth>{confirmLabel}</Button>
        </>
      }
    >
      {message && <p className={styles.message}>{message}</p>}
    </Modal>
  );
}
