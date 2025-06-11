// src/lib/notification-manager.ts
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app, db, auth } from './firebase';
import { doc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';

// This function requests permission and gets the token
export const requestNotificationPermission = async () => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.log('This browser does not support desktop notification');
    toast({
      title: 'Notifications Not Supported',
      description: 'Your browser does not support push notifications.',
      variant: 'destructive',
    });
    return;
  }

  const messaging = getMessaging(app);
  const permission = await Notification.requestPermission();

  if (permission === 'granted') {
    console.log('Notification permission granted.');
    try {
      const currentToken = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      });

      if (currentToken) {
        console.log('FCM Token:', currentToken);
        // Save the token to Firestore
        await saveTokenToFirestore(currentToken);
        toast({
          title: 'Notifications Enabled!',
          description: "You'll now receive reminders for your habits.",
        });
      } else {
        console.log('No registration token available. Request permission to generate one.');
      }
    } catch (err) {
      console.error('An error occurred while retrieving token. ', err);
      toast({
        title: 'Error Enabling Notifications',
        description: 'Could not get the notification token. Please try again.',
        variant: 'destructive',
      });
    }
  } else {
    console.log('Unable to get permission to notify.');
    toast({
      title: 'Notifications Denied',
      description: 'You can enable notifications in your browser settings.',
    });
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
  }
};

// Listen for messages when the app is in the foreground
export const onForegroundMessage = () => {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    const messaging = getMessaging(app);
    onMessage(messaging, (payload) => {
      console.log('Foreground message received. ', payload);
      // Show a toast or update UI when a message is received
      toast({
        title: payload.notification?.title || 'New Message',
        description: payload.notification?.body || '',
      });
    });
  }
};
