import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../Modal/Modal';
import { Button } from '../Button/Button';
import { ChangePasswordModal } from '../ChangePasswordModal/ChangePasswordModal';
import { DeleteAccountModal } from '../DeleteAccountModal/DeleteAccountModal';
import styles from './AccountSettingsModal.module.css';

// Supabase stores signup name as a single full_name string in user_metadata
// — split it back into name/surname naively (first word vs. the rest) for
// editing. Good enough for the common two-word-name case; not lossless for
// anything fancier, but there's nowhere else this app tracks the two
// separately.
function splitName(fullName) {
  const [first = '', ...rest] = (fullName || '').trim().split(/\s+/).filter(Boolean);
  return { first, rest: rest.join(' ') };
}

export function AccountSettingsModal({ onClose }) {
  const { user, updateDisplayName } = useAuth();
  const isPasswordAccount = user?.app_metadata?.provider === 'email';
  const initial = splitName(user?.user_metadata?.full_name);

  const [name, setName] = useState(initial.first);
  const [surname, setSurname] = useState(initial.rest);
  const [status, setStatus] = useState(null); // { type: 'error'|'success', message }
  const [saving, setSaving] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) { setStatus({ type: 'error', message: 'Name can’t be empty.' }); return; }
    setSaving(true);
    setStatus(null);
    try {
      await updateDisplayName(`${trimmedName} ${surname.trim()}`.trim());
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
            <label className={styles.label}>Name</label>
            <div className={styles.row}>
              <input
                className={styles.input}
                type="text"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
              />
              <input
                className={styles.input}
                type="text"
                placeholder="Surname"
                value={surname}
                onChange={(e) => setSurname(e.target.value)}
                maxLength={60}
              />
            </div>
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
