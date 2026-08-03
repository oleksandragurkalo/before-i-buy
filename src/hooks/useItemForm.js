import { useEffect, useRef, useState } from 'react';
import { DEFAULT_COOLING_OFF_DAYS } from '../config';

export function toFormState(item = {}) {
  return {
    name: item.name ?? '',
    price: item.price != null ? String(item.price) : '',
    category: item.category ?? 'other',
    note: item.note ?? '',
    savedAmount: item.savedAmount ? String(item.savedAmount) : '',
    coolingOffDays: String(item.coolingOffDays ?? DEFAULT_COOLING_OFF_DAYS),
    status: item.status ?? 'waiting',
  };
}

export function useItemForm(initial, onClose) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const setHandlers = useRef({});
  const setFieldHandlers = useRef({});

  const set = (field) => {
    if (!setHandlers.current[field]) {
      setHandlers.current[field] = (e) => {
        setForm(prev => ({ ...prev, [field]: e.target.value }));
        setError('');
      };
    }
    return setHandlers.current[field];
  };

  const setField = (field) => {
    if (!setFieldHandlers.current[field]) {
      setFieldHandlers.current[field] = (value) => {
        setForm(prev => ({ ...prev, [field]: value }));
        setError('');
      };
    }
    return setFieldHandlers.current[field];
  };

  const validate = () => {
    if (!form.name.trim()) { setError('Give it a name'); return null; }
    const price = parseFloat(form.price);
    if (!form.price || isNaN(price) || price <= 0) { setError('Enter a valid price'); return null; }
    return { ...form, price };
  };

  return { form, error, set, setField, validate };
}
