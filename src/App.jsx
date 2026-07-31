import { useState } from 'react';
import { useItems } from './hooks/useItems';
import { useTheme } from './context/ThemeContext';
import { Header } from './components/Header/Header';
import { AddItemForm } from './components/AddItemForm/AddItemForm';
import { ItemCard } from './components/ItemCard/ItemCard';
import { HistoryItem } from './components/HistoryItem/HistoryItem';
import { SettingsModal } from './components/SettingsModal/SettingsModal';
import { InsightsPanel } from './components/InsightsPanel/InsightsPanel';
import { FilterBar } from './components/FilterBar/FilterBar';
import { formatPrice, sortItems, groupByCategory } from './utils';
import styles from './App.module.css';

export default function App() {
  const [tab, setTab] = useState('waiting');
  const [showSettings, setShowSettings] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [filterCategory, setFilterCategory] = useState('all');
  const [grouped, setGrouped] = useState(false);
  const {
    waiting, history,
    totalSaved, totalSpent,
    settings, updateSettings,
    addItem, editItem, decide, removeItem,
    exportData, importData,
  } = useItems();
  const { theme } = useTheme();

  const changeTab = (nextTab) => {
    setTab(nextTab);
    setFilterCategory('all');
  };

  const presentCategories = (list) => [...new Set(list.map(i => i.category || 'other'))];

  const visibleItems = (list, dateField) => {
    const filtered = filterCategory === 'all' ? list : list.filter(i => (i.category || 'other') === filterCategory);
    return sortItems(filtered, sortBy, dateField);
  };

  const renderList = (items, renderItem) => {
    if (!grouped) {
      return (
        <ul className={styles.list}>
          {items.map(item => <li key={item.id}>{renderItem(item)}</li>)}
        </ul>
      );
    }
    return groupByCategory(items).map(group => (
      <div className={styles.group} key={group.category}>
        <div className={styles.groupHeader}>
          <span aria-hidden="true">{group.emoji}</span>
          <span>{group.label}</span>
          <span className={styles.groupCount}>{group.items.length}</span>
        </div>
        <ul className={styles.list}>
          {group.items.map(item => <li key={item.id}>{renderItem(item)}</li>)}
        </ul>
      </div>
    ));
  };

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
                onClick={() => changeTab('waiting')}
              >
                Waiting
                {waiting.length > 0 && <span className={styles.tabCount}>{waiting.length}</span>}
              </button>
              <button
                role="tab"
                aria-selected={tab === 'history'}
                className={`${styles.tab} ${tab === 'history' ? styles.tabActive : ''}`}
                onClick={() => changeTab('history')}
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
                  <>
                    {waiting.length > 1 && (
                      <FilterBar
                        sortBy={sortBy}
                        onSortChange={setSortBy}
                        filterCategory={filterCategory}
                        onFilterChange={setFilterCategory}
                        availableCategories={presentCategories(waiting)}
                        grouped={grouped}
                        onGroupToggle={setGrouped}
                      />
                    )}
                    {renderList(visibleItems(waiting, 'addedAt'), item => (
                      <ItemCard item={item} settings={settings} onDecide={decide} onRemove={removeItem} onEdit={editItem} />
                    ))}
                  </>
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
                  <>
                    {history.length > 1 && (
                      <FilterBar
                        sortBy={sortBy}
                        onSortChange={setSortBy}
                        filterCategory={filterCategory}
                        onFilterChange={setFilterCategory}
                        availableCategories={presentCategories(history)}
                        grouped={grouped}
                        onGroupToggle={setGrouped}
                      />
                    )}
                    {renderList(visibleItems(history, 'decidedAt'), item => (
                      <HistoryItem item={item} settings={settings} onRemove={removeItem} onEdit={editItem} />
                    ))}
                  </>
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
