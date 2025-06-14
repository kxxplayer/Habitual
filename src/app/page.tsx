"use client";

// ==========================================================================
// HABITUAL MAIN PAGE - Firestore Integration
// ==========================================================================
import * as React from 'react';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { NextPage } from 'next';
import { useRouter, useSearchParams } from 'next/navigation';

// ADDED: Imports for Firebase Functions
import { getFunctions, httpsCallable } from 'firebase/functions';

import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';

import AppPageLayout from '@/components/layout/AppPageLayout';
import HabitList from '@/components/habits/HabitList';
import AISuggestionDialog from '@/components/habits/AISuggestionDialog';
import AddReflectionNoteDialog from '@/components/habits/AddReflectionNoteDialog';
import RescheduleMissedHabitDialog from '@/components/habits/RescheduleMissedHabitDialog';
import CreateHabitDialog from '@/components/habits/CreateHabitDialog';
import DailyQuestDialog from '@/components/popups/DailyQuestDialog';
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

// REMOVED: All imports from '@/ai/flows/...' have been deleted.

import { checkAndAwardBadges } from '@/lib/badgeUtils';
import { useToast } from "@/hooks/use-toast";

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
} from 'lucide-react';
import { format, getDay } from 'date-fns';

const dayIndexToWeekDayConstant: WeekDay[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const POINTS_PER_COMPLETION = 10;
const USER_DATA_COLLECTION = "users";
const USER_APP_DATA_SUBCOLLECTION = "appData";
const USER_MAIN_DOC_ID = "main";
const LS_KEY_PREFIX_DAILY_QUEST = "hasSeenDailyQuest_";
const DEBOUNCE_SAVE_DELAY_MS = 2500;

// ADDED: Create references to your Cloud Functions
const functions = getFunctions();
const getCommonHabitSuggestionsCallable = httpsCallable(functions, 'getCommonHabitSuggestions');
const getHabitSuggestionCallable = httpsCallable(functions, 'getHabitSuggestion');
const generateHabitProgramFromGoalCallable = httpsCallable(functions, 'generateHabitProgramFromGoal');
const getReflectionStarterCallable = httpsCallable(functions, 'getReflectionStarter');
// Note: You would also create a callable for getMotivationalQuote if you use it.

function sanitizeForFirestore<T>(data: T): T {
  if (data === null || typeof data !== 'object') {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForFirestore(item)).filter(item => item !== undefined) as unknown as T;
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

const HomePage: NextPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [mounted, setMounted] = useState(false);
  const previousAuthUserUidRef = useRef<string | null>(null);

  const [habits, setHabits] = useState<Habit[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<EarnedBadge[]>([]);
  const [totalPoints, setTotalPoints] = useState<number>(0);
  const [isCreateHabitDialogOpen, setIsCreateHabitDialogOpen] = useState(false);
  const [initialFormDataForDialog, setInitialFormDataForDialog] = useState<Partial<CreateHabitFormData> | null>(null);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [isDailyQuestDialogOpen, setIsDailyQuestDialogOpen] = useState(false);
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

  const firstDataLoadCompleteRef = useRef(false);
  const debounceSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const todayString = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const todayAbbr = useMemo(() => dayIndexToWeekDayConstant[getDay(new Date())], []);

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
  }, [router, mounted]);

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
          .filter((log: HabitCompletionLogEntry | undefined): log is HabitCompletionLogEntry => log !== undefined)
          .sort((a: HabitCompletionLogEntry, b: HabitCompletionLogEntry) => b.date.localeCompare(a.date)),
        reminderEnabled: typeof h.reminderEnabled === 'boolean' ? h.reminderEnabled : false,
        programId: typeof h.programId === 'string' ? h.programId : undefined,
        programName: typeof h.programName === 'string' ? h.programName : undefined,
      }));
      setHabits(parsedHabits);
      setEarnedBadges(Array.isArray(data.earnedBadges) ? data.earnedBadges : []);
      setTotalPoints(typeof data.totalPoints === 'number' ? data.totalPoints : 0);

      // MODIFIED: Call to getCommonHabitSuggestions now uses the callable function.
      if (parsedHabits.length === 0 && !commonSuggestionsFetched && authUser) {
        setIsLoadingCommonSuggestions(true);
        getCommonHabitSuggestionsCallable({ category: 'General' }) // Pass a default category
          .then(response => {
            const data = response.data as { result: { suggestions: CommonSuggestedHabitType[] } };
            setCommonHabitSuggestions(data.result?.suggestions || []);
          })
          .catch(err => {
            console.error("Failed to load common habit suggestions:", err);
          })
          .finally(() => {
            setIsLoadingCommonSuggestions(false);
            setCommonSuggestionsFetched(true);
          });
      } else if (parsedHabits.length > 0) {
        if (!commonSuggestionsFetched) setCommonSuggestionsFetched(true);
      }
      setIsLoadingData(false);
      firstDataLoadCompleteRef.current = true;
    }, (error) => {
      console.error("Firestore snapshot error:", error);
      setIsLoadingData(false);
    });
    return () => unsubscribeFirestore();
  }, [authUser, mounted, commonSuggestionsFetched]);

  // ... (the rest of your useEffects remain largely the same) ...
  useEffect(() => {
    if (!authUser || !mounted || !firstDataLoadCompleteRef.current || isLoadingData) {
      return;
    }
    if (debounceSaveTimeoutRef.current) {
      clearTimeout(debounceSaveTimeoutRef.current);
    }
    debounceSaveTimeoutRef.current = setTimeout(() => {
      const userDocRef = doc(db, USER_DATA_COLLECTION, authUser.uid, USER_APP_DATA_SUBCOLLECTION, USER_MAIN_DOC_ID);
      const dataToSave = {
        habits: sanitizeForFirestore(habits),
        earnedBadges: sanitizeForFirestore(earnedBadges),
        totalPoints,
        lastUpdated: new Date().toISOString(),
      };
      setDoc(userDocRef, dataToSave, { merge: true }).catch(error => {
        console.error("Error saving data:", error);
      });
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

  const handleSaveHabit = (habitData: CreateHabitFormData & { id?: string }) => {
    const isEditing = habitData.id && habits.some(h => h.id === habitData.id);
    if (isEditing) {
      setHabits(prev => prev.map(h => h.id === habitData.id ? { ...h, ...habitData, description: habitData.description || '' } as Habit : h));
    } else {
      const newHabit: Habit = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
        ...habitData,
        description: habitData.description || '',
        durationHours: typeof habitData.durationHours === 'number' ? habitData.durationHours : undefined,
        durationMinutes: typeof habitData.durationMinutes === 'number' ? habitData.durationMinutes : undefined,
        completionLog: [],
        reminderEnabled: false,
      };
      setHabits(prev => [...prev, newHabit]);
      if (commonHabitSuggestions.length > 0) setCommonHabitSuggestions([]);
    }
    setIsCreateHabitDialogOpen(false);
  };
  
  const handleToggleComplete = (habitId: string, date: string, completed: boolean) => {
    let habitName = '';
    let pointsChange = 0;
    setHabits(prev => {
      return prev.map(h => {
        if (h.id === habitId) {
          habitName = h.name;
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
          return { ...h, completionLog: newLog };
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
  
  // MODIFIED: This now calls the Firebase Function
  const handleGetAIReflectionPrompt = async (input: ReflectionStarterInput): Promise<ReflectionStarterOutput> => {
    const response = await getReflectionStarterCallable(input);
    return response.data as ReflectionStarterOutput;
  };

  const onOpenReflectionDialog = (habitId: string, date: string, habitName: string) => {
    const habit = habits.find(h => h.id === habitId);
    const initialNote = habit?.completionLog.find(l => l.date === date)?.note;
    setReflectionDialogData({ habitId, date, habitName, initialNote });
    setIsReflectionDialogOpen(true);
  };
  
  const onToggleReminder = (habitId: string, enabled: boolean) => {
    setHabits(prev => prev.map(h => h.id === habitId ? {...h, reminderEnabled: enabled} : h));
  };
  
  const handleSaveReflectionNote = (note: string) => {
    if (reflectionDialogData) {
      const { habitId, date } = reflectionDialogData;
      setHabits(prev => prev.map(h => h.id === habitId ? {
        ...h,
        completionLog: h.completionLog.map(l => l.date === date ? {...l, note} : l)
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
        completionLog: h.completionLog.map(l => l.date === missedDate ? {...l, status: 'skipped'}: l)
      } : h));
       setRescheduleDialogData(null);
    }
  };

  // MODIFIED: This now calls the Firebase Function
  const handleGetAISuggestion = async (habit: Habit) => {
    setIsAISuggestionDialogOpen(true);
    setAISuggestion({ suggestionText: '', isLoading: true, error: null, habitId: habit.id });
    try {
      const response = await getHabitSuggestionCallable({
        habitName: habit.name,
        trackingData: `Completions: ${habit.completionLog.length}`,
        daysOfWeek: habit.daysOfWeek,
      });
      const data = response.data as { suggestion: string };
      setAISuggestion({ suggestionText: data.suggestion, isLoading: false, error: null, habitId: habit.id });
    } catch (e) {
      setAISuggestion({ suggestionText: '', isLoading: false, error: 'Could not get suggestion.', habitId: habit.id });
    }
  };
  
  const handleOpenGoalInputProgramDialog = () => setIsGoalInputProgramDialogOpen(true);
  
  // MODIFIED: This now calls the Firebase Function
  const handleGenerateProgram = async (goal: string, duration: string) => {
    setIsGoalInputProgramDialogOpen(false);
    setIsProgramSuggestionLoading(true);
    try {
      const response = await generateHabitProgramFromGoalCallable({ goal, focusDuration: duration });
      const data = response.data as GenerateHabitProgramOutput;
      setProgramSuggestion({
        goal,
        focusDuration: duration,
        programName: data.programName,
        suggestedHabits: data.suggestedHabits,
      });
      setIsProgramSuggestionDialogOpen(true);
    } catch (e) {
      toast({ title: "Error", description: "Failed to generate program.", variant: "destructive" });
    } finally {
      setIsProgramSuggestionLoading(false);
    }
  };
  
  const handleAddProgramHabits = (habitsToAdd: SuggestedProgramHabit[], programName: string) => {
    const programId = `prog_${Date.now()}`;
    const newHabits: Habit[] = habitsToAdd.map(sh => ({
      id: `h_${Date.now()}_${Math.random()}`,
      ...sh,
      description: sh.description || '',
      completionLog: [],
      reminderEnabled: false,
      programId,
      programName,
    }));
    setHabits(prev => [...prev, ...newHabits]);
    setIsProgramSuggestionDialogOpen(false);
  };
  
  const handleCustomizeSuggestedHabit = (sugg: CommonSuggestedHabitType) => {
    setInitialFormDataForDialog({
      name: sugg.name,
      description: sugg.description || '',
      category: sugg.category || 'Other',
      daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    });
    setIsCreateHabitDialogOpen(true);
  };
  
  if (!mounted || isLoadingAuth || (!firstDataLoadCompleteRef.current && isLoadingData)) {
    return <LoadingFallback />;
  }

  // ... (Your JSX remains the same) ...
  return (
    <>
      <AppPageLayout onAddNew={openCreateHabitDialogForNew}>
        <div className="animate-card-fade-in">
          {habits.length > 0 ? (
            <HabitList
              habits={habits}
              onOpenDetailView={handleOpenDetailView}
              onToggleComplete={(habitId, date) => handleToggleComplete(habitId, date, !habits.find(h => h.id === habitId)?.completionLog.some(l => l.date === date && l.status === 'completed'))}
              onDelete={handleDeleteHabit}
              onEdit={handleOpenEditDialog}
              onReschedule={handleOpenRescheduleDialog}
              todayString={todayString}
              todayAbbr={todayAbbr}
            />
          ) : isLoadingCommonSuggestions ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Loading suggestions...</p>
            </div>
          ) : commonHabitSuggestions.length > 0 ? (
            <div className="my-4 p-3 bg-card/70 backdrop-blur-sm border border-primary/20 rounded-xl shadow-md">
              <div className="px-2 pt-0">
                <h3 className="text-md font-semibold flex items-center text-primary mb-1">Welcome to Habitual!</h3>
                <p className="text-xs text-muted-foreground mb-1.5">
                  Start by picking a common habit or tap the "+" button to create your own.
                </p>
              </div>
              <div className="p-1">
                <div className="flex flex-wrap gap-2 justify-center mb-2">
                  {commonHabitSuggestions.map((sugg, idx) => (
                    <Button key={idx} variant="outline" className="p-2.5 h-auto flex flex-col items-center justify-center space-y-0.5 min-w-[90px] text-center shadow-sm hover:shadow-md transition-shadow text-xs" onClick={() => handleCustomizeSuggestedHabit(sugg)}>
                      <span className="font-medium">{sugg.name}</span>
                      {sugg.category && <span className="text-primary/80 opacity-80">{sugg.category}</span>}
                    </Button>
                  ))}
                </div>
              </div>
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
    </>
  );
};

export default HomePage;