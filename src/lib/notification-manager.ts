// src/lib/notification-manager.ts
import { LocalNotifications } from '@capacitor/local-notifications';
import type { Habit } from '@/types';
import type { ScheduleOptions, LocalNotificationSchema } from '@capacitor/local-notifications';

// Helper to convert a habit ID to a unique but consistent numeric ID for notifications
const getNotificationId = (habitId: string): number => {
  let hash = 0;
  for (let i = 0; i < habitId.length; i++) {
    const char = habitId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

// Request notification permissions from the user
export const requestPermissions = async (): Promise<boolean> => {
  try {
    const result = await LocalNotifications.requestPermissions();
    return result.display === 'granted';
  } catch (e) {
    console.error("Error requesting notification permissions", e);
    return false;
  }
};

// Schedule a recurring reminder every 3 hours for a specific habit
export const scheduleReminder = async (habit: Habit): Promise<void> => {
  const hasPermission = (await LocalNotifications.checkPermissions()).display === 'granted';
  if (!hasPermission) {
    console.warn('Cannot schedule reminder, permission not granted.');
    return;
  }

  try {
    // Schedule a notification that repeats every 3 hours
    const options: ScheduleOptions = {
      notifications: [
        {
          id: getNotificationId(habit.id),
          title: `Time for a good habit!`,
          body: `Don't forget to complete: "${habit.name}"`,
          schedule: {
            every: 'hour',
            count: 1, // Will fire once and then be rescheduled by the app logic if needed
            on: {
                hour: new Date().getHours() + 3 // Schedule 3 hours from now
            }
          },
          sound: undefined,
          channelId: 'habit_reminders',
        },
      ],
    };
    await LocalNotifications.schedule(options);
  } catch (error) {
    console.error(`Error scheduling reminder for ${habit.name}:`, error);
  }
};

// Cancel any scheduled reminders for a habit
export const cancelReminder = async (habit: Habit): Promise<void> => {
  try {
    await LocalNotifications.cancel({
      notifications: [{ id: getNotificationId(habit.id) }],
    });
  } catch (error) {
    console.error(`Error cancelling reminder for ${habit.name}:`, error);
  }
};