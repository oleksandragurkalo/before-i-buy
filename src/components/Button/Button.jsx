import styles from './Button.module.css';

export function Button({
  variant = 'primary', // 'primary' | 'secondary' | 'text' | 'icon'
  size = 'md', // 'md' | 'lg' (only visibly styled for variant="primary")
  tone, // 'danger' — only read when variant="icon"
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
