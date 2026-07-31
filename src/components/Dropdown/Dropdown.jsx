import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';
import styles from './Dropdown.module.css';

export function Dropdown({ value, options, onChange, ariaLabel }) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMenuStyle({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    };
    updatePosition();

    const onClickOutside = (e) => {
      if (
        !triggerRef.current?.contains(e.target) &&
        !menuRef.current?.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };

    document.addEventListener('mousedown', onClickOutside);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  const current = options.find(o => o.value === value);

  return (
    <div className={styles.dropdown}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <span className={styles.triggerLabel}>{current?.label}</span>
      </button>

      {open && menuStyle && createPortal(
        <ul
          ref={menuRef}
          className={styles.menu}
          style={menuStyle}
          role="listbox"
          aria-label={ariaLabel}
        >
          {options.map(o => (
            <li key={o.value}>
              <button
                type="button"
                role="option"
                aria-selected={o.value === value}
                className={`${styles.option} ${o.value === value ? styles.optionActive : ''}`}
                onClick={() => { onChange(o.value); setOpen(false); }}
              >
                <span className={styles.optionLabel}>{o.label}</span>
                {o.value === value && <Check size={14} />}
              </button>
            </li>
          ))}
        </ul>,
        document.body
      )}
    </div>
  );
}
