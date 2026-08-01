import styles from './HistoryItem.module.css';

export function HistoryTableHeader() {
  return (
    <div className={styles.headerRow} aria-hidden="true">
      <span>Item</span>
      <span className={styles.category}>Category</span>
      <span>Decision</span>
      <span className={styles.price}>Price</span>
      <span className={styles.hours}>Hours</span>
      <span className={styles.date}>Date</span>
      <span className={styles.actions} />
    </div>
  );
}
