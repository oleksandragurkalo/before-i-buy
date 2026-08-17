import { useState } from 'react';
import { useAuth, validatePassword } from '../../context/AuthContext';
import { Modal, NESTED_MODAL_Z_INDEX } from '../Modal/Modal';
import { Button } from '../Button/Button';
import formStyles from '../../styles/form.module.css';
import styles from './ChangePasswordModal.module.css';

export function ChangePasswordModal({ onClose }) {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState(null); // { type: 'error'|'success', message }
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);

    const validationError = validatePassword(newPassword);
    if (validationError) { setStatus({ type: 'error', message: validationError }); return; }
    if (newPassword !== confirmPassword) { setStatus({ type: 'error', message: 'New passwords don’t match.' }); return; }

    setSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setStatus({ type: 'success', message: 'Password changed.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setStatus({ type: 'error', message: friendlyError(err.code) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Change password" onClose={onClose} zIndex={NESTED_MODAL_Z_INDEX}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <input
          className={formStyles.input}
          type="password"
          placeholder="Current password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          autoComplete="current-password"
          autoFocus
          required
        />
        <input
          className={formStyles.input}
          type="password"
          placeholder="New password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
          required
        />
        <input
          className={formStyles.input}
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          required
        />
        <p className={formStyles.hint}>At least 8 characters, with a number.</p>
        {status && (
          <p className={status.type === 'error' ? formStyles.error : formStyles.success}>{status.message}</p>
        )}
        <Button type="submit" disabled={saving} fullWidth>
          {saving ? 'Changing…' : 'Change password'}
        </Button>
      </form>
    </Modal>
  );
}

function friendlyError(code) {
  switch (code) {
    case 'invalid_credentials': return 'Current password is incorrect.';
    case 'same_password': return 'New password must be different from your current one.';
    case 'weak_password': return 'Password must be at least 8 characters, with a number.';
    case 'over_request_rate_limit': return 'Too many attempts. Try again later.';
    default: return 'Something went wrong. Please try again.';
  }
}
