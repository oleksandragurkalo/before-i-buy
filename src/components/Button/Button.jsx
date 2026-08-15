import styles from './Button.module.css';

export function Button({
  variant = 'primary', // 'primary' | 'secondary' | 'text' | 'icon' | 'danger'
  tone, // 'danger' — read when variant="icon" or variant="text"
  fullWidth = false,
  icon,
  children,
  className = '',
  type = 'button',
  ...rest
}) {
  const isIcon = variant === 'icon';
  const isDangerToned = tone === 'danger' && (isIcon || variant === 'text');
  const classes = [
    styles.btn,
    isDangerToned ? (isIcon ? styles.iconDanger : styles.textDanger) : styles[variant],
    fullWidth ? styles.fullWidth : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button type={type} className={classes} {...rest}>
      {icon}
      {children}
    </button>
  );
}
