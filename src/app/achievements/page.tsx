
"use client";

import * as React from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase'; // Added db
import { doc, onSnapshot } from 'firebase/firestore'; // Firestore imports
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import type { EarnedBadge } from '@/types';
import AppHeader from '@/components/layout/AppHeader';
import BottomNavigationBar from '@/components/layout/BottomNavigationBar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Loader2, Trophy } from 'lucide-react';
import { format, parseISO } from 'date-fns'; // Added parseISO
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";

// Firestore constants
const USER_DATA_COLLECTION = "users";
const USER_APP_DATA_SUBCOLLECTION = "appData";
const USER_MAIN_DOC_ID = "main";


const AchievementsPage: NextPage = () => {
  const router = useRouter();
  const { toast } = useToast();
  const [authUser, setAuthUser] = React.useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = React.useState(true);
  const [earnedBadges, setEarnedBadges] = React.useState<EarnedBadge[]>([]);
  const [isLoadingData, setIsLoadingData] = React.useState(true);

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
        const badgesFromDb = Array.isArray(data.earnedBadges) ? data.earnedBadges : [];
        // Ensure dateAchieved is a valid date string before parsing for robust display
        const parsedBadges = badgesFromDb.map(b => {
          let dateAchieved = b.dateAchieved || new Date().toISOString(); // Fallback to today if missing
          try {
            parseISO(dateAchieved); // Test if it's a valid ISO string
          } catch (e) {
            console.warn(`Invalid dateAchieved '${b.dateAchieved}' for badge '${b.name}', falling back to current date.`);
            dateAchieved = new Date().toISOString();
          }
          return { ...b, dateAchieved };
        });
        setEarnedBadges(parsedBadges);
      } else {
        setEarnedBadges([]);
      }
      setIsLoadingData(false);
    }, (error) => {
      console.error("Error fetching achievements data from Firestore:", error);
      toast({ title: "Data Error", description: "Could not load achievements data.", variant: "destructive" });
      setEarnedBadges([]);
      setIsLoadingData(false);
    });

    return () => unsubscribeFirestore();
  }, [authUser, isLoadingAuth, toast]);


  const formatDateSafe = (dateString: string) => {
    try {
      // Attempt to parse assuming it might be YYYY-MM-DD or full ISO
      const dateObj = parseISO(dateString);
      return format(dateObj, "MMMM d, yyyy");
    } catch (e) {
      // If it fails, try to format it directly if it's already a simple format like 'yyyy-MM-dd'
      // or if it's some other format that format() can handle (less likely for consistency)
      try {
          return format(new Date(dateString), "MMMM d, yyyy");
      } catch (e2) {
          console.warn(`Could not format date string: ${dateString}`, e2);
          return "Date unavailable"; // Fallback for unparseable dates
      }
    }
  };


  if (isLoadingAuth || (authUser && isLoadingData)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-transparent p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading achievements...</p>
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
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl font-bold text-primary flex items-center">
                    <Trophy className="mr-2 h-5 w-5 text-yellow-500" /> Achievements
                  </CardTitle>
                   <CardDescription>Your collection of earned badges.</CardDescription>
                </CardHeader>
                <CardContent className={cn(
                  "pt-2 space-y-3",
                  earnedBadges.length === 0 && "min-h-[150px] flex items-center justify-center"
                )}>
                  {earnedBadges.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No badges earned yet. Keep up the great work!</p>
                  ) : (
                    earnedBadges.map((badge) => (
                      <div key={badge.id} className="p-3 border rounded-md bg-card shadow-sm">
                        <div className="flex items-center mb-1">
                          <span className="text-2xl mr-2">{badge.icon || "🏆"}</span>
                          <h4 className="font-semibold text-primary">{badge.name}</h4>
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">{badge.description}</p>
                        <p className="text-xs text-muted-foreground">Achieved: {formatDateSafe(badge.dateAchieved)}</p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </main>
            <footer className="py-3 text-center text-xs text-muted-foreground border-t shrink-0 mt-auto">
              <p>&copy; {new Date().getFullYear()} Habitual.</p>
            </footer>
          </div>
        </ScrollArea>
        <BottomNavigationBar />
      </div>
    </div>
  );
};

export default AchievementsPage;
