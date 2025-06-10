// src/app/dashboard/page.tsx
// Added imports for updateDoc, arrayUnion, getDoc, CreateHabitDialog, Button, PlusCircle

"use client";

import * as React from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc, arrayUnion, getDoc } from 'firebase/firestore'; // ADDED imports
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import HabitOverview from '@/components/overview/HabitOverview';
import type { Habit, HabitCategory, HabitCompletionLogEntry, WeekDay, CreateHabitFormData } from '@/types';
import { HABIT_CATEGORIES, weekDays as weekDaysArrayForForm } from '@/types';
import AppHeader from '@/components/layout/AppHeader';
import BottomNavigationBar from '@/components/layout/BottomNavigationBar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Loader2, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import CreateHabitDialog from '@/components/habits/CreateHabitDialog'; // IMPORTED
import { Button } from '@/components/ui/button'; // IMPORTED
import { PlusCircle } from 'lucide-react'; // IMPORTED


// Firestore constants (ensure these match your main page)
const USER_DATA_COLLECTION = "users";
const USER_APP_DATA_SUBCOLLECTION = "appData";
const USER_MAIN_DOC_ID = "main";

const DashboardPage: NextPage = () => {
  const router = useRouter();
  const { toast } = useToast();
  const [authUser, setAuthUser] = React.useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = React.useState(true);
  const [habits, setHabits] = React.useState<Habit[]>([]);
  const [totalPoints, setTotalPoints] = React.useState<number>(0);
  const [isLoadingData, setIsLoadingData] = React.useState(true);
  // ADDED state for CreateHabitDialog
  const [isCreateHabitDialogOpen, setIsCreateHabitDialogOpen] = React.useState(false);
  const [createHabitDialogStep, setCreateHabitDialogStep] = React.useState(1);
  const [editingHabitData, setEditingHabitData] = React.useState<Partial<CreateHabitFormData & { id: string }> | null>(null); // State for editing


  React.useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser(user);
      } else {
        setAuthUser(null);
        router.push('/auth/login');
      }
      setIsLoadingAuth(false);
    });
    return () => unsubscribeAuth();
  }, [router]);

  React.useEffect(() => {
    if (!authUser || isLoadingAuth) {
      if (!authUser && !isLoadingAuth) { // No user, auth check complete
        setIsLoadingData(false);
      }
      return;
    }

    setIsLoadingData(true);
    const userDocRef = doc(db, USER_DATA_COLLECTION, authUser.uid, USER_APP_DATA_SUBCOLLECTION, USER_MAIN_DOC_ID);

    const unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();

        const parsedHabits = (Array.isArray(data.habits) ? data.habits : []).map((h: any): Habit => ({
          id: String(h.id || Date.now().toString() + Math.random().toString(36).substring(2, 7)),
          name: String(h.name || 'Unnamed Habit'),
          description: typeof h.description === 'string' ? h.description : undefined,
          category: HABIT_CATEGORIES.includes(h.category as HabitCategory) ? h.category : 'Other',
          daysOfWeek: Array.isArray(h.daysOfWeek) ? h.daysOfWeek.filter((d: any) => weekDaysArrayForForm.includes(d as WeekDay)) : [],
          optimalTiming: typeof h.optimalTiming === 'string' ? h.optimalTiming : undefined,
          durationHours: typeof h.durationHours === 'number' ? h.durationHours : undefined,
          durationMinutes: typeof h.durationMinutes === 'number' ? h.durationMinutes : undefined,
          specificTime: typeof h.specificTime === 'string' ? h.specificTime : undefined,
          completionLog: (Array.isArray(h.completionLog) ? h.completionLog : []).map((log: any): HabitCompletionLogEntry | null => {
            if (typeof log.date !== 'string' || !log.date.match(/^\d{4}-\d{2}-\d{2}$/)) return null;
            return {
              date: log.date,
              time: typeof log.time === 'string' && log.time.length > 0 ? log.time : 'N/A',
              note: typeof log.note === 'string' ? log.note : undefined,
              status: ['completed', 'pending_makeup', 'skipped'].includes(log.status) ? log.status : 'completed',
              originalMissedDate: typeof log.originalMissedDate === 'string' && log.originalMissedDate.match(/^\d{4}-\d{2}-\d{2}$/) ? log.originalMissedDate : undefined,
            };
          }).filter((log): log is HabitCompletionLogEntry => log !== null).sort((a,b) => b.date.localeCompare(a.date)),
          reminderEnabled: typeof h.reminderEnabled === 'boolean' ? h.reminderEnabled : false,
        }));
        setHabits(parsedHabits);
        setTotalPoints(typeof data.totalPoints === 'number' ? data.totalPoints : 0);
      } else {
        // Document doesn't exist, set to defaults
        setHabits([]);
        setTotalPoints(0);
      }
      setIsLoadingData(false);
    }, (error) => {
      console.error("Error fetching dashboard data from Firestore:", error);
      toast({ title: "Data Error", description: "Could not load dashboard data.", variant: "destructive" });
      setHabits([]);
      setTotalPoints(0);
      setIsLoadingData(false);
    });

    return () => unsubscribeFirestore();
  }, [authUser, isLoadingAuth, toast]);

  // ADDED function to handle saving a new habit
  const handleSaveNewHabit = async (newHabit: CreateHabitFormData) => {
    if (!authUser) {
      toast({ title: "Authentication Error", description: "You must be logged in to add a habit.", variant: "destructive" });
      return;
    }

    setIsLoadingData(true); // Indicate loading while saving

    const userDocRef = doc(db, USER_DATA_COLLECTION, authUser.uid, USER_APP_DATA_SUBCOLLECTION, USER_MAIN_DOC_ID);

    try {
      // Fetch the current data to ensure we don't overwrite other fields
      const docSnap = await getDoc(userDocRef);
      let currentData = docSnap.exists() ? docSnap.data() : {};

      // Ensure habits is an array
      const currentHabits = Array.isArray(currentData.habits) ? currentData.habits : [];

      // Assign a unique ID to the new habit if it doesn't have one
      const habitToSave = {
        id: newHabit.id || Date.now().toString() + Math.random().toString(36).substring(2, 7),
        ...newHabit,
        completionLog: [], // Ensure completionLog is initialized
      };

      // Add the new habit to the array
      const updatedHabits = [...currentHabits, habitToSave];


      // Update the document with the new habits array
      await updateDoc(userDocRef, {
        habits: updatedHabits,
        // Preserve other fields if they exist
        ...currentData,
        habits: updatedHabits, // Ensure habits is the updated array
      });

      toast({ title: "Success", description: "Habit added successfully." });
      setIsCreateHabitDialogOpen(false); // Close dialog on success
      setCreateHabitDialogStep(1); // Reset step

    } catch (error) {
      console.error("Error saving new habit to Firestore:", error);
      toast({ title: "Save Error", description: "Could not save the habit. Please try again.", variant: "destructive" });
    } finally {
       setIsLoadingData(false); // Stop loading
    }
  };

  // Function to handle opening the Create Habit Dialog
  const handleOpenCreateHabitDialog = () => {
    setEditingHabitData(null); // Ensure we are not in editing mode when creating
    setCreateHabitDialogStep(1); // Start at step 1 for creation
    setIsCreateHabitDialogOpen(true);
  };
  
   // Function to handle opening the Goal Program Dialog (placeholder)
  const handleOpenGoalProgramDialog = () => {
    console.log("Open Goal Program Dialog");
    // Implement navigation or state change to open the Goal Program Dialog
    // For now, just close the habit dialog
     setIsCreateHabitDialogOpen(false);
  };


  if (isLoadingAuth || (authUser && isLoadingData)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-transparent p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-transparent p-4">
        <p className="text-muted-foreground">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-0 sm:p-4">
      <div className={cn(
        "bg-card/95 backdrop-blur-sm text-foreground shadow-xl rounded-xl flex flex-col mx-auto",
        "w-full max-w-sm h-[97vh] max-h-[97vh]",
        "md:max-w-md",
        "lg:max-w-lg"
      )}>
        <AppHeader />
        <ScrollArea className="flex-grow min-h-0">
          <div className="flex flex-col min-h-full">
            <main className="px-3 sm:px-4 py-4 flex-grow">
              <Card>
                <CardHeader className="pb-2 flex flex-row items-center justify-between"> {/* MODIFIED */}
                  <div className="flex items-center">
                     <LayoutDashboard className="mr-2 h-5 w-5 text-primary" /> {/* ADDED text-primary */}
                     <CardTitle className="text-xl font-bold text-primary">Dashboard</CardTitle> {/* ADDED text-primary */}
                  </div>
                   {/* ADDED Add Habit Button */}
                   <Button variant="outline" size="sm" onClick={handleOpenCreateHabitDialog}>
                     <PlusCircle className="mr-1 h-4 w-4" /> Add Habit
                   </Button>
                </CardHeader>
                <CardContent className="pt-2">
                  <HabitOverview habits={habits} totalPoints={totalPoints} />
                </CardContent>
              </Card>
            </main>
            <footer className="py-3 text-center text-xs text-muted-foreground border-t shrink-0 mt-auto">
              <p>&copy; {new Date().getFullYear()} Habitual.</p>
            </footer>
          </div>
        </ScrollArea>
        <BottomNavigationBar />

        {/* ADDED CreateHabitDialog */}
        <CreateHabitDialog
           isOpen={isCreateHabitDialogOpen}
           onClose={() => setIsCreateHabitDialogOpen(false)}
           onSaveHabit={handleSaveNewHabit}
           initialData={editingHabitData} // Pass editing data
           currentStep={createHabitDialogStep}
           setCurrentStep={setCreateHabitDialogStep}
           onOpenGoalProgramDialog={handleOpenGoalProgramDialog}
        />
      </div>
    </div>
  );
};

export default DashboardPage;
