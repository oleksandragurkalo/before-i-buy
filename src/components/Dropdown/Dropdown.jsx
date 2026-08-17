import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';
import styles from './Dropdown.module.css';

export function Dropdown({ value, options, onChange, ariaLabel }) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  // Real height of the mounted menu, once known — stays 0 (so
  // updatePosition assumes "opens below") until the measurement effect
  // below fills it in.
  const menuHeightRef = useRef(0);
  const measuredRef = useRef(false);

  const updatePosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const menuHeight = menuHeightRef.current;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    // Flip above the trigger only when below genuinely doesn't fit and
    // above has more room — small screens (mobile) are exactly where a
    // trigger near the bottom of the viewport (or above the on-screen
    // keyboard) makes "always open downward" clip the menu.
    const openUpward = menuHeight > spaceBelow - 8 && spaceAbove > spaceBelow;
    const top = openUpward ? Math.max(8, rect.top - 4 - menuHeight) : rect.bottom + 4;
    setMenuStyle({ top, left: rect.left, width: rect.width });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    menuHeightRef.current = 0;
    measuredRef.current = false;
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
  }, [open, updatePosition]);

  // The very first updatePosition() above runs before the menu exists in
  // the DOM (menuHeightRef.current is still 0), so it can only guess
  // "opens below". Once menuStyle flips it from null to an object, the menu
  // portal mounts and this effect — a separate useLayoutEffect, so it runs
  // as its own synchronous pre-paint pass after that DOM mutation commits —
  // measures the real height and, if that changes the flip decision,
  // repositions. All of this resolves before the browser ever paints, so
  // there's no flicker; deliberately not requestAnimationFrame, which only
  // fires on an actual compositor frame and can stall indefinitely on a
  // backgrounded/inactive tab.
  useLayoutEffect(() => {
    if (!open || !menuStyle || measuredRef.current || !menuRef.current) return;
    measuredRef.current = true;
    menuHeightRef.current = menuRef.current.getBoundingClientRect().height;
    updatePosition();
  }, [open, menuStyle, updatePosition]);

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
        aria-label={current?.label ? `${ariaLabel}: ${current.label}` : ariaLabel}
      >
        <span className={styles.triggerLabel} aria-hidden="true">{current?.label}</span>
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
