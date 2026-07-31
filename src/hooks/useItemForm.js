import { useEffect, useState } from 'react';

/**
 * Shared logic for AddItemForm and EditItemModal.
 *
 * @param {object} initial  - initial field values
 * @param {function} onClose - called on Escape keydown
 * @returns {{ form, error, set, setField, validate }}
 */
export function useItemForm(initial, onClose) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  /** onChange handler factory for plain inputs / selects */
  const set = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    if (error) setError('');
  };

  /** Direct setter for programmatic updates (e.g. NumberStepper callbacks) */
  const setField = (field) => (value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  /**
   * Validates the form and returns the parsed data, or null on failure.
   * Sets the error state as a side effect when validation fails.
   */
  const validate = () => {
    if (!form.name.trim()) { setError('Give it a name'); return null; }
    const price = parseFloat(form.price);
    if (!form.price || isNaN(price) || price <= 0) { setError('Enter a valid price'); return null; }
    return { ...form, price };
  };

  return { form, error, set, setField, validate };
}
