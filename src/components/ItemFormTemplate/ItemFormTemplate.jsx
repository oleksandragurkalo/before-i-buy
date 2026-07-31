import { useId } from 'react';
import { CATEGORIES } from '../../utils';
import { NumberStepper } from '../NumberStepper/NumberStepper';
import { Modal } from '../Modal/Modal';
import { Button } from '../Button/Button';
import styles from './ItemFormTemplate.module.css';

const STATUS_OPTIONS = [
  { value: 'passed', label: "Didn't need it", tone: 'pass' },
  { value: 'bought', label: 'Bought it', tone: 'buy' },
];

function Field({ label, htmlFor, optional, children }) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={htmlFor}>
        {label} {optional && <span className={styles.optional}>(optional)</span>}
      </label>
      {children}
    </div>
  );
}

export function ItemFormTemplate({
  title,
  submitLabel,
  symbol = '$',
  form,
  error,
  showSavedAmount = true,
  showStatus = false,
  onChange,
  onPriceChange,
  onSavedChange,
  onStatusChange,
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
        <Field label="What do you want?" htmlFor="item-name">
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
        </Field>

        <div className={styles.row}>
          <Field label={`Price (${symbol})`} htmlFor="item-price">
            <NumberStepper
              id="item-price"
              value={form.price}
              onChange={onPriceChange}
              placeholder="0.00"
              min={0}
              step={1}
              ariaLabel="price"
            />
          </Field>

          <Field label="Category" htmlFor="item-category">
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
          </Field>
        </div>

        <Field label="Why do you want it?" htmlFor="item-note" optional>
          <input
            id="item-note"
            className={styles.input}
            type="text"
            placeholder="e.g. My headphones broke last week"
            value={form.note}
            onChange={onChange('note')}
            maxLength={120}
          />
        </Field>

        {showStatus && (
          <Field label="Decision">
            <div className={styles.segmented}>
              {STATUS_OPTIONS.map(({ value, label, tone }) => (
                <button
                  key={value}
                  type="button"
                  className={`${styles.segment} ${form.status === value ? `${styles.segmentActive} ${styles[tone]}` : ''}`}
                  onClick={() => onStatusChange(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>
        )}

        {showSavedAmount && (
          <Field label={`Already saved (${symbol})`} htmlFor="item-saved" optional>
            <NumberStepper
              id="item-saved"
              value={form.savedAmount}
              onChange={onSavedChange}
              placeholder="0"
              min={0}
              step={1}
              ariaLabel="amount already saved"
            />
          </Field>
        )}

        {error && <p className={styles.error} role="alert">{error}</p>}
      </form>
    </Modal>
  );
}
