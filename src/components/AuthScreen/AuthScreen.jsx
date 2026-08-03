import { useEffect, useState } from 'react';
import { ShoppingBag, ArrowLeft } from 'lucide-react';
import { useAuth, validatePassword } from '../../context/AuthContext';
import styles from './AuthScreen.module.css';

// Google G icon (SVG) — avoids an extra dependency
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

export function AuthScreen({ onBack }) {
  const {
    signInWithGoogle, signUpWithEmail, signInWithEmail,
    authError, clearAuthError,
  } = useAuth();
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Google sign-in redirects away and back instead of resolving in place —
  // any error from that flow surfaces here once the page reloads. Unlike
  // the codes handled by friendlyError(), this is already a human-readable
  // description pulled straight from the redirect URL.
  useEffect(() => {
    if (!authError) return;
    setError(authError);
    clearAuthError();
  }, [authError, clearAuthError]);

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      // Navigates away immediately on success; only rejects here for a
      // pre-redirect failure (e.g. the provider isn't enabled yet).
      await signInWithGoogle();
    } catch (e) {
      setError(friendlyError(e.code));
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (mode === 'signup') {
      const passwordError = validatePassword(password);
      if (passwordError) { setError(passwordError); return; }
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const fullName = `${name.trim()} ${surname.trim()}`.trim();
        await signUpWithEmail(email, password, fullName);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (e) {
      setError(friendlyError(e.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.backdrop}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <ShoppingBag size={28} />
          </div>
          <div>
            <div className={styles.title}>before-i-buy</div>
            <div className={styles.tagline}>Think before you spend</div>
          </div>
          {onBack && (
            <button type="button" className={styles.backBtn} onClick={onBack} aria-label="Back">
              <ArrowLeft size={16} />
            </button>
          )}
        </div>

        <button className={styles.googleBtn} onClick={handleGoogle} disabled={loading}>
          <GoogleIcon />
          Continue with Google
        </button>

        <div className={styles.divider}>or</div>

        <form className={styles.form} onSubmit={handleEmailSubmit}>
          {mode === 'signup' && (
            <div className={styles.nameRow}>
              <input
                className={styles.input}
                type="text"
                placeholder="Name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                autoComplete="given-name"
                maxLength={60}
              />
              <input
                className={styles.input}
                type="text"
                placeholder="Surname"
                value={surname}
                onChange={e => setSurname(e.target.value)}
                autoComplete="family-name"
                maxLength={60}
              />
            </div>
          )}
          <input
            className={styles.input}
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <input
            className={styles.input}
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            minLength={8}
          />
          {mode === 'signup' && <p className={styles.hint}>At least 8 characters, with a number.</p>}

          {error && <div className={styles.error}>{error}</div>}

          <button className={styles.primaryBtn} type="submit" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <div className={styles.toggle}>
          {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <button
            className={styles.toggleLink}
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError('');
            }}
          >
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}

function friendlyError(code) {
  switch (code) {
    case 'user_not_found':
    case 'invalid_credentials': return 'Incorrect email or password.';
    case 'email_exists': return 'An account with this email already exists.';
    case 'weak_password': return 'Password must be at least 8 characters, with a number.';
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit': return 'Too many attempts. Try again later.';
    default: return 'Something went wrong. Please try again.';
  }
}
