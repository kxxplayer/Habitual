// Note: This component needs to be saved as src/components/habits/HabitItem.tsx
// to replace the existing simplified version

import React from 'react';

interface HabitItemProps {
  habit: any;
  onToggleComplete: (habitId: string, date: string) => void;
  onDelete: (habitId: string) => void;
  onEdit: (habit: any) => void;
  onReschedule: (habit: any) => void;
  onOpenDetailView?: (habit: any) => void;
  isCompleted: boolean;
  currentDate: string;
}

// Helper function to get habit icon
const getHabitIcon = (habitName: string): string => {
  const nameLower = habitName.toLowerCase();
  if (nameLower.includes('gym') || nameLower.includes('workout')) return '🏋️';
  if (nameLower.includes('sql') || nameLower.includes('code')) return '💻';
  if (nameLower.includes('water') || nameLower.includes('drink')) return '💧';
  if (nameLower.includes('walk') || nameLower.includes('run')) return '🚶';
  if (nameLower.includes('read') || nameLower.includes('book')) return '📚';
  if (nameLower.includes('meditate') || nameLower.includes('mindfulness')) return '🧘';
  if (nameLower.includes('learn') || nameLower.includes('study')) return '📝';
  if (nameLower.includes('sleep') || nameLower.includes('bed')) return '🛏️';
  if (nameLower.includes('journal') || nameLower.includes('write')) return '✍️';
  if (nameLower.includes('coding') || nameLower.includes('programming')) return '👨‍💻';
  return '✨'; // Default icon
};

const HabitItem: React.FC<HabitItemProps> = ({
  habit,
  onToggleComplete,
  onDelete,
  onEdit,
  onReschedule,
  onOpenDetailView,
  isCompleted,
  currentDate,
}) => {
  const [showMenu, setShowMenu] = React.useState(false);

  const handleToggleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleComplete(habit.id, currentDate);
  };

  const handleOpenDetails = () => {
    if (onOpenDetailView) {
      onOpenDetailView(habit);
    }
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    onEdit(habit);
  };

  const handleReschedule = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    onReschedule(habit);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    onDelete(habit.id);
  };

  // Close menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => setShowMenu(false);
    if (showMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showMenu]);

  return (
    <div 
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] ${isCompleted ? 'opacity-75' : ''}`}
      onClick={handleOpenDetails}
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '8px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          {/* Habit Icon */}
          <span style={{ fontSize: '24px' }}>{getHabitIcon(habit.name)}</span>
          
          {/* Habit Name */}
          <span style={{
            fontSize: '16px',
            fontWeight: '500',
            color: isCompleted ? '#9ca3af' : '#111827',
            textDecoration: isCompleted ? 'line-through' : 'none'
          }}>
            {habit.name}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Completion Checkbox */}
          <button
            onClick={handleToggleComplete}
            style={{
              padding: '4px',
              borderRadius: '50%',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            aria-label={isCompleted ? "Mark as incomplete" : "Mark as complete"}
          >
            {isCompleted ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="#10b981" />
                <path d="M8 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="#9ca3af" strokeWidth="2" />
              </svg>
            )}
          </button>

          {/* More Options Menu */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={handleMenuClick}
              style={{
                padding: '6px',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="5" r="1" fill="#6b7280" />
                <circle cx="12" cy="12" r="1" fill="#6b7280" />
                <circle cx="12" cy="19" r="1" fill="#6b7280" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <div style={{
                position: 'absolute',
                right: 0,
                top: '100%',
                marginTop: '4px',
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                minWidth: '150px',
                zIndex: 50
              }}>
                <button
                  onClick={handleEdit}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#374151'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  Edit Habit
                </button>
                <button
                  onClick={handleReschedule}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#374151'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  Reschedule
                </button>
                <div style={{ height: '1px', backgroundColor: '#e5e7eb', margin: '4px 0' }} />
                <button
                  onClick={handleDelete}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#ef4444'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#fef2f2';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  Delete Habit
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Optional: Add habit details like time or duration */}
      {(habit.specificTime || habit.durationMinutes || habit.durationHours) && (
        <div style={{ 
          marginTop: '8px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          fontSize: '12px',
          color: '#6b7280'
        }}>
          {habit.specificTime && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              🕐 {habit.specificTime}
            </span>
          )}
          {(habit.durationHours || habit.durationMinutes) && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              ⏱️ {habit.durationHours ? `${habit.durationHours}h` : ''} 
              {habit.durationMinutes ? `${habit.durationMinutes}m` : ''}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default HabitItem;