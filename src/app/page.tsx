// Add this for debugging
console.log("Firebase config check:", {
    hasAuth: !!auth,
    hasDb: !!db,
    authConfig: auth?.app?.options,
  });


"use client";

import * as React from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove, setDoc } from 'firebase/firestore';
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

import type { Habit, AISuggestion as AISuggestionType, WeekDay, HabitCompletionLogEntry, HabitCategory, EarnedBadge, CreateHabitFormData, SuggestedHabitForCommonList as CommonSuggestedHabitType } from '@/types';
import { HABIT_CATEGORIES, weekDays as weekDaysArrayForForm } from '@/types';

import { getHabitSuggestion } from '@/ai/flows/habit-suggestion';
import { getMotivationalQuote } from '@/ai/flows/motivational-quote-flow';
import { generateHabitProgramFromGoal, type GenerateHabitProgramOutput } from '@/ai/flows/generate-habit-program-flow';
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
    const [isCreateHabitDialogOpen, setIsCreateHabitDialogOpen] = useState(false);
    const [selectedHabitForDetailView, setSelectedHabitForDetailView] = useState<Habit | null>(null);
    const [isDetailViewDialogOpen, setIsDetailViewDialogOpen] = useState(false);
    
    // ... (All other state declarations from your file should be here) ...

    const todayString = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
    const todayAbbr = useMemo(() => dayIndexToWeekDayConstant[getDay(new Date())], []);
  
    // ... (All useEffects and handler functions from your file should be here) ...

    const handleAddNewHabit = () => setIsCreateHabitDialogOpen(true);
    const handleOpenDetailView = (habit: Habit) => {
        setSelectedHabitForDetailView(habit);
        setIsDetailViewDialogOpen(true);
    };
    const handleCloseDetailView = useCallback(() => setSelectedHabitForDetailView(null), []);
    
    // This is a placeholder for the full handler logic from your file
    const handleToggleComplete = async (habitId: string, date: string, completed: boolean) => {};


    if (isLoadingAuth) return <LoadingFallback />;

    return (
        <AppPageLayout onAddNew={handleAddNewHabit}>
            <div className="animate-card-fade-in">
              <h1 className="text-3xl font-bold tracking-tight mb-6">Today's Habits</h1>
              <HabitList 
                  habits={habits}
                  onOpenDetailView={handleOpenDetailView}
                  todayString={todayString}
                  todayAbbr={todayAbbr}
                  onToggleComplete={handleToggleComplete}
                  onDelete={() => {}} // Placeholder
                  onEdit={() => {}} // Placeholder
                  onReschedule={() => {}} // Placeholder
              />
            </div>
             {/* All Dialog components go here */}
             <HabitDetailViewDialog
                habit={selectedHabitForDetailView}
                isOpen={!!selectedHabitForDetailView}
                onClose={handleCloseDetailView}
                onToggleComplete={handleToggleComplete}
                onGetAISuggestion={() => {}}
                onOpenReflectionDialog={() => {}}
                onOpenRescheduleDialog={() => {}}
                onToggleReminder={() => {}}
                onOpenEditDialog={() => {}}
                onOpenDeleteConfirm={() => {}}
                onGetAIReflectionPrompt={getReflectionStarter}
            />
        </AppPageLayout>
    );
};

const HabitualPage: NextPage = () => (
    <React.Suspense fallback={<LoadingFallback />}>
        <HabitualPageContent />
    </React.Suspense>
);

export default HabitualPage;
