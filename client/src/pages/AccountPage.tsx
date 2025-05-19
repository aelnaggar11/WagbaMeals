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

const AccountPage = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
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
  
  // Handle skipping/unskipping a delivery
  const handleSkipDelivery = async (orderId: number, skip: boolean) => {
    try {
      await apiRequest('PATCH', `/api/orders/${orderId}/skip`, { skip });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/user/upcoming-meals'] });
      
      toast({
        title: skip ? "Delivery Skipped" : "Delivery Restored",
        description: skip 
          ? "Your delivery has been skipped. You can unskip it anytime before the order deadline." 
          : "Your delivery has been restored. You can now edit your meal selections."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "There was an error updating your delivery. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Set initial selected week when data is loaded
  useEffect(() => {
    if (upcomingMealsData?.upcomingMeals && upcomingMealsData.upcomingMeals.length > 0 && !selectedWeekId) {
      setSelectedWeekId(upcomingMealsData.upcomingMeals[0].weekId);
    }
  }, [upcomingMealsData, selectedWeekId]);
  
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
                        className={`py-4 px-2 text-center rounded-md transition-colors relative ${
                          selectedWeekId === week.weekId 
                            ? 'border-2 border-primary bg-primary/5' 
                            : 'border border-gray-200 hover:bg-gray-50'
                        } ${week.isSkipped ? 'bg-gray-100' : ''}`}
                      >
                        <div className="font-medium mt-3">
                          {week.weekLabel.replace(/\d{4}/, '').trim()}
                        </div>
                        <div className="text-sm mt-1">
                          {new Date(week.deliveryDate).toLocaleDateString('en-US', {
                            day: 'numeric',
                            month: 'short'
                          })}
                        </div>
                        {week.isSkipped && (
                          <div className="absolute top-0 right-0 left-0 bg-red-500 text-white text-xs py-0.5 font-medium">
                            SKIPPED
                          </div>
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
                        <div className={`p-4 rounded-lg ${week.isSkipped ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'}`}>
                          <div className="flex items-start">
                            <div className={`mr-3 ${week.isSkipped ? 'text-red-500' : 'text-amber-500'}`}>
                              {week.isSkipped ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              )}
                            </div>
                            <div>
                              {week.isSkipped ? (
                                <>
                                  <p className="font-medium text-red-800">This delivery has been skipped</p>
                                  <p className="text-sm text-red-700 mt-1">You can unskip this delivery until {deadlineFormatted}</p>
                                </>
                              ) : (
                                <>
                                  <p className="font-medium text-amber-800">Order can be changed until {deadlineFormatted}</p>
                                  <p className="text-sm text-amber-700 mt-1">Make your meal selections before the deadline</p>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Action buttons */}
                        <div className="flex flex-wrap gap-3">
                          {week.canEdit && !week.isSkipped && (
                            <Button 
                              onClick={() => navigate(`/menu/${week.weekId}?edit=true`)}
                              className="flex items-center"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                              Edit Meals
                            </Button>
                          )}
                          
                          {week.orderId && week.canSkip && !week.isSkipped && (
                            <Button 
                              variant="outline" 
                              onClick={() => handleSkipDelivery(week.orderId as number, true)}
                              className="flex items-center border-red-300 text-red-700 hover:bg-red-50"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              Skip This Delivery
                            </Button>
                          )}
                          
                          {week.orderId && week.canUnskip && week.isSkipped && (
                            <Button 
                              variant="default"
                              onClick={() => handleSkipDelivery(week.orderId as number, false)}
                              className="flex items-center bg-green-600 hover:bg-green-700"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              Restore This Delivery
                            </Button>
                          )}
                        </div>
                        
                        {/* Meal selection status */}
                        {!week.isSkipped && (
                          <div className="border rounded-lg p-6">
                            <h3 className="text-lg font-semibold mb-4">Select Your Meals</h3>
                            
                            {week.items.length > 0 ? (
                              <>
                                <div className="text-right mb-4">
                                  <span className="bg-gray-100 px-3 py-1 rounded-full text-sm font-medium">
                                    {week.items.length} of {week.mealCount} selected
                                  </span>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {week.items.map((item) => (
                                    <div key={item.id} className="flex border rounded-md overflow-hidden">
                                      <div className="w-24 h-24 bg-gray-100">
                                        {item.meal.imageUrl && (
                                          <img 
                                            src={item.meal.imageUrl} 
                                            alt={item.meal.title} 
                                            className="w-full h-full object-cover"
                                          />
                                        )}
                                      </div>
                                      <div className="flex-1 p-3 flex flex-col justify-between">
                                        <div>
                                          <h4 className="font-medium">{item.meal.title}</h4>
                                          <div className="flex items-center mt-1 text-sm text-gray-500">
                                            <span>{item.meal.calories} cal</span>
                                            <span className="mx-2">•</span>
                                            <span>{item.meal.proteins}g protein</span>
                                          </div>
                                        </div>
                                        <div className="text-sm text-gray-600">
                                          {item.portionSize === 'large' ? 'Large portion' : 'Standard portion'}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </>
                            ) : (
                              <div className="text-center py-6">
                                <p className="text-gray-500 mb-4">You haven't selected any meals for this delivery yet.</p>
                                {week.canEdit && (
                                  <Button onClick={() => navigate(`/menu/${week.weekId}`)}>
                                    Select Meals
                                  </Button>
                                )}
                              </div>
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
                          <TableCell>{formatDate(order.createdAt)}</TableCell>
                          <TableCell>{order.mealCount} meals</TableCell>
                          <TableCell>{`EGP ${order.total.toFixed(0)}`}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusClass(order.status)}`}>
                              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            </span>
                          </TableCell>
                          <TableCell>{order.deliveryDate}</TableCell>
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
