
"use client";

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function RootLoading() {
  // This loader is for the initial app shell load or when navigating to root if page.tsx is slow.
  // It's kept simple as page.tsx has its own more detailed loading states.
  return (
    <div className="min-h-screen flex items-center justify-center p-0 sm:p-4 h-[97vh]">
      <div className={cn(
        "bg-card/95 backdrop-blur-sm text-foreground shadow-xl rounded-xl flex flex-col mx-auto h-full",
        "w-full max-w-sm",
        "md:max-w-md lg:max-w-lg"
      )}>
        <div className="flex flex-col items-center justify-center flex-grow p-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading Habitual...</p>
        </div>
      </div>
    </div>
  );
}
