import { useState } from 'react';
import { Pencil, Scale, Trash2 } from 'lucide-react';
import { CATEGORIES, hoursOfWork, formatHours, formatPrice, daysAgo, daysSince } from '../../utils';
import { useItemActionDialogs } from '../../hooks/useItemActionDialogs';
import { Button } from '../Button/Button';
import { DecisionModal } from '../DecisionModal/DecisionModal';
import styles from './ItemCard.module.css';

export function ItemCard({ item, settings, onDecide, onRemove, onEdit, view = 'rows' }) {
  const [decisionOpen, setDecisionOpen] = useState(false);
  const { setEditing, dialogs } = useItemActionDialogs({
    item, settings, onRemove, onEdit,
    confirmRemoval: false,
  });
  const { emoji, label: categoryLabel } = CATEGORIES[item.category] || CATEGORIES.other;
  const hrs = hoursOfWork(item.price, settings.hourlyRate);
  const hrsLabel = formatHours(hrs);
  const priceLabel = formatPrice(item.price, settings.currencySymbol);
  const savedAmount = Math.min(item.savedAmount || 0, item.price);
  const savedPct = item.price > 0 ? Math.round((savedAmount / item.price) * 100) : 0;
  const remaining = Math.max(0, item.price - savedAmount);
  const remainingHrsLabel = formatHours(hoursOfWork(remaining, settings.hourlyRate));
  const waitingDays = daysSince(item.addedAt);

  return (
    <article className={`${styles.card} ${view === 'grid' ? styles.grid : ''}`}>
      <div className={styles.top}>
        <span className={styles.emoji} aria-hidden="true">{emoji}</span>
        <div className={styles.meta}>
          <div className={styles.nameRow}>
            <h3 className={styles.name}>{item.name}</h3>
            <span className={styles.categoryTag}>{categoryLabel}</span>
          </div>
          {item.note && <p className={styles.note}>{item.note}</p>}
          <p className={styles.when}>{daysAgo(item.addedAt)}</p>
        </div>
        <div className={styles.cardActions}>
          <Button variant="icon" onClick={() => setEditing(true)} aria-label="Edit item">
            <Pencil size={14} />
          </Button>
          <Button variant="icon" tone="danger" onClick={() => setDecisionOpen(true)} aria-label="Remove item">
            <Trash2 size={14} />
          </Button>
        </div>
        <div className={styles.dayBadge} aria-label={`Waiting ${waitingDays} day${waitingDays === 1 ? '' : 's'}`}>
          <span className={styles.dayBadgeNum}>{waitingDays}</span>
          <span className={styles.dayBadgeLabel}>{waitingDays === 1 ? 'day' : 'days'}</span>
        </div>
      </div>

      <div className={styles.cost}>
        <div className={styles.costBlock}>
          <span className={`${styles.costValue} mono`}>{priceLabel}</span>
          <span className={styles.costLabel}>{settings.currency} price</span>
        </div>
        <div className={styles.costDivider} aria-hidden="true">=</div>
        <div className={styles.costBlock}>
          <span className={`${styles.costValue} ${styles.hoursValue} mono`}>{hrsLabel}</span>
          <span className={styles.costLabel}>of net take-home pay</span>
        </div>
      </div>

      <div className={styles.savings}>
        <div className={styles.savingsTop}>
          <span className={styles.savingsLabel}>
            {formatPrice(savedAmount, settings.currencySymbol)} saved of {priceLabel} ({savedPct}%)
          </span>
          <span className={styles.savingsRemaining}>{remainingHrsLabel} left to save</span>
        </div>
        <div className={styles.savingsBar}>
          <div className={styles.savingsBarFill} style={{ width: `${savedPct}%` }} />
        </div>
      </div>

      <p className={styles.question}>Do you still want this?</p>

      <Button fullWidth icon={<Scale size={15} />} onClick={() => setDecisionOpen(true)}>
        Decide
      </Button>

      {decisionOpen && (
        <DecisionModal
          item={item}
          settings={settings}
          onDecide={(status) => { onDecide(item.id, status); setDecisionOpen(false); }}
          onRemove={() => { onRemove(item.id); setDecisionOpen(false); }}
          onClose={() => setDecisionOpen(false)}
        />
      )}

      {dialogs}
    </article>
  );
}
