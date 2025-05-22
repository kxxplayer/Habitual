
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
    return <Button variant="ghost" size="icon" aria-label="Change theme" disabled className="h-10 w-10" />;
  }

  const CurrentIcon = () => {
    if (theme === "theme-vibrant-purple") return <Moon className="h-5 w-5" />;
    if (theme === "theme-calm-blue") return <Sun className="h-5 w-5" />;
    return <Palette className="h-5 w-5" />; // Default for other themes
  };
  
  return (
    <Button variant="ghost" size="icon" onClick={cycleTheme} aria-label="Change theme">
      <CurrentIcon />
    </Button>
  );
};

export default ThemeToggleButton;
