import { useId } from 'react';
import { CATEGORIES } from '../../utils';
import { NumberStepper } from '../NumberStepper/NumberStepper';
import { Modal } from '../Modal/Modal';
import { Button } from '../Button/Button';
import styles from './ItemFormTemplate.module.css';

export function ItemFormTemplate({
  title,
  submitLabel,
  symbol = '$',
  form,
  error,
  showSavedAmount = true,
  onChange,
  onPriceChange,
  onSavedChange,
  onSubmit,
  onClose,
}) {
  const formId = useId();

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form={formId}>{submitLabel}</Button>
        </>
      }
    >
      <form id={formId} onSubmit={onSubmit} className={styles.form} noValidate>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="item-name">What do you want?</label>
          <input
            id="item-name"
            className={styles.input}
            type="text"
            placeholder="e.g. Sony WH-1000XM5"
            value={form.name}
            onChange={onChange('name')}
            autoFocus
            maxLength={80}
          />
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="item-price">Price ({symbol})</label>
            <NumberStepper
              id="item-price"
              value={form.price}
              onChange={onPriceChange}
              placeholder="0.00"
              min={0}
              step={1}
              ariaLabel="price"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="item-category">Category</label>
            <select
              id="item-category"
              className={styles.input}
              value={form.category}
              onChange={onChange('category')}
            >
              {Object.entries(CATEGORIES).map(([key, { label, emoji }]) => (
                <option key={key} value={key}>{emoji} {label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="item-note">
            Why do you want it? <span className={styles.optional}>(optional)</span>
          </label>
          <input
            id="item-note"
            className={styles.input}
            type="text"
            placeholder="e.g. My headphones broke last week"
            value={form.note}
            onChange={onChange('note')}
            maxLength={120}
          />
        </div>

        {showSavedAmount && (
          <div className={styles.field}>
            <label className={styles.label} htmlFor="item-saved">
              Already saved ({symbol}) <span className={styles.optional}>(optional)</span>
            </label>
            <NumberStepper
              id="item-saved"
              value={form.savedAmount}
              onChange={onSavedChange}
              placeholder="0"
              min={0}
              step={1}
              ariaLabel="amount already saved"
            />
          </div>
        )}

        {error && <p className={styles.error} role="alert">{error}</p>}
      </form>
    </Modal>
  );
}
