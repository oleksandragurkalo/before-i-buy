import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { CATEGORIES } from '../../utils';
import { NumberStepper } from '../NumberStepper/NumberStepper';
import styles from './AddItemForm.module.css';

const EMPTY = { name: '', price: '', category: 'other', note: '', savedAmount: '' };

export function AddItemForm({ onAdd, symbol = '$' }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');

  const set = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    if (error) setError('');
  };

  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Give it a name');
      return;
    }
    const price = parseFloat(form.price);
    if (!form.price || isNaN(price) || price <= 0) {
      setError('Enter a valid price');
      return;
    }
    onAdd({ ...form, price });
    setForm(EMPTY);
    setOpen(false);
  };

  if (!open) {
    return (<button className={styles.trigger} onClick={() => setOpen(true)}>
        <Plus size={18}/>
        Add something I want to buy
      </button>);
  }

  return (<div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>New item</span>
        <button className={styles.close} onClick={() => {
          setOpen(false);
          setForm(EMPTY);
          setError('');
        }} aria-label="Cancel">
          <X size={16}/>
        </button>
      </div>

      <form onSubmit={submit} className={styles.form} noValidate>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="item-name">What do you want?</label>
          <input
            id="item-name"
            className={styles.input}
            type="text"
            placeholder="e.g. Sony WH-1000XM5"
            value={form.name}
            onChange={set('name')}
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
              onChange={(v) => { setForm(prev => ({ ...prev, price: v })); if (error) setError(''); }}
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
              onChange={set('category')}
            >
              {Object.entries(CATEGORIES).map(([key, { label, emoji }]) => (<option key={key} value={key}>{emoji} {label}</option>))}
            </select>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="item-note">Why do you want it? <span className={styles.optional}>(optional)</span></label>
          <input
            id="item-note"
            className={styles.input}
            type="text"
            placeholder="e.g. My headphones broke last week"
            value={form.note}
            onChange={set('note')}
            maxLength={120}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="item-saved">Already saved ({symbol}) <span className={styles.optional}>(optional)</span></label>
          <NumberStepper
            id="item-saved"
            value={form.savedAmount}
            onChange={(v) => setForm(prev => ({ ...prev, savedAmount: v }))}
            placeholder="0"
            min={0}
            step={1}
            ariaLabel="amount already saved"
          />
        </div>

        {error && <p className={styles.error} role="alert">{error}</p>}

        <div className={styles.formActions}>
          <button type="button" className={styles.cancelBtn} onClick={() => {
            setOpen(false);
            setForm(EMPTY);
            setError('');
          }}>
            Cancel
          </button>
          <button type="submit" className={styles.submitBtn}>
            Start the wait
          </button>
        </div>
      </form>
    </div>);
}
