import { useEffect, useRef, useState } from 'react';
import { UserRound, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AccountSettingsModal } from '../AccountSettingsModal/AccountSettingsModal';
import styles from './AccountMenu.module.css';

export function AccountMenu() {
  const { user, logOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const onClickOutside = (e) => {
      if (!wrapperRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };

    document.addEventListener('mousedown', onClickOutside);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
      >
        <UserRound size={15} />
      </button>

      {open && (
        <div className={styles.menu} role="menu">
          <p className={styles.email}>{user?.email}</p>
          <button
            type="button"
            role="menuitem"
            className={styles.item}
            onClick={() => { setOpen(false); setShowSettings(true); }}
          >
            <Settings size={14} />
            Account settings
          </button>
          <button
            type="button"
            role="menuitem"
            className={styles.signOut}
            onClick={() => { setOpen(false); logOut(); }}
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      )}

      {showSettings && <AccountSettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}
