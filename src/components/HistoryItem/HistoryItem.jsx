import { useState } from 'react';
import { Trash2, Pencil } from 'lucide-react';
import { CATEGORIES, formatPrice, formatDate, formatHours, hoursOfWork } from '../../utils';
import { ConfirmDialog } from '../ConfirmDialog/ConfirmDialog';
import { EditItemModal } from '../EditItemModal/EditItemModal';
import styles from './HistoryItem.module.css';

export function HistoryItem({ item, settings, onRemove, onEdit }) {
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [editing, setEditing] = useState(false);
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
      <button
        className={styles.remove}
        onClick={() => setEditing(true)}
        aria-label="Edit item"
      >
        <Pencil size={13} />
      </button>
      <button
        className={styles.remove}
        onClick={() => setConfirmingRemove(true)}
        aria-label="Remove from history"
      >
        <Trash2 size={13} />
      </button>

      {confirmingRemove && (
        <ConfirmDialog
          title={`Remove "${item.name}" from history?`}
          onConfirm={() => onRemove(item.id)}
          onCancel={() => setConfirmingRemove(false)}
        />
      )}

      {editing && (
        <EditItemModal
          item={item}
          settings={settings}
          onSave={(updates) => onEdit(item.id, updates)}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}
