import { useEffect, useState } from 'react';
import { useItems } from './hooks/useItems';
import { coolingOffStatus } from './utils';
import { NavBar } from './components/NavBar/NavBar';
import { StartPage } from './components/StartPage/StartPage';
import { AddItemForm } from './components/AddItemForm/AddItemForm';
import { PageHeader } from './components/PageHeader/PageHeader';
import { WaitingPage } from './components/WaitingPage/WaitingPage';
import { HistoryPage } from './components/HistoryPage/HistoryPage';
import { SettingsModal } from './components/SettingsModal/SettingsModal';
import { Toast } from './components/Toast/Toast';
import styles from './App.module.css';

export default function App() {
  const [view, setView] = useState('start');
  const [showSettings, setShowSettings] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [pendingUndo, setPendingUndo] = useState(null);
  const {
    waiting, history,
    settings, updateSettings,
    addItem, editItem, decide, removeItem, restoreItem,
  } = useItems();

  const handleRemove = (id) => {
    const removed = removeItem(id);
    if (removed) setPendingUndo(removed);
  };

  const handleUndo = () => {
    if (pendingUndo) restoreItem(pendingUndo);
    setPendingUndo(null);
  };

  // A pending Undo snapshot is frozen at removal time, so if currency
  // changes while it's showing, the snapshot's amounts are left in the old
  // currency — restoring it would put a stale, inconsistent price back
  // into an otherwise-converted list. Simplest safe fix: drop the toast.
  useEffect(() => {
    setPendingUndo(null);
  }, [settings.currency]);

  // Every waiting item that's currently decidable — whether it got there by
  // waiting out its cooling-off period or started at "No wait" — counts as
  // actionable, so all of them show up in the badge.
  const readyCount = waiting.filter(item => coolingOffStatus(item, item.coolingOffDays ?? 7).ready).length;

  return (
    <div className={styles.app}>
      <NavBar view={view} onNavigate={setView} onSettingsClick={() => setShowSettings(true)} readyCount={readyCount} />

      {view === 'start' && <StartPage onGetStarted={() => setView('waiting')} />}

      {view !== 'start' && (
        <main className={styles.main}>
          <div className={styles.layout}>
            <div className={styles.content}>
              <PageHeader
                waiting={waiting}
                history={history}
                settings={settings}
                onTitleChange={(name) => updateSettings({ listName: name })}
                onAddItemClick={() => setShowAddItem(true)}
              />

              {showAddItem && (
                <AddItemForm onAdd={addItem} onClose={() => setShowAddItem(false)} symbol={settings.currencySymbol} />
              )}

              {view === 'waiting' && (
                <WaitingPage
                  waiting={waiting}
                  history={history}
                  settings={settings}
                  onDecide={decide}
                  onRemove={handleRemove}
                  onEdit={editItem}
                />
              )}

              {view === 'history' && (
                <HistoryPage
                  waiting={waiting}
                  history={history}
                  settings={settings}
                  onRemove={handleRemove}
                  onEdit={editItem}
                />
              )}
            </div>
          </div>
        </main>
      )}

      {showSettings && (
        <SettingsModal
          settings={settings}
          onSave={updateSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {pendingUndo && (
        <Toast
          message={`Removed "${pendingUndo.item.name}"`}
          actionLabel="Undo"
          onAction={handleUndo}
          onDismiss={() => setPendingUndo(null)}
        />
      )}
    </div>
  );
}
