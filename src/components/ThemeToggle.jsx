import { useState } from 'react';

const STORAGE_KEY = 'around-town-theme';

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    'content', theme === 'dark' ? '#06100f' : '#ffffff',
  );
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => (
    document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
  ));
  const isDark = theme === 'dark';

  function toggleTheme() {
    const nextTheme = isDark ? 'light' : 'dark';
    applyTheme(nextTheme);
    setTheme(nextTheme);
    try {
      localStorage.setItem(STORAGE_KEY, nextTheme);
    } catch {
      // Keep the choice for this visit when browser storage is unavailable.
    }
  }

  return <button
    type="button"
    className="theme-toggle"
    aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    onClick={toggleTheme}
  >
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {isDark
        ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4m0-14.2-1.4 1.4M6.3 17.7l-1.4 1.4" /></>
        : <path d="M20.5 14.2A8.6 8.6 0 0 1 9.8 3.5a8.6 8.6 0 1 0 10.7 10.7Z" />}
    </svg>
    <span>{isDark ? 'Light mode' : 'Dark mode'}</span>
  </button>;
}
