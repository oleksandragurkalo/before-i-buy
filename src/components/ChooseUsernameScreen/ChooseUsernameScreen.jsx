import { useState } from 'react';
import { AtSign } from 'lucide-react';
import { USERNAME_PATTERN } from '../../config';
import styles from './ChooseUsernameScreen.module.css';

export function ChooseUsernameScreen({ createProfile }) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!USERNAME_PATTERN.test(trimmed)) {
      setError('Must be 3-20 characters: letters, numbers, and underscores only.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { error: submitError } = await createProfile(trimmed);
      if (submitError) setError(submitError);
    } catch {
      setError('Could not save your username. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.backdrop}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <AtSign size={26} />
          </div>
          <div>
            <div className={styles.title}>Pick a username</div>
            <div className={styles.tagline}>So friends can find you and share lists with you</div>
          </div>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label htmlFor="username" className="sr-only">Username</label>
          <input
            id="username"
            className={styles.input}
            type="text"
            placeholder="username"
            value={username}
            onChange={e => { setUsername(e.target.value); setError(''); }}
            autoFocus
            autoComplete="off"
            maxLength={20}
            aria-invalid={!!error}
            aria-describedby="username-hint"
          />
          <p id="username-hint" className={styles.hint}>3-20 characters: letters, numbers, and underscores only.</p>

          {error && <div className={styles.error} role="alert">{error}</div>}

          <button className={styles.primaryBtn} type="submit" disabled={loading}>
            {loading ? 'Saving…' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
