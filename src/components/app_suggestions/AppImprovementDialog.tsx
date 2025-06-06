
"use client";

import * as React from 'react';
import type { FC } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Loader2, Lightbulb, Sparkles, Send, BrainCircuit } from 'lucide-react';
import { getAppImprovementSuggestions, type AppImprovementInput, type AppImprovementOutput } from '@/ai/flows/app-improvement-suggester-flow';
import { cn } from '@/lib/utils';

interface AppImprovementDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const AppImprovementDialog: FC<AppImprovementDialogProps> = ({ isOpen, onClose }) => {
  const [focusArea, setFocusArea] = React.useState('');
  const [suggestions, setSuggestions] = React.useState<AppImprovementOutput['suggestions'] | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleGetSuggestions = async () => {
    setIsLoading(true);
    setError(null);
    setSuggestions(null);
    try {
      const input: AppImprovementInput = {};
      if (focusArea.trim()) {
        input.userFocusArea = focusArea.trim();
      }
      const result = await getAppImprovementSuggestions(input);
      setSuggestions(result.suggestions);
    } catch (err: any) {
      console.error("Error getting app improvement suggestions:", err);
      setError(err.message || "Failed to fetch suggestions. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    // Reset state when dialog is closed/reopened
    if (isOpen) {
      setFocusArea('');
      setSuggestions(null);
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  const complexityColors: Record<string, string> = {
    "Low": "bg-green-100 text-green-700 dark:bg-green-700/30 dark:text-green-300",
    "Medium": "bg-yellow-100 text-yellow-700 dark:bg-yellow-700/30 dark:text-yellow-300",
    "High": "bg-red-100 text-red-700 dark:bg-red-700/30 dark:text-red-300",
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-card rounded-lg shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center">
            <BrainCircuit className="mr-2 h-5 w-5 text-primary" /> AI App Enhancement Advisor
          </DialogTitle>
          <DialogDescription>
            Get AI-powered ideas to make Habitual even better! Optionally, specify a focus area.
          </DialogDescription>
        </DialogHeader>

        <div className="py-3 px-1 space-y-3">
          <div>
            <Label htmlFor="focus-area" className="text-sm font-medium">
              Focus Area (Optional)
            </Label>
            <Input
              id="focus-area"
              value={focusArea}
              onChange={(e) => setFocusArea(e.target.value)}
              placeholder="e.g., User engagement, Gamification, New Features"
              className="bg-input/50 text-sm"
              disabled={isLoading}
            />
          </div>
          <Button onClick={handleGetSuggestions} disabled={isLoading} className="w-full">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {isLoading ? 'Brainstorming...' : 'Suggest Improvements'}
          </Button>
        </div>

        {error && (
          <div className="my-3 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-center">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {suggestions && suggestions.length > 0 && (
          <ScrollArea className="max-h-[45vh] mt-2 pr-3">
            <div className="space-y-3 py-1">
              <h3 className="text-md font-semibold text-primary mb-1.5">Suggested Enhancements:</h3>
              {suggestions.map((suggestion, index) => (
                <Card key={index} className="bg-input/30 shadow-sm">
                  <CardHeader className="pb-1.5 pt-2.5 px-3">
                    <CardTitle className="text-sm font-semibold flex items-center">
                      <Lightbulb className="mr-1.5 h-4 w-4 text-yellow-500"/>
                      {suggestion.suggestionTitle}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs space-y-1 px-3 pb-2.5">
                    <p className="text-muted-foreground leading-relaxed">{suggestion.suggestionDescription}</p>
                    <div className="flex flex-wrap gap-1.5 items-center pt-1 text-xs">
                       <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded-full font-medium text-xs", complexityColors[suggestion.complexity] || "bg-gray-100 text-gray-700")}>
                        Complexity: {suggestion.complexity}
                      </span>
                       <span className="inline-flex items-center px-1.5 py-0.5 rounded-full font-medium text-xs bg-blue-100 text-blue-700 dark:bg-blue-700/30 dark:text-blue-300">
                        Impact: {suggestion.potentialImpact}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
         {suggestions && suggestions.length === 0 && !isLoading && !error && (
            <p className="text-sm text-muted-foreground text-center py-4">No specific suggestions generated for this query. Try a different focus or a general request.</p>
        )}

        <DialogFooter className="pt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AppImprovementDialog;

