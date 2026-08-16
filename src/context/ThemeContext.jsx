import { createContext, useContext, useLayoutEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('bib-theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // useLayoutEffect (not useEffect) so the data-theme attribute flips in the
  // same paint as the toggle switch's own visual state — with useEffect
  // there was a one-frame gap where the switch had already flipped but the
  // page colors hadn't, which read as a flicker.
  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('bib-theme', theme);
  }, [theme]);

  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  // Without this, every ThemeProvider render (even ones unrelated to theme)
  // hands consumers a new object identity, re-rendering everything that
  // calls useTheme() regardless of whether `theme` actually changed.
  const value = useMemo(() => ({ theme, toggle, setTheme }), [theme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
