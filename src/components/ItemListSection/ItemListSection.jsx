import { FilterBar } from '../FilterBar/FilterBar';
import { sortItems, groupByCategory } from '../../utils';
import styles from './ItemListSection.module.css';

export function ItemListSection({
  items,
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
  header,
  renderItem,
}) {
  if (items.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyIcon} aria-hidden="true">{emptyIcon}</p>
        <p className={styles.emptyTitle}>{emptyTitle}</p>
        <p className={styles.emptyBody}>{emptyBody}</p>
      </div>
    );
  }

  const availableCategories = [...new Set(items.map(i => i.category || 'other'))];
  const byCategory = filterCategory === 'all' ? items : items.filter(i => (i.category || 'other') === filterCategory);
  const filtered = !decisionFilter || decisionFilter === 'all'
    ? byCategory
    : byCategory.filter(i => i.status === decisionFilter);
  const visible = sortItems(filtered, sortBy, dateField);
  const listClass = viewMode === 'grid' ? styles.grid : styles.list;

  return (
    <>
      {items.length > 1 && (
        <FilterBar
          sortBy={sortBy}
          onSortChange={onSortChange}
          filterCategory={filterCategory}
          onFilterChange={onFilterChange}
          availableCategories={availableCategories}
          grouped={grouped}
          onGroupToggle={onGroupToggle}
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
          decisionFilter={decisionFilter}
          onDecisionFilterChange={onDecisionFilterChange}
        />
      )}

      {header}

      {grouped ? (
        groupByCategory(visible).map(group => (
          <div className={styles.group} key={group.category}>
            <div className={styles.groupHeader}>
              <span aria-hidden="true">{group.emoji}</span>
              <span>{group.label}</span>
              <span className={styles.groupCount}>{group.items.length}</span>
            </div>
            <ul className={listClass}>
              {group.items.map(item => <li key={item.id}>{renderItem(item)}</li>)}
            </ul>
          </div>
        ))
      ) : (
        <ul className={listClass}>
          {visible.map(item => <li key={item.id}>{renderItem(item)}</li>)}
        </ul>
      )}
    </>
  );
}
