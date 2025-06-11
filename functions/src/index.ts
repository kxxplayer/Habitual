import {onSchedule} from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

// Initialize the Firebase Admin SDK to interact with Firebase services
admin.initializeApp();

// Define a data structure for our Habit, matching what's in Firestore.
interface Habit {
  id: string;
  name: string;
  specificTime?: string; // e.g., "14:30"
  daysOfWeek: string[]; // e.g., ["Mon", "Wed", "Fri"]
  reminderEnabled: boolean;
}

// Define the structure for a user's data document.
interface UserData {
  habits: Habit[];
  fcmTokens?: string[]; // Array of notification tokens for the user's devices
}

const TIMEZONE = "Asia/Kolkata";

/**
 * A scheduled Cloud Function that runs every 3 hours using the v2 syntax.
 */
export const sendHabitReminders = onSchedule({
  schedule: "every 3 hours",
  timeZone: "Asia/Kolkata",
}, async () => {
  logger.info("Checking for habit reminders...");

  // Get the current time in the specified timezone.
  const now = new Date();
  const currentDay = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: TIMEZONE,
  }).format(now);
  const currentTime = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TIMEZONE,
  }).format(now);

  const usersSnapshot = await admin.firestore()
    .collection("users").get();

  usersSnapshot.forEach(async (userDoc) => {
    const userData = userDoc.data() as UserData;
    const {habits, fcmTokens} = userData;

    if (!habits?.length || !fcmTokens?.length) {
      return;
    }

    const dueHabits = habits.filter((habit) => {
      const isScheduled = habit.daysOfWeek.includes(currentDay);
      const isTime = habit.specificTime === currentTime;
      const isEnabled = habit.reminderEnabled !== false;
      return isScheduled && isTime && isEnabled;
    });

    if (dueHabits.length > 0) {
      const habitNames = dueHabits.map((h) => h.name).join(", ");
      logger.info(
        `Sending reminder to user ${userDoc.id} for: ${habitNames}`,
      );

      const message = {
        notification: {
          title: "Habit Reminder!",
          body: `It's time for: ${habitNames}`,
        },
        tokens: fcmTokens,
      };

      try {
        await admin.messaging().sendEachForMulticast(message);
        logger.info("Successfully sent message to user:", userDoc.id);
      } catch (error) {
        logger.error("Error sending message to user:", userDoc.id, error);
      }
    }
  });
});
