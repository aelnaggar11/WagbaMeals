import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User, Meal, OrderItem } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { User as UserIcon, MapPin, Calendar, Clock, ChevronLeft, ChevronRight, Check, X, Edit, Package, Loader2, Lock, CreditCard, Settings, Eye } from "lucide-react";
import MealSelectionPanel from "@/components/MealSelectionPanel";

const AccountPage = () => {
  const [location, navigate] = useLocation();
  const { toast } = useToast();

  // All state declarations must be at the top level - NEVER move these or add conditions
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [processingWeekId, setProcessingWeekId] = useState<number | null>(null);
  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(null);
  const [viewingOrderId, setViewingOrderId] = useState<number | null>(null);
  const [localUpcomingMeals, setLocalUpcomingMeals] = useState<any>(null);

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

  // ALL QUERIES MUST BE CALLED UNCONDITIONALLY
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

  const { data: ordersData } = useQuery<{ orders: any[] }>({
    queryKey: ['/api/orders'],
    enabled: !!currentUser
  });

  const { data: upcomingMealsData, isLoading: isLoadingUpcomingMeals } = useQuery({
    queryKey: ['/api/user/upcoming-meals'],
    enabled: !!currentUser
  });

  // ALL MUTATIONS MUST BE CALLED UNCONDITIONALLY
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

  // ALL EFFECTS MUST BE CALLED UNCONDITIONALLY BEFORE ANY EARLY RETURNS
  useEffect(() => {
    if (!isUserLoading && !currentUser) {
      navigate('/auth?returnTo=' + encodeURIComponent(location));
    }
  }, [isUserLoading, currentUser, navigate, location]);

  useEffect(() => {
    if ((upcomingMealsData as any)?.upcomingMeals && (upcomingMealsData as any).upcomingMeals.length > 0) {
      if (!localUpcomingMeals) {
        setLocalUpcomingMeals(upcomingMealsData);
      }

      if (!selectedWeekId) {
        const firstDeliveryWeek = (upcomingMealsData as any).upcomingMeals.find((week: any) => 
          week.orderId && !week.isSkipped
        );

        const weekToSelect = firstDeliveryWeek 
          ? firstDeliveryWeek.weekId 
          : (upcomingMealsData as any).upcomingMeals[0].weekId;

        setSelectedWeekId(weekToSelect);
      }
    }
  }, [upcomingMealsData, selectedWeekId, localUpcomingMeals]);

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
    // Check if the label matches the format "DD/MM/YYYY" (delivery date)
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
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December'];

        const dayNumber = date.getDate();
        const monthName = monthNames[date.getMonth()];

        // Always format as Saturday delivery date
        return `Sat ${dayNumber} ${monthName}`;
      }
    }

    // Handle formats like "June 28-July 4, 2025" (cross-month ranges)
    const crossMonthMatch = weekLabel.match(/(\w+)\s+(\d+)-(\w+)\s+(\d+),?\s*(\d+)/);
    if (crossMonthMatch) {
      const [, startMonthName, startDay, endMonthName, endDay, year] = crossMonthMatch;
      // Use the end day and month (Saturday delivery date)
      return `Sat ${endDay} ${endMonthName}`;
    }

    // Handle formats like "May 19-25, 2025" (same month ranges)
    const sameMonthMatch = weekLabel.match(/(\w+)\s+(\d+)-(\d+),?\s*(\d+)/);
    if (sameMonthMatch) {
      const [, monthName, startDay, endDay, year] = sameMonthMatch;
      // Use the end day (Saturday delivery date)
      return `Sat ${endDay} ${monthName}`;
    }

    // Handle simple formats like "July 4, 2025"
    const simpleMatch = weekLabel.match(/(\w+)\s+(\d+),?\s*(\d+)/);
    if (simpleMatch) {
      const [, monthName, day, year] = simpleMatch;
      return `Sat ${day} ${monthName}`;
    }

    // Return original label if no pattern matches
    return weekLabel;
  };

  // Use local state if available, otherwise fall back to server data
  const displayUpcomingMeals = localUpcomingMeals || upcomingMealsData;

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

  // Get currently selected week data
  const selectedWeek = displayUpcomingMeals?.upcomingMeals?.find((week: any) => week.weekId === selectedWeekId);

  // Get available weeks for navigation
  const availableWeeks = displayUpcomingMeals?.upcomingMeals || [];
  const currentWeekIndex = availableWeeks.findIndex((week: any) => week.weekId === selectedWeekId);

  const goToPreviousWeek = () => {
    if (currentWeekIndex > 0) {
      setSelectedWeekId(availableWeeks[currentWeekIndex - 1].weekId);
    }
  };

  const goToNextWeek = () => {
    if (currentWeekIndex < availableWeeks.length - 1) {
      setSelectedWeekId(availableWeeks[currentWeekIndex + 1].weekId);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          

          <Tabs defaultValue="upcoming" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="upcoming">Upcoming Meals</TabsTrigger>
              <TabsTrigger value="history">Order History</TabsTrigger>
              <TabsTrigger value="profile">Profile</TabsTrigger>
            </TabsList>

            {/* Upcoming Orders Tab */}
            <TabsContent value="upcoming" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl text-red-600">Upcoming Deliveries</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingUpcomingMeals ? (
                    <div className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                      <p className="text-gray-600">Loading deliveries...</p>
                    </div>
                  ) : availableWeeks.length > 0 ? (
                    <div className="space-y-6">
                      {/* Horizontal Week Navigation */}
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {availableWeeks.map((week: any) => {
                          const isSelected = week.weekId === selectedWeekId;

                          return (
                            <button
                              key={week.weekId}
                              className={`flex-shrink-0 px-6 py-3 rounded-lg border text-center transition-colors ${
                                isSelected 
                                  ? 'border-red-500 bg-red-50 text-red-700' 
                                  : week.isSkipped
                                  ? 'border-gray-300 bg-gray-50 text-gray-500'
                                  : 'border-gray-300 bg-white text-gray-700 hover:border-red-300'
                              }`}
                              onClick={() => setSelectedWeekId(week.weekId)}
                            >
                              <div className="font-medium">
                                {formatWeekLabel(week.weekLabel)}
                              </div>
                              {week.isSkipped && (
                                <div className="text-xs mt-1">
                                  Skipped
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Selected Week Details */}
                      {selectedWeek && (
                        <div className="space-y-6">
                          {/* Week Header */}
                          <div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">
                              {formatWeekLabel(selectedWeek.weekLabel)}
                            </h2>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span>Order By: Wednesday 25 June 2025</span>
                              <span>Delivery Date: Saturday 12 July 2025</span>
                            </div>
                          </div>

                          {/* Order Status */}
                          <div className="flex items-center gap-4">
                            <span className="text-lg font-semibold">{selectedWeek.mealCount} meals</span>
                            {selectedWeek.isSkipped && (
                              <Badge variant="secondary">
                                Skipped
                              </Badge>
                            )}
                            {!isOrderDeadlinePassed(selectedWeek.weekLabel) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => selectedWeek.isSkipped ? handleUnskipOrder(selectedWeek.orderId) : handleSkipOrder(selectedWeek.orderId)}
                                disabled={processingWeekId === selectedWeek.orderId}
                              >
                                {processingWeekId === selectedWeek.orderId ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Processing...
                                  </>
                                ) : (
                                  <>
                                    <X className="h-4 w-4 mr-2" />
                                    Skip Delivery
                                  </>
                                )}
                              </Button>
                            )}
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Selection
                            </Button>
                          </div>

                          {/* Your Selected Meals */}
                          {selectedWeek.orderId && !selectedWeek.isSkipped && (
                            <Card>
                              <CardHeader>
                                <CardTitle>Your Selected Meals</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <MealSelectionPanel
                                  weekId={selectedWeek.weekId}
                                  orderId={selectedWeek.orderId}
                                  mealCount={selectedWeek.mealCount}
                                  canEdit={!isOrderDeadlinePassed(selectedWeek.weekLabel)}
                                  isSkipped={selectedWeek.isSkipped}
                                  selectedItems={selectedWeek.meals || []}
                                />
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No upcoming deliveries</h3>
                      <p className="text-gray-600 mb-4">You haven't placed any orders yet.</p>
                      <Link href="/meal-plans">
                        <Button>Browse Plans</Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Order History Tab */}
            <TabsContent value="history" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Order History</CardTitle>
                  <CardDescription>View your previous orders and meal selections</CardDescription>
                </CardHeader>
                <CardContent>
                  {ordersData?.orders && ordersData.orders.length > 0 ? (
                    <div className="space-y-4">
                      {ordersData.orders
                        .filter((order: any) => order.status === 'confirmed' || order.status === 'delivered')
                        .map((order: any) => (
                          <Card key={order.id} className="border-l-4 border-l-primary">
                            <CardHeader>
                              <div className="flex items-center justify-between">
                                <div>
                                  <CardTitle className="text-lg">Order #{order.id}</CardTitle>
                                  <CardDescription>
                                    Week {order.weekId} • Ordered on {new Date(order.createdAt).toLocaleDateString()}
                                  </CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant={order.status === 'delivered' ? 'default' : 'secondary'}>
                                    {order.status}
                                  </Badge>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => setViewingOrderId(order.id)}
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </Button>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <p className="text-sm font-medium text-gray-600">Meal Count</p>
                                  <p className="text-lg">{order.mealCount} meals</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-600">Total Price</p>
                                  <p className="text-lg font-semibold">EGP {order.totalPrice}</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-600">Payment Method</p>
                                  <p className="text-lg">{order.paymentMethod || 'Not specified'}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No order history</h3>
                      <p className="text-gray-600 mb-4">Your completed orders will appear here.</p>
                      <Link href="/meal-plans">
                        <Button>Browse Meal Plans</Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Profile Information */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Profile Information</CardTitle>
                        <CardDescription>Your personal details and contact information</CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditing(!isEditing)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        {isEditing ? 'Cancel' : 'Edit'}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      <form onSubmit={handleUpdateProfile} className="space-y-4">
                        <div>
                          <Label htmlFor="name">Full Name</Label>
                          <Input
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            required
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
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input
                            id="phone"
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button type="submit" disabled={isUpdating}>
                            {isUpdating ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Updating...
                              </>
                            ) : (
                              'Save Changes'
                            )}
                          </Button>
                          <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                            Cancel
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                            <UserIcon className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <p className="font-medium">{(profile as any)?.name || 'User'}</p>
                            <p className="text-sm text-gray-600">{(profile as any)?.email}</p>
                          </div>
                        </div>
                        <Separator />
                        <div className="space-y-2">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Phone</p>
                            <p>{(profile as any)?.phone || 'Not provided'}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Delivery Address */}
                <Card>
                  <CardHeader>
                    <CardTitle>Delivery Address</CardTitle>
                    <CardDescription>Where your meals will be delivered</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="street">Street</Label>
                            <Input
                              id="street"
                              name="street"
                              value={formData.street}
                              onChange={handleInputChange}
                            />
                          </div>
                          <div>
                            <Label htmlFor="building">Building</Label>
                            <Input
                              id="building"
                              name="building"
                              value={formData.building}
                              onChange={handleInputChange}
                            />
                          </div>
                          <div>
                            <Label htmlFor="apartment">Apartment</Label>
                            <Input
                              id="apartment"
                              name="apartment"
                              value={formData.apartment}
                              onChange={handleInputChange}
                            />
                          </div>
                          <div>
                            <Label htmlFor="area">Area</Label>
                            <Input
                              id="area"
                              name="area"
                              value={formData.area}
                              onChange={handleInputChange}
                            />
                          </div>
                          <div className="col-span-2">
                            <Label htmlFor="landmark">Landmark</Label>
                            <Input
                              id="landmark"
                              name="landmark"
                              value={formData.landmark}
                              onChange={handleInputChange}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm">
                              {formData.street && formData.building 
                                ? `${formData.street}, ${formData.building}${formData.apartment ? `, Apt ${formData.apartment}` : ''}`
                                : 'No address provided'
                              }
                            </p>
                            {formData.area && <p className="text-sm text-gray-600">{formData.area}</p>}
                            {formData.landmark && <p className="text-sm text-gray-600">Near {formData.landmark}</p>}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
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

      {/* Order Details Dialog */}
      <Dialog open={!!viewingOrderId} onOpenChange={() => setViewingOrderId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              View the details of your past order
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {viewingOrderId && ordersData?.orders && (
              (() => {
                const order = ordersData.orders.find((o: any) => o.id === viewingOrderId);if (!order) return <p>Order not found</p>;

                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Order ID</p>
                        <p className="text-lg">#{order.id}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Status</p>
                        <Badge variant={order.status === 'delivered' ? 'default' : 'secondary'}>
                          {order.status}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Week</p>
                        <p className="text-lg">Week {order.weekId}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Order Date</p>
                        <p className="text-lg">{new Date(order.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Meal Count</p>
                        <p className="text-lg">{order.mealCount} meals</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Price</p>
                        <p className="text-lg font-semibold">EGP {order.totalPrice}</p>
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <h4 className="font-medium mb-2">Payment Information</h4>
                      <p className="text-sm text-gray-600">
                        Payment Method: {order.paymentMethod || 'Not specified'}
                      </p>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingOrderId(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountPage;