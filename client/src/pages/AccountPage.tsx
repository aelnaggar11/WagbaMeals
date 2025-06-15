import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User, Meal, OrderItem } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { User as UserIcon, MapPin, Calendar, Clock, Check, X, Edit, Package, CreditCard, Lock } from "lucide-react";

const AccountPage = () => {
  const [location, navigate] = useLocation();
  const { toast } = useToast();

  // All state declarations must be at the top level
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoadingMeals, setIsLoadingMeals] = useState(false);

  // Single state variable to track which week is being processed
  const [processingWeekId, setProcessingWeekId] = useState<number | null>(null);

  // Delivery editing state
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

  // Payment method editing state
  const [editingPayment, setEditingPayment] = useState<{
    weekId: number;
    orderId: number;
    currentPaymentMethod: string | null;
  } | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    paymentMethod: 'credit_card' as 'credit_card' | 'cash' | 'bank_transfer',
    applyToFuture: false
  });

  // Get current user with proper loading state handling
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

  // Get user profile
  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['/api/user/profile'],
    enabled: !!currentUser
  });

  // Get order history
  const { data: ordersData } = useQuery<{ orders: any[] }>({
    queryKey: ['/api/orders'],
    enabled: !!currentUser
  });

  // Get upcoming meals with local state for immediate updates
  const { data: upcomingMealsData, isLoading: isLoadingUpcomingMeals } = useQuery({
    queryKey: ['/api/user/upcoming-meals'],
    enabled: !!currentUser
  });

  // Local state to override server data for immediate UI updates
  const [localUpcomingMeals, setLocalUpcomingMeals] = useState<any>(null);

  // Available meals
  const [availableMeals, setAvailableMeals] = useState<Meal[]>([]);
  const [selectedMeals, setSelectedMeals] = useState<OrderItem[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(null);
  const [mealCount, setMealCount] = useState(0);

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

  // Handle authentication and navigation
  useEffect(() => {
    if (!isUserLoading && !currentUser) {
      navigate('/auth?returnTo=' + encodeURIComponent(location));
    }
  }, [isUserLoading, currentUser, navigate, location]);

  // Show loading state while checking authentication
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

  // Don't render anything while redirecting
  if (!currentUser) {
    return null;
  }

  // Calculate pricing for delivery editing
  const calculateDeliveryPrice = (mealCount: number, portionSize: string) => {
    const pricing: { [key: number]: number } = {
      4: 249, 5: 239, 6: 239, 7: 219, 8: 219, 9: 219,
      10: 199, 11: 199, 12: 199, 13: 199, 14: 199, 15: 199
    };
    
    const basePrice = pricing[mealCount] || 199;
    const multiplier = portionSize === 'large' ? 1.5 : portionSize === 'mixed' ? 1.25 : 1;
    return Math.round(basePrice * multiplier);
  };

  // Helper function to format week label
  const formatWeekLabel = (weekLabel: string) => {
    // Check if the label matches the format "DD/MM/YYYY"
    const dateMatch = weekLabel.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dateMatch) {
      const [, dayStr, monthStr, yearStr] = dateMatch;
      
      // Convert month from 1-based to 0-based for JavaScript Date
      const monthMap: { [key: string]: number } = {
        '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5,
        '7': 6, '8': 7, '9': 8, '10': 9, '11': 10, '12': 11
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

  // Set initial selected week when data is loaded and sync local state
  useEffect(() => {
    if ((upcomingMealsData as any)?.upcomingMeals && (upcomingMealsData as any).upcomingMeals.length > 0) {
      // Initialize local state with server data if not already set
      if (!localUpcomingMeals) {
        setLocalUpcomingMeals(upcomingMealsData);
      }

      // Set initial selected week to the first week with a confirmed order (first delivery)
      if (!selectedWeekId) {
        // Find the first week that has an order and is not skipped
        const firstDeliveryWeek = (upcomingMealsData as any).upcomingMeals.find((week: any) => 
          week.orderId && !week.isSkipped
        );

        // If we found a week with a delivery, use that; otherwise use the first available week
        const weekToSelect = firstDeliveryWeek 
          ? firstDeliveryWeek.weekId 
          : (upcomingMealsData as any).upcomingMeals[0].weekId;

        setSelectedWeekId(weekToSelect);
      }
    }
  }, [upcomingMealsData, selectedWeekId, localUpcomingMeals]);

  // Use local state if available, otherwise fall back to server data
  const displayUpcomingMeals = localUpcomingMeals || upcomingMealsData;

  // Update form data when profile data is loaded
  useEffect(() => {
    if (profile) {
      setFormData({
        name: (profile as any).name || "",
        email: (profile as any).email || "",
        phone: (profile as any).phone || "",
        street: "",
        building: "",
        apartment: "",
        area: "",
        landmark: ""
      });

      // Parse address if available
      if ((profile as any).address) {
        try {
          const addressObj = JSON.parse((profile as any).address);
          setFormData(prev => ({
            ...prev,
            street: addressObj.street || "",
            building: addressObj.building || "",
            apartment: addressObj.apartment || "",
            area: addressObj.area || "",
            landmark: addressObj.landmark || ""
          }));
        } catch (e) {
          console.error("Failed to parse address:", e);
        }
      }
    }
  }, [profile]);

  // Mutation for updating profile
  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('PATCH', '/api/user/profile', data);
    },
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully."
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Mutation for skipping an order
  const skipOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      return apiRequest('PATCH', `/api/orders/${orderId}/skip`);
    },
    onSuccess: (data, orderId) => {
      toast({
        title: "Order skipped",
        description: "Your order has been skipped for this week."
      });
      setProcessingWeekId(null);
      
      // Update local state immediately
      if (localUpcomingMeals?.upcomingMeals) {
        const updatedMeals = { ...localUpcomingMeals };
        const weekToUpdate = updatedMeals.upcomingMeals.find((week: any) => week.orderId === orderId);
        if (weekToUpdate) {
          weekToUpdate.isSkipped = true;
        }
        setLocalUpcomingMeals(updatedMeals);
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/user/upcoming-meals'] });
    },
    onError: () => {
      toast({
        title: "Skip failed",
        description: "Failed to skip order. Please try again.",
        variant: "destructive"
      });
      setProcessingWeekId(null);
    }
  });

  // Mutation for unskipping an order
  const unskipOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      return apiRequest('PATCH', `/api/orders/${orderId}/unskip`);
    },
    onSuccess: (data, orderId) => {
      toast({
        title: "Order restored",
        description: "Your order has been restored for this week."
      });
      setProcessingWeekId(null);
      
      // Update local state immediately
      if (localUpcomingMeals?.upcomingMeals) {
        const updatedMeals = { ...localUpcomingMeals };
        const weekToUpdate = updatedMeals.upcomingMeals.find((week: any) => week.orderId === orderId);
        if (weekToUpdate) {
          weekToUpdate.isSkipped = false;
        }
        setLocalUpcomingMeals(updatedMeals);
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/user/upcoming-meals'] });
    },
    onError: () => {
      toast({
        title: "Restore failed",
        description: "Failed to restore order. Please try again.",
        variant: "destructive"
      });
      setProcessingWeekId(null);
    }
  });

  // Check if the order deadline has passed
  const isOrderDeadlinePassed = (weekLabel: string) => {
    const match = weekLabel.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) return false;
    
    const [, dayStr, monthStr, yearStr] = match;
    const deliveryDate = new Date(parseInt(yearStr), parseInt(monthStr) - 1, parseInt(dayStr));
    
    // Calculate deadline (2 days before delivery at 11:59 PM)
    const deadline = new Date(deliveryDate);
    deadline.setDate(deadline.getDate() - 2);
    deadline.setHours(23, 59, 59, 999);
    
    return new Date() > deadline;
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);

    try {
      const address = JSON.stringify({
        street: formData.street,
        building: formData.building,
        apartment: formData.apartment,
        area: formData.area,
        landmark: formData.landmark
      });

      updateProfileMutation.mutate({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: address
      });
    } catch (error) {
      console.error('Profile update error:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSkipOrder = async (orderId: number) => {
    setProcessingWeekId(orderId);
    skipOrderMutation.mutate(orderId);
  };

  const handleUnskipOrder = async (orderId: number) => {
    setProcessingWeekId(orderId);
    unskipOrderMutation.mutate(orderId);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditDelivery = (week: any) => {
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

  const handleEditPayment = (week: any) => {
    setEditingPayment({
      weekId: week.weekId,
      orderId: week.orderId,
      currentPaymentMethod: week.paymentMethod
    });
    setPaymentForm({
      paymentMethod: week.paymentMethod || 'credit_card',
      applyToFuture: false
    });
  };

  const renderWeekCard = (week: any) => {
    const isDeadlinePassed = isOrderDeadlinePassed(week.weekLabel);
    const isProcessing = processingWeekId === week.orderId;

    return (
      <Card key={week.weekId} className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {formatWeekLabel(week.weekLabel)}
                {isDeadlinePassed && <Lock className="h-4 w-4 text-gray-400" />}
              </CardTitle>
              <CardDescription>
                {week.mealCount} meals • {week.portionSize} portions • EGP {calculateDeliveryPrice(week.mealCount, week.portionSize)}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {week.orderId ? (
                week.isSkipped ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUnskipOrder(week.orderId)}
                    disabled={isProcessing || isDeadlinePassed}
                  >
                    {isProcessing ? "Processing..." : "Restore"}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSkipOrder(week.orderId)}
                    disabled={isProcessing || isDeadlinePassed}
                  >
                    {isProcessing ? "Processing..." : "Skip"}
                  </Button>
                )
              ) : null}
              {!isDeadlinePassed && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditDelivery(week)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditPayment(week)}
                  >
                    <CreditCard className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant={week.isSkipped ? "secondary" : week.orderId ? "default" : "outline"}>
                {week.isSkipped ? "Skipped" : week.orderId ? "Confirmed" : "Not Ordered"}
              </Badge>
              {week.paymentMethod && (
                <Badge variant="outline">
                  {week.paymentMethod.replace('_', ' ')}
                </Badge>
              )}
            </div>
            
            {week.meals && week.meals.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Selected Meals:</h4>
                <div className="grid gap-2">
                  {week.meals.map((meal: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="font-medium">{meal.title}</span>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        {meal.standardQuantity > 0 && (
                          <span>{meal.standardQuantity}x Standard</span>
                        )}
                        {meal.largeQuantity > 0 && (
                          <span>{meal.largeQuantity}x Large</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Account</h1>
            <p className="text-gray-600">Manage your meal deliveries and account settings</p>
          </div>

          <Tabs defaultValue="deliveries" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="deliveries">Upcoming Deliveries</TabsTrigger>
              <TabsTrigger value="orders">Order History</TabsTrigger>
              <TabsTrigger value="profile">Profile Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="deliveries" className="space-y-4">
              {isLoadingUpcomingMeals ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading upcoming deliveries...</p>
                </div>
              ) : displayUpcomingMeals?.upcomingMeals?.length > 0 ? (
                <div className="space-y-4">
                  {displayUpcomingMeals.upcomingMeals.map((week: any) => renderWeekCard(week))}
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No upcoming deliveries</h3>
                    <p className="text-gray-600 mb-4">You don't have any upcoming meal deliveries scheduled.</p>
                    <Link href="/meal-plans">
                      <Button>Browse Meal Plans</Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="orders" className="space-y-4">
              {ordersData?.orders?.length > 0 ? (
                <div className="space-y-4">
                  {ordersData.orders.map((order: any) => (
                    <Card key={order.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">Order #{order.id}</CardTitle>
                          <Badge variant={order.status === 'confirmed' ? 'default' : 'secondary'}>
                            {order.status}
                          </Badge>
                        </div>
                        <CardDescription>
                          Week {order.weekId} • {order.mealCount} meals • EGP {order.totalPrice}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(order.createdAt).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <CreditCard className="h-4 w-4" />
                            {order.paymentMethod || 'Not specified'}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No order history</h3>
                    <p className="text-gray-600">Your previous orders will appear here.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="profile" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Profile Information</CardTitle>
                      <CardDescription>Update your personal information and delivery address</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(!isEditing)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      {isEditing ? 'Cancel' : 'Edit'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {isProfileLoading ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                    </div>
                  ) : (
                    <form onSubmit={handleUpdateProfile} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="name">Full Name</Label>
                          <Input
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            disabled={!isEditing}
                          />
                        </div>
                        <div>
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
                        <div>
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input
                            id="phone"
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            disabled={!isEditing}
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Delivery Address</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="street">Street</Label>
                            <Input
                              id="street"
                              name="street"
                              value={formData.street}
                              onChange={handleInputChange}
                              disabled={!isEditing}
                            />
                          </div>
                          <div>
                            <Label htmlFor="building">Building</Label>
                            <Input
                              id="building"
                              name="building"
                              value={formData.building}
                              onChange={handleInputChange}
                              disabled={!isEditing}
                            />
                          </div>
                          <div>
                            <Label htmlFor="apartment">Apartment</Label>
                            <Input
                              id="apartment"
                              name="apartment"
                              value={formData.apartment}
                              onChange={handleInputChange}
                              disabled={!isEditing}
                            />
                          </div>
                          <div>
                            <Label htmlFor="area">Area</Label>
                            <Input
                              id="area"
                              name="area"
                              value={formData.area}
                              onChange={handleInputChange}
                              disabled={!isEditing}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <Label htmlFor="landmark">Landmark</Label>
                            <Input
                              id="landmark"
                              name="landmark"
                              value={formData.landmark}
                              onChange={handleInputChange}
                              disabled={!isEditing}
                            />
                          </div>
                        </div>
                      </div>

                      {isEditing && (
                        <div className="flex gap-2">
                          <Button type="submit" disabled={isUpdating}>
                            {isUpdating ? 'Updating...' : 'Save Changes'}
                          </Button>
                          <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                            Cancel
                          </Button>
                        </div>
                      )}
                    </form>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Delivery Edit Dialog */}
      <Dialog open={!!editingDelivery} onOpenChange={() => setEditingDelivery(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Delivery</DialogTitle>
            <DialogDescription>
              Change your meal count and portion size for this delivery.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="mealCount">Number of Meals</Label>
              <Select
                value={editForm.mealCount.toString()}
                onValueChange={(value) => setEditForm(prev => ({ ...prev, mealCount: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map(count => (
                    <SelectItem key={count} value={count.toString()}>
                      {count} meals
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="portionSize">Portion Size</Label>
              <Select
                value={editForm.portionSize}
                onValueChange={(value) => setEditForm(prev => ({ ...prev, portionSize: value as any }))}
              >
                <SelectTrigger>
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
                id="applyToFuture"
                checked={editForm.applyToFuture}
                onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, applyToFuture: !!checked }))}
              />
              <Label htmlFor="applyToFuture">Apply to all future deliveries</Label>
            </div>

            <div className="p-3 bg-gray-50 rounded">
              <p className="text-sm font-medium">
                New Price: EGP {calculateDeliveryPrice(editForm.mealCount, editForm.portionSize)}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDelivery(null)}>
              Cancel
            </Button>
            <Button onClick={() => {
              toast({
                title: "Delivery updated",
                description: "Your delivery preferences have been updated."
              });
              setEditingDelivery(null);
            }}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Method Edit Dialog */}
      <Dialog open={!!editingPayment} onOpenChange={() => setEditingPayment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Payment Method</DialogTitle>
            <DialogDescription>
              Change your payment method for this delivery.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select
                value={paymentForm.paymentMethod}
                onValueChange={(value) => setPaymentForm(prev => ({ ...prev, paymentMethod: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
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
                id="applyPaymentToFuture"
                checked={paymentForm.applyToFuture}
                onCheckedChange={(checked) => setPaymentForm(prev => ({ ...prev, applyToFuture: !!checked }))}
              />
              <Label htmlFor="applyPaymentToFuture">Apply to all future deliveries</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPayment(null)}>
              Cancel
            </Button>
            <Button onClick={() => {
              toast({
                title: "Payment method updated",
                description: "Your payment method has been updated."
              });
              setEditingPayment(null);
            }}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountPage;