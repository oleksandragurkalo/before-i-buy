import styles from './Button.module.css';

export function Button({
  variant = 'primary',
  size = 'md',
  tone = 'default',
  fullWidth = false,
  icon,
  children,
  className = '',
  type = 'button',
  ...rest
}) {
  const isIcon = variant === 'icon';
  const classes = [
    styles.btn,
    isIcon ? (tone === 'danger' ? styles.iconDanger : styles.icon) : styles[variant],
    !isIcon && size === 'lg' ? styles.lg : '',
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
