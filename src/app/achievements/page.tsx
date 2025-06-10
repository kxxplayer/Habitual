"use client";

import * as React from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import type { EarnedBadge } from '@/types';
import AppPageLayout from '@/components/layout/AppPageLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Loader2, Trophy } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";

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
       if (!authUser && !isLoadingAuth) {
        setIsLoadingData(false);
      }
      return;
    }
    
    setIsLoadingData(true);
    const userDocRef = doc(db, USER_DATA_COLLECTION, authUser.uid, USER_APP_DATA_SUBCOLLECTION, USER_MAIN_DOC_ID);

    const unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const badgesFromDb: EarnedBadge[] = Array.isArray(data.earnedBadges) ? data.earnedBadges : [];
        setEarnedBadges(badgesFromDb.sort((a, b) => new Date(b.dateAchieved).getTime() - new Date(a.dateAchieved).getTime()));
      } else {
        setEarnedBadges([]);
      }
      setIsLoadingData(false);
    }, (error) => {
      console.error("Error fetching achievements data:", error);
      toast({ title: "Data Error", description: "Could not load achievements.", variant: "destructive" });
      setIsLoadingData(false);
    });

    return () => unsubscribeFirestore();
  }, [authUser, isLoadingAuth, toast]);


  const formatDateSafe = (dateString: string) => {
    try {
      const dateObj = parseISO(dateString);
      return format(dateObj, "MMMM d, yyyy");
    } catch (e) {
      return "Date unavailable";
    }
  };


  if (isLoadingAuth || (authUser && isLoadingData)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading achievements...</p>
      </div>
    );
  }

  return (
    <AppPageLayout>
        <div className="flex items-center mb-6">
            <Trophy className="mr-3 h-8 w-8 text-yellow-500" />
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Achievements</h2>
                <p className="text-muted-foreground">Your collection of earned badges.</p>
            </div>
        </div>
        
        {earnedBadges.length === 0 ? (
            <div className="text-center py-10 min-h-[200px] flex flex-col items-center justify-center bg-card/50 rounded-lg animate-card-fade-in">
              <Trophy className="mx-auto h-16 w-16 text-muted-foreground/70 mb-4" />
              <h3 className="text-lg font-semibold text-foreground">No Badges Yet</h3>
              <p className="text-sm text-muted-foreground">Keep completing habits to earn them!</p>
            </div>
        ) : (
            <div className="space-y-4">
                {earnedBadges.map((badge, index) => (
                    <Card 
                        key={badge.id} 
                        className="animate-list-item-fade-in"
                        style={{ animationDelay: `${index * 75}ms` }}
                    >
                        <CardContent className="p-4 flex items-center space-x-4">
                            <span className="text-4xl">{badge.icon || "🏆"}</span>
                            <div className="flex-grow">
                                <h4 className="font-semibold text-primary">{badge.name}</h4>
                                <p className="text-sm text-muted-foreground">{badge.description}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                                <p className="text-xs font-semibold text-muted-foreground">Achieved</p>
                                <p className="text-xs text-muted-foreground">{formatDateSafe(badge.dateAchieved)}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        )}
    </AppPageLayout>
  );
};

export default AchievementsPage;
