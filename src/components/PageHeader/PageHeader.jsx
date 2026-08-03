import { ListChecks, Plus } from 'lucide-react';
import { Topbar } from '../Topbar/Topbar';
import { InsightsPanel } from '../InsightsPanel/InsightsPanel';
import { Button } from '../Button/Button';
import layout from '../../App.module.css';
import styles from './PageHeader.module.css';

export function PageHeader({ waiting, history, settings, onTitleChange, onAddItemClick }) {
  return (
    <>
      <Topbar
        icon={<ListChecks size={16} />}
        title={settings.listName || 'Waiting List'}
        onTitleChange={onTitleChange}
        actions={
          <Button className={styles.addItemBtn} icon={<Plus size={14} />} onClick={onAddItemClick}>
            <span className={styles.addItemLabel}>Add Item</span>
          </Button>
        }
      />

      <aside className={layout.aside}>
        <InsightsPanel waiting={waiting} history={history} settings={settings} />
      </aside>
    </>
  );
}
