
"use client";

import * as React from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import type { EarnedBadge } from '@/types';
import AppHeader from '@/components/layout/AppHeader';
import BottomNavigationBar from '@/components/layout/BottomNavigationBar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Loader2, Trophy } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const LS_KEY_PREFIX_BADGES = "earnedBadges_";

const AchievementsPage: NextPage = () => {
  const router = useRouter();
  const [authUser, setAuthUser] = React.useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = React.useState(true);
  const [earnedBadges, setEarnedBadges] = React.useState<EarnedBadge[]>([]);
  const [isLoadingData, setIsLoadingData] = React.useState(true);

  React.useEffect(() => {
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

  React.useEffect(() => {
    if (!authUser || isLoadingAuth) return;

    setIsLoadingData(true);
    const userUid = authUser.uid;
    const badgesKey = `${LS_KEY_PREFIX_BADGES}${userUid}`;
    const storedBadges = localStorage.getItem(badgesKey);
    if (storedBadges) {
      try {
        setEarnedBadges(JSON.parse(storedBadges));
      } catch (e) {
        console.error("Error parsing badges from localStorage on achievements page:", e);
        setEarnedBadges([]);
      }
    } else {
      setEarnedBadges([]);
    }
    setIsLoadingData(false);
  }, [authUser, isLoadingAuth]);

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
        "bg-card text-foreground shadow-xl rounded-xl flex flex-col overflow-hidden mx-auto",
        "w-full max-w-md max-h-[90vh] sm:max-h-[850px]",
        "md:max-w-lg md:max-h-[85vh]",
        "lg:max-w-2xl lg:max-h-[80vh]"
      )}>
        <AppHeader />
        <ScrollArea className="flex-grow">
          <main className="px-3 sm:px-4 py-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-xl font-bold text-primary flex items-center">
                  <Trophy className="mr-2 h-5 w-5 text-yellow-500" /> Achievements
                </CardTitle>
                 <CardDescription>Your collection of earned badges.</CardDescription>
              </CardHeader>
              <CardContent className="pt-2 space-y-3">
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
                      <p className="text-xs text-muted-foreground">Achieved: {format(new Date(badge.dateAchieved), "MMMM d, yyyy")}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </main>
           <footer className="py-3 text-center text-xs text-muted-foreground border-t mt-auto">
            <p>&copy; {new Date().getFullYear()} Habitual.</p>
          </footer>
        </ScrollArea>
        <BottomNavigationBar />
      </div>
    </div>
  );
};

export default AchievementsPage;

    