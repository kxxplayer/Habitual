// src/components/providers/ErrorBoundaryProvider.tsx
"use client";

import { ErrorBoundary } from 'react-error-boundary';
import { ReactNode } from 'react';

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div role="alert" className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-destructive/10 border border-destructive rounded-lg p-6 max-w-md w-full">
        <h2 className="text-lg font-semibold text-destructive mb-2">Something went wrong!</h2>
        <pre className="text-sm bg-background/50 p-3 rounded mb-4 overflow-x-auto">
          {error.message}
        </pre>
        <p className="text-sm text-muted-foreground mb-4">
          Error: {error.name}
        </p>
        <button
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export default function ErrorBoundaryProvider({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => window.location.reload()}
    >
      {children}
    </ErrorBoundary>
  );
}