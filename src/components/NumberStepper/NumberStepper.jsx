import { Minus, Plus } from 'lucide-react';
import styles from './NumberStepper.module.css';

export function NumberStepper({
  id,
  value,
  onChange,
  step = 1,
  min,
  max,
  placeholder,
  ariaLabel = 'value',
  mono = true,
}) {
  const adjust = (delta) => {
    const current = parseFloat(value) || 0;
    let next = current + delta;
    if (min != null) next = Math.max(min, next);
    if (max != null) next = Math.min(max, next);
    next = Math.round(next * 100) / 100;
    onChange(String(next));
  };

  const atMin = min != null && (parseFloat(value) || 0) <= min;
  const atMax = max != null && (parseFloat(value) || 0) >= max;

  return (
    <div className={styles.stepper}>
      <button
        type="button"
        className={styles.stepBtn}
        onClick={() => adjust(-step)}
        disabled={atMin}
        aria-label={`Decrease ${ariaLabel}`}
      >
        <Minus size={14} />
      </button>
      <input
        id={id}
        type="number"
        className={`${styles.input} ${mono ? 'mono' : ''}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        autoComplete="off"
      />
      <button
        type="button"
        className={styles.stepBtn}
        onClick={() => adjust(step)}
        disabled={atMax}
        aria-label={`Increase ${ariaLabel}`}
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
