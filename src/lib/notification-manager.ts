import { LocalNotifications } from '@capacitor/local-notifications';
import type { Habit } from '@/types';
import type { ScheduleOptions, LocalNotificationSchema  } from '@capacitor/local-notifications';

// Helper to convert a habit ID to a numeric notification ID
const getNotificationId = (habitId: string): number => {
  // Simple hash function to get a consistent integer from the string ID
  let hash = 0;
  for (let i = 0; i < habitId.length; i++) {
    const char = habitId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

// Check for permissions
const checkPermissions = async (): Promise<boolean> => {
  const result = await LocalNotifications.checkPermissions();
  return result.display === 'granted';
};

// Request permissions
const requestPermissions = async (): Promise<boolean> => {
  const result = await LocalNotifications.requestPermissions();
  return result.display === 'granted';
};

// Schedule a recurring reminder for a habit
export const scheduleReminder = async (habit: Habit): Promise<void> => {
  const hasPermission = await checkPermissions() || await requestPermissions();
  if (!hasPermission) {
    console.warn('Notification permission not granted.');
    return;
  }

  const notificationId = getNotificationId(habit.id);

  const options: ScheduleOptions = {
    notifications: [
      {
        id: notificationId,
        title: 'Habit Reminder ✨',
        body: `Don't forget to complete your habit: "${habit.name}"`,
        schedule: {
          every: 'hour', // This will repeat every hour
          count: 3, // Repeats 3 times, effectively creating a 3-hour window
          on: {
            hour: 9, // Starts at 9 AM. Adjust as needed.
          }
        },
        sound: undefined, // Default sound
        channelId: 'habit_reminders',
      },
    ],
  };

  try {
    await LocalNotifications.schedule(options);
    console.log(`Scheduled reminder for habit: ${habit.name}`);
  } catch (error) {
    console.error(`Error scheduling reminder for ${habit.name}:`, error);
  }
};

// Cancel a reminder for a specific habit
export const cancelReminder = async (habit: Habit): Promise<void> => {
  const notificationId = getNotificationId(habit.id);

  try {
    await LocalNotifications.cancel({
      notifications: [{ id: notificationId }],
    });
    console.log(`Cancelled reminder for habit: ${habit.name}`);
  } catch (error) {
    console.error(`Error cancelling reminder for ${habit.name}:`, error);
  }
};