import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { USERNAME_PATTERN } from '../../config';
import { Modal } from '../Modal/Modal';
import { Button } from '../Button/Button';
import { ChangePasswordModal } from '../ChangePasswordModal/ChangePasswordModal';
import { DeleteAccountModal } from '../DeleteAccountModal/DeleteAccountModal';
import styles from './AccountSettingsModal.module.css';

export function AccountSettingsModal({ onClose, profile, updateProfile }) {
  const { user } = useAuth();
  const isPasswordAccount = user?.app_metadata?.provider === 'email';

  const [username, setUsername] = useState(profile?.username || '');
  const [status, setStatus] = useState(null); // { type: 'error'|'success', message }
  const [saving, setSaving] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

  const handleSave = async () => {
    const trimmedUsername = username.trim();
    const usernameChanged = trimmedUsername !== profile?.username;
    if (usernameChanged && !USERNAME_PATTERN.test(trimmedUsername)) {
      setStatus({ type: 'error', message: 'Username must be 3-20 characters: letters, numbers, and underscores only.' });
      return;
    }

    setSaving(true);
    setStatus(null);
    try {
      if (usernameChanged) {
        const { error: profileError } = await updateProfile(trimmedUsername);
        if (profileError) { setStatus({ type: 'error', message: profileError }); return; }
      }
      setStatus({ type: 'success', message: 'Saved.' });
    } catch {
      setStatus({ type: 'error', message: 'Could not save. Try again.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Modal
        title="Account settings"
        onClose={onClose}
        footer={
          <div className={styles.footerRow}>
            <button
              type="button"
              className={styles.deleteAccountLink}
              onClick={() => setShowDeleteAccount(true)}
            >
              Delete account
            </button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        }
      >
        <div className={styles.fields}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="account-username">Username</label>
            <input
              id="account-username"
              className={styles.input}
              type="text"
              placeholder="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="off"
              maxLength={20}
            />
            <p className={styles.hint}>So friends can find you and share lists with you.</p>
            {status && (
              <p className={status.type === 'error' ? styles.error : styles.success}>{status.message}</p>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            {isPasswordAccount ? (
              <Button variant="secondary" onClick={() => setShowChangePassword(true)}>
                Change password
              </Button>
            ) : (
              <p className={styles.hint}>Signed in with Google — no password to manage here.</p>
            )}
          </div>
        </div>
      </Modal>

      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}

      {showDeleteAccount && (
        <DeleteAccountModal onClose={() => setShowDeleteAccount(false)} />
      )}
    </>
  );
}
