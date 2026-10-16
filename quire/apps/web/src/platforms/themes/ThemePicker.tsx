import { useState } from 'react';
import { THEMES, applyTheme, loadTheme } from './index.ts';

/** Theme choice, applied immediately (R-PLT-05). */
export function ThemePicker() {
  const [theme, setTheme] = useState(loadTheme);
  return (
    <label className="field">
      <span>Theme</span>
      <select
        aria-label="Theme"
        value={theme}
        onChange={(e) => {
          setTheme(e.target.value);
          applyTheme(e.target.value);
        }}
      >
        {THEMES.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </label>
  );
}
