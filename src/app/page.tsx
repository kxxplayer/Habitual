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
import { Loader2 } from 'lucide-react';
import { format, getDay } from 'date-fns';

const dayIndexToWeekDayConstant: WeekDay[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const USER_DATA_COLLECTION = "users";
const USER_APP_DATA_SUBCOLLECTION = "appData";
const USER_MAIN_DOC_ID = "main";

const LoadingFallback: React.FC = () => (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading your habits...</p>
    </div>
);

const HabitualPageContent: React.FC = () => {
    const router = useRouter();
    const { toast } = useToast();
    const [authUser, setAuthUser] = useState<User | null>(null);
    const [isLoadingAuth, setIsLoadingAuth] = useState(true);
    const [isLoadingData, setIsLoadingData] = useState(true);
    
    const [habits, setHabits] = useState<Habit[]>([]);
    const [earnedBadges, setEarnedBadges] = useState<EarnedBadge[]>([]);
    const [totalPoints, setTotalPoints] = useState<number>(0);

    const [isCreateHabitDialogOpen, setIsCreateHabitDialogOpen] = useState(false);
    const [editingHabit, setEditingHabit] = useState<Partial<CreateHabitFormData> | null>(null);
    const [creationStep, setCreationStep] = useState(1);
    
    const [selectedHabitForDetailView, setSelectedHabitForDetailView] = useState<Habit | null>(null);
    
    const [isSuggestionLoading, setIsSuggestionLoading] = useState(false);
    const [suggestionData, setSuggestionData] = useState<{ habitName: string; suggestion: string | null; error?: string | null; } | null>(null);

    const [reflectionData, setReflectionData] = useState<{ habitId: string; date: string; habitName: string } | null>(null);
    const [isReflectionDialogOpen, setIsReflectionDialogOpen] = useState(false);

    const [rescheduleData, setRescheduleData] = useState<{ habit: Habit; missedDate: string } | null>(null);
    
    const [deleteConfirmData, setDeleteConfirmData] = useState<{ habitId: string; habitName: string } | null>(null);

    const [isGoalProgramDialogOpen, setIsGoalProgramDialogOpen] = useState(false);
    const [programSuggestion, setProgramSuggestion] = useState<GenerateHabitProgramOutput | null>(null);
    const [isProgramSuggestionLoading, setIsProgramSuggestionLoading] = useState(false);

    const todayString = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
    const todayAbbr = useMemo(() => dayIndexToWeekDayConstant[getDay(new Date())], []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setAuthUser(user);
            } else {
                setAuthUser(null);
                router.push('/auth/login');
            }
            setIsLoadingAuth(false);
        });
        return () => unsubscribe();
    }, [router]);

    useEffect(() => {
        if (!authUser || isLoadingAuth) {
            if (!authUser && !isLoadingAuth) {
                setIsLoadingData(false);
            }
            return;
        }

        setIsLoadingData(true);
        const userDocRef = doc(db, USER_DATA_COLLECTION, authUser.uid, USER_APP_DATA_SUBCOLLECTION, USER_MAIN_DOC_ID);

        const unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
            try {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const parsedHabits = (Array.isArray(data.habits) ? data.habits : []).map((h: any): Habit => ({ 
                        id: String(h.id || Date.now().toString() + Math.random().toString(36).substring(2, 7)),
                        name: String(h.name || 'Unnamed Habit'),
                        description: typeof h.description === 'string' ? h.description : undefined,
                        category: HABIT_CATEGORIES.includes(h.category as HabitCategory) ? h.category : 'Other',
                        daysOfWeek: Array.isArray(h.daysOfWeek) ? h.daysOfWeek.filter((d: any): d is WeekDay => weekDaysArrayForForm.includes(d as WeekDay)) : [], 
                        optimalTiming: typeof h.optimalTiming === 'string' ? h.optimalTiming : undefined,
                        durationHours: typeof h.durationHours === 'number' ? h.durationHours : undefined,
                        durationMinutes: typeof h.durationMinutes === 'number' ? h.durationMinutes : undefined,
                        specificTime: typeof h.specificTime === 'string' ? h.specificTime : undefined,
                        completionLog: (Array.isArray(h.completionLog) ? h.completionLog : [])
                            .map((log: Partial<HabitCompletionLogEntry>): HabitCompletionLogEntry | null => { 
                                if (typeof log.date !== 'string' || !log.date.match(/^\d{4}-\d{2}-\d{2}$/)) return null;
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
                } else {
                    setHabits([]);
                    setEarnedBadges([]);
                    setTotalPoints(0);
                }
            } catch (error) {
                console.error("Critical error while parsing Firestore data:", error);
                toast({
                    title: "Error Loading Data",
                    description: "There was an issue processing your data. Please check the console for details.",
                    variant: "destructive",
                });
                setHabits([]);
                setEarnedBadges([]);
                setTotalPoints(0);
            } finally {
                setIsLoadingData(false);
            }
        }, (error) => {
            console.error("Error fetching user data from Firestore:", error);
            toast({ title: "Data Error", description: "Could not load your data.", variant: "destructive" });
            setIsLoadingData(false);
        });

        return () => unsubscribeFirestore();
    }, [authUser, isLoadingAuth, toast]);

    const handleSaveHabitsToFirestore = useCallback(async (updatedHabits: Habit[], updatedBadges?: EarnedBadge[], updatedPoints?: number) => {
        if (!authUser) return;
        const userDocRef = doc(db, USER_DATA_COLLECTION, authUser.uid, USER_APP_DATA_SUBCOLLECTION, USER_MAIN_DOC_ID);
        try {
            await setDoc(userDocRef, {
                habits: updatedHabits,
                earnedBadges: updatedBadges !== undefined ? updatedBadges : earnedBadges,
                totalPoints: updatedPoints !== undefined ? updatedPoints : totalPoints,
            }, { merge: true });
        } catch (error) {
            console.error("Error saving data to Firestore:", error);
            toast({ title: "Sync Error", description: "Could not save your changes.", variant: "destructive" });
        }
    }, [authUser, earnedBadges, totalPoints, toast]);

    const handleToggleComplete = useCallback(async (habitId: string, date: string, completed: boolean) => {
        const newHabits = habits.map(habit => {
            if (habit.id === habitId) {
                const newLog = [...habit.completionLog];
                const logIndex = newLog.findIndex(l => l.date === date);

                if (logIndex > -1) {
                    if (completed) {
                        newLog[logIndex] = { ...newLog[logIndex], status: 'completed', time: format(new Date(), 'HH:mm') };
                    } else {
                        newLog.splice(logIndex, 1);
                    }
                } else if (completed) {
                    newLog.push({ date, time: format(new Date(), 'HH:mm'), status: 'completed' });
                }
                return { ...habit, completionLog: newLog };
            }
            return habit;
        });

        const newPoints = completed ? totalPoints + 10 : totalPoints - 10;
        const newlyEarnedBadges = checkAndAwardBadges(newHabits, earnedBadges);
        const allBadges = [...earnedBadges, ...newlyEarnedBadges];

        setHabits(newHabits);
        setTotalPoints(newPoints);
        if (newlyEarnedBadges.length > 0) {
            setEarnedBadges(allBadges);
            newlyEarnedBadges.forEach(badge => {
                toast({ title: "Badge Unlocked! 🏆", description: `You've earned the "${badge.name}" badge!` });
            });
        }
        
        await handleSaveHabitsToFirestore(newHabits, allBadges, newPoints);
        
        if (selectedHabitForDetailView?.id === habitId) {
            const updatedHabitForDetailView = newHabits.find(h => h.id === habitId);
            if(updatedHabitForDetailView) setSelectedHabitForDetailView(updatedHabitForDetailView);
        }

    }, [habits, totalPoints, earnedBadges, handleSaveHabitsToFirestore, toast, selectedHabitForDetailView]);

    const handleAddNewHabit = () => {
        setEditingHabit(null);
        setCreationStep(1);
        setIsCreateHabitDialogOpen(true);
    };

    const handleOpenDetailView = (habit: Habit) => {
        setSelectedHabitForDetailView(habit);
    };

    const handleCloseDetailView = useCallback(() => setSelectedHabitForDetailView(null), []);

    if (isLoadingAuth || isLoadingData) return <LoadingFallback />;
    if (!authUser) return <LoadingFallback />;

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
                  onDelete={(habitId, habitName) => setDeleteConfirmData({ habitId, habitName })}
                  onEdit={(habit) => {
                      setEditingHabit(habit);
                      setCreationStep(2);
                      setIsCreateHabitDialogOpen(true);
                  }}
                  onReschedule={(habit, missedDate) => setRescheduleData({ habit, missedDate })}
              />
            </div>

            {/* --- Dialogs --- */}
            <CreateHabitDialog
                isOpen={isCreateHabitDialogOpen}
                onClose={() => setIsCreateHabitDialogOpen(false)}
                onSaveHabit={async (formData) => {
                    let updatedHabits;
                    if (formData.id) { // Editing existing habit
                        updatedHabits = habits.map(h => 
                            h.id === formData.id 
                                ? { 
                                    ...h, 
                                    ...formData,
                                    durationHours: formData.durationHours ?? undefined,
                                    durationMinutes: formData.durationMinutes ?? undefined,
                                  } 
                                : h
                        );
                    } else { // Adding new habit
                        const newHabit: Habit = {
                            id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
                            name: formData.name,
                            description: formData.description,
                            category: formData.category,
                            daysOfWeek: formData.daysOfWeek,
                            optimalTiming: formData.optimalTiming,
                            durationHours: formData.durationHours ?? undefined,
                            durationMinutes: formData.durationMinutes ?? undefined,
                            specificTime: formData.specificTime,
                            completionLog: [],
                            reminderEnabled: false,
                        };
                        updatedHabits = [...habits, newHabit];
                    }
                    setHabits(updatedHabits);
                    await handleSaveHabitsToFirestore(updatedHabits);
                    setIsCreateHabitDialogOpen(false);
                    toast({ title: formData.id ? "Habit Updated!" : "Habit Added!", description: `Your habit "${formData.name}" has been saved.` });
                }}
                initialData={editingHabit}
                currentStep={creationStep}
                setCurrentStep={setCreationStep}
                onOpenGoalProgramDialog={() => setIsGoalProgramDialogOpen(true)}
            />
             
            <HabitDetailViewDialog
                habit={selectedHabitForDetailView}
                isOpen={!!selectedHabitForDetailView}
                onClose={handleCloseDetailView}
                onToggleComplete={handleToggleComplete}
                onGetAISuggestion={async (habit) => {
                    setSuggestionData({ habitName: habit.name, suggestion: null });
                    setIsSuggestionLoading(true);
                    try {
                        const res = await getHabitSuggestion({
                            habitName: habit.name,
                            habitDescription: habit.description,
                            daysOfWeek: habit.daysOfWeek,
                            trackingData: `Completions: ${habit.completionLog.length}`
                        });
                        setSuggestionData({ habitName: habit.name, suggestion: res.suggestion });
                    } catch (error) {
                        console.error(error);
                        setSuggestionData({ habitName: habit.name, suggestion: null, error: "Could not fetch suggestion." });
                    } finally {
                        setIsSuggestionLoading(false);
                    }
                }}
                onOpenReflectionDialog={(habitId, date, habitName) => {
                    setReflectionData({ habitId, date, habitName });
                    setIsReflectionDialogOpen(true);
                }}
                onOpenRescheduleDialog={(habit, missedDate) => setRescheduleData({ habit, missedDate })}
                onToggleReminder={async (habitId, currentState) => {
                    const newHabits = habits.map(h => h.id === habitId ? {...h, reminderEnabled: !currentState} : h);
                    setHabits(newHabits);
                    await handleSaveHabitsToFirestore(newHabits);
                    if (selectedHabitForDetailView?.id === habitId) {
                        setSelectedHabitForDetailView(newHabits.find(h => h.id === habitId) || null);
                    }
                }}
                onOpenEditDialog={(habit) => {
                    setEditingHabit(habit);
                    setCreationStep(2);
                    handleCloseDetailView();
                    setIsCreateHabitDialogOpen(true);
                }}
                onOpenDeleteConfirm={(habitId, habitName) => {
                    handleCloseDetailView();
                    setDeleteConfirmData({ habitId, habitName });
                }}
                onGetAIReflectionPrompt={getReflectionStarter}
            />

            <AISuggestionDialog
                isOpen={!!suggestionData}
                onClose={() => setSuggestionData(null)}
                habitName={suggestionData?.habitName || ''}
                suggestion={suggestionData?.suggestion || null}
                isLoading={isSuggestionLoading}
                error={suggestionData?.error}
            />
            
            {/* Other dialogs would follow a similar pattern */}

        </AppPageLayout>
    );
};

const HabitualPage: NextPage = () => (
    <React.Suspense fallback={<LoadingFallback />}>
        <HabitualPageContent />
    </React.Suspense>
);

export default HabitualPage;
