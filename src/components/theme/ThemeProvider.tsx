
"use client";

import type { FC, ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';

const THEME_NAMES = [
  "theme-calm-blue",
  "theme-forest-green",
  "theme-sunset-orange",
  "theme-vibrant-purple",
] as const;

export type Theme = typeof THEME_NAMES[number];

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  cycleTheme: () => void;
}

const initialState: ThemeProviderState = {
  theme: THEME_NAMES[0], // This default is fine for context shape
  setTheme: () => null,
  cycleTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export const ThemeProvider: FC<ThemeProviderProps> = ({
  children,
  defaultTheme = THEME_NAMES[0],
  storageKey = "habitual-multi-theme",
  ...props
}) => {
  // Initialize theme state *always* with defaultTheme for the first render.
  const [theme, setThemeInternal] = useState<Theme>(defaultTheme);

  useEffect(() => {
    // This effect runs only on the client, after the component has mounted.
    // Now, it's safe to read from localStorage and update the theme.
    const storedTheme = localStorage.getItem(storageKey) as Theme;
    if (THEME_NAMES.includes(storedTheme) && storedTheme !== theme) { // Check if it's different from current (default)
      setThemeInternal(storedTheme);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]); // Only run on mount (and if storageKey changed, which it shouldn't)

  useEffect(() => {
    // This effect applies the theme to the document and updates localStorage.
    // It runs whenever 'theme' or 'storageKey' changes.
    if (typeof window === 'undefined') return;
    const root = window.document.documentElement;
    
    // Remove any existing theme classes
    THEME_NAMES.forEach(name => {
      if (root.classList.contains(name)) {
        root.classList.remove(name);
      }
    });
    
    // Add the new theme class
    if (theme) {
      root.classList.add(theme);
      localStorage.setItem(storageKey, theme);
    }
  }, [theme, storageKey]);

  const handleSetTheme = (newTheme: Theme) => {
    if (THEME_NAMES.includes(newTheme)) {
      setThemeInternal(newTheme);
    }
  };

  const cycleTheme = () => {
    setThemeInternal(currentTheme => {
      const currentIndex = THEME_NAMES.indexOf(currentTheme);
      const nextIndex = (currentIndex + 1) % THEME_NAMES.length;
      return THEME_NAMES[nextIndex];
    });
  };

  const value = { theme, setTheme: handleSetTheme, cycleTheme };

  return (
    <ThemeProviderContext.Provider value={value} {...props}>
      {children}
    </ThemeProviderContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) throw new Error("useTheme must be used within a ThemeProvider");
  return context;
};
