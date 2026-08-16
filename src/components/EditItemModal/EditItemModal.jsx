import { useItemForm, toFormState } from '../../hooks/useItemForm';
import { ItemFormTemplate } from '../ItemFormTemplate/ItemFormTemplate';

export function EditItemModal({ item, settings, onSave, onClose }) {
  const symbol = settings?.currencySymbol || '$';

  const { form, error, set, setField, validate } = useItemForm(() => toFormState(item));

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
      showStatus={item.status !== 'waiting'}
      showCoolingOff={item.status === 'waiting'}
      showTargetDate={item.status === 'waiting'}
      onChange={set}
      onPriceChange={setField('price')}
      onCategoryChange={setField('category')}
      onSavedChange={setField('savedAmount')}
      onStatusChange={setField('status')}
      onCoolingOffChange={setField('coolingOffDays')}
      onSubmit={save}
      onClose={onClose}
    />
  );
}
