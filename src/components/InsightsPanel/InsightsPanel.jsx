import { useState } from 'react';
import { TrendingUp, Flame } from 'lucide-react';
import { computeInsights, computeStreak, formatPrice, formatHours, hoursOfWork } from '../../utils';
import styles from './InsightsPanel.module.css';
import dropdownIcon from '../../assets/icon-arrow-down.svg';

export function InsightsPanel({ waiting, history, settings }) {
  const { resistanceRate, categoryBreakdown, topTemptations, totalItems } = computeInsights(waiting, history);
  const streak = computeStreak(history);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const maxCategoryTotal = categoryBreakdown[0]?.total || 1;

  return (
    <div className={styles.panel}>
      <button 
        type="button"
        className={styles.header}
        onClick={() => setIsDropdownOpen(o => !o)}
        aria-expanded={isDropdownOpen}
      >
        <div className={styles.titleWrapper}>
          <TrendingUp size={16} />
          <h2 className={styles.title}>Insights</h2>
        </div>
        <img
          className={`${styles.dropdownIcon} ${isDropdownOpen ? styles.dropdownIconOpen : ''}`}
          src={dropdownIcon}
          alt=""
        />
      </button>

      <div className={`${styles.dropdownWrapper} ${isDropdownOpen ? styles.open : ''}`}>
        <div className={styles.dropdownInner}>
          {totalItems === 0 ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyIcon} aria-hidden="true">📊</p>
              <p className={styles.emptyText}>
                Add a few items to see your resistance rate, category breakdown, and biggest temptations here.
              </p>
            </div>
          ) : (
            <>
              <div className={styles.section}>
                <p className={styles.sectionLabel}>Resistance rate</p>
                {resistanceRate === null ? (
                  <p className={styles.placeholder}>Decide on an item to see this.</p>
                ) : (
                  <>
                    <div className={styles.rateRow}>
                      <span className={`${styles.rateValue} mono`}>{resistanceRate}%</span>
                      <span className={styles.rateHint}>of decisions were passes</span>
                    </div>
                    <div className={styles.bar}>
                      <div className={styles.barFill} style={{ width: `${resistanceRate}%` }} />
                    </div>
                  </>
                )}
              </div>

              {resistanceRate !== null && (
                <div className={styles.section}>
                  <p className={styles.sectionLabel}>Current streak</p>
                  <div className={styles.streakRow}>
                    <Flame size={20} className={streak > 0 ? styles.streakIconLit : styles.streakIcon} />
                    <span className={styles.streakValue}>
                      {streak === 0 ? 'No streak yet' : `${streak} resisted in a row`}
                    </span>
                  </div>
                </div>
              )}

              {categoryBreakdown.length > 0 && (
                <div className={styles.section}>
                  <p className={styles.sectionLabel}>By category</p>
                  <div className={styles.categoryList}>
                    {categoryBreakdown.map(cat => (
                      <div className={styles.categoryRow} key={cat.category}>
                        <span className={styles.categoryEmoji} aria-hidden="true">{cat.emoji}</span>
                        <div className={styles.categoryMain}>
                          <div className={styles.categoryTop}>
                            <span className={styles.categoryLabel}>{cat.label}</span>
                            <span className={`${styles.categoryValue} mono`}>{formatPrice(cat.total, settings.currencySymbol)}</span>
                          </div>
                          <div className={styles.bar}>
                            <div className={styles.barFillMuted} style={{ width: `${(cat.total / maxCategoryTotal) * 100}%` }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {topTemptations.length > 0 && (
                <div className={styles.section}>
                  <p className={styles.sectionLabel}>Biggest temptations</p>
                  <div className={styles.temptationList}>
                    {topTemptations.map(item => (
                      <div className={styles.temptationRow} key={item.id}>
                        <span className={styles.temptationName}>{item.name}</span>
                        <span className={`${styles.temptationHours} mono`}>{formatHours(hoursOfWork(item.price, settings.hourlyRate))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
