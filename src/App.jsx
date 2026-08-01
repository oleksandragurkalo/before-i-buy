import { useState } from 'react';
import { useItems } from './hooks/useItems';
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

  return (
    <div className={styles.app}>
      <NavBar view={view} onNavigate={setView} onSettingsClick={() => setShowSettings(true)} />

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
