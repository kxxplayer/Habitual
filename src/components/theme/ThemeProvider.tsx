
"use client";

import type { FC, ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';

// Define the theme names
const THEME_NAMES = [
  "theme-calm-blue", // Original light theme
  "theme-forest-green",
  "theme-sunset-orange",
  "theme-vibrant-purple", // Original dark theme
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
  theme: THEME_NAMES[0], // Default to the first theme
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
  const [theme, setThemeInternal] = useState<Theme>(() => {
    if (typeof window === 'undefined') {
      return defaultTheme;
    }
    const storedTheme = localStorage.getItem(storageKey) as Theme;
    return THEME_NAMES.includes(storedTheme) ? storedTheme : defaultTheme;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const root = window.document.documentElement;
    
    // Remove all known theme classes before applying the new one
    THEME_NAMES.forEach(name => root.classList.remove(name));
    
    if (theme) {
      root.classList.add(theme);
    }
    localStorage.setItem(storageKey, theme);
  }, [theme, storageKey]);

  const handleSetTheme = (newTheme: Theme) => {
    if (THEME_NAMES.includes(newTheme)) {
      setThemeInternal(newTheme);
    } else {
      console.warn(`Attempted to set an invalid theme: ${newTheme}`);
    }
  };

  const cycleTheme = () => {
    setThemeInternal(currentTheme => {
      const currentIndex = THEME_NAMES.indexOf(currentTheme);
      const nextIndex = (currentIndex + 1) % THEME_NAMES.length;
      return THEME_NAMES[nextIndex];
    });
  };

  const value = {
    theme,
    setTheme: handleSetTheme,
    cycleTheme,
  };

  return (
    <ThemeProviderContext.Provider value={value} {...props}>
      {children}
    </ThemeProviderContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
