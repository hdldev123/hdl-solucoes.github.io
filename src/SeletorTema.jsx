import { useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { themeOptions } from './tema.js';

/** Menu de tema (claro/escuro/sistema) compartilhado entre a home e o Caderno. */
export default function SeletorTema({ theme, setTheme, activeTheme }) {
  const detailsRef = useRef(null);
  const ActiveThemeIcon = activeTheme.icon;

  useEffect(() => {
    const details = detailsRef.current;
    if (!details) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape' && details.open) {
        details.removeAttribute('open');
        details.querySelector('summary')?.focus();
      }
    };
    const onClickOutside = (event) => {
      if (details.open && !details.contains(event.target)) details.removeAttribute('open');
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onClickOutside);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onClickOutside);
    };
  }, []);

  return (
    <details className="theme-menu" ref={detailsRef}>
      <summary aria-label={`Tema: ${activeTheme.label}`} title={`Tema: ${activeTheme.label}`}>
        <ActiveThemeIcon size={16} aria-hidden="true" />
        <span className="theme-current">{activeTheme.label}</span>
        <ChevronDown className="theme-chevron" size={14} aria-hidden="true" />
      </summary>
      <div className="theme-options" role="group" aria-label="Escolher tema">
        {themeOptions.map(({ value, label, icon: ThemeOptionIcon }) => (
          <button
            type="button"
            key={value}
            aria-pressed={theme === value}
            onClick={(event) => {
              setTheme(value);
              event.currentTarget.closest('details')?.removeAttribute('open');
            }}
          >
            <ThemeOptionIcon size={16} aria-hidden="true" />
            <span>{label}</span>
            <i aria-hidden="true" />
          </button>
        ))}
      </div>
    </details>
  );
}
