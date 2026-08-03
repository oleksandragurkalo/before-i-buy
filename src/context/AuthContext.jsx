import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext(null);

// Shared with AccountSettingsModal's change-password form and AuthScreen's
// signup form.
export function validatePassword(password) {
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/\d/.test(password)) return 'Password must include at least one number.';
  return '';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = still loading
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    // onAuthStateChange fires once immediately with the current session
    // (an INITIAL_SESSION event) as soon as it's subscribed, so a separate
    // getSession() call up front would just re-fetch the same thing.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    // OAuth redirect errors (e.g. the user cancels the Google consent
    // screen) come back as query/hash params rather than a rejected
    // promise, since signInWithOAuth navigates away instead of resolving
    // in place.
    const params = new URLSearchParams(window.location.hash.replace(/^#/, '') || window.location.search);
    const description = params.get('error_description');
    if (description) {
      setAuthError(description.replace(/\+/g, ' '));
      window.history.replaceState(null, '', window.location.pathname);
    }

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
  };

  const signUpWithEmail = async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name } },
    });
    if (error) throw error;
    return data;
  };

  const signInWithEmail = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const logOut = () => supabase.auth.signOut();

  const updateDisplayName = async (name) => {
    const { data, error } = await supabase.auth.updateUser({ data: { full_name: name } });
    if (error) throw error;
    setUser(data.user);
  };

  // Supabase doesn't force a "recent login" check on updateUser like
  // Firebase does, but re-verifying the current password before accepting a
  // new one is still good practice — it confirms the request really came
  // from the account owner, not just an unattended open session.
  const changePassword = async (currentPassword, newPassword) => {
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (verifyError) throw verifyError;
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{
      user, authError, clearAuthError: () => setAuthError(''),
      signInWithGoogle, signUpWithEmail, signInWithEmail, logOut,
      updateDisplayName, changePassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
