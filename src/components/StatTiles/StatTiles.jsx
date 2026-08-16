import { StatTile } from '../StatTile/StatTile.jsx';
import { formatHours, formatPrice } from '../../utils/index.js';

export function StatTiles( { headerStats, currencySymbol, className }) {
  const { totalSaved, totalSpent, resistedCount, spentCount, hoursSaved } = headerStats;

  const tiles = [
    {
      tone: 'green',
      label: 'Resisted',
      value: formatPrice(totalSaved, currencySymbol),
      sublabel: `${resistedCount} item${resistedCount === 1 ? '' : 's'}`,
    },
    {
      tone: "red",
      label: 'Spent anyway',
      value: formatPrice(totalSpent, currencySymbol),
      sublabel: `${spentCount} item${spentCount === 1 ? '' : 's'}`,
    },
    {
      tone: "blue",
      label: 'Hours saved',
      value: formatHours(hoursSaved),
      sublabel: 'per resisted item',
    },
  ];

  return (
    <div className={className}>
      {tiles.map((tile) => (
        <StatTile key={tile.label} {...tile} />
      ))}
    </div>
  );
}
