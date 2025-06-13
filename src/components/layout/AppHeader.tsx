
"use client";

import type { FC } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
// ThemeToggleButton removed as it's available in Settings
// Button and buttonVariants removed as back arrow and calendar link are removed
// CalendarDays and ChevronLeft icons removed

const AppHeader: FC = () => {
  const router = useRouter(); // Kept in case of future use, but not used in this simplified version

  return (
    <header className="bg-card/95 backdrop-blur-sm shadow sticky top-0 z-40 shrink-0">
      <div className="px-3 py-2 flex justify-start items-center w-full"> {/* Slimmer padding, justify-start */}
        <div className="flex items-center">
          {/* SVG checkmark removed */}
          <h1 className="text-lg font-semibold text-primary ml-1.5"> {/* Slightly larger font, added ml for alignment */}
            GroviaHabits
          </h1>
        </div>
        {/* Calendar Link and ThemeToggleButton removed from here */}
      </div>
    </header>
  );
};

export default AppHeader;
