import { useState } from 'react';
import { StatTiles } from '../StatTiles/StatTiles';
import { ItemListSection } from '../ItemListSection/ItemListSection';
import { ItemCard } from '../ItemCard/ItemCard';
import { computeHeaderStats } from '../../utils';
import styles from './WaitingPage.module.css';

export function WaitingPage({ waiting, history, settings, onDecide, onRemove, onEdit }) {
  const [sortBy, setSortBy] = useState('newest');
  const [filterCategory, setFilterCategory] = useState('all');
  const [grouped, setGrouped] = useState(false);
  const [viewMode, setViewMode] = useState('grid');

  const headerStats = computeHeaderStats(waiting, history, settings.hourlyRate);

  return (
    <section className={styles.section} aria-label="Items waiting">
      <StatTiles className={styles.statsRow} headerStats={headerStats} currencySymbol={settings.currencySymbol} />

      <ItemListSection
        items={waiting}
        dateField="addedAt"
        emptyIcon="🎉"
        emptyTitle="Nothing waiting"
        emptyBody="Next time you want to buy something, add it here first and sleep on it."
        sortBy={sortBy}
        onSortChange={setSortBy}
        filterCategory={filterCategory}
        onFilterChange={setFilterCategory}
        grouped={grouped}
        onGroupToggle={setGrouped}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        renderItem={(item) => (
          <ItemCard item={item} settings={settings} onDecide={onDecide} onRemove={onRemove} onEdit={onEdit} view={viewMode} />
        )}
      />
    </section>
  );
}
