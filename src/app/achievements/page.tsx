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
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Trophy } from 'lucide-react';
import { format, parseISO } from 'date-fns';
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

  // ... (Data fetching useEffects from your file should be here) ...

  const formatDateSafe = (dateString: string) => {
    try {
      return format(parseISO(dateString), "MMMM d, yyyy");
    } catch (e) {
      return "Date unavailable";
    }
  };

  if (isLoadingAuth || isLoadingData) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading achievements...</p>
      </div>
    );
  }

  return (
    <AppPageLayout>
        <div className="flex items-center mb-6 animate-card-fade-in">
            <Trophy className="mr-4 h-9 w-9 text-yellow-500" />
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Achievements</h1>
                <p className="text-muted-foreground">Your collection of earned badges.</p>
            </div>
        </div>
        
        {earnedBadges.length === 0 ? (
            <div className="text-center py-12 min-h-[200px] flex flex-col items-center justify-center bg-card/50 rounded-lg animate-card-fade-in">
              <Trophy className="mx-auto h-16 w-16 text-muted-foreground/70 mb-4" />
              <h3 className="text-lg font-semibold text-foreground">No Badges Yet</h3>
              <p className="text-sm text-muted-foreground">Keep completing habits to earn them!</p>
            </div>
        ) : (
            <div className="space-y-3">
                {earnedBadges.map((badge, index) => (
                    <Card 
                        key={badge.id} 
                        className="animate-list-item-fade-in"
                        style={{ animationDelay: `${index * 80}ms` }}
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
