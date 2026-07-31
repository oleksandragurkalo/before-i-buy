import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useItems } from './hooks/useItems';
import { NavBar } from './components/NavBar/NavBar';
import { StartPage } from './components/StartPage/StartPage';
import { AddItemForm } from './components/AddItemForm/AddItemForm';
import { ItemCard } from './components/ItemCard/ItemCard';
import { HistoryItem } from './components/HistoryItem/HistoryItem';
import { SettingsModal } from './components/SettingsModal/SettingsModal';
import { InsightsPanel } from './components/InsightsPanel/InsightsPanel';
import { FilterBar } from './components/FilterBar/FilterBar';
import { StatTile } from './components/StatTile/StatTile';
import { formatPrice, formatHours, sortItems, groupByCategory, computeHeaderStats } from './utils';
import styles from './App.module.css';
import { StatTiles } from './components/StatTiles/StatTiles.jsx';

export default function App() {
  const [view, setView] = useState('start');
  const [showSettings, setShowSettings] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [filterCategory, setFilterCategory] = useState('all');
  const [grouped, setGrouped] = useState(false);
  const {
    waiting, history,
    settings, updateSettings,
    addItem, editItem, decide, removeItem,
    exportData, importData,
  } = useItems();

  const headerStats = computeHeaderStats(waiting, history, settings.hourlyRate);

  const navigate = (nextView) => {
    setView(nextView);
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
      <NavBar view={view} onNavigate={navigate} onSettingsClick={() => setShowSettings(true)} />

      {view === 'start' && <StartPage onGetStarted={() => navigate('waiting')} />}

      {view !== 'start' && (
      <main className={styles.main}>
        <div className={styles.layout}>
          <div className={styles.content}>

            {view === 'waiting' && (
              <section className={styles.section} aria-label="Items waiting">
                <aside className={styles.aside}>
                  <InsightsPanel waiting={waiting} history={history} settings={settings} />
                </aside>
                <StatTiles className={styles.statsRow} headerStats={headerStats} currencySymbol={settings.currencySymbol} />

                <button type="button" className={styles.addItemBtn} onClick={() => setShowAddItem(true)}>
                  <Plus size={16} />
                  Add Item
                </button>
                {showAddItem && (
                  <AddItemForm onAdd={addItem} onClose={() => setShowAddItem(false)} symbol={settings.currencySymbol} />
                )}

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

            {view === 'history' && (
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
        </div>
      </main>
      )}
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
