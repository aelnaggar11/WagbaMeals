import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Order, User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDate, getStatusClass } from "@/lib/utils";
import { useLocation } from "wouter";
import FixedMealSelector from "@/pages/FixedMealSelector";

// Enhanced skip/unskip helper function that handles UI updates without page reloads
const skipOrder = async (
  orderId: number, 
  weekId: number,
  skip: boolean, 
  toast: any,
  queryClient: any
): Promise<boolean> => {
  try {
    // 1. Make API request
    const response = await fetch(`/api/orders/${orderId}/skip`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skip }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update order');
    }
    
    // 2. Show success message
    toast({
      title: skip ? "Delivery Skipped" : "Delivery Restored",
      description: skip 
        ? "Your delivery has been skipped. You can unskip it anytime before the order deadline." 
        : "Your delivery has been restored. You can now edit your meal selections."
    });
    
    // 3. Update local cache with new order status
    queryClient.setQueryData(['/api/user/upcoming-meals'], (oldData: any) => {
      if (!oldData?.upcomingMeals) return oldData;
      
      return {
        ...oldData,
        upcomingMeals: oldData.upcomingMeals.map((week: any) => {
          if (week.weekId === weekId) {
            return {
              ...week,
              isSkipped: skip,
              canSkip: !skip,
              canUnskip: skip
            };
          }
          return week;
        })
      };
    });
    
    // 4. Refetch in background to ensure data consistency
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/upcoming-meals'] });
    }, 500);
    
    return true;
  } catch (error) {
    console.error('Error skipping order:', error);
    
    toast({
      title: "Error",
      description: `There was an error ${skip ? "skipping" : "restoring"} your delivery. Please try again.`,
      variant: "destructive"
    });
    
    return false;
  }
};

const AccountPage = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Single state variable to track which week is being processed
  const [processingWeekId, setProcessingWeekId] = useState<number | null>(null);
  
  // Function to handle skipping/unskipping deliveries WITHOUT page reload
  const handleSkipToggle = async (orderId: number, weekId: number, skip: boolean) => {
    try {
      // Set loading state
      setProcessingWeekId(weekId);
      
      // Call API with credentials to maintain session
      const response = await fetch(`/api/orders/${orderId}/skip`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skip }),
        credentials: 'same-origin'
      });
      
      if (!response.ok) {
        throw new Error(skip ? 'Failed to skip delivery' : 'Failed to restore delivery');
      }
      
      // Success message
      toast({
        title: skip ? "Delivery Skipped" : "Delivery Restored",
        description: skip 
          ? "Your delivery has been skipped. You can unskip it anytime before the order deadline."
          : "Your delivery has been restored. You can now edit your meal selections."
      });
      
      // Force refetch data without page reload
      await queryClient.invalidateQueries({ queryKey: ['/api/user/upcoming-meals'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      
      // Update local processing state
      setProcessingWeekId(null);
      
    } catch (error) {
      console.error(`Error ${skip ? 'skipping' : 'unskipping'} delivery:`, error);
      toast({
        title: "Error",
        description: `Failed to ${skip ? 'skip' : 'restore'} delivery. Please try again.`,
        variant: "destructive"
      });
      setProcessingWeekId(null);
    }
  };

  // User profile
  const { data: user } = useQuery<User>({
    queryKey: ['/api/auth/me'],
  });

  const { data: profile } = useQuery<{
    name: string;
    email: string;
    phone: string;
    address: string;
  }>({
    queryKey: ['/api/user/profile'],
    enabled: !!user,
  });

  // Orders
  const { data: orderData } = useQuery<{ orders: Order[] }>({
    queryKey: ['/api/orders'],
    enabled: !!user,
  });

  // Upcoming meals
  const { data: upcomingMealsData } = useQuery<{ 
    upcomingMeals: Array<{
      orderId: number | null;
      weekId: number;
      weekLabel: string;
      deliveryDate: string;
      orderDeadline: string;
      items: Array<{
        id: number;
        mealId: number;
        portionSize: string;
        meal: {
          id: number;
          title: string;
          description: string;
          imageUrl: string;
          calories: number;
          proteins: number;
          carbs: number;
          fats: number;
        }
      }>;
      isSkipped: boolean;
      canEdit: boolean;
      canSkip: boolean;
      canUnskip: boolean;
      mealCount: number;
    }>
  }>({
    queryKey: ['/api/user/upcoming-meals'],
    enabled: !!user,
    onSuccess: (data) => {
      // Initialize our local state from server data
      const newSkippedWeeks: {[key: number]: boolean} = {};
      
      data?.upcomingMeals.forEach(week => {
        newSkippedWeeks[week.weekId] = week.isSkipped;
      });
      
      setSkippedWeeks(newSkippedWeeks);
    }
  });

  // State for tracking selected week in upcoming meals view
  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    street: "",
    building: "",
    apartment: "",
    area: "",
    landmark: ""
  });

  // Update form data when profile data is loaded
  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || "",
        email: profile.email || "",
        phone: profile.phone || "",
        street: "",
        building: "",
        apartment: "",
        area: "",
        landmark: ""
      });

      // Parse address if available
      if (profile.address) {
        try {
          const addressObj = JSON.parse(profile.address);
          setFormData(prev => ({
            ...prev,
            street: addressObj.street || "",
            building: addressObj.building || "",
            apartment: addressObj.apartment || "",
            area: addressObj.area || "",
            landmark: addressObj.landmark || ""
          }));
        } catch (e) {
          console.error("Error parsing address:", e);
        }
      }
    }
  }, [profile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveProfile = async () => {
    setIsUpdating(true);

    try {
      // Format address object
      const address = JSON.stringify({
        street: formData.street,
        building: formData.building,
        apartment: formData.apartment,
        area: formData.area,
        landmark: formData.landmark
      });

      await apiRequest('PATCH', '/api/user/profile', {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address
      });

      // Invalidate profile query to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });

      toast({
        title: "Profile updated",
        description: "Your profile information has been updated successfully."
      });

      setIsEditing(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "There was an error updating your profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiRequest('POST', '/api/auth/logout', {});
      queryClient.invalidateQueries();
      navigate('/');
    } catch (error) {
      toast({
        title: "Error",
        description: "There was an error logging out. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle skipping/unskipping a delivery with week-based status
  const handleSkipDelivery = async (weekId: number, skip: boolean) => {
    try {
      // Set loading state for this week
      setProcessingWeekId(weekId);

      // Make API call to update the week status
      const response = await apiRequest('PATCH', `/api/weeks/${weekId}/skip`, { skip });
      
      if (!response.status || response.status >= 400) {
        throw new Error('Failed to update delivery status');
      }

      // Force immediate refetch
      await queryClient.refetchQueries({ 
        queryKey: ['/api/user/upcoming-meals'],
        exact: true 
      });

      toast({
        title: skip ? "Delivery Skipped" : "Delivery Restored",
        description: skip 
          ? "Your delivery has been skipped. You can unskip it anytime before the order deadline." 
          : "Your delivery has been restored. You can now edit your meal selections."
      });
      
      // Reset loading state
      setProcessingWeekId(null);
    } catch (error) {
      console.error('Error updating delivery status:', error);
      toast({
        title: "Error",
        description: "Failed to update your delivery status. Please try again.",
        variant: "destructive"
      });
      // Reset loading state
      setProcessingWeekId(null);
    }
  };
  
  // Function to scroll to meal selection section if we unskipped
  const scrollToMealSelection = (weekId: number) => {
        const weekId = upcomingMealsData?.upcomingMeals.find(week => week.orderId === orderId)?.weekId;
        if (weekId) {
          setTimeout(() => {
            document.getElementById(`meal-selection-${weekId}`)?.scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            });
          }, 100);
        }
      }
    } catch (error) {
      console.error('Error updating delivery status:', error);
      
      // Refresh data from server to ensure UI is consistent
      queryClient.invalidateQueries({ queryKey: ['/api/user/upcoming-meals'] });
      
      toast({
        title: "Error",
        description: "There was an error updating your delivery status. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle meal selection
  const handleAddMeal = async (meal: Meal) => {
    // Check if maximum meals already selected
    if (selectedMeals.length >= mealCount) {
      toast({
        title: "Maximum meals reached",
        description: `You can only select ${mealCount} meals for this week.`,
        variant: "destructive"
      });
      return;
    }

    const currentWeek = upcomingMealsData?.upcomingMeals.find(week => week.weekId === selectedWeekId);
    if (!currentWeek) return;

    // Default to standard portion
    const newMeal: OrderItem = {
      mealId: meal.id,
      portionSize: "standard"
    };

    // Update local state
    setSelectedMeals([...selectedMeals, newMeal]);

    try {
      // If order exists, add to it
      if (currentWeek.orderId) {
        await apiRequest('POST', `/api/orders/${currentWeek.orderId}/items`, newMeal);
      } else {
        // Create new order with this meal
        await apiRequest('POST', '/api/orders', {
          weekId: selectedWeekId,
          mealCount,
          defaultPortionSize: "standard",
          items: [newMeal]
        });
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/user/upcoming-meals'] });

      toast({
        title: "Meal added",
        description: `${meal.title} has been added to your selections.`
      });
    } catch (error) {
      // Revert local state
      setSelectedMeals(selectedMeals);

      toast({
        title: "Error",
        description: "There was an error updating your meal selections. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleRemoveMeal = async (meal: Meal) => {
    const currentWeek = upcomingMealsData?.upcomingMeals.find(week => week.weekId === selectedWeekId);
    if (!currentWeek || !currentWeek.orderId) return;

    // Find the meal in selections (get the first one if there are duplicates)
    const mealIndex = selectedMeals.findIndex(item => item.mealId === meal.id);
    if (mealIndex === -1) return;

    // Update local state
    const updatedMeals = [...selectedMeals];
    updatedMeals.splice(mealIndex, 1);
    setSelectedMeals(updatedMeals);

    try {
      // Find the actual order item ID from the week data
      const orderItemIndex = currentWeek.items.findIndex(item => item.mealId === meal.id);
      if (orderItemIndex !== -1) {
        const orderItemId = currentWeek.items[orderItemIndex].id;

        // Remove from order
        await apiRequest('DELETE', `/api/orders/${currentWeek.orderId}/items/${orderItemId}`);

        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['/api/user/upcoming-meals'] });

        toast({
          title: "Meal removed",
          description: `${meal.title} has been removed from your selections.`
        });
      }
    } catch (error) {
      // Revert local state
      setSelectedMeals(selectedMeals);

      toast({
        title: "Error",
        description: "There was an error updating your meal selections. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Check if a meal is already selected
  const getMealCount = (mealId: number): number => {
    return selectedMeals.filter(item => item.mealId === mealId).length;
  };

  // State for meals of the selected week
  const [availableMeals, setAvailableMeals] = useState<Meal[]>([]);
  const [selectedMeals, setSelectedMeals] = useState<OrderItem[]>([]);
  const [isLoadingMeals, setIsLoadingMeals] = useState(false);
  const [mealCount, setMealCount] = useState(0);

  // Set initial selected week when data is loaded
  useEffect(() => {
    if (upcomingMealsData?.upcomingMeals && upcomingMealsData.upcomingMeals.length > 0 && !selectedWeekId) {
      setSelectedWeekId(upcomingMealsData.upcomingMeals[0].weekId);
    }
  }, [upcomingMealsData, selectedWeekId]);

  // Fetch meals for the selected week
  useEffect(() => {
    const fetchMealsForWeek = async () => {
      if (!selectedWeekId) return;

      setIsLoadingMeals(true);
      try {
        const response: any = await apiRequest('GET', `/api/menu/${selectedWeekId}`);
        setAvailableMeals(response.meals || []);

        // Get current meal selections for this week from upcoming meals data
        const currentWeek = upcomingMealsData?.upcomingMeals.find(week => week.weekId === selectedWeekId);
        if (currentWeek) {
          setMealCount(currentWeek.mealCount);

          // Convert week items to OrderItems
          const orderItems: OrderItem[] = currentWeek.items.map(item => ({
            mealId: item.mealId,
            portionSize: item.portionSize as PortionSize
          }));

          setSelectedMeals(orderItems);
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load meals for this week.",
          variant: "destructive"
        });
      } finally {
        setIsLoadingMeals(false);
      }
    };

    fetchMealsForWeek();
  }, [selectedWeekId, upcomingMealsData, toast]);

  if (!user || !profile) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center justify-center py-12">
          <h1 className="text-2xl font-bold mb-4">Please Log In</h1>
          <p className="text-gray-600 mb-6">You need to be logged in to view this page.</p>
          <Button onClick={() => navigate('/auth')}>Log In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-6xl mx-auto">
        <Tabs defaultValue="upcoming" value="upcoming" className="space-y-8">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming Meals</TabsTrigger>
            <TabsTrigger value="orders">Order History</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-primary mb-6">Upcoming Deliveries</h2>

              {upcomingMealsData?.upcomingMeals && upcomingMealsData.upcomingMeals.length > 0 ? (
                <div className="space-y-6">
                  {/* Week selector */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-8">
                    {upcomingMealsData.upcomingMeals.map((week) => (
                      <button
                        key={week.weekId}
                        onClick={() => setSelectedWeekId(week.weekId)}
                        className={`py-4 px-2 text-center rounded-md transition-colors ${
                          selectedWeekId === week.weekId 
                            ? 'border-2 border-primary bg-primary/5' 
                            : 'border border-gray-200 hover:bg-gray-50'
                        } ${week.isSkipped ? 'opacity-50' : ''}`}
                      >
                        <div className="font-medium">
                          {week.weekLabel.replace(/\d{4}/, '').trim()}
                        </div>
                        {week.isSkipped && (
                          <div className="text-sm text-gray-500 mt-1">Skipped</div>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Selected week details */}
                  {selectedWeekId && upcomingMealsData.upcomingMeals.map(week => {
                    if (week.weekId !== selectedWeekId) return null;

                    const deadline = new Date(week.orderDeadline);
                    const deadlineFormatted = deadline.toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric'
                    });

                    return (
                      <div key={week.weekId} className="space-y-6">
                        {/* Order deadline notice */}
                        <div className={`p-4 rounded-lg ${week.isSkipped ? 'bg-gray-100' : 'bg-red-50'}`}>
                          <div className="flex items-start">
                            <div className={`mr-3 ${week.isSkipped ? 'text-gray-500' : 'text-red-500'}`}>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div>
                              {week.isSkipped ? (
                                <p className="font-medium text-gray-600">This delivery is skipped</p>
                              ) : (
                                <>
                                  <p className="font-medium text-gray-800">Order can be changed until {deadlineFormatted}</p>
                                  <p className="text-sm text-gray-600 mt-1">Make your meal selections before the deadline</p>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex space-x-4">
                          {week.canEdit && !week.isSkipped && (
                            <Button 
                              onClick={() => {
                                // Scroll to the meal selection section instead of navigating
                                document.getElementById(`meal-selection-${week.weekId}`)?.scrollIntoView({ 
                                  behavior: 'smooth',
                                  block: 'center' 
                                });
                              }}
                              className="flex items-center"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                              Edit Delivery
                            </Button>
                          )}

                          {week.orderId && week.canSkip && !week.isSkipped && (
                            <Button 
                              variant="outline" 
                              disabled={processingWeekId === week.weekId}
                              onClick={() => handleSkipToggle(week.orderId as number, week.weekId, true)}
                              className="flex items-center"
                            >
                              {processingWeekId === week.weekId ? (
                                <>
                                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                  Skip Delivery
                                </>
                              )}
                            </Button>
                          )}

                          {week.orderId && week.canUnskip && week.isSkipped && (
                            <Button 
                              variant="outline" 
                              disabled={processingWeekId === week.weekId}
                              onClick={() => handleSkipToggle(week.orderId as number, week.weekId, false)}
                              className="flex items-center"
                            >
                              {processingWeekId === week.weekId ? (
                                <>
                                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                  Unskip Delivery
                                </>
                              )}
                            </Button>
                          )}
                        </div>

                        {/* Meal selection directly on account page */}
                        {!week.isSkipped && (
                          <div 
                            id={`meal-selection-${week.weekId}`} 
                            className="border rounded-lg p-6 mt-4"
                          >
                            <FixedMealSelector
                              weekId={week.weekId}
                              orderId={week.orderId}
                              mealCount={week.mealCount}
                              initialItems={week.items}
                            />
                          </div>
                        )}
                        
                        {/* Old meal selection UI - now removed */}
                        {false && (
                          <div className="border rounded-lg p-6">
                            <div className="flex justify-between items-center mb-6">
                              <h3 className="text-lg font-semibold">Select Your Meals</h3>
                              <span className="bg-gray-100 px-3 py-1 rounded-full text-sm font-medium">
                                {selectedMeals.length} of {week.mealCount} selected
                              </span>
                            </div>

                            {isLoadingMeals ? (
                              <div className="py-8 flex justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                              </div>
                            ) : (
                              <>
                                {Array.isArray(availableMeals) && availableMeals.length > 0 ? (
                                  <div className="space-y-4">
                                    {availableMeals.map((meal) => {
                                      const count = getMealCount(meal.id);
                                      const isSelected = count > 0;
                                      const isMaxReached = selectedMeals.length >= week.mealCount;

                                      return (
                                        <div key={meal.id} className="border rounded-lg overflow-hidden">
                                          <div className="flex items-center p-4">
                                            <div className="w-20 h-20 bg-gray-100 rounded-md overflow-hidden mr-4">
                                              {meal.imageUrl && (
                                                <img 
                                                  src={meal.imageUrl} 
                                                  alt={meal.title} 
                                                  className="w-full h-full object-cover"
                                                />
                                              )}
                                            </div>

                                            <div className="flex-1">
                                              <h4 className="font-medium text-lg">{meal.title}</h4>
                                              <div className="flex items-center mt-1 text-sm text-gray-600">
                                                <span>{meal.calories || "0"} cal</span>
                                                <span className="mx-2">•</span>
                                                <span>{meal.protein || "0"}g protein</span>
                                              </div>
                                            </div>

                                            <div className="flex items-center">
                                              <button
                                                onClick={() => handleRemoveMeal(meal)}
                                                className={`p-2 rounded-full ${isSelected ? 'text-red-500 hover:bg-red-50' : 'text-gray-300 cursor-not-allowed'}`}
                                                disabled={!isSelected}
                                              >
                                                <MinusCircle size={24} />
                                              </button>

                                              <span className="w-8 text-center font-medium">
                                                {count}
                                              </span>

                                              <button
                                                onClick={() => handleAddMeal(meal)}
                                                className={`p-2 rounded-full ${(!isMaxReached || isSelected) ? 'text-green-500 hover:bg-green-50' : 'text-gray-300 cursor-not-allowed'}`}
                                                disabled={isMaxReached && !isSelected}
                                              >
                                                <PlusCircle size={24} />
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="text-center py-8">
                                    <p className="text-gray-500">No meals available for this week.</p>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 border rounded-lg">
                  <div className="mb-4 text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium mb-2">No upcoming meal deliveries</h3>
                  <p className="text-gray-500 mb-6">You don't have any upcoming meal deliveries scheduled</p>
                  <Button onClick={() => navigate('/meal-plans')}>Choose a Meal Plan</Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="orders" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Order History</CardTitle>
                <CardDescription>View all your past orders</CardDescription>
              </CardHeader>
              <CardContent>
                {orderData?.orders && orderData.orders.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Meals</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Delivery Date</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderData.orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">#{order.id}</TableCell>
                          <TableCell>{formatDate(order.createdAt || new Date())}</TableCell>
                          <TableCell>{order.mealCount || 0} meals</TableCell>
                          <TableCell>{`EGP ${(order.total || 0).toFixed(0)}`}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusClass(order.status || '')}`}>
                              {order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : 'Unknown'}
                            </span>
                          </TableCell>
                          <TableCell>{order.deliveryDate ? formatDate(order.deliveryDate) : 'Not scheduled'}</TableCell>
                          <TableCell>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => navigate(`/menu/${order.weekId}?view=true`)}
                            >
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-gray-500 mb-4">You don't have any orders yet.</p>
                    <Button onClick={() => navigate('/menu/current')}>Browse Menu</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Manage your personal details and delivery address</CardDescription>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="pt-4 border-t">
                      <h3 className="text-lg font-medium mb-4">Delivery Address</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="street">Street Address</Label>
                          <Input
                            id="street"
                            name="street"
                            value={formData.street}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="building">Building Number</Label>
                          <Input
                            id="building"
                            name="building"
                            value={formData.building}
                            onChange={handleInputChange}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="space-y-2">
                          <Label htmlFor="apartment">Apartment (Optional)</Label>
                          <Input
                            id="apartment"
                            name="apartment"
                            value={formData.apartment}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="area">Area/District</Label>
                          <Input
                            id="area"
                            name="area"
                            value={formData.area}
                            onChange={handleInputChange}
                          />
                        </div>
                      </div>

                      <div className="mt-4 space-y-2">
                        <Label htmlFor="landmark">Landmark (Optional)</Label>
                        <Input
                          id="landmark"
                          name="landmark"
                          value={formData.landmark}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>

                    <div className="flex gap-4 mt-4">
                      <Button 
                        onClick={handleSaveProfile}
                        disabled={isUpdating}
                      >
                        {isUpdating ? "Saving..." : "Save Changes"}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setIsEditing(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Name</h3>
                        <p>{profile.name || "Not provided"}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Email</h3>
                        <p>{profile.email}</p>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Phone</h3>
                      <p>{profile.phone || "Not provided"}</p>
                    </div>

                    <div className="pt-4 border-t">
                      <h3 className="text-lg font-medium mb-2">Delivery Address</h3>
                      {profile.address ? (
                        <div>
                          {(() => {
                            try {
                              const addr = JSON.parse(profile.address);
                              return (
                                <div className="space-y-1">
                                  <p>
                                    {addr.building} {addr.street}
                                    {addr.apartment && `, Apt ${addr.apartment}`}
                                  </p>
                                  <p>{addr.area}</p>
                                  {addr.landmark && <p>Landmark: {addr.landmark}</p>}
                                </div>
                              );
                            } catch (e) {
                              return <p>{profile.address}</p>;
                            }
                          })()}
                        </div>
                      ) : (
                        <p className="text-gray-500">No address saved</p>
                      )}
                    </div>

                    <div className="flex gap-4 mt-4">
                      <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
                      <Button variant="outline" onClick={handleLogout}>Logout</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AccountPage;