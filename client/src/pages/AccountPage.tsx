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
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // All useState hooks must be at the top before any early returns
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
    mealCount: 4,
    portionSize: 'standard' as 'standard' | 'large' | 'mixed',
    applyToFuture: false
  });
  
  // Check authentication state with aggressive refetching for post-checkout scenarios
  const { data: currentUser, isLoading: isUserLoading, refetch: refetchAuth } = useQuery<User | null>({
    queryKey: ['/api/auth/me'],
    retry: 5,
    retryDelay: 500,
    staleTime: 0, // Always fetch fresh data to catch post-checkout auth state
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Get user profile
  const { data: profile } = useQuery({
    queryKey: ['/api/user/profile'],
    enabled: !!currentUser
  });

  // Get upcoming meals data  
  const { data: upcomingMeals } = useQuery({
    queryKey: ['/api/user/upcoming-meals'],
    enabled: !!currentUser
  });

  // Get user orders
  const { data: ordersData } = useQuery({
    queryKey: ['/api/user/orders'],
    enabled: !!currentUser
  });
  
  // Force immediate auth refetch when component mounts (for post-checkout navigation)
  useEffect(() => {
    const timer = setTimeout(() => {
      refetchAuth();
    }, 100); // Very quick refetch to ensure fresh auth state
    
    return () => clearTimeout(timer);
  }, [refetchAuth]);

  // Handle post-checkout authentication with extended timeout
  useEffect(() => {
    const isPostCheckout = localStorage.getItem('wagba_checkout_success') === 'true';
    
    if (isPostCheckout) {
      // Extended timeout for post-checkout scenario
      const checkoutTimer = setTimeout(() => {
        refetchAuth();
        localStorage.removeItem('wagba_checkout_success');
      }, isPostCheckout ? 10000 : 3000); // 10 seconds for post-checkout, 3 seconds otherwise
      
      return () => clearTimeout(checkoutTimer);
    }
  }, [refetchAuth]);

  // Show loading state while checking authentication
  if (isUserLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your account...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!currentUser) {
    navigate('/auth');
    return null;
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    
    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const profileData = {
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        phone: formData.get('phone') as string,
        address: {
          street: formData.get('street') as string,
          area: formData.get('area') as string,
          building: formData.get('building') as string,
          floor: formData.get('floor') as string,
          apartment: formData.get('apartment') as string,
          instructions: formData.get('instructions') as string,
        }
      };

      await apiRequest('PUT', '/api/user/profile', profileData);
      await queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
      
      setIsEditing(false);
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiRequest('POST', '/api/auth/logout');
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      // Navigate anyway in case of error
      navigate('/');
    }
  };

  const formatWeekLabel = (weekLabel: string) => {
    // Check if it's a delivery date pattern like "26 Dec - 2 Jan"
    const deliveryPattern = /(\d{1,2})\s+(\w{3})\s*-\s*(\d{1,2})\s+(\w{3})/;
    const match = weekLabel.match(deliveryPattern);
    
    if (match) {
      const [, startDay, startMonth, endDay, endMonth] = match;
      
      // Convert month abbreviations to full names
      const monthMap: { [key: string]: string } = {
        'Jan': 'January', 'Feb': 'February', 'Mar': 'March', 'Apr': 'April',
        'May': 'May', 'Jun': 'June', 'Jul': 'July', 'Aug': 'August',
        'Sep': 'September', 'Oct': 'October', 'Nov': 'November', 'Dec': 'December'
      };
      
      const startMonthFull = monthMap[startMonth] || startMonth;
      const endMonthFull = monthMap[endMonth] || endMonth;
      
      return `${startDay} ${startMonthFull} - ${endDay} ${endMonthFull}`;
    }
    
    // Check if it's a single date like "Week of 26 Dec" or "26 Dec"
    const singleDatePattern = /(?:Week of )?(\d{1,2})\s+(\w{3})/;
    const singleMatch = weekLabel.match(singleDatePattern);
    
    if (singleMatch) {
      const [, day, month] = singleMatch;
      const monthMap: { [key: string]: string } = {
        'Jan': 'January', 'Feb': 'February', 'Mar': 'March', 'Apr': 'April',
        'May': 'May', 'Jun': 'June', 'Jul': 'July', 'Aug': 'August',
        'Sep': 'September', 'Oct': 'October', 'Nov': 'November', 'Dec': 'December'
      };
      
      const monthFull = monthMap[month] || month;
      return `Week of ${day} ${monthFull}`;
    }
    
    // Check if it's a pattern like "This Week" or "Next Week"
    if (weekLabel.toLowerCase().includes('this week') || weekLabel.toLowerCase().includes('next week')) {
      // Calculate the actual date
      const today = new Date();
      const isNextWeek = weekLabel.toLowerCase().includes('next week');
      
      if (isNextWeek) {
        today.setDate(today.getDate() + 7);
      }
      
      // Find the start of the week (assuming Monday is the start)
      const dayOfWeek = today.getDay();
      const daysUntilMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() + daysUntilMonday);
      
      // Format the date
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      
      const dayName = dayNames[startOfWeek.getDay()];
      const dayNumber = startOfWeek.getDate();
      const monthName = monthNames[startOfWeek.getMonth()];
      
      return `Week of ${dayNumber} ${monthName}`;
    }
    
    // For patterns like "Current Week" try to parse and format nicely
    if (weekLabel.toLowerCase().includes('current')) {
      const today = new Date();
      
      // Find the start of the current week (Monday)
      const dayOfWeek = today.getDay();
      const daysUntilMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() + daysUntilMonday);
      
      // Format the date
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      
      const dayName = dayNames[startOfWeek.getDay()];
      const dayNumber = startOfWeek.getDate();
      const monthName = monthNames[startOfWeek.getMonth()];
      
      return `Week of ${dayNumber} ${monthName}`;
    }
    
    // Try to extract any date from the label
    const anyDatePattern = /(\d{1,2})\s+(\w{3,})/;
    const anyMatch = weekLabel.match(anyDatePattern);
    
    if (anyMatch) {
      const [, day, month] = anyMatch;
      
      // Check if month is abbreviated and convert to full name
      const monthMap: { [key: string]: string } = {
        'Jan': 'January', 'Feb': 'February', 'Mar': 'March', 'Apr': 'April',
        'May': 'May', 'Jun': 'June', 'Jul': 'July', 'Aug': 'August',
        'Sep': 'September', 'Oct': 'October', 'Nov': 'November', 'Dec': 'December'
      };
      
      if (monthMap[month]) {
        return `Week of ${day} ${monthMap[month]}`;
      } else {
        // Try to find date in the current/next year
        const currentYear = new Date().getFullYear();
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const monthIndex = monthNames.findIndex(m => m.toLowerCase().startsWith(month.toLowerCase()));
        
        if (monthIndex !== -1) {
          const date = new Date(currentYear, monthIndex, parseInt(day));
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const dayName = dayNames[date.getDay()];
          const dayNumber = date.getDate();
          const monthName = monthNames[date.getMonth()];
          
          return `${dayName} ${dayNumber} ${monthName}`;
        }
      }
    }
    
    // Return original label if no pattern matches
    return weekLabel;
  };

  const handleSkipWeek = async (weekId: number) => {
    setProcessingWeekId(weekId);
    try {
      await apiRequest('POST', `/api/orders/skip`, { weekId });
      await queryClient.invalidateQueries({ queryKey: ['/api/user/upcoming-meals'] });
      toast({
        title: "Week Skipped",
        description: "This week has been skipped successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Skip Failed",
        description: error.message || "Failed to skip week",
        variant: "destructive"
      });
    } finally {
      setProcessingWeekId(null);
    }
  };

  const handleUnskipWeek = async (weekId: number) => {
    setProcessingWeekId(weekId);
    try {
      await apiRequest('POST', `/api/orders/unskip`, { weekId });
      await queryClient.invalidateQueries({ queryKey: ['/api/user/upcoming-meals'] });
      toast({
        title: "Week Unskipped",
        description: "This week has been restored successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Unskip Failed",
        description: error.message || "Failed to unskip week",
        variant: "destructive"
      });
    } finally {
      setProcessingWeekId(null);
    }
  };

  const openEditDelivery = (week: any) => {
    setEditingDelivery({
      weekId: week.weekId,
      currentMealCount: week.mealCount,
      currentPortionSize: week.portionSize
    });
    setEditForm({
      mealCount: week.mealCount,
      portionSize: week.portionSize,
      applyToFuture: false
    });
  };

  const handleEditDelivery = async () => {
    if (!editingDelivery) return;
    
    setIsUpdating(true);
    try {
      await apiRequest('PUT', '/api/orders/delivery', {
        weekId: editingDelivery.weekId,
        mealCount: editForm.mealCount,
        defaultPortionSize: editForm.portionSize,
        applyToFuture: editForm.applyToFuture
      });
      
      await queryClient.invalidateQueries({ queryKey: ['/api/user/upcoming-meals'] });
      
      toast({
        title: "Delivery Updated",
        description: editForm.applyToFuture 
          ? "Delivery preferences updated for this week and all future deliveries."
          : "Delivery preferences updated for this week only.",
      });
      
      setEditingDelivery(null);
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update delivery",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEditMeals = async (weekId: number) => {
    setIsLoadingMeals(true);
    try {
      navigate(`/menu/${weekId}?editing=true`);
    } catch (error) {
      console.error('Navigation error:', error);
    } finally {
      setIsLoadingMeals(false);
    }
  };

  const getPortionDisplayName = (portion: string) => {
    switch (portion) {
      case 'standard': return 'Standard';
      case 'large': return 'Large';
      case 'mixed': return 'Mix & Match';
      default: return portion;
    }
  };

  const renderMealItems = (items: any[]) => {
    if (!items || items.length === 0) {
      return <p className="text-gray-500 text-sm">No meals selected</p>;
    }

    return (
      <div className="space-y-2">
        {items.map((item: any, index: number) => (
          <div key={index} className="flex justify-between items-center text-sm">
            <span className="font-medium">{item.mealTitle}</span>
            <div className="flex items-center gap-2 text-gray-600">
              <span>x{item.quantity}</span>
              {item.portionSize && item.portionSize !== 'standard' && (
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {getPortionDisplayName(item.portionSize)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderUpcomingMeals = () => {
    if (!upcomingMeals || !upcomingMeals.upcomingMeals || upcomingMeals.upcomingMeals.length === 0) {
      return (
        <Card>
          <CardContent className="p-6">
            <p className="text-gray-500 text-center">No upcoming meals found.</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {upcomingMeals.upcomingMeals.map((week: any) => (
          <Card key={week.weekId} className={week.isSkipped ? "opacity-60" : ""}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{formatWeekLabel(week.weekLabel)}</CardTitle>
                  <CardDescription>
                    {week.mealCount} meals • {getPortionDisplayName(week.portionSize)}
                    {week.isSkipped && <span className="ml-2 text-orange-600 font-medium">(Skipped)</span>}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {!week.isSkipped ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDelivery(week)}
                      >
                        Edit Delivery
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditMeals(week.weekId)}
                        disabled={isLoadingMeals}
                      >
                        {isLoadingMeals ? 'Loading...' : 'Edit Meals'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSkipWeek(week.weekId)}
                        disabled={processingWeekId === week.weekId}
                      >
                        {processingWeekId === week.weekId ? 'Skipping...' : 'Skip Week'}
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnskipWeek(week.weekId)}
                      disabled={processingWeekId === week.weekId}
                    >
                      {processingWeekId === week.weekId ? 'Restoring...' : 'Restore Week'}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!week.isSkipped && renderMealItems(week.meals)}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Account</h1>
        <Button 
          variant="outline" 
          onClick={handleLogout}
          className="text-gray-600 hover:text-gray-900"
        >
          Sign Out
        </Button>
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upcoming">Upcoming Meals</TabsTrigger>
          <TabsTrigger value="orders">Order History</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Your Upcoming Meals</h2>
            {renderUpcomingMeals()}
          </div>
        </TabsContent>

        <TabsContent value="orders" className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Order History</h2>
            {!ordersData || !ordersData.orders || ordersData.orders.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-gray-500 text-center">No orders found.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {ordersData?.orders?.map((order: Order) => (
                  <Card key={order.id}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold">Order #{order.id}</h3>
                          <p className="text-sm text-gray-600">
                            {order.deliveryDate ? formatDate(new Date(order.deliveryDate)) : 'Date not set'}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusClass(order.status || 'pending')}`}>
                          {order.status?.charAt(0).toUpperCase()}{order.status?.slice(1) || 'Pending'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Manage your account details and delivery information</CardDescription>
            </CardHeader>
            <CardContent>
              {!isEditing ? (
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Name</Label>
                    <p className="text-gray-900">{profile?.name || 'Not set'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Email</Label>
                    <p className="text-gray-900">{profile?.email || 'Not set'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Phone</Label>
                    <p className="text-gray-900">{profile?.phone || 'Not set'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Delivery Address</Label>
                    <div className="text-gray-900">
                      {profile?.address ? (
                        <div>
                          <p>{profile.address.street}</p>
                          <p>{profile.address.area}</p>
                          {profile.address.building && <p>Building: {profile.address.building}</p>}
                          {profile.address.floor && <p>Floor: {profile.address.floor}</p>}
                          {profile.address.apartment && <p>Apartment: {profile.address.apartment}</p>}
                          {profile.address.instructions && <p>Instructions: {profile.address.instructions}</p>}
                        </div>
                      ) : (
                        <p>Not set</p>
                      )}
                    </div>
                  </div>
                  <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
                </div>
              ) : (
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      name="name"
                      defaultValue={profile?.name || ''}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      defaultValue={profile?.email || ''}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      name="phone"
                      defaultValue={profile?.phone || ''}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Delivery Address</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="street">Street Address</Label>
                        <Input
                          id="street"
                          name="street"
                          defaultValue={profile?.address?.street || ''}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="area">Area</Label>
                        <Input
                          id="area"
                          name="area"
                          defaultValue={profile?.address?.area || ''}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="building">Building (Optional)</Label>
                        <Input
                          id="building"
                          name="building"
                          defaultValue={profile?.address?.building || ''}
                        />
                      </div>
                      <div>
                        <Label htmlFor="floor">Floor (Optional)</Label>
                        <Input
                          id="floor"
                          name="floor"
                          defaultValue={profile?.address?.floor || ''}
                        />
                      </div>
                      <div>
                        <Label htmlFor="apartment">Apartment (Optional)</Label>
                        <Input
                          id="apartment"
                          name="apartment"
                          defaultValue={profile?.address?.apartment || ''}
                        />
                      </div>
                      <div>
                        <Label htmlFor="instructions">Delivery Instructions (Optional)</Label>
                        <Input
                          id="instructions"
                          name="instructions"
                          defaultValue={profile?.address?.instructions || ''}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={isUpdating}>
                      {isUpdating ? 'Updating...' : 'Update Profile'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Delivery Dialog */}
      <Dialog open={!!editingDelivery} onOpenChange={(open) => !open && setEditingDelivery(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Delivery Preferences</DialogTitle>
            <DialogDescription>
              Change your meal count and portion preferences for this delivery.
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
                  {Array.from({length: 12}, (_, i) => i + 4).map(count => (
                    <SelectItem key={count} value={count.toString()}>
                      {count} meals
                    </SelectItem>
                  ))}
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
                  <SelectItem value="large">Large</SelectItem>
                  <SelectItem value="mixed">Mix & Match</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="apply-future"
                checked={editForm.applyToFuture}
                onCheckedChange={(checked) => setEditForm({...editForm, applyToFuture: !!checked})}
              />
              <Label htmlFor="apply-future" className="text-sm">
                Apply to all future deliveries
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingDelivery(null)}
            >
              Cancel
            </Button>
            <Button onClick={handleEditDelivery} disabled={isUpdating}>
              {isUpdating ? 'Updating...' : 'Update Delivery'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountPage;