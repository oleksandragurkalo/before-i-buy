import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useItems } from './hooks/useItems';
import { useLists } from './hooks/useLists';
import { useFriends } from './hooks/useFriends';
import { useAuth } from './context/AuthContext';
import { useProfile } from './hooks/useProfile';
import { coolingOffStatus } from './utils';
import { NavBar } from './components/NavBar/NavBar';
import { StartPage } from './components/StartPage/StartPage';
import { PageHeader } from './components/PageHeader/PageHeader';
import { WaitingPage } from './components/WaitingPage/WaitingPage';
import { Toast } from './components/Toast/Toast';
import styles from './App.module.css';
import { Analytics } from "@vercel/analytics/react"

// Not needed for the initial paint (only shown after a user action or on
// the logged-out → sign-in click), so split into their own chunks to keep
// them out of the main bundle.
const AuthScreen = lazy(() => import('./components/AuthScreen/AuthScreen').then(m => ({ default: m.AuthScreen })));
const ChooseUsernameScreen = lazy(() => import('./components/ChooseUsernameScreen/ChooseUsernameScreen').then(m => ({ default: m.ChooseUsernameScreen })));
const AddItemForm = lazy(() => import('./components/AddItemForm/AddItemForm').then(m => ({ default: m.AddItemForm })));
const HistoryPage = lazy(() => import('./components/HistoryPage/HistoryPage').then(m => ({ default: m.HistoryPage })));
const FriendsPage = lazy(() => import('./components/FriendsPage/FriendsPage').then(m => ({ default: m.FriendsPage })));
const SettingsModal = lazy(() => import('./components/SettingsModal/SettingsModal').then(m => ({ default: m.SettingsModal })));

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
  const { profile, needsUsername, loading: profileLoading, createProfile, updateProfile } = useProfile();
  const [showStart, setShowStart] = useState(true);
  const [view, setView] = useState('waiting');
  const [showSettings, setShowSettings] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [pendingUndo, setPendingUndo] = useState(null);
  const {
    lists, sharedLists, currentListId, currentList, setCurrentListId,
    createList, renameList, deleteList, shareList, unshareList,
  } = useLists();
  const readOnly = currentList ? !currentList.isOwner : false;
  const {
    waiting, history,
    settings, updateSettings,
    addItem, editItem, decide, removeItem, restoreItem,
    loading, error, clearError,
  } = useItems(currentListId, readOnly);
  const {
    friends, incomingRequests, outgoingRequests, loading: friendsLoading,
    searchUsers, sendRequest, acceptRequest, declineRequest, cancelRequest, removeFriend,
  } = useFriends();

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
      : (
        <Suspense fallback={<LoadingScreen />}>
          <AuthScreen onBack={() => setShowStart(true)} />
        </Suspense>
      );
  }

  // Block on the profile load too (not just auth) so a signed-in user with
  // no profile row yet doesn't flash the main app before the gate appears.
  if (profileLoading) return <LoadingScreen />;
  if (needsUsername) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <ChooseUsernameScreen createProfile={createProfile} />
      </Suspense>
    );
  }

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
      <NavBar
        view={view}
        onNavigate={setView}
        onSettingsClick={() => setShowSettings(true)}
        readyCount={readyCount}
        friendRequestCount={incomingRequests.length}
        profile={profile}
        updateProfile={updateProfile}
      />

      <main className={styles.main}>
        <div className={styles.layout}>
          <div className={styles.content}>
            {view !== 'friends' && (
              <PageHeader
                waiting={waiting}
                history={history}
                settings={settings}
                lists={lists}
                sharedLists={sharedLists}
                currentList={currentList}
                currentListId={currentListId}
                onSelectList={setCurrentListId}
                onCreateList={createList}
                onRenameList={renameList}
                onDeleteList={deleteList}
                friends={friends}
                onShare={shareList}
                onUnshare={unshareList}
                readOnly={readOnly}
                onAddItemClick={() => setShowAddItem(true)}
              />
            )}

            {!readOnly && showAddItem && (
              <Suspense fallback={null}>
                <AddItemForm
                  onAdd={(item) => { addItem(item); setView('waiting'); }}
                  onClose={() => setShowAddItem(false)}
                  symbol={settings.currencySymbol}
                />
              </Suspense>
            )}

            {view === 'waiting' && (
              <WaitingPage
                waiting={waiting}
                history={history}
                settings={settings}
                loading={loading}
                onDecide={decide}
                onRemove={handleRemove}
                onEdit={editItem}
                readOnly={readOnly}
              />
            )}

            {view === 'history' && (
              <Suspense fallback={null}>
                <HistoryPage
                  waiting={waiting}
                  history={history}
                  settings={settings}
                  loading={loading}
                  onRemove={handleRemove}
                  onEdit={editItem}
                  readOnly={readOnly}
                />
              </Suspense>
            )}

            {view === 'friends' && (
              <Suspense fallback={null}>
                <FriendsPage
                  friends={friends}
                  incomingRequests={incomingRequests}
                  outgoingRequests={outgoingRequests}
                  loading={friendsLoading}
                  searchUsers={searchUsers}
                  sendRequest={sendRequest}
                  acceptRequest={acceptRequest}
                  declineRequest={declineRequest}
                  cancelRequest={cancelRequest}
                  removeFriend={removeFriend}
                  lists={lists}
                  onShare={shareList}
                  onUnshare={unshareList}
                />
              </Suspense>
            )}
          </div>
        </div>
      </main>

      {showSettings && (
        <Suspense fallback={null}>
          <SettingsModal
            settings={settings}
            onSave={updateSettings}
            onClose={() => setShowSettings(false)}
          />
        </Suspense>
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
      <Analytics />
    </div>
  );
}
