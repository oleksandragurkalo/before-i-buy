import { Rows3, LayoutGrid, List, Grid2x2 } from 'lucide-react';
import { CATEGORIES } from '../../utils';
import { Dropdown } from '../Dropdown/Dropdown';
import styles from './FilterBar.module.css';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'price-asc', label: 'Price: low to high' },
];

export function FilterBar({
  sortBy, onSortChange, filterCategory, onFilterChange, availableCategories,
  grouped, onGroupToggle, viewMode, onViewModeChange,
}) {
  const categoryOptions = [
    { value: 'all', label: 'All categories' },
    ...availableCategories.map(key => ({
      value: key,
      label: `${(CATEGORIES[key] || CATEGORIES.other).emoji} ${(CATEGORIES[key] || CATEGORIES.other).label}`,
    })),
  ];

  return (
    <div className={styles.bar}>
      <Dropdown value={sortBy} options={SORT_OPTIONS} onChange={onSortChange} ariaLabel="Sort by" />
      <Dropdown value={filterCategory} options={categoryOptions} onChange={onFilterChange} ariaLabel="Filter by category" />

      {onViewModeChange && (
        <div className={styles.viewToggle}>
          <button
            type="button"
            className={styles.viewBtn}
            onClick={() => onViewModeChange('rows')}
            aria-pressed={viewMode === 'rows'}
            aria-label="Row view"
            title="Row view"
          >
            <List size={15} />
          </button>
          <button
            type="button"
            className={styles.viewBtn}
            onClick={() => onViewModeChange('grid')}
            aria-pressed={viewMode === 'grid'}
            aria-label="Grid view"
            title="Grid view"
          >
            <Grid2x2 size={15} />
          </button>
        </div>
      )}

      <button
        type="button"
        className={styles.groupBtn}
        onClick={() => onGroupToggle(!grouped)}
        aria-pressed={grouped}
        aria-label={grouped ? 'Show as flat list' : 'Group by category'}
        title={grouped ? 'Show as flat list' : 'Group by category'}
      >
        {grouped ? <Rows3 size={15} /> : <LayoutGrid size={15} />}
      </button>
    </div>
  );
}
