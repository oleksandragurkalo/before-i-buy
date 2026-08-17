import { ListChecks, ShoppingCart, AlarmClock, CheckCircle2, Smartphone, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../Button/Button';
import styles from './StartPage.module.css';

const FEATURES = [
  { icon: ShoppingCart, tone: 'purple', title: 'See real cost in hours', body: 'Know how long you work for it' },
  { icon: AlarmClock, tone: 'blue', title: 'Day counter & reminders', body: 'Give yourself time to decide' },
  { icon: CheckCircle2, tone: 'green', title: 'Track decisions', body: 'Resisted vs bought anyway' },
  { icon: Smartphone, tone: 'gray', title: 'Works everywhere', body: 'Fully responsive on any device' },
];

const THEMES = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
];

// Shown once, pre-auth, before AuthScreen — a "Try it" CTA leads into
// sign-in/sign-up rather than straight into the app, since an account is
// now required to use it at all.
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
          Part anti-impulse-purchase tracker, part shared wishlist. See how many hours of net
          take-home pay things cost, decide with a clear head — and share your list so friends
          know what you're eyeing.
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
          {THEMES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              className={`${styles.themeBtn} ${theme === value ? styles.themeBtnActive : ''}`}
              onClick={() => setTheme(value)}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        <Button className={styles.tryBtn} fullWidth onClick={onGetStarted}>
          Try it
        </Button>
      </div>
    </div>
  );
}
