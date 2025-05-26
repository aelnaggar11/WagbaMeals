import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Order, User, Meal, OrderItem, PortionSize } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDate, getStatusClass } from "@/lib/utils";
import { useLocation } from "wouter";
import FixedMealSelector from "@/pages/FixedMealSelector";

const AccountPage = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoadingMeals, setIsLoadingMeals] = useState(false);
  
  // Single state variable to track which week is being processed
  const [processingWeekId, setProcessingWeekId] = useState<number | null>(null);
  
  // Get authenticated user
  const { data: user } = useQuery({
    queryKey: ['/api/auth/me'],
  });
  
  // Get user profile
  const { data: profile } = useQuery({
    queryKey: ['/api/user/profile'],
    enabled: !!user
  });
  
  // Get order history
  const { data: ordersData } = useQuery({
    queryKey: ['/api/orders'],
    enabled: !!user
  });
  
  // Get upcoming meals
  const { data: upcomingMealsData, isLoading: isLoadingUpcomingMeals } = useQuery({
    queryKey: ['/api/user/upcoming-meals'],
    enabled: !!user
  });
  
  // Available meals
  const [availableMeals, setAvailableMeals] = useState<Meal[]>([]);
  const [selectedMeals, setSelectedMeals] = useState<OrderItem[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(null);
  const [mealCount, setMealCount] = useState(0);

  // Set initial selected week when data is loaded
  useEffect(() => {
    if (upcomingMealsData?.upcomingMeals && upcomingMealsData.upcomingMeals.length > 0 && !selectedWeekId) {
      setSelectedWeekId(upcomingMealsData.upcomingMeals[0].weekId);
    }
  }, [upcomingMealsData, selectedWeekId]);

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
          console.error("Failed to parse address:", e);
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

  // Skip/unskip implementation with immediate UI updates
  const handleSkipToggle = async (orderId: number, weekId: number, skip: boolean) => {
    try {
      // Set loading state
      setProcessingWeekId(weekId);
      
      // Make API call
      await apiRequest('PATCH', `/api/orders/${orderId}/skip`, { skip });
      
      // Immediately invalidate and refetch the data to show changes
      queryClient.invalidateQueries({ queryKey: ['/api/user/upcoming-meals'] });
      
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
      
      toast({
        title: "Error",
        description: `Failed to ${skip ? 'skip' : 'restore'} delivery. Please try again.`,
        variant: "destructive"
      });
      setProcessingWeekId(null);
    }
  };

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
        <Tabs defaultValue="upcoming" className="space-y-8">
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
                    const deliveryDate = new Date(week.deliveryDate);
                    const now = new Date();
                    const isDeadlinePassed = deadline < now;
                    
                    return (
                      <div key={`details-${week.weekId}`} className="space-y-6">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-xl">
                              {week.weekLabel}
                            </CardTitle>
                            <CardDescription>
                              <div className="text-sm mt-2">
                                <span className="block mb-1">
                                  <strong>Order By:</strong> {formatDate(deadline, true)}
                                </span>
                                <span className="block">
                                  <strong>Delivery Date:</strong> {formatDate(deliveryDate, true)}
                                </span>
                              </div>
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
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
                                <p className="font-medium">{week.mealCount} meals</p>
                                <p className="text-sm text-gray-500">
                                  {week.orderId ? "Order confirmed" : "No order yet"}
                                </p>
                              </div>
                              
                              <div className="space-x-2">
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
                            <FixedMealSelector 
                              weekId={week.weekId}
                              orderId={week.orderId}
                              mealCount={week.mealCount}
                              items={week.items}
                            />
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

          <TabsContent value="orders" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-primary mb-6">Order History</h2>
              
              {ordersData?.orders && ordersData.orders.length > 0 ? (
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
                    {ordersData.orders.map((order: Order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">#{order.id}</TableCell>
                        <TableCell>{formatDate(new Date(order.createdAt))}</TableCell>
                        <TableCell>
                          <span className={getStatusClass(order.status)}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </span>
                        </TableCell>
                        <TableCell>${order.total.toFixed(2)}</TableCell>
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="street">Street</Label>
                          <Input
                            id="street"
                            name="street"
                            value={formData.street}
                            onChange={handleInputChange}
                            disabled={!isEditing}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="building">Building</Label>
                          <Input
                            id="building"
                            name="building"
                            value={formData.building}
                            onChange={handleInputChange}
                            disabled={!isEditing}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="space-y-2">
                          <Label htmlFor="apartment">Apartment/Unit</Label>
                          <Input
                            id="apartment"
                            name="apartment"
                            value={formData.apartment}
                            onChange={handleInputChange}
                            disabled={!isEditing}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="area">Area/District</Label>
                          <Input
                            id="area"
                            name="area"
                            value={formData.area}
                            onChange={handleInputChange}
                            disabled={!isEditing}
                          />
                        </div>
                      </div>
                      <div className="space-y-2 mt-4">
                        <Label htmlFor="landmark">Landmark (Optional)</Label>
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
      </div>
    </div>
  );
};

export default AccountPage;
