import chartResisted from '../../assets/chart-resisted.png';
import chartSpent from '../../assets/chart-spent.png';
import chartHours from '../../assets/chart-saved-hours.png';
import styles from './StatTile.module.css';

const CHARTS = {
  green: chartResisted,
  red: chartSpent,
  blue: chartHours,
};

export function StatTile({ tone, label, value, sublabel }) {
  const chartSrc = CHARTS[tone];
  return (
    <div className={`${styles.tile} ${styles[tone]}`}>
      <div className={styles.header}>
        <p className={styles.label}>{label}</p>
      </div>
      <p className={`${styles.value} mono`}>{value}</p>
      <p className={styles.sublabel}>{sublabel}</p>
      {chartSrc && <img src={chartSrc} className={styles.chart} alt="" aria-hidden="true" />}
    </div>
  );
}
