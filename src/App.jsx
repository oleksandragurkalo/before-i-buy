import { useState } from 'react';
import { useItems } from './hooks/useItems';
import { useTheme } from './context/ThemeContext';
import { Header } from './components/Header/Header';
import { AddItemForm } from './components/AddItemForm/AddItemForm';
import { ItemCard } from './components/ItemCard/ItemCard';
import { HistoryItem } from './components/HistoryItem/HistoryItem';
import { SettingsModal } from './components/SettingsModal/SettingsModal';
import { InsightsPanel } from './components/InsightsPanel/InsightsPanel';
import { formatPrice } from './utils';
import styles from './App.module.css';

export default function App() {
  const [tab, setTab] = useState('waiting');
  const [showSettings, setShowSettings] = useState(false);
  const {
    waiting, history,
    totalSaved, totalSpent,
    settings, updateSettings,
    addItem, editItem, decide, removeItem,
    exportData, importData,
  } = useItems();
  const { theme } = useTheme();

  return (
    <div className={styles.app}>
      <Header onSettingsClick={() => setShowSettings(true)} />
      <main className={styles.main}>
        <div className={styles.layout}>
          <div className={styles.content}>
            {history.length > 0 && (
              <div className={styles.summary}>
                <div className={styles.summaryItem}>
                  <span className={`${styles.summaryValue} mono`} style={{ color: 'var(--green)' }}>
                    {formatPrice(totalSaved, settings.currencySymbol)}
                  </span>
                  <span className={styles.summaryLabel}>resisted</span>
                </div>
                <div className={styles.summaryDivider} />
                <div className={styles.summaryItem}>
                  <span className={`${styles.summaryValue} mono`} style={{ color: 'var(--text-secondary)' }}>
                    {formatPrice(totalSpent, settings.currencySymbol)}
                  </span>
                  <span className={styles.summaryLabel}>bought anyway</span>
                </div>
              </div>
            )}

            <div className={styles.tabs} role="tablist">
              <button
                role="tab"
                aria-selected={tab === 'waiting'}
                className={`${styles.tab} ${tab === 'waiting' ? styles.tabActive : ''}`}
                onClick={() => setTab('waiting')}
              >
                Waiting
                {waiting.length > 0 && <span className={styles.tabCount}>{waiting.length}</span>}
              </button>
              <button
                role="tab"
                aria-selected={tab === 'history'}
                className={`${styles.tab} ${tab === 'history' ? styles.tabActive : ''}`}
                onClick={() => setTab('history')}
              >
                History
                {history.length > 0 && <span className={styles.tabCount}>{history.length}</span>}
              </button>
            </div>

            {tab === 'waiting' && (
              <section className={styles.section} aria-label="Items waiting">
                <AddItemForm onAdd={addItem} symbol={settings.currencySymbol} />
                {waiting.length === 0 ? (
                  <div className={styles.empty}>
                    <p className={styles.emptyIcon} aria-hidden="true">🎉</p>
                    <p className={styles.emptyTitle}>Nothing waiting</p>
                    <p className={styles.emptyBody}>Next time you want to buy something, add it here first and sleep on it.</p>
                  </div>
                ) : (
                  <ul className={styles.list}>
                    {waiting.map(item => (
                      <li key={item.id}>
                        <ItemCard item={item} settings={settings} onDecide={decide} onRemove={removeItem} onEdit={editItem} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {tab === 'history' && (
              <section className={styles.section} aria-label="Decision history">
                {history.length === 0 ? (
                  <div className={styles.empty}>
                    <p className={styles.emptyIcon} aria-hidden="true">📋</p>
                    <p className={styles.emptyTitle}>No decisions yet</p>
                    <p className={styles.emptyBody}>Items you decide on will appear here.</p>
                  </div>
                ) : (
                  <ul className={styles.list}>
                    {history.map(item => (
                      <li key={item.id}>
                        <HistoryItem item={item} settings={settings} onRemove={removeItem} onEdit={editItem} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </div>

          <aside className={styles.aside}>
            <InsightsPanel waiting={waiting} history={history} settings={settings} />
          </aside>
        </div>
      </main>
      {showSettings && (
        <SettingsModal
          settings={settings}
          onSave={updateSettings}
          onClose={() => setShowSettings(false)}
          onExport={exportData}
          onImport={importData}
        />
      )}
    </div>
  );
}
