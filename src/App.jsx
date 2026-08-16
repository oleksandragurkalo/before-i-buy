import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useItems } from './hooks/useItems';
import { useLists } from './hooks/useLists';
import { useFriends } from './hooks/useFriends';
import { useSettings } from './hooks/useSettings';
import { useAuth } from './context/AuthContext';
import { useProfile } from './hooks/useProfile';
import { coolingOffStatus } from './utils';
import { DEFAULT_COOLING_OFF_DAYS } from './config';
import { NavBar } from './components/NavBar/NavBar';
import { StartPage } from './components/StartPage/StartPage';
import { PageHeader } from './components/PageHeader/PageHeader';
import { WaitingPage } from './components/WaitingPage/WaitingPage';
import { Toast } from './components/Toast/Toast';
import { Button } from './components/Button/Button';
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary';
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

function ProfileLoadErrorScreen({ onRetry }) {
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      color: 'var(--text-muted)',
      fontSize: '14px',
      padding: '24px',
      textAlign: 'center',
    }}>
      <p>Could not load your profile. Check your connection.</p>
      <Button variant="secondary" onClick={onRetry}>Retry</Button>
    </div>
  );
}

// useLists.js seeds a default list for any account that has none, so this
// should only ever be reached if that seed insert itself failed (e.g. a
// dropped connection) — every other codepath through useLists guarantees at
// least one owned list by the time `loading` goes false. Shown instead of
// falling through to the main app shell, which otherwise has no real list to
// work with (no active list to add items to, an empty list switcher, etc).
function ListsLoadErrorScreen({ onRetry }) {
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      color: 'var(--text-muted)',
      fontSize: '14px',
      padding: '24px',
      textAlign: 'center',
    }}>
      <p>Could not set up your list. Check your connection.</p>
      <Button variant="secondary" onClick={onRetry}>Retry</Button>
    </div>
  );
}

export default function App() {
  const { user } = useAuth();
  const { profile, needsUsername, loading: profileLoading, loadFailed: profileLoadFailed, retryProfile, createProfile, updateProfile } = useProfile();
  const [showStart, setShowStart] = useState(true);
  const [view, setView] = useState('waiting');
  const [showSettings, setShowSettings] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [pendingUndo, setPendingUndo] = useState(null);
  const {
    lists, sharedLists, currentListId, currentList, setCurrentListId,
    createList, renameList, deleteList, shareList, unshareList,
    loading: listsLoading, loadError: listsError, clearLoadError: clearListsError, retryLists,
  } = useLists();
  const readOnly = currentList ? !currentList.isOwner : false;
  const {
    settings, updateSettings: updateAccountSettings, replaceSettings,
    loading: settingsLoading, error: settingsError, clearError: clearSettingsError,
  } = useSettings();
  const {
    waiting, history,
    displaySettings,
    addItem, editItem, decide, removeItem, restoreItem,
    convertItemsCurrency,
    loading, historyLoading, error, clearError,
  } = useItems(currentListId, {
    readOnly,
    ownerId: currentList?.ownerUserId ?? null,
    accountSettings: settings,
    onImportSettings: replaceSettings,
  });
  const {
    friends, incomingRequests, outgoingRequests, loading: friendsLoading,
    searchUsers, sendRequest, acceptRequest, declineRequest, cancelRequest, removeFriend,
    loadError: friendsError, clearLoadError: clearFriendsError,
  } = useFriends();

  // The currency-conversion side effect on items must run before the new
  // currency is saved to settings — otherwise it'd read the already-updated
  // settings.currency as both "from" and "to".
  const updateSettings = (updates) => {
    if (!readOnly && updates.currency && updates.currency !== settings.currency) {
      convertItemsCurrency(settings.currency, updates.currency);
    }
    updateAccountSettings(updates);
  };

  // Only one Toast slot is shown at a time — items errors take priority
  // since they're the most action-blocking, then lists, then friends, then
  // settings (settings failures are also visible via the Settings modal).
  const activeError = error || listsError || friendsError || settingsError;
  const clearActiveError = error ? clearError : (listsError ? clearListsError : (friendsError ? clearFriendsError : clearSettingsError));

  // Reset to the Waiting view on the signed-out → signed-in transition only
  // (not on every render while already signed in, e.g. a token refresh
  // giving a new user object) — so signing back in during the same session
  // always lands on Waiting instead of wherever you were before signing out.
  const wasSignedInRef = useRef(!!user);
  useEffect(() => {
    if (!wasSignedInRef.current && user) setView('waiting');
    wasSignedInRef.current = !!user;
  }, [user]);

  // Handed to ItemCard/HistoryItem as onRemove (via WaitingPage/HistoryPage),
  // both wrapped in React.memo — must stay reference-stable across renders
  // or the memo never hits. Declared above the early returns below so the
  // hook is always called in the same order regardless of auth/profile state.
  const handleRemove = useCallback((id) => {
    const removed = removeItem(id);
    if (removed) setPendingUndo(removed);
  }, [removeItem]);

  const handleUndo = useCallback(() => {
    if (pendingUndo) restoreItem(pendingUndo);
    setPendingUndo(null);
  }, [pendingUndo, restoreItem]);

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
  if (profileLoadFailed) return <ProfileLoadErrorScreen onRetry={retryProfile} />;
  if (needsUsername) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <ChooseUsernameScreen createProfile={createProfile} />
      </Suspense>
    );
  }

  // Block on lists too, same reasoning as the profile gate above — a
  // zero-lists account (see ListsLoadErrorScreen) has no active list for the
  // rest of the app to work with, so it's caught here rather than letting it
  // flash a main app shell with a broken/empty list switcher. Gated on the
  // explicit `listsError` signal (not just `lists.length === 0`) for the same
  // reason the profile gate above uses `profileLoadFailed` rather than
  // inferring failure from `!profile`: right after a signed-out → signed-in
  // transition in the same tab, useLists's `lists`/`loading` are briefly
  // stale (still `[]`/`false`, left over from the sign-out reset) for the one
  // render before its effect reruns for the new user — `lists.length === 0`
  // alone would misfire on that render, while `listsError` stays correctly
  // falsy (it isn't reset on sign-out, but was never set to begin with).
  if (!listsLoading && lists.length === 0 && listsError) return <ListsLoadErrorScreen onRetry={retryLists} />;

  const readyCount = waiting.filter(item => coolingOffStatus(item, item.coolingOffDays ?? DEFAULT_COOLING_OFF_DAYS).ready).length;
  // Items and settings now load independently (see useSettings.js) — combine
  // them for anything that renders prices/hours off displaySettings, so it
  // doesn't flash DEFAULT_SETTINGS before the real settings arrive. History
  // is never a friend's list, so it gates on its own always-own-account
  // load (`historyLoading`) rather than whichever source `waiting` needs.
  const itemsLoading = loading || settingsLoading;
  const historyPageLoading = historyLoading || settingsLoading;

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
            {/* Keyed by `view` so a crash caught here resets the moment the
                user navigates to a different view (a fresh ErrorBoundary
                instance, not the same one still stuck in its error state) —
                the root-level boundary in main.jsx is a last resort that
                takes out NavBar too, this one lets them route around a
                broken page instead. */}
            <ErrorBoundary key={view}>
            {view === 'waiting' && (
              <PageHeader
                waiting={waiting}
                // History is always this account's own (see useItems.js) —
                // while browsing a friend's shared list, insights here
                // should only reflect *their* waiting items, never mixed
                // with this account's own decision history.
                history={readOnly ? [] : history}
                settings={displaySettings}
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
                settings={displaySettings}
                loading={itemsLoading}
                onDecide={decide}
                onRemove={handleRemove}
                onEdit={editItem}
                readOnly={readOnly}
              />
            )}

            {view === 'history' && (
              <Suspense fallback={null}>
                <HistoryPage
                  history={history}
                  // Always this account's own raw settings, never
                  // `displaySettings` — history is never a friend's, so its
                  // items are always priced in this account's own currency
                  // at this account's own rate, regardless of which list
                  // (yours or a friend's) is active elsewhere in the app.
                  settings={settings}
                  loading={historyPageLoading}
                  onRemove={handleRemove}
                  onEdit={editItem}
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
                  sharedLists={sharedLists}
                  onViewList={(listId) => { setCurrentListId(listId); setView('waiting'); }}
                />
              </Suspense>
            )}
            </ErrorBoundary>
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

      {activeError && (
        <Toast
          message={activeError}
          actionLabel="Dismiss"
          onAction={clearActiveError}
          onDismiss={clearActiveError}
        />
      )}
      <Analytics />
    </div>
  );
}
