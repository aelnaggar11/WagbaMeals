import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { useToast } from "@/hooks/use-toast";
import MenuEditor from "@/components/admin/MenuEditor";
import { Admin, Meal, Week } from "@shared/schema";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MenuManagement = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Check if admin is authenticated
  const { data: admin, isLoading: adminLoading } = useQuery<Admin>({
    queryKey: ['/api/admin/auth/me'],
  });

  // Redirect unauthenticated users immediately instead of showing access denied
  useEffect(() => {
    if (!adminLoading && !admin) {
      navigate('/admin/login');
    }
  }, [admin, adminLoading, navigate]);
  
  // Active week for menu editing
  const [activeWeekId, setActiveWeekId] = useState<number | null>(null);
  
  // Fetch weeks data
  const { data: weeksData } = useQuery<{ weeks: Week[] }>({
    queryKey: ['/api/weeks'],
  });
  
  // Fetch meals data
  const { data: allMealsData } = useQuery<{ meals: Meal[] }>({
    queryKey: ['/api/admin/meals'],
    queryFn: async () => {
      const meals = await fetch('/api/meals').then(res => res.json());
      return meals;
    }
  });
  
  // Set active week to first future week when data is loaded
  useEffect(() => {
    if (weeksData?.weeks && !activeWeekId) {
      const now = new Date();
      const futureWeeks = weeksData.weeks
        .filter(week => new Date(week.startDate) > now)
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
      
      if (futureWeeks.length > 0) {
        setActiveWeekId(futureWeeks[0].id);
      } else if (weeksData.weeks.length > 0) {
        // If no future weeks, show the most recent week
        const sortedWeeks = weeksData.weeks.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
        setActiveWeekId(sortedWeeks[0].id);
      }
    }
  }, [weeksData, activeWeekId]);

  // Show only current and future weeks for admin editing, sorted by start date
  const now = new Date();
  const editableWeeks = weeksData?.weeks
    ? weeksData.weeks
        .filter(week => {
          const weekStart = new Date(week.startDate);
          const today = new Date();
          today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
          return weekStart >= today; // Show weeks that start today or in the future
        })
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    : [];

  // Helper function to format week dates as "Sat 5 July"
  const formatWeekLabel = (week: Week) => {
    const startDate = new Date(week.startDate);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    
    const dayName = dayNames[startDate.getDay()];
    const dayNumber = startDate.getDate();
    const monthName = monthNames[startDate.getMonth()];
    
    return `${dayName} ${dayNumber} ${monthName}`;
  };

  // Determine if a week is live (visible to users) using the same logic as user WeekSelector
  const isWeekLive = (week: Week) => {
    const now = new Date();
    const fourWeeksFromNow = new Date(now.getTime() + (4 * 7 * 24 * 60 * 60 * 1000));
    const orderDeadline = new Date(week.orderDeadline);
    const startDate = new Date(week.startDate);
    
    // A week is live if users can see it (deadline hasn't passed, is selectable, and within 4 weeks)
    return orderDeadline > now && week.isSelectable && startDate <= fourWeeksFromNow;
  };

  const currentWeekIndex = editableWeeks.findIndex(week => week.id === activeWeekId);
  const currentWeek = editableWeeks[currentWeekIndex];
  
  const canGoPrevious = currentWeekIndex > 0;
  const canGoNext = currentWeekIndex < editableWeeks.length - 1;

  const goToPreviousWeek = () => {
    if (canGoPrevious) {
      setActiveWeekId(editableWeeks[currentWeekIndex - 1].id);
    }
  };

  const goToNextWeek = () => {
    if (canGoNext) {
      setActiveWeekId(editableWeeks[currentWeekIndex + 1].id);
    }
  };
  
  // Show loading state while checking authentication
  if (adminLoading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-gray-600">Loading menu management...</p>
        </div>
      </div>
    );
  }

  // Return null while redirecting to avoid showing content briefly
  if (!admin) {
    return null;
  }
  
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Menu Management</h1>
          <p className="text-gray-600">Manage meals and weekly menus</p>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => navigate('/admin')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
      
      {/* Week Navigation */}
      {editableWeeks.length > 0 && currentWeek && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Week Editor</CardTitle>
            <CardDescription>Navigate between weeks to manage menus (up to 8 weeks in advance)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
              <Button
                variant="outline"
                size="icon"
                onClick={goToPreviousWeek}
                disabled={!canGoPrevious}
                className="h-10 w-10"
              >
                <ChevronLeft size={16} />
              </Button>
              
              <div className="flex flex-col items-center text-center min-w-0 flex-1 mx-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {formatWeekLabel(currentWeek)}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  {isWeekLive(currentWeek) && (
                    <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-medium">
                      Live Week
                    </span>
                  )}
                </div>
              </div>
              
              <Button
                variant="outline"
                size="icon"
                onClick={goToNextWeek}
                disabled={!canGoNext}
                className="h-10 w-10"
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Menu Editor */}
      {activeWeekId && (
        <MenuEditor weekId={activeWeekId} />
      )}
    </div>
  );
};

export default MenuManagement;
