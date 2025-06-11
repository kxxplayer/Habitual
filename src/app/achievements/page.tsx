"use client";

import * as React from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import type { EarnedBadge } from '@/types';
import AppHeader from '@/components/layout/AppHeader';
import BottomNavigationBar from '@/components/layout/BottomNavigationBar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Loader2, Trophy, Award, Calendar, Star, Zap, Target } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";

// Firestore constants
const USER_DATA_COLLECTION = "users";
const USER_APP_DATA_SUBCOLLECTION = "appData";
const USER_MAIN_DOC_ID = "main";

// Badge icons mapping
const getBadgeIcon = (badgeId: string) => {
  switch (badgeId) {
    case 'first-habit-completed':
      return <Star className="h-8 w-8 text-yellow-500" />;
    case '7-day-streak':
      return <Zap className="h-8 w-8 text-orange-500" />;
    case '30-day-streak':
      return <Target className="h-8 w-8 text-red-500" />;
    default:
      return <Award className="h-8 w-8 text-blue-500" />;
  }
};

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
          const badgesFromDb = Array.isArray(data.earnedBadges) ? data.earnedBadges : [];
          setEarnedBadges(badgesFromDb);
        } else {
          // Document doesn't exist yet, that's okay
          setEarnedBadges([]);
        }
      } catch (error) {
        console.error("Error processing badges data:", error);
        setEarnedBadges([]);
      } finally {
        setIsLoadingData(false);
      }
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
      const dateObj = parseISO(dateString);
      return format(dateObj, "MMMM d, yyyy");
    } catch (e) {
      try {
        return format(new Date(dateString), "MMMM d, yyyy");
      } catch (e2) {
        console.warn(`Could not format date string: ${dateString}`, e2);
        return "Date unavailable";
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
                    <p className="text-muted-foreground text-center py-4">
                      No badges earned yet. Complete habits to earn achievements!
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {earnedBadges.map((badge) => (
                        <div
                          key={badge.id}
                          className="flex items-center space-x-3 p-3 bg-secondary/20 rounded-lg border border-border"
                        >
                          {getBadgeIcon(badge.id)}
                          <div className="flex-1">
                            <h3 className="font-semibold text-sm">{badge.name}</h3>
                            <p className="text-xs text-muted-foreground">{badge.description}</p>
                            <div className="flex items-center mt-1 text-xs text-muted-foreground">
                              <Calendar className="mr-1 h-3 w-3" />
                              <span>Earned on {formatDateSafe(badge.earnedDate)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
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