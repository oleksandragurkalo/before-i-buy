import { useState } from 'react';
import { EditItemModal } from '../components/EditItemModal/EditItemModal';

// Shared edit-dialog wiring for ItemCard and HistoryItem: local open state
// plus the modal itself ready to drop into JSX. Removal has no confirm step
// of its own — it's optimistic, with an Undo toast handled at the app level.
export function useItemActionDialogs({ item, settings, onEdit }) {
  const [editing, setEditing] = useState(false);

  const dialogs = editing && (
    <EditItemModal
      item={item}
      settings={settings}
      onSave={(updates) => onEdit(item.id, updates)}
      onClose={() => setEditing(false)}
    />
  );

  return { editing, setEditing, dialogs };
}
