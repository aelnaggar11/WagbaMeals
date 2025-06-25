import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Order, User, Meal, OrderItem, PortionSize } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDate, getStatusClass } from "@/lib/utils";
import { useLocation } from "wouter";
import FixedMealSelector from "@/pages/FixedMealSelector";

const AccountPage = () => {
  const [location, navigate] = useLocation();
  const { toast } = useToast();

  // ALL STATE AND HOOKS MUST BE DECLARED AT THE TOP LEVEL - NO CONDITIONAL HOOKS
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoadingMeals, setIsLoadingMeals] = useState(false);
  const [processingWeekId, setProcessingWeekId] = useState<number | null>(null);
  const [editingDelivery, setEditingDelivery] = useState<{
    weekId: number;
    currentMealCount: number;
    currentPortionSize: string;
  } | null>(null);
  const [editForm, setEditForm] = useState({
    mealCount: 0,
    portionSize: 'standard' as 'standard' | 'large' | 'mixed',
    applyToFuture: false
  });
  const [editingPayment, setEditingPayment] = useState<{
    weekId: number;
    orderId: number;
    currentPaymentMethod: string | null;
  } | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    paymentMethod: 'credit_card' as 'credit_card' | 'cash' | 'bank_transfer',
    applyToFuture: false
  });
  const [localUpcomingMeals, setLocalUpcomingMeals] = useState<any>(null);
  const [availableMeals, setAvailableMeals] = useState<Meal[]>([]);
  const [selectedMeals, setSelectedMeals] = useState<OrderItem[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(null);
  const [mealCount, setMealCount] = useState(0);
  const [isRefreshingWeekData, setIsRefreshingWeekData] = useState(false);
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

  // ALL QUERIES MUST BE DECLARED BEFORE ANY CONDITIONAL LOGIC
  const { data: currentUser, isLoading: isUserLoading } = useQuery<User | null>({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
    retry: 1
  });

  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['/api/user/profile'],
    enabled: !!currentUser
  });

  const { data: ordersData } = useQuery({
    queryKey: ['/api/orders'],
    enabled: !!currentUser
  });

  const { data: weeksData } = useQuery({
    queryKey: ['/api/weeks'],
    enabled: !!currentUser
  });

  const { data: upcomingMealsData, isLoading: isLoadingUpcomingMeals, refetch: refetchUpcomingMeals } = useQuery({
    queryKey: ['/api/user/upcoming-meals'],
    enabled: !!currentUser,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 1000, // Consider data stale after 1 second
    refetchInterval: false
  });

  // ALL useEffect HOOKS MUST BE DECLARED BEFORE CONDITIONAL LOGIC
  useEffect(() => {
    if (!isUserLoading && !currentUser) {
      navigate('/auth?returnTo=' + encodeURIComponent(location));
    }
  }, [isUserLoading, currentUser, navigate, location]);

  // Auto-select first non-skipped week when data loads
  useEffect(() => {
    console.log('Auto-selection check:', {
      hasData: !!(upcomingMealsData as any)?.upcomingMeals,
      dataLength: (upcomingMealsData as any)?.upcomingMeals?.length,
      selectedWeekId: selectedWeekId
    });
    
    if ((upcomingMealsData as any)?.upcomingMeals && (upcomingMealsData as any).upcomingMeals.length > 0 && !selectedWeekId) {
      console.log('Auto-selecting first available week...');
      
      // Always update local state with fresh server data
      setLocalUpcomingMeals(upcomingMealsData);

      // Find the first week that is not skipped
      const firstActiveWeek = (upcomingMealsData as any).upcomingMeals.find((week: any) => 
        !week.isSkipped
      );

      // If we found an active week, use that; otherwise use the first available week
      const weekToSelect = firstActiveWeek 
        ? firstActiveWeek.weekId 
        : (upcomingMealsData as any).upcomingMeals[0].weekId;

      console.log('Auto-selected week:', weekToSelect, 'from weeks:', (upcomingMealsData as any).upcomingMeals.map((w: any) => ({ id: w.weekId, skipped: w.isSkipped })));
      
      // Set the selected week and immediately sync its meal data
      setSelectedWeekId(weekToSelect);
      
      // Find and set the meal data for the auto-selected week
      const selectedWeekData = (upcomingMealsData as any).upcomingMeals.find((week: any) => week.weekId === weekToSelect);
      if (selectedWeekData) {
        setMealCount(selectedWeekData.mealCount || 0);
        
        const orderItems: OrderItem[] = (selectedWeekData.items || []).map((item: any) => ({
          mealId: item.mealId,
          portionSize: item.portionSize as PortionSize
        }));
        
        setSelectedMeals(orderItems);
        console.log('Auto-loaded meal selections:', orderItems.length, 'meals for week', weekToSelect);
      }
    }
  }, [upcomingMealsData]);



  // Handle URL week parameter (but don't auto-select if no param)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const weekParam = urlParams.get('week');
    
    if (weekParam && !selectedWeekId) {
      const weekId = parseInt(weekParam);
      console.log('URL week parameter found:', weekId);
      setSelectedWeekId(weekId);
    }
  }, [selectedWeekId]);

  // Refresh data after meal modifications (but not on week switches)
  const refreshMealData = async () => {
    try {
      const response = await fetch(`/api/user/upcoming-meals?t=${Date.now()}`, { 
        credentials: 'include',
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      const freshData = await response.json();
      setLocalUpcomingMeals(freshData);
      
      // Update current week's selections if we have a selected week
      if (selectedWeekId) {
        const currentWeek = freshData.upcomingMeals?.find((week: any) => week.weekId === selectedWeekId);
        if (currentWeek) {
          const orderItems: OrderItem[] = (currentWeek.items || []).map((item: any) => ({
            mealId: item.mealId,
            portionSize: item.portionSize as PortionSize
          }));
          setSelectedMeals(orderItems);
          setMealCount(currentWeek.mealCount || 0);
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/user/upcoming-meals'] });
    } catch (error) {
      console.error('Failed to refresh meal data:', error);
    }
  };

  // Update form data when profile data is loaded
  useEffect(() => {
    if (profile) {
      const profileData = profile as any;
      console.log('Profile data received:', profileData);
      
      // Parse address data if it exists
      let addressData = {};
      if (profileData.address) {
        try {
          if (typeof profileData.address === 'string') {
            addressData = JSON.parse(profileData.address);
            console.log('Parsed address data:', addressData);
          } else {
            addressData = profileData.address;
          }
        } catch (e) {
          console.error('Error parsing address data:', e);
        }
      }
      
      // Get neighborhood from pre-onboarding if address doesn't have it
      const preOnboardingNeighborhood = sessionStorage.getItem('preOnboardingNeighborhood');
      const neighborhoodValue = (addressData as any).area || preOnboardingNeighborhood || "";
      
      const newFormData = {
        name: profileData.name || "",
        email: profileData.email || "",
        phone: profileData.phone || "",
        street: (addressData as any).street || "",
        building: (addressData as any).building || "",
        apartment: (addressData as any).apartment || "",
        area: neighborhoodValue,
        landmark: (addressData as any).landmark || ""
      };
      
      console.log('Setting form data:', newFormData);
      setFormData(newFormData);
    }
  }, [profile]);

  // Debug logging to track form data state
  useEffect(() => {
    console.log('Current form data state:', formData);
  }, [formData]);

  // NOW SAFE TO HAVE CONDITIONAL RETURNS AFTER ALL HOOKS ARE DECLARED
  if (isUserLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  console.log("AccountPage - Auth State:", {
    currentUser: !!currentUser,
    isUserLoading,
    userId: currentUser?.id,
    location
  });

  // Calculate pricing for delivery editing
  const calculateDeliveryPrice = (mealCount: number, portionSize: string) => {
    const pricing: { [key: number]: number } = {
      4: 249, 5: 239, 6: 239, 7: 219, 8: 219, 9: 219,
      10: 199, 11: 199, 12: 199, 13: 199, 14: 199, 15: 199
    };

    const basePrice = pricing[mealCount] || 249;

    if (portionSize === 'large') {
      return (basePrice + 99) * mealCount;
    } else if (portionSize === 'mixed') {
      return basePrice * mealCount; // Base price for mixed (portions selected individually)
    }

    return basePrice * mealCount;
  };

  // Helper function to format week dates as "Sat 5 July"
  const formatWeekLabel = (weekLabel: string) => {
    // Handle cross-month formats like "Jun 28-Jul 4, 2025"
    const crossMonthMatch = weekLabel.match(/(\w+)\s+(\d+)-(\w+)\s+(\d+),?\s*(\d+)/);
    if (crossMonthMatch) {
      const [, startMonthStr, startDayStr, , , yearStr] = crossMonthMatch;
      const monthMap: { [key: string]: number } = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11,
        'January': 0, 'February': 1, 'March': 2, 'April': 3, 'June': 5,
        'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
      };

      const month = monthMap[startMonthStr];
      if (month !== undefined) {
        const date = new Date(parseInt(yearStr), month, parseInt(startDayStr));
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December'];

        const dayName = dayNames[date.getDay()];
        const dayNumber = date.getDate();
        const monthName = monthNames[date.getMonth()];

        return `${dayName} ${dayNumber} ${monthName}`;
      }
    }

    // Handle single-month formats like "May 24-30, 2025"
    const singleMonthMatch = weekLabel.match(/(\w+)\s+(\d+)-\d+,?\s*(\d+)/);
    if (singleMonthMatch) {
      const [, monthStr, dayStr, yearStr] = singleMonthMatch;
      const monthMap: { [key: string]: number } = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11,
        'January': 0, 'February': 1, 'March': 2, 'April': 3, 'June': 5,
        'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
      };

      const month = monthMap[monthStr];
      if (month !== undefined) {
        const date = new Date(parseInt(yearStr), month, parseInt(dayStr));
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December'];

        const dayName = dayNames[date.getDay()];
        const dayNumber = date.getDate();
        const monthName = monthNames[date.getMonth()];

        return `${dayName} ${dayNumber} ${monthName}`;
      }
    }

    // Return original label if no pattern matches
    return weekLabel;
  };

  // Use local state if available, otherwise fall back to server data
  const displayUpcomingMeals = localUpcomingMeals || upcomingMealsData;

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
        title: "Profile Updated",
        description: "Your profile has been updated successfully."
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
      await apiRequest('POST', '/api/auth/logout');

      // Clear cache and redirect to home
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

  // Open delivery editing dialog
  const openEditDelivery = (weekId: number, mealCount: number, portionSize: string) => {
    setEditingDelivery({ weekId, currentMealCount: mealCount, currentPortionSize: portionSize });
    setEditForm({
      mealCount,
      portionSize: portionSize as 'standard' | 'large',
      applyToFuture: false
    });
  };

  // Open payment method editing dialog
  const openEditPayment = (weekId: number, orderId: number, currentPaymentMethod: string | null) => {
    setEditingPayment({ weekId, orderId, currentPaymentMethod });
    setPaymentForm({
      paymentMethod: (currentPaymentMethod as 'credit_card' | 'cash' | 'bank_transfer') || 'credit_card',
      applyToFuture: false
    });
  };

  // Handle delivery editing with real-time updates
  const handleEditDelivery = async () => {
    if (!editingDelivery) return;

    try {
      setIsUpdating(true);

      // Update the order with new meal count and portion size
      await apiRequest('PATCH', `/api/orders/${editingDelivery.weekId}/delivery`, {
        mealCount: editForm.mealCount,
        defaultPortionSize: editForm.portionSize,
        applyToFuture: editForm.applyToFuture
      });

      // Immediately update local state for real-time UI feedback
      setLocalUpcomingMeals((prev: any) => {
        if (!prev || !prev.upcomingMeals) return prev;

        return {
          ...prev,
          upcomingMeals: prev.upcomingMeals.map((week: any) => {
            if (week.weekId === editingDelivery.weekId) {
              return {
                ...week,
                mealCount: editForm.mealCount.toString(),
                defaultPortionSize: editForm.portionSize,
                // Clear existing meal selections when count changes
                items: [], // Force empty items array to reset component
                selectedMealCount: 0,
                hasIncompleteSelection: true
              };
            }
            // Apply to future weeks if requested
            if (editForm.applyToFuture && week.weekId > editingDelivery.weekId) {
              return {
                ...week,
                mealCount: editForm.mealCount.toString(),
                defaultPortionSize: editForm.portionSize,
                items: [] // Clear items for future weeks too
              };
            }
            return week;
          })
        };
      });

      // Refresh upcoming meals data from server
      await queryClient.invalidateQueries({ queryKey: ['/api/user/upcoming-meals'] });

      toast({
        title: "Delivery Updated",
        description: editForm.applyToFuture 
          ? "Your delivery preferences have been updated for this week and all future weeks. Please select your meals again."
          : "Your delivery preferences have been updated for this week. Please select your meals again."
      });

      setEditingDelivery(null);

      // Scroll to meal selection for the updated week
      setTimeout(() => {
        document.getElementById(`meal-selection-${editingDelivery.weekId}`)?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }, 500);

    } catch (error) {
      toast({
        title: "Error",
        description: "There was an error updating your delivery. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle payment method editing
  const handleEditPayment = async () => {
    if (!editingPayment) return;

    try {
      setIsUpdating(true);

      // Update the payment method for the specific order
      await apiRequest('PATCH', `/api/orders/${editingPayment.orderId}/payment`, {
        paymentMethod: paymentForm.paymentMethod,
        applyToFuture: paymentForm.applyToFuture
      });

      // Refresh upcoming meals data
      await queryClient.invalidateQueries({ queryKey: ['/api/user/upcoming-meals'] });

      toast({
        title: "Payment Method Updated",
        description: paymentForm.applyToFuture 
          ? "Your payment method has been updated for this week and all future weeks."
          : "Your payment method has been updated for this week."
      });

      setEditingPayment(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "There was an error updating your payment method. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Skip/unskip implementation with immediate local state updates
  const handleSkipToggle = async (orderId: number, weekId: number, skip: boolean) => {
    try {
      // Set loading state
      setProcessingWeekId(weekId);

      // Immediately update local state for instant UI feedback
      setLocalUpcomingMeals((prev: any) => {
        if (!prev || !prev.upcomingMeals) return prev;

        return {
          ...prev,
          upcomingMeals: prev.upcomingMeals.map((week: any) => {
            if (week.orderId === orderId) {
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

      // Make API call to the correct endpoint
      if (skip) {
        await apiRequest('PATCH', `/api/orders/${orderId}/skip`);
      } else {
        await apiRequest('PATCH', `/api/orders/${orderId}/unskip`);
      }

      // Invalidate relevant queries to refresh data from server
      queryClient.invalidateQueries({ queryKey: ['/api/user/upcoming-meals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });

      // Success message
      toast({
        title: skip ? "Delivery Skipped" : "Delivery Restored",
        description: skip 
          ? "Your delivery has been skipped. You can unskip it anytime before the order deadline."
          : "Your delivery has been restored. You can now edit your meal selections."
      });

      // Reset loading state
      setProcessingWeekId(null);

      // If we unskipped, scroll to the meal selection after a brief delay
      if (!skip) {
        setTimeout(() => {
          document.getElementById(`meal-selection-${weekId}`)?.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }, 300);
      }
    } catch (error) {
      console.error(`Error ${skip ? 'skipping' : 'unskipping'} delivery:`, error);

      // Revert local state on error
      setLocalUpcomingMeals((prev: any) => {
        if (!prev || !prev.upcomingMeals) return prev;

        return {
          ...prev,
          upcomingMeals: prev.upcomingMeals.map((week: any) => {
            if (week.orderId === orderId) {
              return {
                ...week,
                isSkipped: !skip,
                canSkip: skip,
                canUnskip: !skip
              };
            }
            return week;
          })
        };
      });

      toast({
        title: "Error",
        description: `Failed to ${skip ? 'skip' : 'restore'} delivery. Please try again.`,
        variant: "destructive"
      });
      setProcessingWeekId(null);
    }
  };



  // Show loading while authentication is in progress
  if (isUserLoading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
          <p className="text-gray-600">Loading your account...</p>
        </div>
      </div>
    );
  }

  // Only show login prompt if user is definitively not authenticated
  if (!currentUser) {
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

  // Show profile loading state separately - don't block the entire page
  const profileData = profile || {
    name: currentUser.name || '',
    email: currentUser.email || '',
    phone: currentUser.phone || '',
    address: currentUser.address || ''
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-6xl mx-auto">
        <Tabs defaultValue="upcoming" className="space-y-8">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming Meals</TabsTrigger>
            <TabsTrigger value="orders">Order History</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-primary mb-6">Upcoming Deliveries</h2>

              {displayUpcomingMeals?.upcomingMeals && displayUpcomingMeals.upcomingMeals.length > 0 ? (
                <div className="space-y-6">
                  {/* Week selector */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-8">
                    {displayUpcomingMeals.upcomingMeals.map((week: any) => (
                      <button
                        key={week.weekId}
                        onClick={async () => {
                          console.log('Week switch to:', week.weekId);
                          setSelectedWeekId(week.weekId);
                          setIsRefreshingWeekData(true);
                          
                          try {
                            // Always fetch fresh data for accurate meal selections
                            const response = await fetch(`/api/user/upcoming-meals?t=${Date.now()}`, {
                              credentials: 'include',
                              cache: 'no-store',
                              headers: { 'Cache-Control': 'no-cache' }
                            });
                            const freshData = await response.json();
                            setLocalUpcomingMeals(freshData);
                            
                            // Set correct meal selections for the selected week
                            const selectedWeek = freshData.upcomingMeals?.find((w: any) => w.weekId === week.weekId);
                            if (selectedWeek) {
                              const items = (selectedWeek.items || []).map((item: any) => ({
                                mealId: item.mealId,
                                portionSize: item.portionSize
                              }));
                              setSelectedMeals(items);
                              setMealCount(selectedWeek.mealCount || 0);
                              console.log('Fresh week data loaded for week', week.weekId, 'with', items.length, 'meals');
                            }
                            
                            queryClient.invalidateQueries({ queryKey: ['/api/user/upcoming-meals'] });
                          } catch (error) {
                            console.error('Week switch error:', error);
                          } finally {
                            setIsRefreshingWeekData(false);
                          }
                        }}
                        className={`py-4 px-2 text-center rounded-md transition-colors ${
                          selectedWeekId === week.weekId 
                            ? 'border-2 border-primary bg-primary/5' 
                            : 'border border-gray-200 hover:bg-gray-50'
                        } ${week.isSkipped ? 'opacity-50' : ''}`}
                      >
                        <div className="font-medium">
                          {formatWeekLabel(week.weekLabel)}
                        </div>
                        {week.isSkipped && (
                          <div className="text-sm text-gray-500 mt-1">Skipped</div>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Selected week details */}
                  {selectedWeekId && displayUpcomingMeals.upcomingMeals.map((week: any) => {
                    if (week.weekId !== selectedWeekId) return null;

                    const deadline = new Date(week.orderDeadline);
                    const deliveryDate = new Date(week.deliveryDate);
                    const now = new Date();
                    const isDeadlinePassed = deadline < now;

                    return (
                      <div key={`details-${week.weekId}`} className="space-y-6">
                        <Card>
                          <CardContent className="pt-6">
                            <div className="mb-4">
                              <p className="text-sm text-gray-600">
                                <strong>Order By:</strong> {formatDate(deadline)}
                              </p>
                            </div>

                            {isDeadlinePassed ? (
                              <div className="bg-amber-50 text-amber-700 p-4 rounded-md mb-4">
                                <p className="font-medium">Order deadline has passed</p>
                                <p className="text-sm">You can no longer modify this order.</p>
                              </div>
                            ) : week.isSkipped ? (
                              <div className="bg-gray-100 p-4 rounded-md mb-4">
                                <p className="font-medium">This delivery is skipped</p>
                                <p className="text-sm">You have chosen to skip this week's delivery.</p>
                              </div>
                            ) : null}

                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-medium">{week.mealCount} meals · {week.defaultPortionSize} size</p>
                                <p className="text-sm text-gray-500">
                                  {week.orderId ? "Order confirmed" : "No order yet"}
                                </p>
                              </div>

                              <div className="space-x-2">
                                {!isDeadlinePassed && !week.isSkipped && (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => openEditDelivery(week.weekId, week.mealCount, week.defaultPortionSize)}
                                    className="flex items-center"
                                  >
                                    <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
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
                            </div>
                            </CardContent>
                          </Card>

                        {/* Meal selection panel */}
                        {!week.isSkipped && (
                          <div id={`meal-selection-${week.weekId}`}>
                            {isRefreshingWeekData && selectedWeekId === week.weekId ? (
                              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                                <p className="text-gray-600">Refreshing meal selections...</p>
                              </div>
                            ) : (
                              <FixedMealSelector 
                                key={`${week.weekId}-${week.mealCount}-${week.items?.length || 0}`}
                                weekId={week.weekId}
                                orderId={week.orderId}
                                mealCount={week.mealCount}
                                items={week.items || []}
                                defaultPortionSize={week.defaultPortionSize || 'standard'}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  {isLoadingUpcomingMeals ? (
                    <p>Loading upcoming meals...</p>
                  ) : (
                    <p>No upcoming meal deliveries found.</p>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="orders" className="space-y-6">```text
            <div>
              <h2 className="text-2xl font-bold text-primary mb-6">Order History</h2>

              {(ordersData as any)?.orders && (ordersData as any).orders.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(ordersData as any).orders.map((order: any) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">#{order.id}</TableCell>
                        <TableCell>{order.createdAt ? formatDate(new Date(order.createdAt)) : 'N/A'}</TableCell>
                        <TableCell>
                          <span className={order.status ? getStatusClass(order.status) : ''}>
                            {order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : 'Unknown'}
                          </span>
                        </TableCell>
                        <TableCell>${order.total ? order.total.toFixed(2) : '0.00'}</TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              // Navigate to order details or show modal
                              toast({
                                title: "Coming Soon",
                                description: "Order details view is coming soon."
                              });
                            }}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <p>No order history found.</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="profile" className="space-y-8">
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-primary">Profile</h2>
                {!isEditing ? (
                  <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
                ) : (
                  <div className="space-x-2">
                    <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                    <Button onClick={handleSaveProfile} disabled={isUpdating}>
                      {isUpdating ? "Saving..." : "Save"}
                    </Button>
                  </div>
                )}
              </div>

              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          disabled={!isEditing}
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
                          disabled={!isEditing}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                      />
                    </div>

                    {/* Address Fields */}
                    <div className="border-t pt-4 mt-6">
                      <h3 className="font-semibold text-lg mb-4">Delivery Address</h3>
                      
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="street">Street Address</Label>
                          <Input
                            id="street"
                            name="street"
                            value={formData.street}
                            onChange={handleInputChange}
                            disabled={!isEditing}
                            placeholder="Street name and number"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="building">Building</Label>
                            <Input
                              id="building"
                              name="building"
                              value={formData.building}
                              onChange={handleInputChange}
                              disabled={!isEditing}
                              placeholder="Building number/name"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="apartment">Apartment/Unit</Label>
                            <Input
                              id="apartment"
                              name="apartment"
                              value={formData.apartment}
                              onChange={handleInputChange}
                              disabled={!isEditing}
                              placeholder="Apt/Unit number"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="area">Neighborhood</Label>
                          <Input
                            id="area"
                            name="area"
                            value={formData.area}
                            onChange={handleInputChange}
                            disabled={!isEditing}
                            placeholder="Your neighborhood"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="landmark">Landmark (Optional)</Label>
                          <Input
                            id="landmark"
                            name="landmark"
                            value={formData.landmark}
                            onChange={handleInputChange}
                            disabled={!isEditing}
                            placeholder="Nearby landmark for easier delivery"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="mt-8">
                <Button variant="outline" className="text-red-500" onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit Delivery Dialog */}
        <Dialog open={!!editingDelivery} onOpenChange={() => setEditingDelivery(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Delivery Preferences</DialogTitle>
              <DialogDescription>
                Change your meal count and portion size for this delivery. You can apply changes to future deliveries too.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="meal-count" className="text-right">
                  Meal Count
                </Label>
                <Select 
                  value={editForm.mealCount.toString()} 
                  onValueChange={(value) => setEditForm({...editForm, mealCount: parseInt(value)})}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4">4 meals</SelectItem>
                    <SelectItem value="5">5 meals</SelectItem>
                    <SelectItem value="6">6 meals</SelectItem>
                    <SelectItem value="7">7 meals</SelectItem>
                    <SelectItem value="8">8 meals</SelectItem>
                    <SelectItem value="9">9 meals</SelectItem>
                    <SelectItem value="10">10 meals</SelectItem>
                    <SelectItem value="11">11 meals</SelectItem>
                    <SelectItem value="12">12 meals</SelectItem>
                    <SelectItem value="13">13 meals</SelectItem>
                    <SelectItem value="14">14 meals</SelectItem>
                    <SelectItem value="15">15 meals</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="portion-size" className="text-right">
                  Portion Size
                </Label>
                <Select 
                  value={editForm.portionSize} 
                  onValueChange={(value) => setEditForm({...editForm, portionSize: value as 'standard' | 'large' | 'mixed'})}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="large">Large (+99 EGP per meal)</SelectItem>
                    <SelectItem value="mixed">Mix & Match</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2 mt-4">
                <Checkbox 
                  id="apply-future"
                  checked={editForm.applyToFuture}
                  onCheckedChange={(checked) => setEditForm({...editForm, applyToFuture: !!checked})}
                />
                <Label htmlFor="apply-future" className="text-sm">
                  Apply these changes to all future deliveries
                </Label>
              </div>

              {/* Price Display */}
              {editForm.mealCount > 0 && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">
                    New total: <span className="font-semibold text-green-600">
                      EGP {calculateDeliveryPrice(editForm.mealCount, editForm.portionSize).toFixed(0)}
                    </span>
                  </div>
                  {editForm.portionSize === 'mixed' && (
                    <div className="text-xs text-gray-500 mt-1">
                      Base price shown. Individual meal portions can be selected later.
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingDelivery(null)}>
                Cancel
              </Button>
              <Button onClick={handleEditDelivery} disabled={isUpdating}>
                {isUpdating ? "Updating..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Payment Method Dialog */}
        <Dialog open={!!editingPayment} onOpenChange={() => setEditingPayment(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Payment Method</DialogTitle>
              <DialogDescription>
                Update your payment method for this delivery or all future deliveries.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select 
                  value={paymentForm.paymentMethod} 
                  onValueChange={(value) => setPaymentForm(prev => ({ ...prev, paymentMethod: value as 'credit_card' | 'cash' | 'bank_transfer' }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="cash">Cash on Delivery</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="applyToFuture"
                  checked={paymentForm.applyToFuture}
                  onCheckedChange={(checked) => setPaymentForm(prev => ({ ...prev, applyToFuture: !!checked }))}
                />
                <Label htmlFor="applyToFuture" className="text-sm">
                  Apply to all future deliveries
                </Label>
              </div>

              {editingPayment && (
                <div className="bg-gray-50 p-3 rounded-md text-sm">
                  <p className="font-medium">Current: {editingPayment.currentPaymentMethod || 'Not set'}</p>
                  <p className="text-gray-600 mt-1">
                    {paymentForm.applyToFuture 
                      ? "This will update your payment method for this week and all future weeks."
                      : "This will only update your payment method for this week."
                    }
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingPayment(null)}>
                Cancel
              </Button>
              <Button onClick={handleEditPayment} disabled={isUpdating}>
                {isUpdating ? "Updating..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AccountPage;