import { useState } from 'react';
import { Plus, ListChecks } from 'lucide-react';
import { useItems } from './hooks/useItems';
import { NavBar } from './components/NavBar/NavBar';
import { StartPage } from './components/StartPage/StartPage';
import { AddItemForm } from './components/AddItemForm/AddItemForm';
import { ItemCard } from './components/ItemCard/ItemCard';
import { HistoryItem } from './components/HistoryItem/HistoryItem';
import { SettingsModal } from './components/SettingsModal/SettingsModal';
import { InsightsPanel } from './components/InsightsPanel/InsightsPanel';
import { ItemListSection } from './components/ItemListSection/ItemListSection';
import { StatTiles } from './components/StatTiles/StatTiles';
import { Topbar } from './components/Topbar/Topbar';
import { Button } from './components/Button/Button';
import { computeHeaderStats } from './utils';
import styles from './App.module.css';

export default function App() {
  const [view, setView] = useState('start');
  const [showSettings, setShowSettings] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [filterCategory, setFilterCategory] = useState('all');
  const [grouped, setGrouped] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
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

  const listProps = {
    sortBy, onSortChange: setSortBy,
    filterCategory, onFilterChange: setFilterCategory,
    grouped, onGroupToggle: setGrouped,
  };

  return (
    <div className={styles.app}>
      <NavBar view={view} onNavigate={navigate} onSettingsClick={() => setShowSettings(true)} />

      {view === 'start' && <StartPage onGetStarted={() => navigate('waiting')} />}

      {view !== 'start' && (
      <main className={styles.main}>
        <div className={styles.layout}>
          <div className={styles.content}>

            <Topbar
              icon={<ListChecks size={16} />}
              title={settings.listName || 'Waiting List'}
              onTitleChange={(name) => updateSettings({ listName: name })}
              actions={
                <Button icon={<Plus size={14} />} onClick={() => setShowAddItem(true)}>
                  Add Item
                </Button>
              }
            />

            {showAddItem && (
              <AddItemForm onAdd={addItem} onClose={() => setShowAddItem(false)} symbol={settings.currencySymbol} />
            )}

            {view === 'waiting' && (
              <section className={styles.section} aria-label="Items waiting">
                <aside className={styles.aside}>
                  <InsightsPanel waiting={waiting} history={history} settings={settings} />
                </aside>
                <StatTiles className={styles.statsRow} headerStats={headerStats} currencySymbol={settings.currencySymbol} />

                <ItemListSection
                  items={waiting}
                  dateField="addedAt"
                  emptyIcon="🎉"
                  emptyTitle="Nothing waiting"
                  emptyBody="Next time you want to buy something, add it here first and sleep on it."
                  {...listProps}
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                  renderItem={(item) => (
                    <ItemCard item={item} settings={settings} onDecide={decide} onRemove={removeItem} onEdit={editItem} view={viewMode} />
                  )}
                />
              </section>
            )}

            {view === 'history' && (
              <section className={styles.section} aria-label="Decision history">
                <ItemListSection
                  items={history}
                  dateField="decidedAt"
                  emptyIcon="📋"
                  emptyTitle="No decisions yet"
                  emptyBody="Items you decide on will appear here."
                  {...listProps}
                  viewMode="rows"
                  renderItem={(item) => (
                    <HistoryItem item={item} settings={settings} onRemove={removeItem} onEdit={editItem} />
                  )}
                />
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
