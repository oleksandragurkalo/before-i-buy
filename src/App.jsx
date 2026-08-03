import { useEffect, useRef, useState } from 'react';
import { useItems } from './hooks/useItems';
import { useAuth } from './context/AuthContext';
import { coolingOffStatus } from './utils';
import { NavBar } from './components/NavBar/NavBar';
import { AuthScreen } from './components/AuthScreen/AuthScreen';
import { StartPage } from './components/StartPage/StartPage';
import { AddItemForm } from './components/AddItemForm/AddItemForm';
import { PageHeader } from './components/PageHeader/PageHeader';
import { WaitingPage } from './components/WaitingPage/WaitingPage';
import { HistoryPage } from './components/HistoryPage/HistoryPage';
import { SettingsModal } from './components/SettingsModal/SettingsModal';
import { Toast } from './components/Toast/Toast';
import styles from './App.module.css';

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      color: 'var(--text-muted)',
      fontSize: '14px',
    }}>
      Loading…
    </div>
  );
}

export default function App() {
  const { user } = useAuth();
  const [showStart, setShowStart] = useState(true);
  const [view, setView] = useState('waiting');
  const [showSettings, setShowSettings] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [pendingUndo, setPendingUndo] = useState(null);
  const {
    waiting, history,
    settings, updateSettings,
    addItem, editItem, decide, removeItem, restoreItem,
    loading, error, clearError,
  } = useItems();

  // Reset to the Waiting view on the signed-out → signed-in transition only
  // (not on every render while already signed in, e.g. a token refresh
  // giving a new user object) — so signing back in during the same session
  // always lands on Waiting instead of wherever you were before signing out.
  const wasSignedInRef = useRef(!!user);
  useEffect(() => {
    if (!wasSignedInRef.current && user) setView('waiting');
    wasSignedInRef.current = !!user;
  }, [user]);

  // user === undefined means auth is still initialising
  if (user === undefined) return <LoadingScreen />;
  if (user === null) {
    // "Try it" leads into sign-in/sign-up rather than straight into the
    // app, since an account is required to use it at all now.
    return showStart
      ? <StartPage onGetStarted={() => setShowStart(false)} />
      : <AuthScreen onBack={() => setShowStart(true)} />;
  }
  if (loading) return <LoadingScreen />;

  const handleRemove = (id) => {
    const removed = removeItem(id);
    if (removed) setPendingUndo(removed);
  };

  const handleUndo = () => {
    if (pendingUndo) restoreItem(pendingUndo);
    setPendingUndo(null);
  };

  const readyCount = waiting.filter(item => coolingOffStatus(item, item.coolingOffDays ?? 7).ready).length;

  return (
    <div className={styles.app}>
      <NavBar view={view} onNavigate={setView} onSettingsClick={() => setShowSettings(true)} readyCount={readyCount} />

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
              <AddItemForm
                onAdd={(item) => { addItem(item); setView('waiting'); }}
                onClose={() => setShowAddItem(false)}
                symbol={settings.currencySymbol}
              />
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

      {error && (
        <Toast
          message={error}
          actionLabel="Dismiss"
          onAction={clearError}
          onDismiss={clearError}
        />
      )}
    </div>
  );
}
