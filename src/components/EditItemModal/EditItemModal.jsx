import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { CATEGORIES } from '../../utils';
import styles from './EditItemModal.module.css';

export function EditItemModal({ item, onSave, onClose }) {
  const [form, setForm] = useState({
    name: item.name,
    price: String(item.price),
    category: item.category,
    note: item.note || '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    if (error) setError('');
  };

  const save = () => {
    if (!form.name.trim()) { setError('Give it a name'); return; }
    const price = parseFloat(form.price);
    if (!form.price || isNaN(price) || price <= 0) { setError('Enter a valid price'); return; }
    onSave(form);
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Edit item">
        <div className={styles.header}>
          <h2 className={styles.title}>Edit item</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="edit-name">What do you want?</label>
            <input
              id="edit-name"
              className={styles.input}
              type="text"
              value={form.name}
              onChange={set('name')}
              autoFocus
              maxLength={80}
            />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="edit-price">Price</label>
              <input
                id="edit-price"
                className={`${styles.input} mono`}
                type="number"
                min="0.01"
                step="0.01"
                value={form.price}
                onChange={set('price')}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="edit-category">Category</label>
              <select
                id="edit-category"
                className={styles.input}
                value={form.category}
                onChange={set('category')}
              >
                {Object.entries(CATEGORIES).map(([key, { label, emoji }]) => (
                  <option key={key} value={key}>{emoji} {label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="edit-note">Note <span className={styles.optional}>(optional)</span></label>
            <input
              id="edit-note"
              className={styles.input}
              type="text"
              value={form.note}
              onChange={set('note')}
              maxLength={120}
            />
          </div>

          {error && <p className={styles.error} role="alert">{error}</p>}
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button className={styles.saveBtn} onClick={save}>Save</button>
        </div>
      </div>
    </div>
  );
}
