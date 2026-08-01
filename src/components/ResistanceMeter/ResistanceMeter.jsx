import styles from './ResistanceMeter.module.css';

export function ResistanceMeter({ resistanceRate }) {
  if (resistanceRate === null) return null;

  return (
    <div className={styles.meter}>
      <div className={styles.top}>
        <span className={`${styles.value} mono`}>{resistanceRate}%</span>
        <span className={styles.label}>of decisions were resisted</span>
      </div>
      <div className={styles.bar}>
        <div className={styles.barFill} style={{ width: `${resistanceRate}%` }} />
      </div>
    </div>
  );
}
