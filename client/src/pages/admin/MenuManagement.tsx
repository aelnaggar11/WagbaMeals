import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import MenuEditor from "@/components/admin/MenuEditor";
import { User, Meal, Week } from "@shared/schema";
import { Plus } from "lucide-react";

const MenuManagement = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Check if user is admin
  const { data: user } = useQuery<User>({
    queryKey: ['/api/auth/me'],
  });
  
  const isAdmin = user?.isAdmin;
  
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
  
  // Set active week to current week when data is loaded
  useState(() => {
    if (weeksData?.weeks && !activeWeekId) {
      const currentWeek = weeksData.weeks.find(week => week.isActive);
      if (currentWeek) {
        setActiveWeekId(currentWeek.id);
      } else if (weeksData.weeks.length > 0) {
        setActiveWeekId(weeksData.weeks[0].id);
      }
    }
  });
  
  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center justify-center py-12">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">You don't have permission to access the menu management.</p>
          <Button onClick={() => navigate('/')}>Return to Home</Button>
        </div>
      </div>
    );
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
          <Button className="bg-primary hover:bg-primary/90 text-white">
            <Plus size={16} className="mr-2" />
            Add New Meal
          </Button>
        </div>
      </div>
      
      {/* Week Selection */}
      {weeksData?.weeks && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Select Week to Edit</CardTitle>
            <CardDescription>Choose a week to manage its menu</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs 
              value={activeWeekId?.toString() || ""}
              onValueChange={(value) => setActiveWeekId(parseInt(value))}
              className="w-full"
            >
              <TabsList className="w-full flex overflow-x-auto">
                {weeksData.weeks.map((week) => (
                  <TabsTrigger 
                    key={week.id} 
                    value={week.id.toString()}
                    className="flex-1"
                  >
                    {week.label}
                    {week.isActive && <span className="ml-2 text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full">Active</span>}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
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
