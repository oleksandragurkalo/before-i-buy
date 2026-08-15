import { useState } from 'react';
import { HistorySummary } from '../HistorySummary/HistorySummary';
import { ResistanceMeter } from '../ResistanceMeter/ResistanceMeter';
import { ItemListSection } from '../ItemListSection/ItemListSection';
import { HistoryItem } from '../HistoryItem/HistoryItem';
import { HistoryTableHeader } from '../HistoryItem/HistoryTableHeader';
import { computeHeaderStats, computeInsights } from '../../utils';
import styles from './HistoryPage.module.css';

export function HistoryPage({ waiting, history, settings, loading, onRemove, onEdit, readOnly = false }) {
  const [sortBy, setSortBy] = useState('newest');
  const [filterCategory, setFilterCategory] = useState('all');
  const [grouped, setGrouped] = useState(false);
  const [decisionFilter, setDecisionFilter] = useState('all');

  const headerStats = computeHeaderStats(waiting, history, settings.hourlyRate);
  const { resistanceRate } = computeInsights(waiting, history);

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
          <HistoryItem item={item} settings={settings} onRemove={onRemove} onEdit={onEdit} readOnly={readOnly} />
        )}
      />

      <ResistanceMeter resistanceRate={resistanceRate} />
    </section>
  );
}
