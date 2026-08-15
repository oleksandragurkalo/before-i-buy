import { savingsPace, formatPrice } from '../../utils';
import styles from './SavingsPace.module.css';

function formatTargetDate(targetDate) {
  return new Date(`${targetDate}T00:00:00`).toLocaleDateString('en-CA', {
    month: 'short', day: 'numeric',
  });
}

export function SavingsPace({ item, settings }) {
  const pace = savingsPace(item);
  if (!pace) return null;

  if (pace.fullySaved) {
    return <p className={styles.pace}>You've saved enough for this — go ahead and decide.</p>;
  }

  if (pace.overdue) {
    return (
      <p className={`${styles.pace} ${styles.overdue}`}>
        Target date passed — save the rest of {formatPrice(pace.remaining, settings.currencySymbol)} whenever you can.
      </p>
    );
  }

  // formatPrice rounds to cents — for a small remaining balance over a
  // long enough horizon that would otherwise display as "$0.00/day",
  // implying nothing is left to save when there genuinely is.
  const perDay = Math.max(pace.perDay, 0.01);

  return (
    <p className={styles.pace}>
      Save <span className={styles.amount}>{formatPrice(perDay, settings.currencySymbol)}/day</span> to
      have it by {formatTargetDate(item.targetDate)} ({pace.daysLeft} day{pace.daysLeft === 1 ? '' : 's'} left)
    </p>
  );
}
