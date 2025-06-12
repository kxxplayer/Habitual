import React from 'react';

/**
 * A simple Home page component.
 * This component serves as a stable entry point for the application,
 * replacing the previous redirect to '/dashboard' for debugging purposes.
 * It helps verify that the basic page rendering is working across all deployment environments.
 */
export default function Home() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontFamily: 'sans-serif',
      backgroundColor: '#f0f2f5',
    }}>
      <div style={{
        textAlign: 'center',
        padding: '40px',
        borderRadius: '8px',
        backgroundColor: 'white',
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ fontSize: '2.5em', color: '#333' }}>Welcome to Habitual</h1>
        <p style={{ fontSize: '1.2em', color: '#666', marginTop: '10px' }}>
          Your application is successfully running.
        </p>
        <p style={{ fontSize: '1em', color: '#888', marginTop: '20px' }}>
          Next Step: Debug the /dashboard route.
        </p>
      </div>
    </div>
  );
}
