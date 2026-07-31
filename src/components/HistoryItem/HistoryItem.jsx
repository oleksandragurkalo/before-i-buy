import { Trash2, Pencil } from 'lucide-react';
import { CATEGORIES, formatPrice, formatDate, formatHours, hoursOfWork } from '../../utils';
import { useItemActionDialogs } from '../../hooks/useItemActionDialogs';
import { Button } from '../Button/Button';
import styles from './HistoryItem.module.css';

export function HistoryItem({ item, settings, onRemove, onEdit }) {
  const { setEditing, setConfirmingRemove, dialogs } = useItemActionDialogs({
    item, settings, onRemove, onEdit,
    confirmTitle: `Remove "${item.name}" from history?`,
  });
  const { emoji } = CATEGORIES[item.category] || CATEGORIES.other;
  const priceLabel = formatPrice(item.price, settings.currencySymbol);
  const hrsLabel = formatHours(hoursOfWork(item.price, item.hourlyRateAtDecision ?? settings.hourlyRate));
  const bought = item.status === 'bought';

  return (
    <div className={styles.row}>
      <span className={styles.emoji} aria-hidden="true">{emoji}</span>
      <div className={styles.info}>
        <span className={styles.name}>{item.name}</span>
        <span className={styles.date}>{formatDate(item.decidedAt)}</span>
      </div>
      <div className={styles.priceCol}>
        <span className={`mono ${styles.price}`}>{priceLabel}</span>
        <span className={`mono ${styles.hours}`}>{hrsLabel}</span>
      </div>
      <span className={`${styles.badge} ${bought ? styles.bought : styles.passed}`}>
        {bought ? 'bought' : 'passed'}
      </span>
      <Button variant="icon" onClick={() => setEditing(true)} aria-label="Edit item">
        <Pencil size={13} />
      </Button>
      <Button variant="icon" tone="danger" onClick={() => setConfirmingRemove(true)} aria-label="Remove from history">
        <Trash2 size={13} />
      </Button>

      {dialogs}
    </div>
  );
}
