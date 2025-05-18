import { useState, useEffect } from "react";
import { format, addDays, startOfWeek, endOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

interface WeekSelectorProps {
  currentWeekId: string;
}

interface Week {
  id: string;
  label: string;
  startDate: Date;
  endDate: Date;
  orderDeadline: Date;
  isSelectable: boolean;
}

const WeekSelector = ({ currentWeekId }: WeekSelectorProps) => {
  const [, navigate] = useLocation();
  
  // Fetch available weeks from the server
  const { data: weeksData } = useQuery<{ weeks: Week[] }>({
    queryKey: ['/api/weeks'],
  });
  
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0);
  
  useEffect(() => {
    if (weeksData?.weeks) {
      setWeeks(weeksData.weeks);
      const index = weeksData.weeks.findIndex(week => week.id === currentWeekId);
      if (index !== -1) {
        setCurrentWeekIndex(index);
      }
    }
  }, [weeksData, currentWeekId]);
  
  const handlePreviousWeek = () => {
    if (currentWeekIndex > 0) {
      const newIndex = currentWeekIndex - 1;
      setCurrentWeekIndex(newIndex);
      navigate(`/menu/${weeks[newIndex].id}`);
    }
  };
  
  const handleNextWeek = () => {
    if (currentWeekIndex < weeks.length - 1) {
      const newIndex = currentWeekIndex + 1;
      setCurrentWeekIndex(newIndex);
      navigate(`/menu/${weeks[newIndex].id}`);
    }
  };
  
  if (!weeks.length || currentWeekIndex < 0 || currentWeekIndex >= weeks.length) {
    return <div className="flex items-center justify-center h-10">Loading...</div>;
  }
  
  const currentWeek = weeks[currentWeekIndex];
  const isPreviousDisabled = currentWeekIndex === 0;
  const isNextDisabled = currentWeekIndex === weeks.length - 1;
  
  // Check if the order deadline has passed
  const hasDeadlinePassed = new Date() > currentWeek.orderDeadline;
  
  return (
    <div className="flex flex-col items-center mb-8">
      <div className="flex items-center justify-center">
        <button 
          className={`text-gray-400 hover:text-primary focus:outline-none ${isPreviousDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={handlePreviousWeek}
          disabled={isPreviousDisabled}
        >
          <ChevronLeft size={24} />
        </button>
        <div className="mx-4 px-6 py-2 bg-secondary rounded-full font-medium flex items-center">
          <Calendar size={16} className="mr-2" />
          {currentWeek.label}
        </div>
        <button 
          className={`text-gray-400 hover:text-primary focus:outline-none ${isNextDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={handleNextWeek}
          disabled={isNextDisabled}
        >
          <ChevronRight size={24} />
        </button>
      </div>
      
      {hasDeadlinePassed ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-2xl mx-auto mt-4 flex items-center">
          <svg className="w-5 h-5 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="font-medium text-red-800">Order Deadline Passed</h4>
            <p className="text-sm text-red-700">
              The deadline for this week has passed. Your default meal selection will be applied.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-2xl mx-auto mt-4 flex items-center">
          <svg className="w-5 h-5 text-yellow-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="font-medium text-yellow-800">Order Deadline</h4>
            <p className="text-sm text-yellow-700">
              Place your order by {format(currentWeek.orderDeadline, "EEEE, MMMM d 'at' h:mm a")} to receive this menu
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeekSelector;
