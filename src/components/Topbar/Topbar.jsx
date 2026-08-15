import { useState, useRef, useLayoutEffect } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import { Button } from '../Button/Button';
import styles from './Topbar.module.css';

export function Topbar({ icon, title, onTitleChange, titleAdornment, actions }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const [inputWidth, setInputWidth] = useState(0);
  const measureRef = useRef(null);

  useLayoutEffect(() => {
    if (measureRef.current) setInputWidth(measureRef.current.offsetWidth);
  }, [draft, editing]);

  const startEdit = () => {
    setDraft(title);
    setEditing(true);
  };

  const save = () => {
    const trimmed = draft.trim();
    if (trimmed) onTitleChange(trimmed);
    setEditing(false);
  };

  return (
    <div className={styles.topbar}>
      <div className={styles.left}>
        <span className={styles.icon} aria-hidden="true">{icon}</span>

        {editing ? (
          <form className={styles.editForm} onSubmit={(e) => { e.preventDefault(); save(); }}>
            <span ref={measureRef} className={styles.measure} aria-hidden="true">{draft || ' '}</span>
            <input
              className={styles.input}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') setEditing(false); }}
              autoFocus
              maxLength={40}
              aria-label="List name"
              style={inputWidth ? { width: `${inputWidth + 2}px` } : undefined}
            />
            <Button variant="icon" type="submit" aria-label="Save name">
              <Check size={14} />
            </Button>
            <Button variant="icon" type="button" onClick={() => setEditing(false)} aria-label="Cancel rename">
              <X size={14} />
            </Button>
          </form>
        ) : (
          <>
            <h2 className={styles.title}>{title}</h2>
            {onTitleChange && (
              <Button variant="icon" onClick={startEdit} aria-label="Rename list">
                <Pencil size={13} />
              </Button>
            )}
            {titleAdornment}
          </>
        )}
      </div>

      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}
