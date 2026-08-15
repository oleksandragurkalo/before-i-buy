import { useState } from 'react';
import { ListChecks, Plus, Share2 } from 'lucide-react';
import { Topbar } from '../Topbar/Topbar';
import { ListSwitcher } from '../ListSwitcher/ListSwitcher';
import { ShareListModal } from '../ListSwitcher/ShareListModal';
import { InsightsPanel } from '../InsightsPanel/InsightsPanel';
import { Button } from '../Button/Button';
import layout from '../../App.module.css';
import styles from './PageHeader.module.css';

export function PageHeader({
  waiting, history, settings, onAddItemClick,
  lists = [], sharedLists = [], currentList, currentListId, onSelectList, onCreateList, onRenameList, onDeleteList,
  friends = [], onShare, onUnshare,
  readOnly = false,
}) {
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const isShared = currentList?.visibility === 'public';

  return (
    <>
      <Topbar
        icon={<ListChecks size={16} />}
        title={currentList?.name || 'Waiting List'}
        onTitleChange={!readOnly && currentList ? (name) => onRenameList(currentList.id, name) : undefined}
        titleAdornment={
          <ListSwitcher
            lists={lists}
            sharedLists={sharedLists}
            currentListId={currentListId}
            onSelect={onSelectList}
            onCreate={onCreateList}
            onRename={onRenameList}
            onDelete={onDeleteList}
            friends={friends}
            onShare={onShare}
            onUnshare={onUnshare}
          />
        }
        actions={!readOnly && currentList && (
          <>
            <Button
              className={styles.shareBtn}
              variant="secondary"
              icon={<Share2 size={14} />}
              onClick={() => setShareModalOpen(true)}
              aria-label={isShared ? `Manage sharing for ${currentList.name} — currently shared` : `Share ${currentList.name}`}
            >
              <span className={styles.shareLabel} aria-hidden="true">
                {isShared ? 'Shared' : 'Share'}
                {isShared && <span className={styles.sharedDot} aria-hidden="true" />}
              </span>
            </Button>
            <Button className={styles.addItemBtn} icon={<Plus size={14} />} onClick={onAddItemClick} aria-label="Add Item">
              <span className={styles.addItemLabel} aria-hidden="true">Add Item</span>
            </Button>
          </>
        )}
      />

      {shareModalOpen && currentList && (
        <ShareListModal
          list={currentList}
          friends={friends}
          onShare={onShare}
          onUnshare={onUnshare}
          onClose={() => setShareModalOpen(false)}
        />
      )}

      {readOnly && currentList && (
        <p className={styles.readOnlyNote}>
          Viewing @{currentList.ownerUsername}'s list — read only. Amounts shown are in their currency.
        </p>
      )}

      <aside className={layout.aside}>
        <InsightsPanel waiting={waiting} history={history} settings={settings} />
      </aside>
    </>
  );
}
