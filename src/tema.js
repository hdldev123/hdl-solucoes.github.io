import { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';

export const themeOptions = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Escuro', icon: Moon },
  { value: 'system', label: 'Sistema', icon: Monitor },
];

function getInitialTheme() {
  try {
    const savedTheme = window.localStorage.getItem('hdl-theme');
    return themeOptions.some(({ value }) => value === savedTheme) ? savedTheme : 'system';
  } catch {
    return 'system';
  }
}

/** Gerencia o tema claro/escuro/sistema, persistido em localStorage['hdl-theme']. */
export function useTema() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = () => {
      const resolvedTheme = theme === 'system'
        ? (mediaQuery.matches ? 'dark' : 'light')
        : theme;

      document.documentElement.dataset.theme = resolvedTheme;
      document.documentElement.style.colorScheme = resolvedTheme;
      document.querySelector('meta[name="theme-color"]')?.setAttribute(
        'content',
        resolvedTheme === 'dark' ? '#0B1019' : '#F7F7F4',
      );
    };

    applyTheme();

    try {
      window.localStorage.setItem('hdl-theme', theme);
    } catch {
      // The selected theme still works when storage is unavailable.
    }

    if (theme === 'system') {
      mediaQuery.addEventListener('change', applyTheme);
      return () => mediaQuery.removeEventListener('change', applyTheme);
    }

    return undefined;
  }, [theme]);

  const activeTheme = themeOptions.find(({ value }) => value === theme) ?? themeOptions[2];
  return { theme, setTheme, activeTheme };
}
