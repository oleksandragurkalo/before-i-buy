import { Trash2, Pencil } from 'lucide-react';
import { getCategory, formatPrice, formatDate, formatHours, hoursOfWork } from '../../utils';
import { DECISION_LABELS } from '../../config';
import { useItemActionDialogs } from '../../hooks/useItemActionDialogs';
import { Button } from '../Button/Button';
import styles from './HistoryItem.module.css';

export function HistoryItem({ item, settings, onRemove, onEdit, readOnly = false }) {
  const { setEditing, dialogs } = useItemActionDialogs({ item, settings, onEdit });
  const { emoji, label: categoryLabel } = getCategory(item.category);
  const priceLabel = formatPrice(item.price, settings.currencySymbol);
  const hrsLabel = formatHours(hoursOfWork(item.price, item.hourlyRateAtDecision ?? settings.hourlyRate));
  const bought = item.status === 'bought';

  return (
    <div className={styles.row}>
      <div className={styles.item}>
        <span className={styles.emoji} aria-hidden="true">{emoji}</span>
        <span className={styles.name}>{item.name}</span>
      </div>

      <span className={styles.category}>{categoryLabel}</span>

      <span className={`${styles.badge} ${bought ? styles.bought : styles.passed}`}>
        {DECISION_LABELS[item.status]}
      </span>

      <span className={`${styles.price} mono`}>{priceLabel}</span>
      <span className={`${styles.hours} mono`}>{hrsLabel}</span>
      <span className={styles.date}>{formatDate(item.decidedAt)}</span>

      {!readOnly && (
        <div className={styles.actions}>
          <Button variant="icon" onClick={() => setEditing(true)} aria-label="Edit item">
            <Pencil size={13} />
          </Button>
          <Button variant="icon" tone="danger" onClick={() => onRemove(item.id)} aria-label="Remove from history">
            <Trash2 size={13} />
          </Button>
        </div>
      )}

      {!readOnly && dialogs}
    </div>
  );
}
