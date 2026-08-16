import { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { Modal, NESTED_MODAL_Z_INDEX } from '../Modal/Modal';
import { Button } from '../Button/Button';
import styles from './DeleteAccountModal.module.css';

const CONFIRM_PHRASE = 'DELETE';

// `code` is only set on Supabase AuthErrors (the password-verification
// step) — errors from the /api/delete-account call are plain Errors whose
// .message already carries the server's actual reason, so surface that
// instead of masking it with a generic string.
function friendlyError(err) {
  switch (err.code) {
    case 'invalid_credentials': return 'Current password is incorrect.';
    case 'over_request_rate_limit': return 'Too many attempts. Try again later.';
    default: return err.message || 'Something went wrong. Please try again.';
  }
}

export function DeleteAccountModal({ onClose }) {
  const { user, logOut } = useAuth();
  const isPasswordAccount = user?.app_metadata?.provider === 'email';

  const [currentPassword, setCurrentPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [status, setStatus] = useState(null); // { type: 'error', message }
  const [deleting, setDeleting] = useState(false);

  const canSubmit = confirmText.trim() === CONFIRM_PHRASE && (!isPasswordAccount || currentPassword.length > 0);

  const handleDelete = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setStatus(null);
    setDeleting(true);
    try {
      // Verify the account owner actually knows the current password before
      // doing anything destructive — the "type DELETE" field alone only
      // guards against accidental clicks, not someone at an unattended
      // signed-in session.
      if (isPasswordAccount) {
        const { error: verifyError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: currentPassword,
        });
        if (verifyError) throw verifyError;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Your session has expired. Please sign in again and retry.');
      const res = await fetch('/api/delete-account', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Delete failed');
      }
      // The account is gone server-side — sign out locally too so the app
      // drops back to the sign-in screen immediately instead of waiting on
      // the current session to eventually stop working.
      await logOut();
    } catch (err) {
      setStatus({ type: 'error', message: friendlyError(err) });
      setDeleting(false);
    }
  };

  return (
    <Modal title="Delete account" onClose={onClose} zIndex={NESTED_MODAL_Z_INDEX}>
      <form className={styles.form} onSubmit={handleDelete}>
        <p className={styles.warning}>
          This permanently deletes your account and every saved item. This can't be undone.
        </p>

        {isPasswordAccount && (
          <input
            className={styles.input}
            type="password"
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            autoFocus
            required
          />
        )}

        <label className={styles.label}>
          Type <strong>{CONFIRM_PHRASE}</strong> to confirm
        </label>
        <input
          className={styles.input}
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          autoComplete="off"
          autoFocus={!isPasswordAccount}
          required
        />

        {status && <p className={styles.error}>{status.message}</p>}

        <Button type="submit" variant="danger" disabled={!canSubmit || deleting} fullWidth>
          {deleting ? 'Deleting…' : 'Delete account'}
        </Button>
      </form>
    </Modal>
  );
}
