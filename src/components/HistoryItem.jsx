import { Trash2 } from 'lucide-react';
import { CATEGORIES, formatPrice, formatDate } from '../utils';
import styles from './HistoryItem.module.css';

export function HistoryItem({ item, settings, onRemove }) {
  const { emoji } = CATEGORIES[item.category] || CATEGORIES.other;
  const priceLabel = formatPrice(item.price, settings.currencySymbol);
  const bought = item.status === 'bought';

  return (
    <div className={styles.row}>
      <span className={styles.emoji} aria-hidden="true">{emoji}</span>
      <div className={styles.info}>
        <span className={styles.name}>{item.name}</span>
        <span className={styles.date}>{formatDate(item.decidedAt)}</span>
      </div>
      <span className={`mono ${styles.price}`}>{priceLabel}</span>
      <span className={`${styles.badge} ${bought ? styles.bought : styles.passed}`}>
        {bought ? 'bought' : 'passed'}
      </span>
      <button
        className={styles.remove}
        onClick={() => confirm(`Remove "${item.name}" from history?`) && onRemove(item.id)}
        aria-label="Remove from history"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}
