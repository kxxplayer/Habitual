// src/lib/notification-manager.ts
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app, db, auth } from './firebase';
import { doc, setDoc, arrayUnion } from 'firebase/firestore';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// This function requests permission and gets the token
export const requestNotificationPermission = async () => {
  if (!isBrowser || !('Notification' in window)) {
    console.log('This browser does not support desktop notification');
    return {
      success: false,
      error: 'Your browser does not support push notifications.'
    };
  }

  try {
    // First check if permission was already granted
    if (Notification.permission === 'granted') {
      const messaging = getMessaging(app);
      
      // Check if VAPID key is configured
      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      if (!vapidKey) {
        console.error('VAPID key not configured');
        return {
          success: false,
          error: 'Push notifications are not properly configured. Please contact support.'
        };
      }
      
      const currentToken = await getToken(messaging, { vapidKey });
      
      if (currentToken) {
        await saveTokenToFirestore(currentToken);
        return {
          success: true,
          message: "You're already set up for notifications!"
        };
      }
    }

    // Request permission if not already granted
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('Notification permission granted.');
      
      // Wait a moment for permission to register
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const messaging = getMessaging(app);
      
      // Check if VAPID key is configured
      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      if (!vapidKey) {
        console.error('VAPID key not configured');
        return {
          success: false,
          error: 'Push notifications are not properly configured. Please contact support.'
        };
      }
      
      const currentToken = await getToken(messaging, { vapidKey });

      if (currentToken) {
        console.log('FCM Token:', currentToken);
        await saveTokenToFirestore(currentToken);
        return {
          success: true,
          message: "You'll now receive reminders for your habits!"
        };
      } else {
        console.log('No registration token available.');
        return {
          success: false,
          error: 'Could not generate notification token. Please check your setup and try again.'
        };
      }
    } else if (permission === 'denied') {
      return {
        success: false,
        error: 'You have blocked notifications. Please enable them in your browser settings and try again.'
      };
    } else {
      return {
        success: false,
        error: 'Notification permission is required to enable reminders.'
      };
    }
  } catch (err: any) {
    console.error('An error occurred while retrieving token:', err);
    
    let errorMessage = 'Could not get the notification token. Please try again.';
    
    // Handle specific Firebase error codes
    if (err.code === 'messaging/permission-blocked') {
      errorMessage = 'Notifications are blocked. Please enable them in your browser settings.';
    } else if (err.code === 'messaging/failed-service-worker-registration') {
      errorMessage = 'Service worker registration failed. Please ensure you have a firebase-messaging-sw.js file in your public directory.';
    } else if (err.code === 'messaging/unsupported-browser') {
      errorMessage = 'Your browser does not support notifications.';
    } else if (err.code === 'messaging/token-unsubscribe-failed') {
      errorMessage = 'Failed to generate token. Please try again.';
    } else if (err.message && err.message.includes('messaging-sw.js')) {
      errorMessage = 'Service worker file missing. Please ensure firebase-messaging-sw.js exists in your public directory.';
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
};

// Function to save the token to the user's document in Firestore
const saveTokenToFirestore = async (token: string) => {
  const user = auth.currentUser;
  if (!user) {
    console.log('No user logged in to save token.');
    return;
  }

  const userDocRef = doc(db, 'users', user.uid);

  try {
    // Use arrayUnion to add the token to an array, avoiding duplicates
    await setDoc(userDocRef, { 
      fcmTokens: arrayUnion(token) 
    }, { merge: true });
    console.log('FCM token saved for user:', user.uid);
  } catch (error) {
    console.error('Error saving FCM token to Firestore:', error);
    throw error;
  }
};

// Listen for messages when the app is in the foreground
export const onForegroundMessage = () => {
  if (!isBrowser || !('Notification' in window)) {
    return;
  }

  try {
    const messaging = getMessaging(app);
    onMessage(messaging, (payload) => {
      console.log('Foreground message received:', payload);
      
      // Show a browser notification if the page is not focused
      if (document.hidden && payload.notification) {
        new Notification(payload.notification.title || 'New Message', {
          body: payload.notification.body || '',
          icon: payload.notification.icon || '/icon-192x192.png',
        });
      }
      
      // You can also emit a custom event or update UI here
      const event = new CustomEvent('fcm-message', { detail: payload });
      window.dispatchEvent(event);
    });
  } catch (error) {
    console.error('Error setting up foreground message listener:', error);
  }
};

// Check if notifications are supported
export const isNotificationSupported = () => {
  return isBrowser && 'Notification' in window && 'serviceWorker' in navigator;
};

// Check current notification permission status
export const getNotificationPermission = () => {
  if (!isBrowser || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
};