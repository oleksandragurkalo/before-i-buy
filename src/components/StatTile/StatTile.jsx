import styles from './StatTile.module.css';

function Sparkline({ series, color }) {
  if (!series || series.length < 2) return null;
  const w = 64;
  const h = 28;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;
  const points = series.map((v, i) => {
    const x = (i / (series.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return [x, y];
  });
  const linePath = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${w},${h} L0,${h} Z`;

  return (
    <svg className={styles.sparkline} viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true">
      <path d={areaPath} fill={color} opacity={0.1} />
      <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StatTile({ tone, label, value, sublabel, series }) {
  return (
    <div className={`${styles.tile} ${styles[tone]}`}>
      <p className={styles.label}>{label}</p>
      <p className={`${styles.value} mono`}>{value}</p>
      <div className={styles.footer}>
        <p className={styles.sublabel}>{sublabel}</p>
        <Sparkline series={series} color={`var(--${tone})`} />
      </div>
    </div>
  );
}
