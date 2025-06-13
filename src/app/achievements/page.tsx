// src/app/achievements/page.tsx

"use client";

import * as React from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import type { EarnedBadge, Habit } from '@/types';
import { Loader2, Award, Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { calculateLongestOverallStreak, calculateCurrentActiveStreak } from '@/lib/dateUtils';
import AppHeader from '@/components/layout/AppHeader';

const AchievementsPage: NextPage = () => {
  const router = useRouter();
  const [authUser, setAuthUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [earnedBadges, setEarnedBadges] = React.useState<EarnedBadge[]>([]);
  const [habits, setHabits] = React.useState<Habit[]>([]);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser(user);
      } else {
        router.push('/auth/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  React.useEffect(() => {
    if (!authUser) return;

    const userDocRef = doc(db, "users", authUser.uid, "appData", "main");
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setEarnedBadges(Array.isArray(data.earnedBadges) ? data.earnedBadges : []);
        setHabits(Array.isArray(data.habits) ? data.habits : []);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [authUser]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading Achievements...</p>
      </div>
    );
  }

  const validBadges = earnedBadges.filter(badge => badge && badge.id && badge.earnedDate);
  const longestStreak = calculateLongestOverallStreak(habits);
  const activeStreak = calculateCurrentActiveStreak(habits);

  return (
    <>
      <AppHeader />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-6">
          Your Achievements
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Streak</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeStreak} Days</div>
              <p className="text-xs text-muted-foreground">
                Your current consecutive streak.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Longest Streak</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{longestStreak} Days</div>
              <p className="text-xs text-muted-foreground">
                Your best streak ever.
              </p>
            </CardContent>
          </Card>
        </div>

        <h2 className="text-2xl font-semibold mb-4">Badges</h2>
        {validBadges.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {validBadges.map((badge) => (
              <Card key={badge.id} className="flex flex-col items-center justify-center p-6 text-center">
                <div className="text-5xl mb-3">{badge.icon || '🏆'}</div>
                <p className="font-bold text-lg">{badge.name}</p>
                <p className="text-sm text-muted-foreground mb-2">{badge.description}</p>
                <p className="text-xs text-muted-foreground">
                  Earned on {format(new Date(badge.earnedDate), "MMM d, yyyy")}
                </p>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">No badges earned yet. Keep it up!</p>
          </div>
        )}
      </main>
    </>
  );
};

export default AchievementsPage;