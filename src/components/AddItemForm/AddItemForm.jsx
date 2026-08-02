import { useItemForm, toFormState } from '../../hooks/useItemForm';
import { ItemFormTemplate } from '../ItemFormTemplate/ItemFormTemplate';

export function AddItemForm({ onAdd, onClose, symbol = '$' }) {
  const { form, error, set, setField, validate } = useItemForm(toFormState, onClose);

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
      onCategoryChange={setField('category')}
      onSavedChange={setField('savedAmount')}
      onCoolingOffChange={setField('coolingOffDays')}
      onSubmit={submit}
      onClose={onClose}
    />
  );
}
