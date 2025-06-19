// src/lib/local-storage-service.ts
import { Preferences } from '@capacitor/preferences';
import type { Habit, EarnedBadge } from '@/types';

// Define keys for storing data
const HABITS_KEY = 'habits_data';
const BADGES_KEY = 'badges_data';
const POINTS_KEY = 'points_data';

// --- Habits ---
export const saveHabitsToLocal = async (habits: Habit[]): Promise<void> => {
  await Preferences.set({ key: HABITS_KEY, value: JSON.stringify(habits) });
};

export const loadHabitsFromLocal = async (): Promise<Habit[]> => {
  const { value } = await Preferences.get({ key: HABITS_KEY });
  return value ? JSON.parse(value) : [];
};

// --- Badges ---
export const saveBadgesToLocal = async (badges: EarnedBadge[]): Promise<void> => {
    await Preferences.set({ key: BADGES_KEY, value: JSON.stringify(badges) });
};

export const loadBadgesFromLocal = async (): Promise<EarnedBadge[]> => {
    const { value } = await Preferences.get({ key: BADGES_KEY });
    return value ? JSON.parse(value) : [];
};

// --- Points ---
export const savePointsToLocal = async (points: number): Promise<void> => {
    await Preferences.set({ key: POINTS_KEY, value: JSON.stringify(points) });
};

export const loadPointsFromLocal = async (): Promise<number> => {
    const { value } = await Preferences.get({ key: POINTS_KEY });
    return value ? JSON.parse(value) : 0;
};