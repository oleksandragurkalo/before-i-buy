import { useState } from 'react';
import { Trash2, Pencil, ShoppingBag, ThumbsDown } from 'lucide-react';
import { CATEGORIES, hoursOfWork, formatHours, formatPrice, daysAgo } from '../../utils';
import { ConfirmDialog } from '../ConfirmDialog/ConfirmDialog';
import { EditItemModal } from '../EditItemModal/EditItemModal';
import styles from './ItemCard.module.css';

export function ItemCard({ item, settings, onDecide, onRemove, onEdit }) {
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [editing, setEditing] = useState(false);
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
        <div className={styles.cardActions}>
          <button
            className={styles.removeBtn}
            onClick={() => setEditing(true)}
            aria-label="Edit item"
          >
            <Pencil size={14} />
          </button>
          <button
            className={styles.removeBtn}
            onClick={() => setConfirmingRemove(true)}
            aria-label="Remove item"
          >
            <Trash2 size={14} />
          </button>
        </div>
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

      {confirmingRemove && (
        <ConfirmDialog
          title={`Remove "${item.name}"?`}
          onConfirm={() => onRemove(item.id)}
          onCancel={() => setConfirmingRemove(false)}
        />
      )}

      {editing && (
        <EditItemModal
          item={item}
          onSave={(updates) => onEdit(item.id, updates)}
          onClose={() => setEditing(false)}
        />
      )}
    </article>
  );
}
