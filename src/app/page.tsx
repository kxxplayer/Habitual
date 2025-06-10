"use client";

import * as React from 'react';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { NextPage } from 'next';
import { useRouter, useSearchParams } from 'next/navigation';

import { auth, db } from '@/lib/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

import type { Habit, AISuggestion as AISuggestionType, WeekDay, HabitCompletionLogEntry, EarnedBadge, CreateHabitFormData, SuggestedHabitForCommonList as CommonSuggestedHabitType } from '@/types';
import { HABIT_CATEGORIES, weekDays as weekDaysArrayForForm, SEVEN_DAY_STREAK_BADGE_ID, THIRTY_DAY_STREAK_BADGE_ID, FIRST_HABIT_COMPLETED_BADGE_ID, THREE_DAY_SQL_STREAK_BADGE_ID } from '@/types';

import { getHabitSuggestion } from '@/ai/flows/habit-suggestion';
import { getSqlTip } from '@/ai/flows/sql-tip-flow';
import { getMotivationalQuote } from '@/ai/flows/motivational-quote-flow';
import { getCommonHabitSuggestions } from '@/ai/flows/common-habit-suggestions-flow';
import { generateHabitProgramFromGoal, type GenerateHabitProgramOutput, type SuggestedProgramHabit } from '@/ai/flows/generate-habit-program-flow';
import { getReflectionStarter, type ReflectionStarterInput, type ReflectionStarterOutput } from '@/ai/flows/reflection-starter-flow';

import { checkAndAwardBadges } from '@/lib/badgeUtils';
import { useToast } from "@/hooks/use-toast";

import { Loader2, ListChecks } from 'lucide-react';
import { format, getDay } from 'date-fns';

const dayIndexToWeekDayConstant: WeekDay[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const POINTS_PER_COMPLETION = 10;
const USER_DATA_COLLECTION = "users";
const USER_APP_DATA_SUBCOLLECTION = "appData";
const USER_MAIN_DOC_ID = "main";
const LS_KEY_PREFIX_DAILY_QUEST = "hasSeenDailyQuest_";
const DEBOUNCE_SAVE_DELAY_MS = 2500;

const LoadingFallback: React.FC = () => (
  <div className="flex min-h-screen flex-col items-center justify-center p-4">
    <Loader2 className="h-12 w-12 animate-spin text-primary" />
    <p className="mt-4 text-muted-foreground">Loading your habits...</p>
  </div>
);

const HabitualPageContent: React.FC = () => {
    const router = useRouter();
    const { toast } = useToast();
    const [authUser, setAuthUser] = React.useState<User | null>(null);
    const [isLoadingAuth, setIsLoadingAuth] = React.useState(true);
    const [habits, setHabits] = useState<Habit[]>([]);
    const [earnedBadges, setEarnedBadges] = useState<EarnedBadge[]>([]);
    const [totalPoints, setTotalPoints] = useState<number>(0);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [isCreateHabitDialogOpen, setIsCreateHabitDialogOpen] = useState(false);
    const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
    const [initialFormDataForDialog, setInitialFormDataForDialog] = useState<Partial<CreateHabitFormData> | null>(null);
    const [createHabitDialogStep, setCreateHabitDialogStep] = useState(1);
    const [isDailyQuestDialogOpen, setIsDailyQuestDialogOpen] = useState(false);
    const [selectedHabitForDetailView, setSelectedHabitForDetailView] = useState<Habit | null>(null);
    const [isDetailViewDialogOpen, setIsDetailViewDialogOpen] = useState(false);
    const [isGoalInputProgramDialogOpen, setIsGoalInputProgramDialogOpen] = useState(false);
    const [isProgramSuggestionLoading, setIsProgramSuggestionLoading] = useState(false);
    const [programSuggestion, setProgramSuggestion] = useState<GenerateHabitProgramOutput | null>(null);
    const [isProgramSuggestionDialogOpen, setIsProgramSuggestionDialogOpen] = useState(false);
    const [isAISuggestionDialogOpen, setIsAISuggestionDialogOpen] = React.useState(false);
    const [selectedHabitForAISuggestion, setSelectedHabitForAISuggestion] = React.useState<Habit | null>(null);
    const [aiSuggestion, setAISuggestion] = React.useState<AISuggestionType | null>(null);
    const [isReflectionDialogOpen, setIsReflectionDialogOpen] = React.useState(false);
    const [reflectionDialogData, setReflectionDialogData] = React.useState<{ habitId: string; date: string; initialNote?: string; habitName: string; } | null>(null);
    const [rescheduleDialogData, setRescheduleDialogData] = React.useState<{ habit: Habit; missedDate: string; } | null>(null);
    const [isDeleteHabitConfirmOpen, setIsDeleteHabitConfirmOpen] = React.useState(false);
    const [habitToDelete, setHabitToDelete] = React.useState<{ id: string; name: string } | null>(null);
    
    // ... (rest of state declarations)

    const todayString = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
    const todayAbbr = useMemo(() => dayIndexToWeekDayConstant[getDay(new Date())], []);
  
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            setAuthUser(user);
            setIsLoadingAuth(false);
            if (!user) router.push('/auth/login');
        });
        return () => unsubscribeAuth();
    }, [router]);

    // ... (Data fetching and other useEffects remain here) ...

    const handleSaveHabit = (habitData: CreateHabitFormData & { id?: string }) => {
        if (!authUser) return;
        const isEditingMode = !!(habitData.id);
        
        if (isEditingMode) {
            setHabits(prev => prev.map(h => h.id === habitData.id ? { 
                ...h, 
                ...habitData,
                durationHours: habitData.durationHours ?? undefined,
                durationMinutes: habitData.durationMinutes ?? undefined,
            } as Habit : h));
            toast({ title: "Habit Updated", description: `"${habitData.name}" has been updated.`});
        } else {
            const newHabit: Habit = {
                id: String(Date.now()),
                name: habitData.name,
                description: habitData.description,
                category: habitData.category,
                daysOfWeek: habitData.daysOfWeek,
                optimalTiming: habitData.optimalTiming,
                durationHours: habitData.durationHours ?? undefined,
                durationMinutes: habitData.durationMinutes ?? undefined,
                specificTime: habitData.specificTime,
                completionLog: [],
                reminderEnabled: false,
            };
            setHabits(prev => [...prev, newHabit]);
            toast({ title: "Habit Added", description: `"${newHabit.name}" has been added.`});
        }
        setIsCreateHabitDialogOpen(false);
    };

    const handleToggleComplete = async (habitId: string, date: string, completed: boolean) => {
        if (!authUser) return;
        let pointsChange = 0;
        let habitNameForQuote: string | undefined = undefined;

        setHabits(prev => prev.map(h => {
            if (h.id === habitId) {
                habitNameForQuote = h.name;
                let newLog = [...h.completionLog];
                const logIndex = newLog.findIndex(l => l.date === date);

                if (completed) {
                    if (logIndex > -1) {
                        if (newLog[logIndex].status !== 'completed') pointsChange = POINTS_PER_COMPLETION;
                        newLog[logIndex] = { ...newLog[logIndex], status: 'completed', time: format(new Date(), 'HH:mm') };
                    } else {
                        pointsChange = POINTS_PER_COMPLETION;
                        newLog.push({ date, time: format(new Date(), 'HH:mm'), status: 'completed' });
                    }
                } else {
                    if (logIndex > -1) {
                        if (newLog[logIndex].status === 'completed') pointsChange = -POINTS_PER_COMPLETION;
                        newLog.splice(logIndex, 1);
                    }
                }
                return { ...h, completionLog: newLog };
            }
            return h;
        }));

        if (pointsChange !== 0) setTotalPoints(prev => Math.max(0, prev + pointsChange));
        if (completed && habitNameForQuote) {
            try {
                const quoteResult = await getMotivationalQuote({ habitName: habitNameForQuote });
                toast({ title: "Way to go!", description: quoteResult.quote });
            } catch (e) { console.error("Error getting quote:", e); }
        }
    };

    const handleGetAISuggestion = async (habit: Habit) => {
        setIsAISuggestionDialogOpen(true);
        setAISuggestion({ habitId: habit.id, suggestionText: '', isLoading: true });
        try {
            const result = await getHabitSuggestion({
                habitName: habit.name,
                daysOfWeek: habit.daysOfWeek,
                trackingData: `Completed ${habit.completionLog.length} times.`,
                // Pass optional fields only if they exist
                ...(habit.description && { habitDescription: habit.description }),
                ...(habit.optimalTiming && { optimalTiming: habit.optimalTiming }),
                ...(habit.durationHours && { durationHours: habit.durationHours }),
                ...(habit.durationMinutes && { durationMinutes: habit.durationMinutes }),
                ...(habit.specificTime && { specificTime: habit.specificTime }),
            });
            setAISuggestion({ habitId: habit.id, suggestionText: result.suggestion, isLoading: false });
        } catch (error) {
            setAISuggestion({ habitId: habit.id, suggestionText: 'Could not get suggestion.', isLoading: false, error: 'Failed' });
        }
    };

    // ... (rest of your handlers and component return)
    
    return (
        <AppPageLayout>
            {/* Main content goes here */}
            {/* You'll need to add the actual JSX for your page */}
            {/* This is just a placeholder to satisfy the type requirement */}
            <div>Your page content here</div>
        </AppPageLayout>
    );
};

const HabitualPage: NextPage = () => (
    <React.Suspense fallback={<LoadingFallback />}>
        <HabitualPageContent />
    </React.Suspense>
);

export default HabitualPage;
