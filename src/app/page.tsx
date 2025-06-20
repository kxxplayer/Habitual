"use client";

// ==========================================================================
// HABITUAL MAIN PAGE - Firestore Integration
// ==========================================================================
import { useNetworkStatus } from '@/hooks/use-network-status';
import { 
  loadHabitsFromLocal, 
  saveHabitsToLocal,
  loadBadgesFromLocal,
  saveBadgesToLocal,
  loadPointsFromLocal,
  savePointsToLocal
} from '@/lib/local-storage-service';
import * as React from 'react';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { NextPage } from 'next';
import { useRouter, useSearchParams } from 'next/navigation';
import { scheduleReminder, cancelReminder } from '@/lib/notification-manager';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { genkitService } from '@/lib/genkit-service';

import AppPageLayout from '@/components/layout/AppPageLayout';
import HabitList from '@/components/habits/HabitList';
import AISuggestionDialog from '@/components/habits/AISuggestionDialog';
import AddReflectionNoteDialog from '@/components/habits/AddReflectionNoteDialog';
import RescheduleMissedHabitDialog from '@/components/habits/RescheduleMissedHabitDialog';
import CreateHabitDialog from '@/components/habits/CreateHabitDialog';
import HabitDetailViewDialog from '@/components/habits/HabitDetailViewDialog';
import GoalInputProgramDialog from '@/components/programs/GoalInputProgramDialog';
import ProgramSuggestionDialog from '@/components/programs/ProgramSuggestionDialog';

import type {
  Habit,
  AISuggestion as AISuggestionType,
  WeekDay,
  HabitCompletionLogEntry,
  HabitCategory,
  EarnedBadge,
  CreateHabitFormData,
  CommonSuggestedHabitType,
  SuggestedProgramHabit,
  GenerateHabitProgramOutput,
  ReflectionStarterInput,
  ReflectionStarterOutput
} from '@/types';
import { HABIT_CATEGORIES, weekDays as weekDaysArrayForForm } from '@/types';

import { checkAndAwardBadges } from '@/lib/badgeUtils';

import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription as AlertDialogDescriptionEl,
  AlertDialogFooter as AlertDialogFooterEl,
  AlertDialogHeader as AlertDialogHeaderEl,
  AlertDialogTitle as AlertTitle,
} from '@/components/ui/alert-dialog';

import {
  Loader2, ListChecks,
  Trash2
} from 'lucide-react';
import { format, getDay } from 'date-fns';
import { usePushNotifications } from '@/hooks/usePushNotifications';

const dayIndexToWeekDayConstant: WeekDay[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const POINTS_PER_COMPLETION = 10;
const USER_DATA_COLLECTION = "users";
const USER_APP_DATA_SUBCOLLECTION = "appData";
const USER_MAIN_DOC_ID = "main";
const DEBOUNCE_SAVE_DELAY_MS = 500;

function sanitizeForFirestore<T>(data: T): T {
  if (data === null || typeof data !== 'object') {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map((item:any) => sanitizeForFirestore(item)).filter(item => item !== undefined) as unknown as T;
  }
  const sanitizedObject: { [key: string]: any } = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const value = (data as any)[key];
      if (value !== undefined) {
        sanitizedObject[key] = sanitizeForFirestore(value);
      }
    }
  }
  return sanitizedObject as T;
}

const LoadingFallback: React.FC = () => {
  return (
    <AppPageLayout>
      <div className="flex flex-col items-center justify-center pt-20">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading Your Habits...</p>
      </div>
    </AppPageLayout>
  );
};
const ProgramGenerationOverlay: React.FC<{ isVisible: boolean }> = ({ isVisible }) => {
  if (!isVisible) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-card p-8 rounded-lg shadow-xl flex flex-col items-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <h3 className="text-lg font-semibold">Generating Your Program</h3>
        <p className="text-sm text-muted-foreground">AI is creating personalized habits for you...</p>
      </div>
    </div>
  );
};

const HomePage: NextPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [mounted, setMounted] = useState(false);
  const previousAuthUserUidRef = useRef<string | null>(null);
  const isSavingRef = React.useRef(false);

  const [habits, setHabits] = useState<Habit[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<EarnedBadge[]>([]);
  const [totalPoints, setTotalPoints] = useState<number>(0);
  const [isCreateHabitDialogOpen, setIsCreateHabitDialogOpen] = useState(false);
  const [initialFormDataForDialog, setInitialFormDataForDialog] = useState<Partial<CreateHabitFormData> | null>(null);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [selectedHabitForAISuggestion, setSelectedHabitForAISuggestion] = useState<Habit | null>(null);
  const [aiSuggestion, setAISuggestion] = useState<AISuggestionType | null>(null);
  const [isAISuggestionDialogOpen, setIsAISuggestionDialogOpen] = useState(false);
  const [isReflectionDialogOpen, setIsReflectionDialogOpen] = useState(false);
  const [reflectionDialogData, setReflectionDialogData] = useState<{
    habitId: string; date: string; habitName: string; initialNote?: string;
  } | null>(null);
  const [rescheduleDialogData, setRescheduleDialogData] = useState<{
    habit: Habit; missedDate: string;
  } | null>(null);
  const [commonHabitSuggestions, setCommonHabitSuggestions] = useState<CommonSuggestedHabitType[]>([]);
  const [isLoadingCommonSuggestions, setIsLoadingCommonSuggestions] = useState(false);
  const [commonSuggestionsFetched, setCommonSuggestionsFetched] = useState(false);
  const [isDeleteHabitConfirmOpen, setIsDeleteHabitConfirmOpen] = useState(false);
  const [habitToDelete, setHabitToDelete] = useState<{ id: string; name: string } | null>(null);
  const [selectedHabitForDetailView, setSelectedHabitForDetailView] = useState<Habit | null>(null);
  const [isDetailViewDialogOpen, setIsDetailViewDialogOpen] = useState(false);
  const [isGoalInputProgramDialogOpen, setIsGoalInputProgramDialogOpen] = useState(false);
  const [isProgramSuggestionLoading, setIsProgramSuggestionLoading] = useState(false);
  const [programSuggestion, setProgramSuggestion] = useState<GenerateHabitProgramOutput | null>(null);
  const [isProgramSuggestionDialogOpen, setIsProgramSuggestionDialogOpen] = useState(false);

  const [showAllHabits, setShowAllHabits] = useState(false);

  const firstDataLoadCompleteRef = useRef(false);
  const debounceSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const todayString = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const todayAbbr = useMemo(() => dayIndexToWeekDayConstant[getDay(new Date())], []);

  const [selectedHabitIds, setSelectedHabitIds] = useState<string[]>([]);
  const [isDeleteSelectedConfirmOpen, setIsDeleteSelectedConfirmOpen] = useState(false);

  const openCreateHabitDialogForNew = useCallback(() => {
    setEditingHabit(null);
    setInitialFormDataForDialog(null);
    setIsCreateHabitDialogOpen(true);
  }, []);

  useEffect(() => {
    setMounted(true);
    if (searchParams.get('action') === 'addHabit') {
      openCreateHabitDialogForNew();
      router.replace('/', { scroll: false });
    }
  }, [searchParams, openCreateHabitDialogForNew, router]);

  useEffect(() => {
    const unsubscribeAuthMain = onAuthStateChanged(auth, (currentUserAuthMain) => {
      const currentUidAuthMain = currentUserAuthMain?.uid || null;
      if (previousAuthUserUidRef.current && previousAuthUserUidRef.current !== currentUidAuthMain) {
        setHabits([]);
        setEarnedBadges([]);
        setTotalPoints(0);
        setCommonHabitSuggestions([]);
        setCommonSuggestionsFetched(false);
        setIsLoadingData(true);
        firstDataLoadCompleteRef.current = false;
      }
      setAuthUser(currentUserAuthMain);
      setIsLoadingAuth(false);
      previousAuthUserUidRef.current = currentUidAuthMain;
      if (!currentUserAuthMain && mounted) {
        router.push('/auth/login');
      }
    });
    return () => unsubscribeAuthMain();
  }, [router, mounted, isLoadingAuth]);

  useEffect(() => {
    if (!authUser || !mounted) {
      if (!authUser && !isLoadingAuth) setIsLoadingData(false);
      return;
    }
    const userDocRef = doc(db, USER_DATA_COLLECTION, authUser.uid, USER_APP_DATA_SUBCOLLECTION, USER_MAIN_DOC_ID);
    const unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
      const data = docSnap.exists() ? docSnap.data() : {};
      const parsedHabits = (Array.isArray(data.habits) ? data.habits : []).map((h: any): Habit => ({
        id: String(h.id || Date.now().toString() + Math.random().toString(36).substring(2, 7)),
        name: String(h.name || 'Unnamed Habit'),
        description: typeof h.description === 'string' ? h.description : undefined,
        category: HABIT_CATEGORIES.includes(h.category as HabitCategory) ? h.category : 'Other',
        daysOfWeek: Array.isArray(h.daysOfWeek) ? h.daysOfWeek.filter((d: any) => weekDaysArrayForForm.includes(d as WeekDay)) : [],
        optimalTiming: typeof h.optimalTiming === 'string' ? h.optimalTiming : undefined,
        durationHours: typeof h.durationHours === 'number' ? h.durationHours : undefined,
        durationMinutes: typeof h.durationMinutes === 'number' ? h.durationMinutes : undefined,
        specificTime: typeof h.specificTime === 'string' && h.specificTime.match(/^\d{2}:\d{2}$/) ? h.specificTime : undefined,
        completionLog: (Array.isArray(h.completionLog) ? h.completionLog : [])
          .map((log: any): HabitCompletionLogEntry | undefined => {
            if (typeof log.date !== 'string' || !log.date.match(/^\d{4}-\d{2}-\d{2}$/)) return undefined;
            return {
              date: log.date,
              time: typeof log.time === 'string' && log.time.length > 0 ? log.time : 'N/A',
              note: typeof log.note === 'string' ? log.note : undefined,
              status: ['completed', 'pending_makeup', 'skipped'].includes(log.status as string) ? log.status as 'completed' | 'pending_makeup' | 'skipped' : 'completed',
              originalMissedDate: typeof log.originalMissedDate === 'string' && log.originalMissedDate.match(/^\d{4}-\d{2}-\d{2}$/) ? log.originalMissedDate : undefined,
            };
          })
          .filter((log: any): log is HabitCompletionLogEntry => log !== undefined)
          .sort((a: HabitCompletionLogEntry, b: HabitCompletionLogEntry) => b.date.localeCompare(a.date)),
        reminderEnabled: typeof h.reminderEnabled === 'boolean' ? h.reminderEnabled : false,
        programId: typeof h.programId === 'string' ? h.programId : undefined,
        programName: typeof h.programName === 'string' ? h.programName : undefined,
      }));
      setHabits(parsedHabits);
      setEarnedBadges(Array.isArray(data.earnedBadges) ? data.earnedBadges : []);
      setTotalPoints(typeof data.totalPoints === 'number' ? data.totalPoints : 0);
      setIsLoadingData(false);
      firstDataLoadCompleteRef.current = true;
    }, (error) => {
      console.error("Firestore snapshot error:", error);
      setIsLoadingData(false);
    });
    return () => unsubscribeFirestore();
  }, [authUser, mounted]);

  useEffect(() => {
    if (!authUser || !mounted || !firstDataLoadCompleteRef.current || isLoadingData) {
      return;
    }
    
    if (debounceSaveTimeoutRef.current) {
      clearTimeout(debounceSaveTimeoutRef.current);
    }
    
    debounceSaveTimeoutRef.current = setTimeout(async () => {
      isSavingRef.current = true;
      const userDocRef = doc(db, USER_DATA_COLLECTION, authUser.uid, USER_APP_DATA_SUBCOLLECTION, USER_MAIN_DOC_ID);
      const dataToSave = {
        habits: sanitizeForFirestore(habits),
        earnedBadges: sanitizeForFirestore(earnedBadges),
        totalPoints,
        lastUpdated: new Date().toISOString(),
      };
      
      try {
        await setDoc(userDocRef, dataToSave, { merge: true });
        console.log('Data saved to Firestore successfully');
      } catch (error) {
        console.error("Error saving data:", error);
      } finally {
        isSavingRef.current = false;
      }
    }, DEBOUNCE_SAVE_DELAY_MS);
    
    return () => {
      if (debounceSaveTimeoutRef.current) clearTimeout(debounceSaveTimeoutRef.current);
    };
  }, [habits, earnedBadges, totalPoints, authUser, mounted, isLoadingData]);

  useEffect(() => {
    if (isLoadingData || !mounted || !firstDataLoadCompleteRef.current) return;
    const newlyEarnedBadges = checkAndAwardBadges(habits, earnedBadges);
    if (newlyEarnedBadges.length > 0) {
      const updatedBadges = [...earnedBadges];
      newlyEarnedBadges.forEach(newBadge => {
        if (!earnedBadges.some(eb => eb.id === newBadge.id)) {
          updatedBadges.push(newBadge);
        }
      });
      setEarnedBadges(updatedBadges);
    }
  }, [habits, earnedBadges, isLoadingData, mounted]);

  const handleSaveHabit = async (habitData: CreateHabitFormData & { id?: string }) => {
    const isEditing = !!habitData.id;
    const habitToSave = {
        name: habitData.name,
        description: habitData.description || '',
        category: habitData.category,
        daysOfWeek: habitData.daysOfWeek,
        optimalTiming: habitData.optimalTiming,
        durationHours: habitData.durationHours ?? undefined,
        durationMinutes: habitData.durationMinutes ?? undefined,
        specificTime: habitData.specificTime,
    };

    if (isEditing) {
      setHabits(prev =>
        prev.map(h => h.id === habitData.id ? { ...h, ...habitToSave } : h)
      );
    } else {
      const newHabit: Habit = {
        id: `h_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        ...habitToSave,
        completionLog: [],
        reminderEnabled: false,
      };
      setHabits(prev => [...prev, newHabit]);
    }
    setIsCreateHabitDialogOpen(false);
  };

  const handleDeleteProgram = (programId: string, programName: string) => {
    if (window.confirm(`Are you sure you want to delete the entire "${programName}" program and all its habits?`)) {
      setHabits(prev => prev.filter(h => h.programId !== programId));
    }
  };

  const handleToggleComplete = (habitId: string, date: string, completed: boolean) => {
      let pointsChange = 0;
      const habit = habits.find(h => h.id === habitId);

      // If a valid habit is found, handle its reminder schedule
      if (habit) {
          if (completed) {
              // When the habit is marked complete, cancel any pending reminders for it
              cancelReminder(habit);
          } else {
              // If the habit is being un-completed, re-schedule the reminder
              scheduleReminder(habit);
          }
      }
      
      setHabits(prev => {
          return prev.map(h => {
              if (h.id === habitId) {
                  const logIndex = h.completionLog.findIndex(l => l.date === date);
                  const newLog = [...h.completionLog];

                  if (completed) {
                      if (logIndex > -1) {
                          if (newLog[logIndex].status !== 'completed') pointsChange = POINTS_PER_COMPLETION;
                          newLog[logIndex] = { ...newLog[logIndex], status: 'completed', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
                      } else {
                          pointsChange = POINTS_PER_COMPLETION;
                          newLog.push({ date, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), status: 'completed' });
                      }
                  } else {
                      if (logIndex > -1) {
                          if (h.completionLog[logIndex].status === 'completed') pointsChange = -POINTS_PER_COMPLETION;
                          newLog.splice(logIndex, 1);
                      }
                  }
                  return { ...h, completionLog: newLog.sort((a: HabitCompletionLogEntry, b: HabitCompletionLogEntry) => b.date.localeCompare(a.date)) };
              }
              return h;
          });
      });

      if (pointsChange !== 0) {
          setTotalPoints(prev => Math.max(0, prev + pointsChange));
      }
  };

  const handleDeleteHabit = (habitId: string) => {
    const habit = habits.find(h => h.id === habitId);
    if (habit) {
      setHabitToDelete({ id: habit.id, name: habit.name });
      setIsDeleteHabitConfirmOpen(true);
    }
  };
  
  const handleConfirmDeleteHabit = () => {
    if (habitToDelete) {
      setHabits(prev => prev.filter(h => h.id !== habitToDelete.id));
      setIsDeleteHabitConfirmOpen(false);
      setHabitToDelete(null);
    }
  };

  const handleOpenEditDialog = (habit: Habit) => {
    setEditingHabit(habit);
    setInitialFormDataForDialog(habit);
    setIsCreateHabitDialogOpen(true);
  };

  const handleOpenDetailView = (habit: Habit) => {
    setSelectedHabitForDetailView(habit);
    setIsDetailViewDialogOpen(true);
  };
  
  const handleOpenRescheduleDialog = (habit: Habit, missedDate: string) => setRescheduleDialogData({ habit, missedDate });
  
  const handleGetAIReflectionPrompt = async (input: ReflectionStarterInput): Promise<ReflectionStarterOutput> => {
    return await genkitService.getReflectionStarter(input);
  };

  const onOpenReflectionDialog = (habitId: string, date: string, habitName: string) => {
    const habit = habits.find(h => h.id === habitId);
    const initialNote = habit?.completionLog.find(l => l.date === date)?.note;
    setReflectionDialogData({ habitId, date, habitName, initialNote });
    setIsReflectionDialogOpen(true);
  };
  
  const onToggleReminder = (habitId: string, enabled: boolean) => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    if (enabled) {
      scheduleReminder(habit);
    } else {
      cancelReminder(habit);
    }
    setHabits(prev => prev.map(h => h.id === habitId ? {...h, reminderEnabled: enabled} : h));
  };
  
  const handleSaveReflectionNote = (note: string) => {
    if (reflectionDialogData) {
      const { habitId, date } = reflectionDialogData;
      setHabits(prev => prev.map(h => h.id === habitId ? {
        ...h,
        completionLog: h.completionLog.map((l: HabitCompletionLogEntry) => l.date === date ? {...l, note} : l)
      } : h));
    }
    setIsReflectionDialogOpen(false);
  };
  
  const handleSaveRescheduledHabit = (newDate: string) => {
    if (rescheduleDialogData) {
      const { habit, missedDate } = rescheduleDialogData;
      setHabits(prev => prev.map(h => h.id === habit.id ? {
        ...h,
        completionLog: [
          ...h.completionLog.filter(l => l.date !== missedDate),
          { date: newDate, time: 'N/A', status: 'pending_makeup', originalMissedDate: missedDate }
        ]
      } : h));
       setRescheduleDialogData(null);
    }
  };

  const handleSaveMarkAsSkipped = () => {
    if (rescheduleDialogData) {
      const { habit, missedDate } = rescheduleDialogData;
      setHabits(prev => prev.map(h => h.id === habit.id ? {
        ...h,
        completionLog: h.completionLog.map((l: HabitCompletionLogEntry) => l.date === missedDate ? {...l, status: 'skipped'}: l)
      } : h));
       setRescheduleDialogData(null);
    }
  };

  const handleGetAISuggestion = async (habit: Habit) => {
    setIsAISuggestionDialogOpen(true);
    setAISuggestion({ suggestionText: '', isLoading: true, error: null, habitId: habit.id });
    try {
      const response = await genkitService.getHabitSuggestion({
        habitName: habit.name,
        trackingData: `Completions: ${habit.completionLog.length}`,
        daysOfWeek: habit.daysOfWeek,
      });
      setAISuggestion({ suggestionText: response.suggestion, isLoading: false, error: null, habitId: habit.id });
    } catch (e) {
      console.error('Failed to get AI suggestion:', e);
      setAISuggestion({ suggestionText: '', isLoading: false, error: e instanceof Error ? e.message : 'Could not get suggestion.', habitId: habit.id });
    }
  };
  
  const handleOpenGoalInputProgramDialog = () => setIsGoalInputProgramDialogOpen(true);
  
  const handleGenerateProgram = async (goal: string, duration: string) => {
    if (isProgramSuggestionLoading) return;
    
    setIsGoalInputProgramDialogOpen(false); 
    setIsProgramSuggestionLoading(true);
    setProgramSuggestion(null);

    try {
      const data = await genkitService.generateHabitProgramFromGoal(
        goal.trim(),
        duration.trim()
      );

      if (data && data.suggestedHabits) {
        const validHabits: SuggestedProgramHabit[] = (data.suggestedHabits || [])
          .filter((h: any) => h && h.name && h.name.trim() !== "")
          .map((h: any): SuggestedProgramHabit => {
            const category = h.category && HABIT_CATEGORIES.includes(h.category as HabitCategory)
              ? h.category as HabitCategory
              : "Other";
            const daysOfWeek = Array.isArray(h.daysOfWeek) && h.daysOfWeek.length > 0
              ? h.daysOfWeek
              : ['Mon', 'Wed', 'Fri'];
            return {
              name: h.name,
              description: h.description || '',
              category,
              daysOfWeek,
              optimalTiming: h.optimalTiming,
              durationHours: h.durationHours,
              durationMinutes: h.durationMinutes,
              specificTime: h.specificTime,
            };
          });

        if (validHabits.length > 0) {
          setProgramSuggestion({
            programName: data.programName || "New Program",
            suggestedHabits: validHabits,
            goal: goal,
            focusDuration: duration,
          });
          setIsProgramSuggestionDialogOpen(true);
        } else {
          console.error("AI Error: The AI couldn't generate valid habits for this goal.");
        }
      } else {
        throw new Error("Invalid response from AI service.");
      }
    } catch (error) {
      console.error("Failed to generate habit program:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    } finally {
      setIsProgramSuggestionLoading(false);
    }
  };
  
  const handleAddProgramHabits = async (habitsToAdd: SuggestedProgramHabit[], programName: string) => {
    if (!authUser) return;

    const programId = `prog_${Date.now()}`;
    const newHabits: Habit[] = habitsToAdd.map((sh, index) => ({
      id: `h_${Date.now()}_${index}`,
      name: sh.name,
      description: sh.description || '',
      category: sh.category,
      daysOfWeek: sh.daysOfWeek,
      optimalTiming: sh.optimalTiming,
      durationHours: sh.durationHours,
      durationMinutes: sh.durationMinutes,
      specificTime: sh.specificTime,
      completionLog: [],
      reminderEnabled: false,
      programId,
      programName,
    }));

    setHabits(prev => [...prev, ...newHabits]);
    setIsProgramSuggestionDialogOpen(false);
  };
  
  const handleDeleteSelected = () => {
    setIsDeleteSelectedConfirmOpen(true);
  };
  const handleConfirmDeleteSelected = () => {
    setHabits(prev => prev.filter(h => !selectedHabitIds.includes(h.id)));
    setSelectedHabitIds([]);
    setIsDeleteSelectedConfirmOpen(false);
  };

  usePushNotifications();

  if (!mounted || isLoadingAuth) {
    return <LoadingFallback />;
  }

  return (
    <>
      <ProgramGenerationOverlay isVisible={isProgramSuggestionLoading && !programSuggestion} />
      <AppPageLayout onAddNew={openCreateHabitDialogForNew}>
        <div className="animate-card-fade-in w-full">
          {habits.length > 0 ? (
             <>
                <div className="flex justify-between items-center mb-4 w-full">
                    <h2 className="text-xl font-bold text-foreground">
                        {showAllHabits ? 'All Habits & Programs' : 'Today\'s Tasks'}
                    </h2>
                    <div className="flex items-center gap-2">
                        {selectedHabitIds.length > 0 && (
                            <Button
                                variant="destructive"
                                size="sm"
                                className="flex items-center"
                                onClick={handleDeleteSelected}
                            >
                                <Trash2 className="mr-1 h-4 w-4" /> Delete Selected
                            </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => setShowAllHabits(prev => !prev)}>
                            {showAllHabits ? 'View Today\'s Tasks' : 'View All Tasks'}
                        </Button>
                    </div>
                </div>
                <HabitList
                    habits={habits}
                    showAllHabits={showAllHabits}
                    onOpenDetailView={handleOpenDetailView}
                    onToggleComplete={(habitId, date) => handleToggleComplete(habitId, date, !habits.find(h => h.id === habitId)?.completionLog.some(l => l.date === date && l.status === 'completed'))}
                    onDelete={handleDeleteHabit}
                    onEdit={handleOpenEditDialog}
                    onReschedule={handleOpenRescheduleDialog}
                    onDeleteProgram={handleDeleteProgram}
                    todayString={todayString}
                    todayAbbr={todayAbbr}
                    selectedHabitIds={selectedHabitIds}
                    setSelectedHabitIds={setSelectedHabitIds}
                />
            </>
          ) : isLoadingData ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Loading habits...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-10 min-h-[200px] sm:min-h-[250px]">
              <ListChecks className="mx-auto h-16 w-16 text-muted-foreground/70 mb-4" />
              <h3 className="text-lg font-semibold text-foreground">No Habits Yet</h3>
              <p className="text-sm text-muted-foreground">
                Tap the '+' button to add a habit or create a program!
              </p>
            </div>
          )}
        </div>
      </AppPageLayout>

      <CreateHabitDialog
        isOpen={isCreateHabitDialogOpen}
        onClose={() => setIsCreateHabitDialogOpen(false)}
        onSaveHabit={handleSaveHabit}
        initialData={initialFormDataForDialog}
        onOpenGoalProgramDialog={handleOpenGoalInputProgramDialog}
      />
      {aiSuggestion && (
        <AISuggestionDialog
          isOpen={isAISuggestionDialogOpen}
          onClose={() => setIsAISuggestionDialogOpen(false)}
          habitName={habits.find(h => h.id === aiSuggestion.habitId)?.name || ''}
          suggestion={aiSuggestion.suggestionText}
          isLoading={aiSuggestion.isLoading}
          error={aiSuggestion.error}
        />
      )}
       {reflectionDialogData && (
        <AddReflectionNoteDialog
            isOpen={isReflectionDialogOpen}
            onClose={() => setIsReflectionDialogOpen(false)}
            onSaveNote={handleSaveReflectionNote}
            {...reflectionDialogData}
            completionDate={reflectionDialogData.date}
        />
      )}
      {rescheduleDialogData && (
        <RescheduleMissedHabitDialog
          isOpen={!!rescheduleDialogData}
          onClose={() => setRescheduleDialogData(null)}
          habitName={rescheduleDialogData.habit.name}
          originalMissedDate={rescheduleDialogData.missedDate}
          onReschedule={handleSaveRescheduledHabit}
          onMarkAsSkipped={handleSaveMarkAsSkipped}
        />
      )}
      <AlertDialog open={isDeleteHabitConfirmOpen} onOpenChange={setIsDeleteHabitConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeaderEl>
            <AlertTitle>Confirm Deletion</AlertTitle>
            <AlertDialogDescriptionEl>
              Are you sure you want to delete the habit "{habitToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescriptionEl>
          </AlertDialogHeaderEl>
          <AlertDialogFooterEl>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteHabit}>Delete</AlertDialogAction>
          </AlertDialogFooterEl>
        </AlertDialogContent>
      </AlertDialog>
      {selectedHabitForDetailView && (
        <HabitDetailViewDialog
          habit={selectedHabitForDetailView}
          isOpen={isDetailViewDialogOpen}
          onClose={() => setSelectedHabitForDetailView(null)}
          onToggleComplete={handleToggleComplete}
          onGetAISuggestion={handleGetAISuggestion}
          onOpenReflectionDialog={onOpenReflectionDialog}
          onOpenRescheduleDialog={handleOpenRescheduleDialog}
          onToggleReminder={onToggleReminder}
          onOpenEditDialog={handleOpenEditDialog}
          onOpenDeleteConfirm={handleDeleteHabit}
          onGetAIReflectionPrompt={handleGetAIReflectionPrompt}
        />
      )}
      <GoalInputProgramDialog
       isOpen={isGoalInputProgramDialogOpen}
       onClose={() => setIsGoalInputProgramDialogOpen(false)}
       onSubmit={handleGenerateProgram}
       isLoading={isProgramSuggestionLoading}
     />
     {programSuggestion && (
       <ProgramSuggestionDialog
         isOpen={isProgramSuggestionDialogOpen}
         onClose={() => setIsProgramSuggestionDialogOpen(false)}
         programSuggestion={programSuggestion}
         onAddProgramHabits={handleAddProgramHabits}
         isLoading={isProgramSuggestionLoading}
       />
     )}
     <AlertDialog open={isDeleteSelectedConfirmOpen} onOpenChange={setIsDeleteSelectedConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeaderEl>
            <AlertTitle>Confirm Deletion</AlertTitle>
            <AlertDialogDescriptionEl>
              Are you sure you want to delete {selectedHabitIds.length} selected habit{selectedHabitIds.length > 1 ? 's' : ''}? This action cannot be undone.
            </AlertDialogDescriptionEl>
          </AlertDialogHeaderEl>
          <AlertDialogFooterEl>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteSelected}>Delete</AlertDialogAction>
          </AlertDialogFooterEl>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default HomePage;