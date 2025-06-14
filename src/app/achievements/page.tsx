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
import AppPageLayout from '@/components/layout/AppPageLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Trophy, Award, Calendar, Star, Zap, Target, Lock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { badgeDefinitions } from '@/lib/badgeUtils'; // Import all possible badge definitions

const USER_DATA_COLLECTION = "users";
const USER_APP_DATA_SUBCOLLECTION = "appData";
const USER_MAIN_DOC_ID = "main";

const getBadgeIcon = (badgeId: string, isLocked = false) => {
    const className = cn("h-8 w-8", isLocked ? "text-muted-foreground/50" : "");
    switch (badgeId) {
        case 'first-habit-completed':
            return <Star className={cn(className, !isLocked && "text-yellow-500")} />;
        case '7-day-streak':
            return <Zap className={cn(className, !isLocked && "text-orange-500")} />;
        case '30-day-streak':
            return <Target className={cn(className, !isLocked && "text-red-500")} />;
        default:
            return <Award className={cn(className, !isLocked && "text-blue-500")} />;
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

    const formatDateSafe = (dateString: string | undefined) => {
        if (!dateString) return "Date unavailable";
        try {
            return format(parseISO(dateString), "MMMM d, yyyy");
        } catch (e) {
            return "Date unavailable";
        }
    };
    
    const validEarnedBadges = earnedBadges.filter(badge => badge && badge.id && badge.earnedDate);
    const earnedBadgeIds = new Set(validEarnedBadges.map(b => b.id));
    const unearnedBadges = badgeDefinitions.filter(def => !earnedBadgeIds.has(def.id));

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
            <div className="animate-card-fade-in space-y-8">
                <div>
                    <div className="flex items-center mb-6">
                        <Trophy className="mr-3 h-8 w-8 text-yellow-500" />
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight">Achievements</h2>
                            <p className="text-muted-foreground">Your collection of earned badges.</p>
                        </div>
                    </div>
                    <Card>
                        <CardContent className={cn("pt-6", validEarnedBadges.length === 0 && "min-h-[150px] flex items-center justify-center")}>
                            {validEarnedBadges.length === 0 ? (
                                <p className="text-muted-foreground text-center">
                                    Your earned badges will appear here.
                                </p>
                            ) : (
                                <div className="grid grid-cols-1 gap-3">
                                    {validEarnedBadges.map((badge) => (
                                        <div key={badge.id} className="flex items-center space-x-4 p-4 bg-secondary/30 rounded-lg border">
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
                </div>

                {/* Sneak Peek Section */}
                <div>
                    <div className="flex items-center mb-4">
                        <Lock className="mr-3 h-6 w-6 text-muted-foreground" />
                        <div>
                            <h3 className="text-2xl font-bold tracking-tight">Achievements to Unlock</h3>
                            <p className="text-muted-foreground">Here’s what you can earn next!</p>
                        </div>
                    </div>
                    <Card>
                         <CardContent className="pt-6">
                            {unearnedBadges.length > 0 ? (
                                <div className="grid grid-cols-1 gap-3">
                                    {unearnedBadges.map((badge) => (
                                        <div key={badge.id} className="flex items-center space-x-4 p-4 bg-background rounded-lg border border-dashed opacity-70">
                                            {getBadgeIcon(badge.id, true)}
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-muted-foreground">{badge.name}</h3>
                                                <p className="text-sm text-muted-foreground/80">{badge.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="min-h-[100px] flex items-center justify-center">
                                     <p className="text-muted-foreground text-center">
                                        You've earned all available badges. Great job!
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppPageLayout>
    );
};

export default AchievementsPage;