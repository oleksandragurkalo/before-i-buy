import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '../Button/Button';
import styles from './ErrorBoundary.module.css';

export class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.backdrop}>
          <div className={styles.card}>
            <div className={styles.icon} aria-hidden="true">
              <AlertTriangle size={22} />
            </div>
            <p className={styles.title}>Something went wrong</p>
            <p className={styles.body}>
              Reloading usually fixes it.
            </p>
            <Button className={styles.reloadBtn} fullWidth onClick={() => window.location.reload()}>
              Reload
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
