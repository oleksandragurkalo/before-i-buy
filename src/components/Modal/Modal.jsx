import { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '../Button/Button';
import styles from './Modal.module.css';

// Module-level so nested modals (e.g. a confirm dialog opened over settings)
// share one lock: only the first mount locks and only the last unmount
// restores scroll. `overflow: hidden` alone doesn't stop touch-driven
// scroll/rubber-banding on iOS Safari, so the body is pinned with
// position: fixed at its current offset instead.
let lockCount = 0;
let savedScrollY = 0;

function lockBodyScroll() {
  if (lockCount === 0) {
    savedScrollY = window.scrollY;
    const body = document.body;
    body.style.position = 'fixed';
    body.style.top = `-${savedScrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';
  }
  lockCount++;
}

function unlockBodyScroll() {
  lockCount--;
  if (lockCount === 0) {
    const body = document.body;
    body.style.position = '';
    body.style.top = '';
    body.style.left = '';
    body.style.right = '';
    body.style.width = '';
    body.style.overflow = '';
    window.scrollTo(0, savedScrollY);
  }
}

export function Modal({ title, onClose, children, footer, role = 'dialog', maxWidth = 480, zIndex = 200 }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    lockBodyScroll();
    return unlockBodyScroll;
  }, []);

  return (
    <div
      className={styles.overlay}
      style={{ '--modal-z-index': zIndex }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={styles.modal}
        role={role}
        aria-modal="true"
        aria-label={title}
        style={{ '--modal-max-width': `${maxWidth}px` }}
      >
        <div className={`${styles.header} ${!children ? styles.noBorder : ''}`}>
          <span className={styles.title}>{title}</span>
          <Button variant="icon" onClick={onClose} aria-label="Close">
            <X size={16} />
          </Button>
        </div>
        {children && <div className={styles.body}>{children}</div>}
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  );
}
