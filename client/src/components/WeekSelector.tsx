import { useState, useEffect } from "react";
import { format, isAfter } from "date-fns";
import { Calendar, ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [selectedWeekId, setSelectedWeekId] = useState(currentWeekId);
  
  useEffect(() => {
    if (weeksData?.weeks) {
      // Sort weeks by date - temporarily show all weeks for demonstration
      const sortedWeeks = [...weeksData.weeks].sort((a, b) => {
        // Sort by start date ascending
        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      });
      
      setWeeks(sortedWeeks);
      
      // If no week is selected, default to the first week
      if (sortedWeeks.length > 0) {
        const currentWeekIndex = sortedWeeks.findIndex(week => week.id === currentWeekId);
        if (currentWeekIndex === -1) {
          setSelectedWeekId(sortedWeeks[0].id);
          navigate(`/menu/${sortedWeeks[0].id}`);
        } else {
          setSelectedWeekId(currentWeekId);
        }
      }
    }
  }, [weeksData, currentWeekId, navigate]);
  
  const handleWeekChange = (weekId: string) => {
    setSelectedWeekId(weekId);
    navigate(`/menu/${weekId}`);
  };
  
  if (!weeks.length) {
    return <div className="flex items-center justify-center h-10">Loading available delivery weeks...</div>;
  }
  
  const selectedWeek = weeks.find(week => week.id === selectedWeekId) || weeks[0];
  const today = new Date();
  
  return (
    <div className="flex flex-col items-center mb-8">
      <div className="max-w-md w-full mx-auto">
        <label htmlFor="week-select" className="block text-sm font-medium text-gray-700 mb-1">
          Choose your delivery week
        </label>
        <Select value={selectedWeekId} onValueChange={handleWeekChange}>
          <SelectTrigger className="w-full bg-white border border-gray-300 rounded-lg py-3 px-4 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50">
            <div className="flex items-center">
              <Calendar size={16} className="mr-2 text-gray-500" />
              <SelectValue placeholder="Select a week" />
            </div>
          </SelectTrigger>
          <SelectContent>
            {weeks.map((week) => (
              <SelectItem key={week.id} value={week.id}>
                {week.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-2xl mx-auto mt-4 flex items-center">
        <svg className="w-5 h-5 text-yellow-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <h4 className="font-medium text-yellow-800">Order Deadline</h4>
          <p className="text-sm text-yellow-700">
            Place your order by {format(new Date(selectedWeek.orderDeadline), "EEEE, MMMM d 'at' h:mm a")} to receive this menu
          </p>
        </div>
      </div>
    </div>
  );
};

export default WeekSelector;
