import { useEffect, useRef } from 'react';
import { Button } from '../Button/Button';
import styles from './Toast.module.css';

const AUTO_DISMISS_MS = 5000;

export function Toast({ message, actionLabel, onAction, onDismiss }) {
  // Ref so the timer is only ever set once per mount — onDismiss is an
  // inline arrow at the call site and would otherwise reset the countdown
  // on every unrelated parent re-render.
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  useEffect(() => {
    const timer = setTimeout(() => dismissRef.current(), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={styles.toast} role="status">
      <span className={styles.message}>{message}</span>
      {actionLabel && (
        <Button variant="text" className={styles.action} onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
