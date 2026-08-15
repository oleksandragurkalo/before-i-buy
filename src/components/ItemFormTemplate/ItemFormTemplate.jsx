import { CATEGORIES, COOLING_OFF_PRESETS } from '../../config';
import { NumberStepper } from '../NumberStepper/NumberStepper';
import { Modal } from '../Modal/Modal';
import { Button } from '../Button/Button';
import { Dropdown } from '../Dropdown/Dropdown';
import styles from './ItemFormTemplate.module.css';

const FORM_ID = 'item-form';

// toISOString() converts to UTC first — for anyone west of UTC that rolls
// over to tomorrow's date before local midnight, wrongly blocking "today"
// as a target date for a good chunk of the evening.
function todayLocalISODate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const STATUS_OPTIONS = [
  { value: 'waiting', label: 'Still deciding', tone: 'wait' },
  { value: 'passed', label: "Didn't need it", tone: 'pass' },
  { value: 'bought', label: 'Bought it', tone: 'buy' },
];

const CATEGORY_OPTIONS = Object.entries(CATEGORIES).map(([value, { label, emoji }]) => ({
  value,
  label: `${emoji} ${label}`,
}));

function Field({ label, htmlFor, optional, hint, children }) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={htmlFor}>
        {label} {optional && <span className={styles.optional}>(optional)</span>}
      </label>
      {hint && <p className={styles.hint}>{hint}</p>}
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
  showCoolingOff = true,
  showTargetDate = false,
  onChange,
  onPriceChange,
  onCategoryChange,
  onSavedChange,
  onStatusChange,
  onCoolingOffChange,
  onSubmit,
  onClose,
}) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form={FORM_ID}>{submitLabel}</Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={onSubmit} className={styles.form} noValidate>
        <Field label="What do you want?" htmlFor="item-name">
          <input
            id="item-name"
            className={styles.input}
            type="text"
            placeholder="e.g. Sony WH-1000XM5"
            value={form.name}
            onChange={onChange('name')}
            autoComplete="off"
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

          <Field label="Category">
            <Dropdown
              value={form.category}
              options={CATEGORY_OPTIONS}
              onChange={onCategoryChange}
              ariaLabel="Category"
            />
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
            autoComplete="off"
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
                  aria-pressed={form.status === value}
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

        {showTargetDate && (
          <Field label="Want it by" htmlFor="item-target-date" optional hint="See how much to save per day to hit this date">
            <input
              id="item-target-date"
              className={styles.input}
              type="date"
              min={todayLocalISODate()}
              value={form.targetDate}
              onChange={onChange('targetDate')}
            />
          </Field>
        )}

        {showCoolingOff && (
          <Field label="Days to wait before deciding" hint="Sleep on it, or pick “No wait” to decide right away">
            <div className={styles.segmented}>
              {COOLING_OFF_PRESETS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={Number(form.coolingOffDays) === value}
                  className={`${styles.segment} ${Number(form.coolingOffDays) === value ? styles.segmentActive : ''}`}
                  onClick={() => onCoolingOffChange(String(value))}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>
        )}

        {error && <p className={styles.error} role="alert">{error}</p>}
      </form>
    </Modal>
  );
}
