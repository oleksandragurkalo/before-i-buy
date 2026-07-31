import { Home, Clock3, ListChecks, Settings } from 'lucide-react';
import styles from './NavBar.module.css';

const DESTINATIONS = [
  { key: 'start', label: 'Start Page', icon: Home },
  { key: 'waiting', label: 'Waiting List', icon: Clock3 },
  { key: 'history', label: 'History', icon: ListChecks },
];

export function NavBar({ view, onNavigate, onSettingsClick }) {
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
            </button>
          ))}
        </div>
        <button type="button" className={styles.settingsPill} onClick={onSettingsClick}>
          <Settings size={13} />
          <span>Settings</span>
        </button>
      </div>
    </nav>
  );
}
