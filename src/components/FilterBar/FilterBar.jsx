import { Rows3, LayoutGrid } from 'lucide-react';
import { CATEGORIES } from '../../utils';
import styles from './FilterBar.module.css';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'price-asc', label: 'Price: low to high' },
];

export function FilterBar({ sortBy, onSortChange, filterCategory, onFilterChange, availableCategories, grouped, onGroupToggle }) {
  return (
    <div className={styles.bar}>
      <select
        className={styles.select}
        value={sortBy}
        onChange={(e) => onSortChange(e.target.value)}
        aria-label="Sort by"
      >
        {SORT_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <select
        className={styles.select}
        value={filterCategory}
        onChange={(e) => onFilterChange(e.target.value)}
        aria-label="Filter by category"
      >
        <option value="all">All categories</option>
        {availableCategories.map(key => (
          <option key={key} value={key}>
            {(CATEGORIES[key] || CATEGORIES.other).emoji} {(CATEGORIES[key] || CATEGORIES.other).label}
          </option>
        ))}
      </select>

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
