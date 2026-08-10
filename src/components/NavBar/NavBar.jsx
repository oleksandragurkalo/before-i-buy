import { Clock3, ListChecks, Settings, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { AccountMenu } from '../AccountMenu/AccountMenu';
import styles from './NavBar.module.css';

const DESTINATIONS = [
  { key: 'waiting', label: 'Waiting List', icon: Clock3 },
  { key: 'history', label: 'History', icon: ListChecks },
];

export function NavBar({ view, onNavigate, onSettingsClick, readyCount = 0 }) {
  const { theme, toggle } = useTheme();

  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>
        <span className={styles.brand}>Before I Buy</span>
        <div className={styles.pills}>
          {DESTINATIONS.map(({ key, label, icon: Icon }) => {
            const showBadge = key === 'waiting' && readyCount > 0;
            const pillLabel = showBadge
              ? `${label}, ${readyCount} item${readyCount === 1 ? '' : 's'} ready to decide`
              : label;
            return (
              <button
                key={key}
                type="button"
                className={`${styles.pill} ${view === key ? styles.pillActive : ''}`}
                onClick={() => onNavigate(key)}
                aria-current={view === key ? 'page' : undefined}
                aria-label={pillLabel}
              >
                <Icon size={13} />
                <span aria-hidden="true">{label}</span>
                {showBadge && (
                  <span className={styles.badge} aria-hidden="true">{readyCount}</span>
                )}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={theme === 'dark'}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className={styles.themeSwitch}
          onClick={toggle}
        >
          <span className={styles.themeThumb}>
            {theme === 'dark' ? <Moon size={11} /> : <Sun size={11} />}
          </span>
        </button>

        <button type="button" className={styles.settingsPill} onClick={onSettingsClick} aria-label="Settings">
          <Settings size={13} />
          <span aria-hidden="true">Settings</span>
        </button>

        <AccountMenu />
      </div>
    </nav>
  );
}
