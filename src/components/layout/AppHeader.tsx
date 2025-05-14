import type { FC } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

interface AppHeaderProps {
  onAddHabitClick: () => void;
}

const AppHeader: FC<AppHeaderProps> = ({ onAddHabitClick }) => {
  return (
    <header className="bg-card shadow-md sticky top-0 z-40">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block mr-2 text-primary align-text-bottom">
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
            <path d="m9 12 2 2 4-4"></path>
          </svg>
          Habitual
        </h1>
        <Button onClick={onAddHabitClick} variant="default" size="lg">
          <PlusCircle className="mr-2 h-5 w-5" />
          Add Habit
        </Button>
      </div>
    </header>
  );
};

export default AppHeader;
