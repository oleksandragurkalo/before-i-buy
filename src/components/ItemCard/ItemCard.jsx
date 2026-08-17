import { memo, useState } from 'react';
import { Check, Pencil, Scale, Trash2 } from 'lucide-react';
import { getCategory, hoursOfWork, formatHours, formatPrice, daysAgo, daysSince, coolingOffStatus } from '../../utils';
import { DEFAULT_COOLING_OFF_DAYS } from '../../config';
import { useItemActionDialogs } from '../../hooks/useItemActionDialogs';
import { Button } from '../Button/Button';
import { DecisionModal } from '../DecisionModal/DecisionModal';
import { SavingsPace } from '../SavingsPace/SavingsPace';
import styles from './ItemCard.module.css';

// Memoized since it's rendered in lists (WaitingPage) where onDecide/onRemove/
// onEdit/settings are now stable references (see useItems.js/App.jsx) — this
// only pays off if all props stay reference-stable across unrelated re-renders.
export const ItemCard = memo(function ItemCard({ item, settings, onDecide, onRemove, onEdit, view = 'rows', readOnly = false }) {
  const [decisionOpen, setDecisionOpen] = useState(false);
  const { setEditing, dialogs } = useItemActionDialogs({ item, settings, onEdit });
  const { emoji, label: categoryLabel } = getCategory(item.category);
  // On a shared/read-only list, `settings.hourlyRate` is the owner's real
  // rate — showing it alongside the (already-visible) price would let a
  // viewer back it out via price ÷ hours, so hours are left out entirely
  // for a read-only card rather than computed and hidden.
  const hrsLabel = readOnly ? null : formatHours(hoursOfWork(item.price, settings.hourlyRate));
  const priceLabel = formatPrice(item.price, settings.currencySymbol);
  const savedAmount = Math.min(item.savedAmount || 0, item.price);
  const savedPct = item.price > 0 ? Math.round((savedAmount / item.price) * 100) : 0;
  const remaining = Math.max(0, item.price - savedAmount);
  const remainingHrsLabel = readOnly ? null : formatHours(hoursOfWork(remaining, settings.hourlyRate));
  const waitingDays = daysSince(item.addedAt);
  const { remaining: coolingOffDaysLeft, ready } = coolingOffStatus(item, item.coolingOffDays ?? DEFAULT_COOLING_OFF_DAYS);

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
        {!readOnly && (
          <div className={styles.cardActions}>
            <Button variant="icon" onClick={() => setEditing(true)} aria-label="Edit item">
              <Pencil size={14} />
            </Button>
            <Button variant="icon" tone="danger" onClick={() => setDecisionOpen(true)} aria-label="Decide on item">
              <Trash2 size={14} />
            </Button>
          </div>
        )}
        {/* The cooling-off countdown is the owner's own decision timeline —
            a friend viewing a shared list can't act on it (no Decide
            button here either), so it's just noise on a read-only card. */}
        {!readOnly && (
          <div
            className={`${styles.dayBadge} ${ready ? styles.dayBadgeReady : ''}`}
            aria-label={ready
              ? `Cooling-off done — ready to decide (waited ${waitingDays} day${waitingDays === 1 ? '' : 's'})`
              : `${coolingOffDaysLeft} day${coolingOffDaysLeft === 1 ? '' : 's'} left before deciding`}
          >
            {/* A countdown number turning green at zero still reads as "a
                number", not "do something now" — swapping to a check + label
                makes the ready state its own distinct signal instead of just
                a recolored data point. */}
            {ready ? (
              <>
                <Check size={18} className={styles.dayBadgeIcon} aria-hidden="true" />
                <span className={styles.dayBadgeLabel}>Ready</span>
              </>
            ) : (
              <>
                <span className={styles.dayBadgeNum}>{coolingOffDaysLeft}</span>
                <span className={styles.dayBadgeLabel}>{coolingOffDaysLeft === 1 ? 'day' : 'days'}</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className={styles.cost}>
        <div className={styles.costBlock}>
          {/* Price is the card's only number on a read-only card (hours and
              savings progress are hidden — see below), so it takes the
              larger "hero" size that used to belong to the hours value. */}
          <span className={`${styles.costValue} ${hrsLabel == null ? styles.costValueSolo : ''} mono`}>{priceLabel}</span>
          <span className={styles.costLabel}>{settings.currency} price</span>
        </div>
        {hrsLabel != null && (
          <>
            <div className={styles.costDivider} aria-hidden="true">=</div>
            <div className={styles.costBlock}>
              <span className={`${styles.costValue} ${styles.hoursValue} mono`}>{hrsLabel}</span>
              <span className={styles.costLabel}>of net take-home pay</span>
            </div>
          </>
        )}
      </div>

      {/* Savings progress is the owner's personal saving behavior/pace, not
          something a friend deciding what to buy for them needs — and on a
          shared list it's the same kind of "personal financial info" the
          hours figures above were hidden for, so it's left out entirely
          rather than shown. */}
      {!readOnly && (
        <div className={styles.savings}>
          <div className={styles.savingsTop}>
            <span className={styles.savingsLabel}>
              {formatPrice(savedAmount, settings.currencySymbol)} saved of {priceLabel} ({savedPct}%)
            </span>
            {remainingHrsLabel != null && <span className={styles.savingsRemaining}>{remainingHrsLabel} left to save</span>}
          </div>
          <div className={styles.savingsBar}>
            <div className={styles.savingsBarFill} style={{ width: `${savedPct}%` }} />
          </div>
          <SavingsPace item={item} settings={settings} />
        </div>
      )}

      {!readOnly && (
        <>
          <p className={styles.question}>Do you still want this?</p>

          <Button fullWidth icon={<Scale size={15} />} onClick={() => setDecisionOpen(true)}>
            Decide
          </Button>
        </>
      )}

      {decisionOpen && (
        <DecisionModal
          item={item}
          settings={settings}
          onDecide={(status) => { onDecide(item.id, status); setDecisionOpen(false); }}
          onRemove={() => { onRemove(item.id); setDecisionOpen(false); }}
          onClose={() => setDecisionOpen(false)}
        />
      )}

      {!readOnly && dialogs}
    </article>
  );
});
