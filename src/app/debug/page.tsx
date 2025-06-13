"use client";

import { useEffect, useState } from 'react';

export default function DebugPage() {
  const [componentStatus, setComponentStatus] = useState<Record<string, string>>({});

  useEffect(() => {
    const checkComponents = async () => {
      const status: Record<string, string> = {};

      try {
        const AppHeader = await import('@/components/layout/AppHeader');
        status.AppHeader = AppHeader.default ? 'Loaded' : 'No default export';
      } catch (e) {
        status.AppHeader = `Error: ${e}`;
      }

      try {
        const BottomNav = await import('@/components/layout/BottomNavigationBar');
        status.BottomNavigationBar = BottomNav.default ? 'Loaded' : 'No default export';
      } catch (e) {
        status.BottomNavigationBar = `Error: ${e}`;
      }

      try {
        const ScrollAreaImport = await import('@/components/ui/scroll-area');
        status.ScrollArea = ScrollAreaImport.ScrollArea ? 'Loaded' : 'No ScrollArea export';
      } catch (e) {
        status.ScrollArea = `Error: ${e}`;
      }

      try {
        const CalendarImport = await import('@/components/ui/calendar');
        status.Calendar = CalendarImport.Calendar ? 'Loaded' : 'No Calendar export';
      } catch (e) {
        status.Calendar = `Error: ${e}`;
      }

      try {
        const AppPageLayout = await import('@/components/layout/AppPageLayout');
        status.AppPageLayout = AppPageLayout.default ? 'Loaded' : 'No default export';
      } catch (e) {
        status.AppPageLayout = `Error: ${e}`;
      }

      setComponentStatus(status);
    };

    checkComponents();
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Component Import Debug</h1>
      <pre className="bg-gray-100 p-4 rounded">
        {JSON.stringify(componentStatus, null, 2)}
      </pre>
      
      <div className="mt-4">
        <h2 className="text-xl font-bold mb-2">Environment</h2>
        <p>Node Env: {process.env.NODE_ENV}</p>
        <p>Build Time: {new Date().toISOString()}</p>
      </div>
    </div>
  );
}