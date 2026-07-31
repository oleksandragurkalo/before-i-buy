import { useState } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog/ConfirmDialog';
import { EditItemModal } from '../components/EditItemModal/EditItemModal';

/**
 * Shared edit/remove wiring for ItemCard and HistoryItem: local open state
 * for the two dialogs, plus the dialogs themselves ready to drop into JSX.
 *
 * Pass confirmRemoval: false when removal is already confirmed elsewhere
 * (e.g. ItemCard's DecisionModal already offers "Remove item").
 */
export function useItemActionDialogs({ item, settings, onRemove, onEdit, confirmTitle, confirmRemoval = true }) {
  const [editing, setEditing] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  const dialogs = (
    <>
      {confirmRemoval && confirmingRemove && (
        <ConfirmDialog
          icon="🗑️"
          title={confirmTitle}
          onConfirm={() => onRemove(item.id)}
          onCancel={() => setConfirmingRemove(false)}
        />
      )}
      {editing && (
        <EditItemModal
          item={item}
          settings={settings}
          onSave={(updates) => onEdit(item.id, updates)}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  );

  return { editing, setEditing, confirmingRemove, setConfirmingRemove, dialogs };
}
