import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown, Check, Pencil, Plus, Share2, Trash2, X } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { Button } from '../Button/Button';
import { DeleteListModal } from './DeleteListModal';
import { ShareListModal } from './ShareListModal';
import styles from './ListSwitcher.module.css';

// Mirrors .menu's max-width in ListSwitcher.module.css — the JS-computed
// inline maxWidth below never exceeds this, it only ever shrinks it further
// for a viewport too narrow to fit it.
const MENU_MAX_WIDTH = 300;
const EDGE_MARGIN = 16;

// Pure decision behind the menu's mobile positioning (see the comment on
// the `useLayoutEffect` that calls this, in ListSwitcher, for the why).
// Exported for unit testing — it takes plain numbers rather than DOM rects
// so it can be tested without a DOM environment.
export function computeMenuPosition({ wrapperLeft, wrapperRight, menuWidth, viewportWidth }) {
  const maxWidth = Math.min(MENU_MAX_WIDTH, viewportWidth - EDGE_MARGIN * 2);
  const naturalWidth = Math.min(menuWidth, maxWidth);
  const availableToRight = viewportWidth - EDGE_MARGIN - wrapperLeft;
  if (naturalWidth > availableToRight) {
    // CSS `right` is measured inward from the containing block's (the
    // wrapper's) right edge, so convert the desired viewport-relative
    // right edge (viewportWidth - EDGE_MARGIN) into that frame.
    const right = wrapperRight - (viewportWidth - EDGE_MARGIN);
    return { mode: 'right', right, maxWidth };
  }
  return { mode: 'standard', maxWidth };
}

// No "Shared with" prefix — the adjacent "Shared" badge already says that,
// and the menu is only ~240-300px wide, so every character here competes
// directly with how many usernames actually fit before truncating.
function formatSharedWith(friendsForList) {
  if (!friendsForList || friendsForList.length === 0) return null;
  const names = friendsForList.map(f => `@${f.username}`);
  if (names.length <= 3) return names.join(', ');
  return `${names.slice(0, 3).join(', ')} +${names.length - 3} more`;
}

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
  // listId -> array of friend objects it's shared with, loaded lazily (only
  // once the menu is opened) and only for lists already flagged `public` —
  // a `private` list is kept in sync to have zero shares (see useLists.js),
  // so there's nothing to fetch for the common case of an unshared list.
  const [shareMap, setShareMap] = useState({});
  // { mode: 'standard' | 'right', maxWidth, right? }, in pixels — null while
  // closed, so the JSX default (CSS left: 0 / max-width: 300px) is used
  // until this computes a real value. Recomputed from scratch on every open
  // (never carried over from the previous time it was open — see why
  // below). 'standard' leaves the menu's left edge flush with the trigger,
  // same as before any of this positioning logic existed. 'right' instead
  // anchors the menu's right edge to the viewport's own EDGE_MARGIN (16px)
  // — the same horizontal inset the page content uses.
  const [menuPos, setMenuPos] = useState(null);
  const wrapperRef = useRef(null);
  const menuRef = useRef(null);

  // The trigger sits right after the (possibly long, especially on mobile)
  // current list title, so unlike a fixed-position control it can end up
  // anywhere across the header — the closer it sits to the right edge, the
  // less room 'standard' placement has before the menu runs past the
  // page's right margin and causes horizontal scroll. So this only departs
  // from 'standard' when it has to: it lets the menu mount and render at
  // its natural, content-driven width under 'standard' CSS first (position
  // doesn't affect intrinsic width, so measuring before this effect
  // resolves menuPos is safe), then compares that width against the space
  // actually available between the trigger and the right margin. Only if
  // the menu wouldn't fit there does it switch to 'right'. Runs as a layout
  // effect so that switch — when it happens — lands before the browser
  // paints, with no visible jump.
  //
  // This also *sets* menuWidth itself (as an inline maxWidth), rather than
  // trusting the CSS max-width alone, in both modes. That measure-then-trust
  // approach is what caused the "moves on every open, converges after ~10
  // clicks" bug in an earlier version: the CSS cap was written as
  // `min(300px, calc(100vw - 32px))`, but 100vw and window.innerWidth
  // disagree by a scrollbar's width whenever a vertical scrollbar is
  // present — and this menu, before being repositioned, could itself
  // briefly extend the page's scrollable height enough to toggle that
  // scrollbar on or off, feeding a slightly different 100vw into the *next*
  // open's measurement. Computing maxWidth here from window.innerWidth
  // alone — never from 100vw or a post-render measurement — removes that
  // feedback loop entirely: every open computes the exact same answer from
  // the exact same inputs, independent of anything the previous open did.
  useLayoutEffect(() => {
    if (!open) { setMenuPos(null); return; }
    const updatePosition = () => {
      const wrapperRect = wrapperRef.current?.getBoundingClientRect();
      const menuRect = menuRef.current?.getBoundingClientRect();
      if (!wrapperRect || !menuRect) return;
      // Below ~272px viewport width this would undershoot the menu's own
      // 240px min-width and let it run past whichever edge it's anchored
      // to — but that's narrower than any real phone, so it's left
      // unclamped.
      setMenuPos(computeMenuPosition({
        wrapperLeft: wrapperRect.left,
        wrapperRight: wrapperRect.right,
        menuWidth: menuRect.width,
        viewportWidth: window.innerWidth,
      }));
    };
    updatePosition();
    // Covers a mobile orientation change while the menu happens to be open
    // — resize is enough on its own since the trigger's position only
    // moves relative to the viewport when the viewport itself changes size
    // (unlike Dropdown.jsx's portal-rendered menu, this one scrolls with
    // its trigger, so a scroll listener isn't needed here).
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [open]);

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

  // Reloads on every open (not just once) so a share change made elsewhere
  // (another tab, or the ShareListModal on a previous open) is reflected —
  // mirrors ShareListModal's own "reload each time it's opened" pattern.
  useEffect(() => {
    if (!open) return;
    const publicListIds = lists.filter(l => l.visibility === 'public').map(l => l.id);
    if (publicListIds.length === 0) { setShareMap({}); return; }
    let cancelled = false;
    supabase.from('list_shares').select('list_id, shared_with_user_id').in('list_id', publicListIds)
      .then(({ data, error: sharesError }) => {
        if (cancelled) return;
        if (sharesError) { console.error('list shares load error', sharesError); return; }
        const map = {};
        data.forEach(row => {
          const friend = friends.find(f => f.userId === row.shared_with_user_id);
          if (!friend) return;
          (map[row.list_id] ??= []).push(friend);
        });
        setShareMap(map);
      })
      .catch((err) => { if (!cancelled) console.error('list shares load error', err); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Keeps the inline "Shared with …" line in sync immediately after a
  // toggle in ShareListModal, without waiting for the menu to be reopened.
  const updateShareMap = (listId, friendUserId, added) => {
    setShareMap(prev => {
      const current = prev[listId] || [];
      if (added) {
        if (current.some(f => f.userId === friendUserId)) return prev;
        const friend = friends.find(f => f.userId === friendUserId);
        return friend ? { ...prev, [listId]: [...current, friend] } : prev;
      }
      return { ...prev, [listId]: current.filter(f => f.userId !== friendUserId) };
    });
  };

  const handleShare = async (listId, friendUserId) => {
    const result = await onShare(listId, friendUserId);
    if (!result.error) updateShareMap(listId, friendUserId, true);
    return result;
  };

  const handleUnshare = async (listId, friendUserId) => {
    const result = await onUnshare(listId, friendUserId);
    if (!result.error) updateShareMap(listId, friendUserId, false);
    return result;
  };

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
        <div
          className={styles.menu}
          role="menu"
          ref={menuRef}
          style={
            menuPos == null ? undefined
              : menuPos.mode === 'right'
                ? { left: 'auto', right: menuPos.right, maxWidth: menuPos.maxWidth }
                : { left: 0, right: 'auto', maxWidth: menuPos.maxWidth }
          }
        >
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
                    <span className={styles.itemTextBlock}>
                      <span className={styles.itemName}>{list.name}</span>
                      {list.visibility === 'public' && shareMap[list.id]?.length > 0 && (
                        <span className={styles.shareInfo} title={formatSharedWith(shareMap[list.id])}>
                          {formatSharedWith(shareMap[list.id])}
                        </span>
                      )}
                    </span>
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
          onShare={handleShare}
          onUnshare={handleUnshare}
          onClose={() => setShareTarget(null)}
        />
      )}
    </div>
  );
}
