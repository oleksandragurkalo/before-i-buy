import { useItemForm } from '../../hooks/useItemForm';
import { ItemFormTemplate } from '../ItemFormTemplate/ItemFormTemplate';

export function EditItemModal({ item, settings, onSave, onClose }) {
  const symbol = settings?.currencySymbol || '$';

  const initial = {
    name: item.name,
    price: String(item.price),
    category: item.category,
    note: item.note || '',
    savedAmount: item.savedAmount ? String(item.savedAmount) : '',
  };

  const { form, error, set, setField, validate } = useItemForm(initial, onClose);

  const save = (e) => {
    e.preventDefault();
    const data = validate();
    if (!data) return;
    onSave(data);
    onClose();
  };

  return (
    <ItemFormTemplate
      title="Edit item"
      submitLabel="Save"
      symbol={symbol}
      form={form}
      error={error}
      showSavedAmount={item.status === 'waiting'}
      onChange={set}
      onPriceChange={setField('price')}
      onSavedChange={setField('savedAmount')}
      onSubmit={save}
      onClose={onClose}
    />
  );
}
