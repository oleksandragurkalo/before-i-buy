import { ListChecks, ShoppingCart, AlarmClock, CheckCircle2, Lock, Smartphone, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import styles from './StartPage.module.css';

const FEATURES = [
  { icon: ShoppingCart, tone: 'purple', title: 'See real cost in hours', body: 'Know how long you work for it' },
  { icon: AlarmClock, tone: 'blue', title: 'Day counter & reminders', body: 'Give yourself time to decide' },
  { icon: CheckCircle2, tone: 'green', title: 'Track decisions', body: 'Resisted vs bought anyway' },
  { icon: Lock, tone: 'red', title: 'Private & local', body: '100% stored in your browser' },
  { icon: Smartphone, tone: 'gray', title: 'Works everywhere', body: 'Fully responsive on any device' },
];

export function StartPage({ onGetStarted }) {
  const { theme, setTheme } = useTheme();

  return (
    <div className={styles.backdrop}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logo} aria-hidden="true">
            <ListChecks size={24} />
          </div>
          <div>
            <h1 className={styles.title}>Before I Buy</h1>
            <p className={styles.tagline}>Sleep on it before you spend it.</p>
          </div>
        </div>

        <p className={styles.description}>
          A minimal anti-impulse-purchase tracker. See how many hours of net take-home pay
          things cost — and decide with a clear head.
        </p>

        <ul className={styles.features}>
          {FEATURES.map(({ icon: Icon, tone, title, body }) => (
            <li className={styles.feature} key={title}>
              <span className={`${styles.featureIcon} ${styles[tone]}`} aria-hidden="true">
                <Icon size={16} />
              </span>
              <div>
                <p className={styles.featureTitle}>{title}</p>
                <p className={styles.featureBody}>{body}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className={styles.themeSwitcher}>
          <button
            type="button"
            className={`${styles.themeBtn} ${theme === 'light' ? styles.themeBtnActive : ''}`}
            onClick={() => setTheme('light')}
          >
            <Sun size={14} /> Light
          </button>
          <button
            type="button"
            className={`${styles.themeBtn} ${theme === 'dark' ? styles.themeBtnActive : ''}`}
            onClick={() => setTheme('dark')}
          >
            <Moon size={14} /> Dark
          </button>
        </div>

        <button type="button" className={styles.cta} onClick={onGetStarted}>
          Try it
        </button>
      </div>
    </div>
  );
}
