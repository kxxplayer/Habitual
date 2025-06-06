
"use client";

import * as React from 'react';
import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { useTheme } from "./ThemeProvider";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Palette } from "lucide-react";

const ThemeToggleButton: FC = () => {
  const { theme, cycleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    // Render a placeholder or null on the server and during initial client hydration
    // Size adjusted to h-7 w-7 to match other header icons
    return <Button variant="ghost" size="icon" aria-label="Change theme" disabled className="h-7 w-7" />;
  }

  const CurrentIcon = () => {
    // Icon size adjusted to h-3.5 w-3.5
    if (theme === "theme-vibrant-purple") return <Moon className="h-3.5 w-3.5" />;
    if (theme === "theme-calm-blue") return <Sun className="h-3.5 w-3.5" />;
    return <Palette className="h-3.5 w-3.5" />; // Default for other themes
  };
  
  return (
    // Size adjusted to h-7 w-7
    <Button variant="ghost" size="icon" onClick={cycleTheme} aria-label="Change theme" className="h-7 w-7">
      <CurrentIcon />
    </Button>
  );
};

export default ThemeToggleButton;
