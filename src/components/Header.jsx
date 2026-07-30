import { Sun, Moon, Settings } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import styles from './Header.module.css';

export function Header({ onSettingsClick }) {
  const { theme, toggle } = useTheme();

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <span className={styles.receipt} aria-hidden="true">🧾</span>
          <div>
            <h1 className={styles.title}>Before I Buy</h1>
            <p className={styles.tagline}>Sleep on it before you spend it</p>
          </div>
        </div>
        <div className={styles.actions}>
          <button
            className={styles.iconBtn}
            onClick={onSettingsClick}
            aria-label="Settings"
          >
            <Settings size={18} />
          </button>
          <button
            className={styles.iconBtn}
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>
    </header>
  );
}
