
"use client";

import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { useTheme } from "./ThemeProvider";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Palette } from "lucide-react"; // Added Palette

const ThemeToggleButton: FC = () => {
  const { theme, cycleTheme } = useTheme(); // Use cycleTheme
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <Button variant="ghost" size="icon" aria-label="Change theme" disabled className="h-10 w-10" />;
  }

  // Determine icon based on current theme (simplified, could be more complex)
  const CurrentIcon = () => {
    if (theme === "theme-vibrant-purple") return <Moon className="h-5 w-5" />;
    if (theme === "theme-calm-blue") return <Sun className="h-5 w-5" />;
    return <Palette className="h-5 w-5" />; // Generic palette icon for other themes
  };
  
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycleTheme} // Call cycleTheme
      aria-label="Change theme"
    >
      <CurrentIcon />
    </Button>
  );
};

export default ThemeToggleButton;
