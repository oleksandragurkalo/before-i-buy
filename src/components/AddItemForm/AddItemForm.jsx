import { useItemForm } from '../../hooks/useItemForm';
import { ItemFormTemplate } from '../ItemFormTemplate/ItemFormTemplate';

const EMPTY = { name: '', price: '', category: 'other', note: '', savedAmount: '' };

export function AddItemForm({ onAdd, onClose, symbol = '$' }) {
  const { form, error, set, setField, validate } = useItemForm(EMPTY, onClose);

  const submit = (e) => {
    e.preventDefault();
    const data = validate();
    if (!data) return;
    onAdd(data);
    onClose();
  };

  return (
    <ItemFormTemplate
      title="New item"
      submitLabel="Start the wait"
      symbol={symbol}
      form={form}
      error={error}
      showSavedAmount
      onChange={set}
      onPriceChange={setField('price')}
      onSavedChange={setField('savedAmount')}
      onSubmit={submit}
      onClose={onClose}
    />
  );
}
