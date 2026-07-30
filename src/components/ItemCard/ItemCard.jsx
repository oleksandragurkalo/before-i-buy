import { Trash2, ShoppingBag, ThumbsDown } from 'lucide-react';
import { CATEGORIES, hoursOfWork, formatHours, formatPrice, daysAgo } from '../../utils';
import styles from './ItemCard.module.css';

export function ItemCard({ item, settings, onDecide, onRemove }) {
  const { emoji } = CATEGORIES[item.category] || CATEGORIES.other;
  const hrs = hoursOfWork(item.price, settings.hourlyRate);
  const hrsLabel = formatHours(hrs);
  const priceLabel = formatPrice(item.price, settings.currencySymbol);

  return (
    <article className={styles.card}>
      <div className={styles.top}>
        <span className={styles.emoji} aria-hidden="true">{emoji}</span>
        <div className={styles.meta}>
          <h3 className={styles.name}>{item.name}</h3>
          {item.note && <p className={styles.note}>{item.note}</p>}
          <p className={styles.when}>{daysAgo(item.addedAt)}</p>
        </div>
        <button
          className={styles.removeBtn}
          onClick={() => confirm(`Remove "${item.name}"?`) && onRemove(item.id)}
          aria-label="Remove item"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className={styles.cost}>
        <div className={styles.costBlock}>
          <span className={`${styles.costValue} mono`}>{priceLabel}</span>
          <span className={styles.costLabel}>{settings.currency} price</span>
        </div>
        <div className={styles.costDivider} aria-hidden="true">=</div>
        <div className={`${styles.costBlock} ${styles.costHighlight}`}>
          <span className={`${styles.costValue} ${styles.hoursValue} mono`}>{hrsLabel}</span>
          <span className={styles.costLabel}>of net take-home pay</span>
        </div>
      </div>

      <p className={styles.question}>Do you still want this?</p>

      <div className={styles.actions}>
        <button
          className={`${styles.actionBtn} ${styles.passBtn}`}
          onClick={() => onDecide(item.id, 'passed')}
        >
          <ThumbsDown size={15} />
          I don't need it
        </button>
        <button
          className={`${styles.actionBtn} ${styles.buyBtn}`}
          onClick={() => onDecide(item.id, 'bought')}
        >
          <ShoppingBag size={15} />
          I bought it
        </button>
      </div>
    </article>
  );
}
