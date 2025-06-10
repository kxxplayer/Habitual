// src/lib/getHabitIcon.ts

import {
  Heart,
  Brain,
  Dumbbell,
  BookOpen,
  DollarSign,
  Users,
  Briefcase,
  Smile,
  LucideIcon
} from 'lucide-react';

// Maps habit categories to their corresponding icons
export const getHabitIcon = (category: string): LucideIcon => {
  switch (category) {
    case 'Health & Fitness':
      return Dumbbell;
    case 'Mental Well-being':
      return Brain;
    case 'Personal Growth':
      return BookOpen;
    case 'Finances':
      return DollarSign;
    case 'Social':
      return Users;
    case 'Career':
      return Briefcase;
    case 'Hobbies':
      return Smile;
    default:
      return Heart; // A default icon for uncategorized habits
  }
};
