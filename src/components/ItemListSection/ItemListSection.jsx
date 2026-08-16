import { useEffect, useMemo } from 'react';
import { FilterBar } from '../FilterBar/FilterBar';
import { sortItems, groupByCategory, coolingOffStatus } from '../../utils';
import { DEFAULT_COOLING_OFF_DAYS } from '../../config';
import styles from './ItemListSection.module.css';

export function ItemListSection({
  items,
  loading,
  dateField,
  emptyIcon,
  emptyTitle,
  emptyBody,
  sortBy,
  onSortChange,
  filterCategory,
  onFilterChange,
  grouped,
  onGroupToggle,
  viewMode = 'grid',
  onViewModeChange,
  decisionFilter,
  onDecisionFilterChange,
  readinessFilter,
  onReadinessFilterChange,
  header,
  renderItem,
}) {
  // Chained filter/sort derivation — memoized so it only recomputes when
  // the items or filter/sort inputs actually change, not on every render of
  // this component (e.g. from unrelated parent state like a dropdown toggle).
  const byDecision = useMemo(() => (
    !decisionFilter || decisionFilter === 'all'
      ? items
      : items.filter(i => i.status === decisionFilter)
  ), [items, decisionFilter]);

  const byReadiness = useMemo(() => (
    !readinessFilter || readinessFilter === 'all'
      ? byDecision
      : byDecision.filter(i => {
        const ready = coolingOffStatus(i, i.coolingOffDays ?? DEFAULT_COOLING_OFF_DAYS).ready;
        return readinessFilter === 'ready' ? ready : !ready;
      })
  ), [byDecision, readinessFilter]);

  const availableCategories = useMemo(() => (
    [...new Set(byReadiness.map(i => i.category || 'other'))]
  ), [byReadiness]);

  // If the currently selected category no longer has any matching items
  // (e.g. they were all decided on, removed, or the decision filter changed),
  // fall back to "all" instead of silently showing zero results forever.
  const categoryIsStale = filterCategory !== 'all' && !availableCategories.includes(filterCategory);
  useEffect(() => {
    if (categoryIsStale) onFilterChange('all');
  }, [categoryIsStale, onFilterChange]);

  const effectiveCategory = categoryIsStale ? 'all' : filterCategory;
  const byCategory = useMemo(() => (
    effectiveCategory === 'all' ? byReadiness : byReadiness.filter(i => (i.category || 'other') === effectiveCategory)
  ), [byReadiness, effectiveCategory]);
  const visible = useMemo(() => sortItems(byCategory, sortBy, dateField), [byCategory, sortBy, dateField]);

  // Data is still in flight — show a neutral placeholder shape rather than
  // the empty state, which would otherwise flash "Nothing waiting" for a
  // returning user who actually has items, right before they show up.
  if (loading) {
    const skeletonClass = viewMode === 'grid' ? styles.grid : styles.list;
    return (
      <ul className={skeletonClass} aria-hidden="true">
        {Array.from({ length: 4 }, (_, i) => <li key={i} className={styles.skeletonCard} />)}
      </ul>
    );
  }

  if (items.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyIcon} aria-hidden="true">{emptyIcon}</p>
        <p className={styles.emptyTitle}>{emptyTitle}</p>
        <p className={styles.emptyBody}>{emptyBody}</p>
      </div>
    );
  }

  const listClass = viewMode === 'grid' ? styles.grid : styles.list;

  return (
    <>
      {items.length > 1 && (
        <FilterBar
          sortBy={sortBy}
          onSortChange={onSortChange}
          filterCategory={effectiveCategory}
          onFilterChange={onFilterChange}
          availableCategories={availableCategories}
          grouped={grouped}
          onGroupToggle={onGroupToggle}
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
          decisionFilter={decisionFilter}
          onDecisionFilterChange={onDecisionFilterChange}
          readinessFilter={readinessFilter}
          onReadinessFilterChange={onReadinessFilterChange}
        />
      )}

      {visible.length === 0 ? (
        header ? (
          <div className="history-table">
            {header}
            <p className={styles.noMatches}>No items match this filter.</p>
          </div>
        ) : (
          <p className={styles.noMatches}>No items match this filter.</p>
        )
      ) : grouped ? (
        <>
          {header}
          {groupByCategory(visible).map(group => {
            const list = (
              <ul className={listClass}>
                {group.items.map(item => <li key={item.id}>{renderItem(item)}</li>)}
              </ul>
            );
            return (
              <div className={styles.group} key={group.category}>
                <div className={styles.groupHeader}>
                  <span aria-hidden="true">{group.emoji}</span>
                  <span>{group.label}</span>
                  <span className={styles.groupCount}>{group.items.length}</span>
                </div>
                {/* Same merged-block treatment as the ungrouped History view
                    (see "history-table" above), applied per group since each
                    one has its own <ul> here. */}
                {header ? <div className="history-table">{list}</div> : list}
              </div>
            );
          })}
        </>
      ) : header ? (
        // A header is only ever passed for the History table view — merge it
        // with the row list into one bordered block (see "history-table" in
        // ItemListSection.module.css / HistoryItem.module.css) instead of a
        // floating label row sitting above a stack of separate cards.
        <div className="history-table">
          {header}
          <ul className={listClass}>
            {visible.map(item => <li key={item.id}>{renderItem(item)}</li>)}
          </ul>
        </div>
      ) : (
        <ul className={listClass}>
          {visible.map(item => <li key={item.id}>{renderItem(item)}</li>)}
        </ul>
      )}
    </>
  );
}
