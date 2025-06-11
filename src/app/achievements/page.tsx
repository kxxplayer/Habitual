// src/app/achievements/page.tsx
"use client";
import * as React from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import type { EarnedBadge } from '@/types';
import AppPageLayout from '@/components/layout/AppPageLayout'; // Import the layout
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Loader2, Trophy, Award, Calendar, Star, Zap, Target } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";

const USER_DATA_COLLECTION = "users";
const USER_APP_DATA_SUBCOLLECTION = "appData";
const USER_MAIN_DOC_ID = "main";

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
      if (!authUser && !isLoadingAuth) setIsLoadingData(false);
      return;
    }
    
    setIsLoadingData(true);
    const userDocRef = doc(db, USER_DATA_COLLECTION, authUser.uid, USER_APP_DATA_SUBCOLLECTION, USER_MAIN_DOC_ID);

    const unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
      try {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setEarnedBadges(Array.isArray(data.earnedBadges) ? data.earnedBadges : []);
        } else {
          setEarnedBadges([]);
        }
      } catch (error) {
        console.error("Error processing badges data:", error);
        setEarnedBadges([]);
      } finally {
        setIsLoadingData(false);
      }
    }, (error) => {
      console.error("Error fetching achievements data:", error);
      toast({ title: "Data Error", description: "Could not load achievements.", variant: "destructive" });
      setIsLoadingData(false);
    });

    return () => unsubscribeFirestore();
  }, [authUser, isLoadingAuth, toast]);

  const formatDateSafe = (dateString: string) => {
    try {
      return format(parseISO(dateString), "MMMM d, yyyy");
    } catch (e) {
      return "Date unavailable";
    }
  };

  if (isLoadingAuth || (authUser && isLoadingData)) {
    return (
      <AppPageLayout>
        <div className="flex flex-col items-center justify-center pt-20">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading Achievements...</p>
        </div>
      </AppPageLayout>
    );
  }

  return (
    <AppPageLayout onAddNew={() => router.push('/?action=addHabit')}>
        <div className="flex items-center mb-6">
            <Trophy className="mr-3 h-8 w-8 text-yellow-500" />
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Achievements</h2>
                <p className="text-muted-foreground">Your collection of earned badges.</p>
            </div>
        </div>
        <Card>
            <CardContent className={cn("pt-6 space-y-3", earnedBadges.length === 0 && "min-h-[200px] flex items-center justify-center")}>
              {earnedBadges.length === 0 ? (
                <p className="text-muted-foreground text-center">
                  No badges earned yet. Complete habits to earn them!
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {earnedBadges.map((badge) => (
                    <div
                      key={badge.id}
                      className="flex items-center space-x-4 p-4 bg-secondary/30 rounded-lg border"
                    >
                      {getBadgeIcon(badge.id)}
                      <div className="flex-1">
                        <h3 className="font-semibold">{badge.name}</h3>
                        <p className="text-sm text-muted-foreground">{badge.description}</p>
                        <div className="flex items-center mt-1 text-xs text-muted-foreground">
                          <Calendar className="mr-1.5 h-3 w-3" />
                          <span>Earned on {formatDateSafe(badge.earnedDate)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
        </Card>
    </AppPageLayout>
  );
};

export default AchievementsPage;