import { formatPrice, formatHours } from '../../utils';
import chartResisted from '../../assets/chart-resisted.png';
import chartSpent from '../../assets/chart-spent.png';
import styles from './HistorySummary.module.css';

const CHARTS = {
  green: chartResisted,
  red: chartSpent,
};

export function HistorySummary({ headerStats, currencySymbol }) {
  const { totalSaved, resistedCount, hoursSaved, totalSpent, spentCount, hoursSpent } = headerStats;

  const cards = [
    {
      tone: 'green',
      title: 'You resisted',
      count: resistedCount,
      amount: formatPrice(totalSaved, currencySymbol),
      hoursLabel: `${formatHours(hoursSaved)} saved`,
    },
    {
      tone: 'red',
      title: 'You spent anyway',
      count: spentCount,
      amount: formatPrice(totalSpent, currencySymbol),
      hoursLabel: `${formatHours(hoursSpent)} spent`,
    },
  ];

  return (
    <div className={styles.row}>
      {cards.map(({ tone, title, count, amount, hoursLabel }) => (
        <div key={tone} className={`${styles.card} ${styles[tone]}`}>
          <p className={styles.title}>{title}</p>
          <div className={styles.body}>
            <div className={styles.countBlock}>
              <span className={`${styles.count} mono`}>{count}</span>
              <span className={styles.countLabel}>{count === 1 ? 'item' : 'items'}</span>
            </div>
            <div className={styles.amountBlock}>
              <span className={`${styles.amount} mono`}>{amount}</span>
              <span className={styles.hoursLabel}>{hoursLabel}</span>
            </div>
          </div>
          <img src={CHARTS[tone]} className={styles.chart} alt="" aria-hidden="true" />
        </div>
      ))}
    </div>
  );
}
