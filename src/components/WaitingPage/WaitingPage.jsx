import { useState, useEffect } from 'react';
import { StatTiles } from '../StatTiles/StatTiles';
import { ItemListSection } from '../ItemListSection/ItemListSection';
import { ItemCard } from '../ItemCard/ItemCard';
import { computeHeaderStats } from '../../utils';
import styles from './WaitingPage.module.css';

// Below this width (covers phones and iPad) there's no room for a
// meaningful rows/grid choice, so rows is forced and the toggle is hidden.
const COMPACT_BREAKPOINT = 1024;

export function WaitingPage({ waiting, history, settings, loading, onDecide, onRemove, onEdit, readOnly = false }) {
  const [sortBy, setSortBy] = useState('newest');
  const [filterCategory, setFilterCategory] = useState('all');
  const [readinessFilter, setReadinessFilter] = useState('all');
  const [grouped, setGrouped] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [isCompact, setIsCompact] = useState(() => window.innerWidth < COMPACT_BREAKPOINT);

  useEffect(() => {
    const onResize = () => setIsCompact(window.innerWidth < COMPACT_BREAKPOINT);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const effectiveViewMode = isCompact ? 'rows' : viewMode;
  // `history` here is always this account's own (see useItems.js), so these
  // stats are this account's own resisted/spent totals regardless of whether
  // the list currently being browsed is a friend's — which is exactly why
  // they're hidden below on a read-only (friend's) list: `settings` there is
  // the *owner's* currency/rate, so this account's own totals would render
  // under the wrong currency symbol and mixed with the owner's hourly rate.
  const headerStats = computeHeaderStats(history, settings.hourlyRate);

  return (
    <section className={styles.section} aria-label="Items waiting">
      {!readOnly && (
        <StatTiles className={styles.statsRow} headerStats={headerStats} currencySymbol={settings.currencySymbol} />
      )}

      <ItemListSection
        items={waiting}
        loading={loading}
        dateField="addedAt"
        emptyIcon="🎉"
        emptyTitle="Nothing waiting"
        emptyBody="Next time you want to buy something, add it here first and sleep on it."
        sortBy={sortBy}
        onSortChange={setSortBy}
        filterCategory={filterCategory}
        onFilterChange={setFilterCategory}
        /* Readiness is derived from the cooling-off countdown, which is
           hidden on a friend's read-only card (see ItemCard) — filtering by
           it there would filter by a number the viewer never sees. */
        readinessFilter={readOnly ? 'all' : readinessFilter}
        onReadinessFilterChange={readOnly ? undefined : setReadinessFilter}
        grouped={grouped}
        onGroupToggle={setGrouped}
        viewMode={effectiveViewMode}
        onViewModeChange={isCompact ? undefined : setViewMode}
        renderItem={(item) => (
          <ItemCard item={item} settings={settings} onDecide={onDecide} onRemove={onRemove} onEdit={onEdit} view={effectiveViewMode} readOnly={readOnly} />
        )}
      />
    </section>
  );
}
