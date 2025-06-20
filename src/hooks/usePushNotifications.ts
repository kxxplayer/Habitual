import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Preferences } from '@capacitor/preferences';

export function usePushNotifications() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const initPushNotifications = async () => {
      try {
        // Request permission
        const result = await PushNotifications.requestPermissions();
        
        if (result.receive === 'granted') {
          await PushNotifications.register();
        } else {
          console.log('Push notification permission denied');
        }
      } catch (error) {
        console.error('Error initializing push notifications:', error);
      }
    };

    // Registration success
    PushNotifications.addListener('registration', token => {
      console.log('Push registration success, token: ' + token.value);
      // TODO: Send this token to your backend if you want to send targeted notifications
    });

    // Registration error
    PushNotifications.addListener('registrationError', err => {
      console.error('Push registration error: ', err);
    });

    // Notification received in foreground
    PushNotifications.addListener('pushNotificationReceived', notification => {
      console.log('Push received: ', notification);
      // Instead of alert, use a more user-friendly notification
    });

    // Notification action performed (user taps)
    PushNotifications.addListener('pushNotificationActionPerformed', notification => {
      console.log('Push action performed: ', notification);
      // Handle notification tap
    });

    // Initialize with error handling
    initPushNotifications();

    // Cleanup listeners on unmount
    return () => {
      PushNotifications.removeAllListeners();
    };
  }, []);
}

export async function requestLocalNotificationPermission() {
  try {
    const perm = await LocalNotifications.requestPermissions();
    return perm.display === 'granted';
  } catch (error) {
    console.error('Error requesting local notification permission:', error);
    return false;
  }
}

export async function scheduleReminder(title: string, body: string, atDate: Date): Promise<void> {
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          title,
          body,
          id: Date.now(),
          schedule: { at: atDate },
          sound: undefined,
          actionTypeId: '',
          extra: undefined,
        },
      ],
    });
  } catch (error) {
    console.error('Error scheduling reminder:', error);
    throw error;
  }
}

// Save data
export async function saveToStorage(key: string, value: string): Promise<void> {
  try {
    await Preferences.set({ key, value });
  } catch (error) {
    console.error('Error saving to storage:', error);
    throw error;
  }
}

// Get data
export async function getFromStorage(key: string): Promise<string | null> {
  try {
    const { value } = await Preferences.get({ key });
    return value ?? null;
  } catch (error) {
    console.error('Error getting from storage:', error);
    return null;
  }
}