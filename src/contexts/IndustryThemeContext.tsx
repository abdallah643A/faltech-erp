import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type IndustryTheme = 'construction' | 'trading' | 'industrial';

interface IndustryThemeContextType {
  theme: IndustryTheme;
  setTheme: (theme: IndustryTheme) => void;
  themeConfig: ThemeConfig;
}

interface ThemeConfig {
  label: string;
  icon: string;
  accent: string;
  description: string;
}

const THEME_CONFIGS: Record<IndustryTheme, ThemeConfig> = {
  construction: {
    label: 'Construction',
    icon: '🏗️',
    accent: 'Orange',
    description: 'Project-centric with Gantt charts',
  },
  trading: {
    label: 'Trading',
    icon: '📦',
    accent: 'Blue/Green',
    description: 'Table-heavy, Inventory-centric',
  },
  industrial: {
    label: 'Industrial',
    icon: '⚙️',
    accent: 'Red/Amber',
    description: 'Dark theme, Machine monitoring',
  },
};

const IndustryThemeContext = createContext<IndustryThemeContextType | undefined>(undefined);

export function IndustryThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<IndustryTheme>(() => {
    return (localStorage.getItem('industry-theme') as IndustryTheme) || 'trading';
  });

  const setTheme = (t: IndustryTheme) => {
    setThemeState(t);
    localStorage.setItem('industry-theme', t);
  };

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-industry', theme);
    // Remove all theme classes then add current
    root.classList.remove('theme-construction', 'theme-trading', 'theme-industrial');
    root.classList.add(`theme-${theme}`);
  }, [theme]);

  return (
    <IndustryThemeContext.Provider value={{ theme, setTheme, themeConfig: THEME_CONFIGS[theme] }}>
      {children}
    </IndustryThemeContext.Provider>
  );
}

export function useIndustryTheme() {
  const ctx = useContext(IndustryThemeContext);
  if (!ctx) throw new Error('useIndustryTheme must be used within IndustryThemeProvider');
  return ctx;
}

export { THEME_CONFIGS };
