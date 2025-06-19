import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Preferences } from '@capacitor/preferences';

export function usePushNotifications() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // Request permission
    PushNotifications.requestPermissions().then(result => {
      if (result.receive === 'granted') {
        PushNotifications.register();
      }
    });

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
      alert('Push received: ' + JSON.stringify(notification));
    });

    // Notification action performed (user taps)
    PushNotifications.addListener('pushNotificationActionPerformed', notification => {
      alert('Push action performed: ' + JSON.stringify(notification));
    });

    // Cleanup listeners on unmount
    return () => {
      PushNotifications.removeAllListeners();
    };
  }, []);
}

export async function requestLocalNotificationPermission() {
  const perm = await LocalNotifications.requestPermissions();
  return perm.display === 'granted';
}

export async function scheduleReminder(title: string, body: string, atDate: Date): Promise<void> {
  await LocalNotifications.schedule({
    notifications: [
      {
        title,
        body,
        id: Date.now(),
        schedule: { at: atDate }, // atDate is a JS Date object
        sound: undefined,
        actionTypeId: '',
        extra: undefined,
      },
    ],
  });
}

// Save data
export async function saveToStorage(key: string, value: string): Promise<void> {
  await Preferences.set({ key, value });
}

// Get data
export async function getFromStorage(key: string): Promise<string | null> {
  const { value } = await Preferences.get({ key });
  return value ?? null;
}