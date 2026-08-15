import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check, Pencil, Plus, Share2, Trash2, X } from 'lucide-react';
import { Button } from '../Button/Button';
import { DeleteListModal } from './DeleteListModal';
import { ShareListModal } from './ShareListModal';
import styles from './ListSwitcher.module.css';

export function ListSwitcher({
  lists, sharedLists = [], currentListId, onSelect, onCreate, onRename, onDelete,
  friends = [], onShare, onUnshare,
}) {
  const [open, setOpen] = useState(false);
  const [renamingId, setRenamingId] = useState(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [creating, setCreating] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [shareTarget, setShareTarget] = useState(null);
  const [error, setError] = useState('');
  const [creatingPending, setCreatingPending] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e) => {
      if (!wrapperRef.current?.contains(e.target)) closeMenu();
    };
    const onKey = (e) => { if (e.key === 'Escape') closeMenu(); };
    document.addEventListener('mousedown', onClickOutside);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const closeMenu = () => {
    setOpen(false);
    setRenamingId(null);
    setCreating(false);
    setNewListName('');
    setError('');
  };

  const startRename = (list) => {
    setError('');
    setRenamingId(list.id);
    setRenameDraft(list.name);
  };

  const submitRename = async (e) => {
    e.preventDefault();
    const trimmed = renameDraft.trim();
    setRenamingId(null);
    if (!trimmed) return;
    const { error: renameError } = await onRename(renamingId, trimmed);
    if (renameError) setError(renameError);
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    if (creatingPending) return;
    setCreatingPending(true);
    setError('');
    try {
      const { error: createError } = await onCreate(newListName);
      if (createError) { setError(createError); return; }
      closeMenu();
    } catch (err) {
      console.error('createList error', err);
      setError('Could not create the list.');
    } finally {
      setCreatingPending(false);
    }
  };

  const cancelCreate = () => {
    setCreating(false);
    setNewListName('');
  };

  const requestDelete = (list) => {
    setError('');
    if (lists.length <= 1) { setError("You need at least one list — can't delete your last one."); return; }
    setDeleteTarget(list);
  };

  const requestShare = (list) => {
    setError('');
    setShareTarget(list);
  };

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Switch list"
      >
        <ChevronDown size={14} />
      </button>

      {open && (
        <div className={styles.menu} role="menu">
          <p className={styles.sectionLabel}>My lists</p>

          {lists.map(list => (
            <div key={list.id} className={styles.row}>
              {renamingId === list.id ? (
                <form className={styles.renameForm} onSubmit={submitRename}>
                  <input
                    className={styles.renameInput}
                    value={renameDraft}
                    onChange={e => setRenameDraft(e.target.value)}
                    autoFocus
                    maxLength={40}
                    aria-label="List name"
                  />
                  <Button variant="icon" type="submit" aria-label="Save name">
                    <Check size={13} />
                  </Button>
                  <Button variant="icon" type="button" onClick={() => setRenamingId(null)} aria-label="Cancel rename">
                    <X size={13} />
                  </Button>
                </form>
              ) : (
                <>
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={list.id === currentListId}
                    className={styles.item}
                    onClick={() => { onSelect(list.id); closeMenu(); }}
                  >
                    <span className={styles.check} aria-hidden="true">
                      {list.id === currentListId && <Check size={13} />}
                    </span>
                    <span className={styles.itemName}>{list.name}</span>
                    {list.visibility === 'public' && <span className={styles.badge}>Shared</span>}
                  </button>
                  <div className={styles.rowActions}>
                    <Button variant="icon" onClick={() => requestShare(list)} aria-label={`Share ${list.name}`}>
                      <Share2 size={12} />
                    </Button>
                    <Button variant="icon" onClick={() => startRename(list)} aria-label={`Rename ${list.name}`}>
                      <Pencil size={12} />
                    </Button>
                    <Button variant="icon" tone="danger" onClick={() => requestDelete(list)} aria-label={`Delete ${list.name}`}>
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}

          {error && <p className={styles.error}>{error}</p>}

          {creating ? (
            <form className={styles.renameForm} onSubmit={submitCreate}>
              <input
                className={styles.renameInput}
                value={newListName}
                onChange={e => setNewListName(e.target.value)}
                placeholder="List name"
                autoFocus
                maxLength={40}
                aria-label="New list name"
              />
              <Button variant="icon" type="submit" disabled={creatingPending} aria-label="Create list">
                <Check size={13} />
              </Button>
              <Button variant="icon" type="button" onClick={cancelCreate} aria-label="Cancel new list">
                <X size={13} />
              </Button>
            </form>
          ) : (
            <button type="button" className={styles.newListBtn} onClick={() => setCreating(true)}>
              <Plus size={13} />
              New list
            </button>
          )}

          {sharedLists.length > 0 && (
            <>
              <p className={styles.sectionLabel}>Shared with me</p>
              {sharedLists.map(list => (
                <button
                  key={list.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={list.id === currentListId}
                  className={styles.item}
                  onClick={() => { onSelect(list.id); closeMenu(); }}
                >
                  <span className={styles.check} aria-hidden="true">
                    {list.id === currentListId && <Check size={13} />}
                  </span>
                  <span className={styles.itemName}>{list.name} <span className={styles.muted}>by @{list.ownerUsername}</span></span>
                </button>
              ))}
            </>
          )}
        </div>
      )}

      {deleteTarget && (
        <DeleteListModal
          list={deleteTarget}
          onConfirm={onDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}

      {shareTarget && (
        <ShareListModal
          list={shareTarget}
          friends={friends}
          onShare={onShare}
          onUnshare={onUnshare}
          onClose={() => setShareTarget(null)}
        />
      )}
    </div>
  );
}
