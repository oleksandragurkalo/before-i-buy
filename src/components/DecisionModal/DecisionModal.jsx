import { ShoppingBag, ThumbsDown, Trash2 } from 'lucide-react';
import { CATEGORIES, formatPrice } from '../../utils';
import { Modal } from '../Modal/Modal';
import styles from './DecisionModal.module.css';

const OPTIONS = [
  { tone: 'pass', icon: ThumbsDown, iconSize: 15, label: "I don't need it", action: 'decide', status: 'passed' },
  { tone: 'buy', icon: ShoppingBag, iconSize: 15, label: 'I bought it anyway', action: 'decide', status: 'bought' },
  { tone: 'remove', icon: Trash2, iconSize: 14, label: 'Remove item', action: 'remove' },
];

export function DecisionModal({ item, settings, onDecide, onRemove, onClose }) {
  const { emoji } = CATEGORIES[item.category] || CATEGORIES.other;
  const priceLabel = formatPrice(item.price, settings.currencySymbol);

  return (
    <Modal title="Confirm decision" onClose={onClose} maxWidth={400}>
      <div className={styles.header}>
        <span className={styles.icon} aria-hidden="true">{emoji}</span>
        <div>
          <p className={styles.question}>What's your decision?</p>
          <p className={`${styles.itemLine} mono`}>{item.name} — {priceLabel}</p>
        </div>
      </div>

      <div className={styles.options}>
        {OPTIONS.map(({ tone, icon: Icon, iconSize, label, action, status }) => (
          <button
            key={tone}
            type="button"
            className={`${styles.option} ${styles[tone]}`}
            onClick={() => (action === 'remove' ? onRemove() : onDecide(status))}
          >
            <Icon size={iconSize} />
            {label}
          </button>
        ))}
      </div>
    </Modal>
  );
}
