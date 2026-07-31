import { useState, useEffect, useRef } from 'react';
import { X, Download, Upload } from 'lucide-react';
import { DEFAULT_SETTINGS } from '../../hooks/useItems';
import { computeHourlyRate, convertPayAmount, defaultPayAmountFor, formatPrice } from '../../utils';
import { ConfirmDialog } from '../ConfirmDialog/ConfirmDialog';
import { NumberStepper } from '../NumberStepper/NumberStepper';
import styles from './SettingsModal.module.css';

const CURRENCIES = [
  { code: 'CAD', symbol: '$', label: 'CAD — Canadian dollar' },
  { code: 'USD', symbol: '$', label: 'USD — US dollar' },
  { code: 'EUR', symbol: '€', label: 'EUR — Euro' },
  { code: 'PLN', symbol: 'zł', label: 'PLN — Polish złoty' },
  { code: 'UAH', symbol: '₴', label: 'UAH — Ukrainian hryvnia' },
];

const PAY_PERIODS = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'annually', label: 'Annually' },
];

export function SettingsModal({ settings, onSave, onClose, onExport, onImport }) {
  const [payPeriod, setPayPeriod] = useState(settings.payPeriod || DEFAULT_SETTINGS.payPeriod);
  const [payAmount, setPayAmount] = useState(String(settings.payAmount ?? settings.hourlyRate));
  const [payType, setPayType] = useState(settings.payType || DEFAULT_SETTINGS.payType);
  const [taxRate, setTaxRate] = useState(String(settings.taxRate ?? DEFAULT_SETTINGS.taxRate));
  const [hoursPerWeek, setHoursPerWeek] = useState(String(settings.hoursPerWeek ?? DEFAULT_SETTINGS.hoursPerWeek));
  const [currency, setCurrency] = useState(settings.currency);
  const [importError, setImportError] = useState('');
  const [pendingImport, setPendingImport] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const computedHourlyRate = computeHourlyRate({
    payPeriod, payAmount, payType,
    taxRate: parseFloat(taxRate) || 0,
    hoursPerWeek: parseFloat(hoursPerWeek) || 1,
  });

  const currentSymbol = CURRENCIES.find(c => c.code === currency)?.symbol || '$';

  const changePeriod = (nextPeriod) => {
    const amt = parseFloat(payAmount);
    if (!isNaN(amt) && amt > 0) {
      const converted = convertPayAmount(amt, payPeriod, nextPeriod, parseFloat(hoursPerWeek) || 1);
      const rounded = nextPeriod === 'hourly' ? Math.round(converted * 100) / 100 : Math.round(converted);
      setPayAmount(String(rounded));
    }
    setPayPeriod(nextPeriod);
  };

  const changeCurrency = (nextCode) => {
    setPayAmount(String(defaultPayAmountFor(payPeriod, nextCode, parseFloat(hoursPerWeek) || 1)));
    setCurrency(nextCode);
  };

  const save = () => {
    if (computedHourlyRate === null || computedHourlyRate <= 0) return;
    const curr = CURRENCIES.find(c => c.code === currency);
    onSave({
      hourlyRate: computedHourlyRate,
      currency,
      currencySymbol: curr?.symbol || '$',
      payPeriod,
      payAmount: parseFloat(payAmount),
      payType,
      taxRate: parseFloat(taxRate) || 0,
      hoursPerWeek: parseFloat(hoursPerWeek) || 1,
    });
    onClose();
  };

  const reset = () => {
    setPayPeriod(DEFAULT_SETTINGS.payPeriod);
    setPayAmount(String(DEFAULT_SETTINGS.payAmount));
    setPayType(DEFAULT_SETTINGS.payType);
    setTaxRate(String(DEFAULT_SETTINGS.taxRate));
    setHoursPerWeek(String(DEFAULT_SETTINGS.hoursPerWeek));
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
            <label className={styles.label}>
              Your pay
              <span className={styles.hint}>Used to work out hours of work per item</span>
            </label>

            <div className={styles.segmented}>
              {PAY_PERIODS.map(p => (
                <button
                  key={p.value}
                  type="button"
                  className={`${styles.segment} ${payPeriod === p.value ? styles.segmentActive : ''}`}
                  onClick={() => changePeriod(p.value)}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className={styles.row}>
              <NumberStepper
                id="pay-amount"
                value={payAmount}
                onChange={setPayAmount}
                step={payPeriod === 'hourly' ? 1 : payPeriod === 'monthly' ? 50 : 500}
                min={0}
                ariaLabel="pay amount"
              />
              <div className={styles.segmented}>
                <button
                  type="button"
                  className={`${styles.segment} ${payType === 'net' ? styles.segmentActive : ''}`}
                  onClick={() => setPayType('net')}
                >
                  Net
                </button>
                <button
                  type="button"
                  className={`${styles.segment} ${payType === 'gross' ? styles.segmentActive : ''}`}
                  onClick={() => setPayType('gross')}
                >
                  Gross
                </button>
              </div>
            </div>

            {payType === 'gross' && (
              <div className={styles.subField}>
                <label className={styles.smallLabel} htmlFor="tax-rate">Effective tax rate (%)</label>
                <NumberStepper
                  id="tax-rate"
                  value={taxRate}
                  onChange={setTaxRate}
                  step={1}
                  min={0}
                  max={90}
                  ariaLabel="tax rate percent"
                />
              </div>
            )}

            {payPeriod !== 'hourly' && (
              <div className={styles.subField}>
                <label className={styles.smallLabel} htmlFor="hours-per-week">Hours worked per week</label>
                <NumberStepper
                  id="hours-per-week"
                  value={hoursPerWeek}
                  onChange={setHoursPerWeek}
                  step={1}
                  min={1}
                  max={100}
                  ariaLabel="hours per week"
                />
              </div>
            )}

            <p className={styles.help}>
              {computedHourlyRate !== null && computedHourlyRate > 0
                ? <>≈ <strong>{formatPrice(computedHourlyRate, currentSymbol)}/hr</strong> net take-home</>
                : 'Enter a valid amount'}
            </p>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="currency">Currency</label>
            <select
              id="currency"
              className={styles.input}
              value={currency}
              onChange={(e) => changeCurrency(e.target.value)}
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
