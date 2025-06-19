import { useState, useEffect } from 'react';
import { Network } from '@capacitor/network';

export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(true); 

  useEffect(() => {
    const handleStatusChange = (status: { connected: boolean }) => {
      setIsOnline(status.connected);
    };

    Network.getStatus().then(handleStatusChange);
    
    const listenerPromise = Network.addListener('networkStatusChange', handleStatusChange);

    // This function correctly awaits the listener handle before removing it
    return () => {
      const removeListener = async () => {
        try {
          const handle = await listenerPromise;
          handle.remove();
        } catch (e) {
          console.error("Failed to remove network listener", e);
        }
      };
      removeListener();
    };
  }, []);

  return { isOnline };
};