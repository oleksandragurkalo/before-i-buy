import { useState, useEffect, useRef } from 'react';
import { X, Download, Upload } from 'lucide-react';
import { DEFAULT_SETTINGS } from '../../hooks/useItems';
import { ConfirmDialog } from '../ConfirmDialog/ConfirmDialog';
import styles from './SettingsModal.module.css';

const CURRENCIES = [
  { code: 'CAD', symbol: '$', label: 'CAD — Canadian dollar' },
  { code: 'USD', symbol: '$', label: 'USD — US dollar' },
  { code: 'EUR', symbol: '€', label: 'EUR — Euro' },
  { code: 'GBP', symbol: '£', label: 'GBP — British pound' },
  { code: 'UAH', symbol: '₴', label: 'UAH — Ukrainian hryvnia' },
];

export function SettingsModal({ settings, onSave, onClose, onExport, onImport }) {
  const [rate, setRate] = useState(String(settings.hourlyRate));
  const [currency, setCurrency] = useState(settings.currency);
  const [importError, setImportError] = useState('');
  const [pendingImport, setPendingImport] = useState(null);
  const fileInputRef = useRef(null);

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

  const handleExport = () => {
    const blob = new Blob([onExport()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `before-i-buy-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!Array.isArray(parsed.items)) throw new Error('bad shape');
        setImportError('');
        setPendingImport(parsed);
      } catch {
        setImportError('That file doesn\'t look like a valid export.');
      }
    };
    reader.readAsText(file);
  };

  const confirmImport = () => {
    onImport(pendingImport);
    setPendingImport(null);
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

          <div className={styles.field}>
            <label className={styles.label}>
              Your data
              <span className={styles.hint}>Backup or restore everything (stored only in this browser)</span>
            </label>
            <div className={styles.dataActions}>
              <button type="button" className={styles.dataBtn} onClick={handleExport}>
                <Download size={14} />
                Export
              </button>
              <button type="button" className={styles.dataBtn} onClick={() => fileInputRef.current?.click()}>
                <Upload size={14} />
                Import
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>
            {importError && <p className={styles.error} role="alert">{importError}</p>}
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

      {pendingImport && (
        <ConfirmDialog
          title="Replace all current data?"
          message={`This will overwrite everything in the app (${pendingImport.items.length} item${pendingImport.items.length === 1 ? '' : 's'} in the file) with no way to undo.`}
          confirmLabel="Replace"
          onConfirm={confirmImport}
          onCancel={() => setPendingImport(null)}
        />
      )}
    </div>
  );
}
