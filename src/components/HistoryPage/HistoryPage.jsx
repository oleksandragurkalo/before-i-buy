import { useState } from 'react';
import { HistorySummary } from '../HistorySummary/HistorySummary';
import { ResistanceMeter } from '../ResistanceMeter/ResistanceMeter';
import { ItemListSection } from '../ItemListSection/ItemListSection';
import { HistoryItem } from '../HistoryItem/HistoryItem';
import { HistoryTableHeader } from '../HistoryItem/HistoryTableHeader';
import { computeHeaderStats, computeInsights } from '../../utils';
import styles from './HistoryPage.module.css';

// History is always this account's own decisions, account-wide across
// every list — never a friend's, and never divided by which list happens
// to be active elsewhere in the app (see useItems.js) — so unlike
// WaitingPage/ItemCard there's no read-only mode or per-list context here.
export function HistoryPage({ history, settings, loading, onRemove, onEdit }) {
  const [sortBy, setSortBy] = useState('newest');
  const [filterCategory, setFilterCategory] = useState('all');
  const [grouped, setGrouped] = useState(false);
  const [decisionFilter, setDecisionFilter] = useState('all');

  const headerStats = computeHeaderStats(history, settings.hourlyRate);
  const { resistanceRate } = computeInsights([], history);

  return (
    <section className={styles.section} aria-label="Decision history">
      <HistorySummary headerStats={headerStats} currencySymbol={settings.currencySymbol} />

      <ItemListSection
        items={history}
        loading={loading}
        dateField="decidedAt"
        emptyIcon="📋"
        emptyTitle="No decisions yet"
        emptyBody="Items you decide on will appear here."
        sortBy={sortBy}
        onSortChange={setSortBy}
        filterCategory={filterCategory}
        onFilterChange={setFilterCategory}
        grouped={grouped}
        onGroupToggle={setGrouped}
        viewMode="rows"
        decisionFilter={decisionFilter}
        onDecisionFilterChange={setDecisionFilter}
        header={<HistoryTableHeader />}
        renderItem={(item) => (
          <HistoryItem item={item} settings={settings} onRemove={onRemove} onEdit={onEdit} />
        )}
      />

      <ResistanceMeter resistanceRate={resistanceRate} />
    </section>
  );
}
