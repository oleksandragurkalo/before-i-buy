import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { DEFAULT_SETTINGS } from '../../hooks/useItems';
import styles from './SettingsModal.module.css';

const CURRENCIES = [
  { code: 'CAD', symbol: '$', label: 'CAD — Canadian dollar' },
  { code: 'USD', symbol: '$', label: 'USD — US dollar' },
  { code: 'EUR', symbol: '€', label: 'EUR — Euro' },
  { code: 'GBP', symbol: '£', label: 'GBP — British pound' },
  { code: 'UAH', symbol: '₴', label: 'UAH — Ukrainian hryvnia' },
];

export function SettingsModal({ settings, onSave, onClose }) {
  const [rate, setRate] = useState(String(settings.hourlyRate));
  const [currency, setCurrency] = useState(settings.currency);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const save = () => {
    const parsed = parseFloat(rate);
    if (!isNaN(parsed) && parsed > 0) {
      const curr = CURRENCIES.find(c => c.code === currency);
      onSave({
        hourlyRate: parsed,
        currency,
        currencySymbol: curr?.symbol || '$',
      });
      onClose();
    }
  };

  const reset = () => {
    setRate(String(DEFAULT_SETTINGS.hourlyRate));
    setCurrency(DEFAULT_SETTINGS.currency);
  };

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Settings">
        <div className={styles.header}>
          <h2 className={styles.title}>Settings</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close settings">
            <X size={16} />
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="hourly-rate">
              Your net hourly rate
              <span className={styles.hint}>After-tax take-home pay per hour</span>
            </label>
            <div className={styles.rateInput}>
              <span className={styles.rateSymbol}>
                {CURRENCIES.find(c => c.code === currency)?.symbol || '$'}
              </span>
              <input
                id="hourly-rate"
                className={`${styles.input} mono`}
                type="number"
                min="1"
                step="1"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                autoFocus
              />
              <span className={styles.ratePer}>/hr</span>
            </div>
            <p className={styles.help}>
              Default is $27 CAD — approx. $38/hr gross minus ~30% tax. Adjust to your actual take-home.
            </p>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="currency">Currency</label>
            <select
              id="currency"
              className={styles.input}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.resetBtn} onClick={reset}>Reset to defaults</button>
          <div className={styles.footerRight}>
            <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button className={styles.saveBtn} onClick={save}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}
