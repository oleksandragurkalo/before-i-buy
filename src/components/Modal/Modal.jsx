import { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '../Button/Button';
import styles from './Modal.module.css';

let lockCount = 0;
let savedScrollY = 0;

function lockBodyScroll() {
  if (lockCount === 0) {
    savedScrollY = window.scrollY;
    const root = document.getElementById('root');
    root.style.position = 'fixed';
    root.style.top = `-${savedScrollY}px`;
    root.style.left = '0';
    root.style.right = '0';
    root.style.width = '100%';
    document.body.style.overflow = 'hidden';
  }
  lockCount++;
}

function unlockBodyScroll() {
  lockCount--;
  if (lockCount === 0) {
    const root = document.getElementById('root');
    root.style.position = '';
    root.style.top = '';
    root.style.left = '';
    root.style.right = '';
    root.style.width = '';
    document.body.style.overflow = '';
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
