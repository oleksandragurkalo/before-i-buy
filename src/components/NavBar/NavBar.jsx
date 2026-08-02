import { Home, Clock3, ListChecks, Settings, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import styles from './NavBar.module.css';

const DESTINATIONS = [
  { key: 'start', label: 'Start Page', icon: Home },
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
          {DESTINATIONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              className={`${styles.pill} ${view === key ? styles.pillActive : ''}`}
              onClick={() => onNavigate(key)}
              aria-current={view === key ? 'page' : undefined}
            >
              <Icon size={13} />
              <span>{label}</span>
              {key === 'waiting' && readyCount > 0 && (
                <span className={styles.badge} aria-label={`${readyCount} item${readyCount === 1 ? '' : 's'} ready to decide`}>
                  {readyCount}
                </span>
              )}
            </button>
          ))}
        </div>
        <button type="button" className={styles.settingsPill} onClick={onSettingsClick}>
          <Settings size={13} />
          <span>Settings</span>
        </button>

        {view !== 'start' && (
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
        )}
      </div>
    </nav>
  );
}
