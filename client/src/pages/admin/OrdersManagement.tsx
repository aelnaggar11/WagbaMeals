import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Admin, Order, Week, User, Meal, Neighborhood } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CacheManager } from "@/lib/cacheManager";
import { formatCurrency } from "@/lib/utils";
import { Package, Clock, MapPin, CreditCard, Users } from "lucide-react";
import OrderList from "@/components/admin/OrderList";

// Helper function to format delivery address from JSON string
const formatDeliveryAddress = (addressString: string | null) => {
  if (!addressString) return null;
  
  try {
    const address = JSON.parse(addressString);
    const parts = [];
    
    // Add name if available
    if (address.name) {
      parts.push(address.name);
    }
    
    // Add street address
    if (address.street) {
      parts.push(address.street);
    }
    
    // Add apartment/building info
    const apartmentInfo = [];
    if (address.apartment) {
      apartmentInfo.push(`Apt ${address.apartment}`);
    }
    if (address.building) {
      apartmentInfo.push(`Building ${address.building}`);
    }
    if (apartmentInfo.length > 0) {
      parts.push(apartmentInfo.join(', '));
    }
    
    // Add area/neighborhood
    if (address.area) {
      parts.push(address.area);
    }
    
    // Add landmark if available
    if (address.landmark) {
      parts.push(`Near ${address.landmark}`);
    }
    
    // Add phone if available
    if (address.phone) {
      parts.push(`📞 ${address.phone}`);
    }
    
    return parts.join(', ');
  } catch (error) {
    // If it's not valid JSON, return the original string
    return addressString;
  }
};

const OrdersManagement = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Force re-render state
  const [forceUpdate, setForceUpdate] = useState(0);
  
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
  
  // State for filtering
  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("orders-list");
  
  // Fetch weeks data
  const { data: weeksData } = useQuery<{ weeks: Week[] }>({
    queryKey: ['/api/weeks'],
  });
  
  // Fetch orders data with force update dependency
  const { data: ordersData, refetch: refetchOrders } = useQuery<{ orders: Order[] }>({
    queryKey: ['/api/admin/orders', forceUpdate],
  });
  
  // Fetch users data
  const { data: usersData } = useQuery<{ users: User[] }>({
    queryKey: ['/api/admin/users'],
  });
  
  // Fetch meals data
  const { data: mealsData } = useQuery<{ meals: Meal[] }>({
    queryKey: ['/api/meals'],
  });

  // Fetch neighborhoods data
  const { data: neighborhoodsData } = useQuery<{ neighborhoods: Neighborhood[] }>({
    queryKey: ['/api/neighborhoods'],
  });
  
  // Get weeks where the deadline has passed (for Orders List and Meal Prep)
  const pastDeadlineWeeks = weeksData?.weeks.filter(week => {
    const deadlineDate = new Date(week.orderDeadline);
    const today = new Date();
    return deadlineDate < today;
  }).sort((a, b) => new Date(b.orderDeadline).getTime() - new Date(a.orderDeadline).getTime()) || [];
  
  // Get upcoming weeks (for Upcoming Orders)
  const upcomingWeeks = weeksData?.weeks.filter(week => {
    const deadlineDate = new Date(week.orderDeadline);
    const today = new Date();
    return deadlineDate >= today;
  }).sort((a, b) => new Date(a.orderDeadline).getTime() - new Date(b.orderDeadline).getTime()) || [];
  
  // Set default week selection
  if (!selectedWeekId && pastDeadlineWeeks.length > 0) {
    setSelectedWeekId(pastDeadlineWeeks[0].id);
  }
  
  // Helper functions
  const getUserById = (userId: number) => {
    return usersData?.users.find(u => u.id === userId);
  };
  
  const getMealById = (mealId: number) => {
    return mealsData?.meals.find(m => m.id === mealId);
  };
  
  // Handle status update with forced component re-render
  const handleUpdateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      // Update the server
      await apiRequest('PATCH', `/api/admin/orders/${orderId}`, { status: newStatus });
      
      // Force component re-render by updating force update state
      setForceUpdate(prev => prev + 1);
      
      // Also trigger manual refetch
      await refetchOrders();
      
      toast({
        title: "Order updated",
        description: `Order #${orderId} status updated to ${newStatus}`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "There was an error updating the order. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle delivery status toggle
  const handleToggleDelivery = async (orderId: number, currentDelivered: boolean | null) => {
    try {
      const isCurrentlyDelivered = currentDelivered || false;
      // Update the server
      await apiRequest('PATCH', `/api/admin/orders/${orderId}`, { delivered: !isCurrentlyDelivered });
      
      // Force component re-render by updating force update state
      setForceUpdate(prev => prev + 1);
      
      // Also trigger manual refetch
      await refetchOrders();
      
      toast({
        title: "Delivery status updated",
        description: `Order #${orderId} marked as ${!isCurrentlyDelivered ? 'delivered' : 'not delivered'}`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "There was an error updating the delivery status. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Orders List Component
  const OrdersListTab = () => {
    const [statusFilter, setStatusFilter] = useState<string>('active'); // 'all', 'active', 'skipped', 'selected', 'not_selected'
    const [neighborhoodFilter, setNeighborhoodFilter] = useState<string>('all'); // 'all' or specific neighborhood name
    
    let weekOrders = selectedWeekId ? ordersData?.orders.filter(order => order.weekId === selectedWeekId) || [] : [];
    
    // Apply status filter
    if (statusFilter === 'active') {
      weekOrders = weekOrders.filter(order => order.status !== 'skipped');
    } else if (statusFilter !== 'all') {
      weekOrders = weekOrders.filter(order => order.status === statusFilter);
    }

    // Apply neighborhood filter
    if (neighborhoodFilter !== 'all') {
      weekOrders = weekOrders.filter(order => {
        if (!order.deliveryAddress) return false;
        try {
          const address = JSON.parse(order.deliveryAddress);
          return address.area === neighborhoodFilter;
        } catch (error) {
          return false;
        }
      });
    }

    // Get serviced neighborhoods for filter dropdown
    const servicedNeighborhoods = neighborhoodsData?.neighborhoods.filter(n => n.isServiced) || [];
    
    const { data: orderItemsData } = useQuery<any>({
      queryKey: [`/api/orders/items`, selectedWeekId],
      queryFn: async () => {
        if (!selectedWeekId) return null;
        const items: any = {};
        
        // Fetch order items in smaller batches to avoid overwhelming the server
        const batchSize = 5;
        for (let i = 0; i < weekOrders.length; i += batchSize) {
          const batch = weekOrders.slice(i, i + batchSize);
          
          const batchPromises = batch.map(async (order) => {
            try {
              const response = await fetch(`/api/orders/${order.id}/items`, {
                credentials: 'include'
              });
              if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
              }
              const data = await response.json();
              return { orderId: order.id, items: data };
            } catch (error) {
              // Silently handle failed requests without console errors
              return { orderId: order.id, items: [] };
            }
          });
          
          const batchResults = await Promise.allSettled(batchPromises);
          batchResults.forEach((result) => {
            if (result.status === 'fulfilled') {
              items[result.value.orderId] = result.value.items;
            }
          });
          
          // Small delay between batches to prevent server overload
          if (i + batchSize < weekOrders.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        
        return items;
      },
      enabled: !!selectedWeekId && weekOrders.length > 0,
      retry: 1,
      refetchOnWindowFocus: false
    });

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Orders for Delivery</h3>
          <div className="flex gap-4">
            <Select
              value={statusFilter}
              onValueChange={setStatusFilter}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Orders</SelectItem>
                <SelectItem value="active">Active Orders (Default)</SelectItem>
                <SelectItem value="selected">Selected Only</SelectItem>
                <SelectItem value="not_selected">Not Selected Only</SelectItem>
                <SelectItem value="skipped">Skipped Only</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={neighborhoodFilter}
              onValueChange={setNeighborhoodFilter}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by neighborhood" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Neighborhoods</SelectItem>
                {servicedNeighborhoods.map((neighborhood) => (
                  <SelectItem key={neighborhood.id} value={neighborhood.name}>
                    {neighborhood.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedWeekId?.toString() || ""}
              onValueChange={(value) => setSelectedWeekId(parseInt(value))}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select week" />
              </SelectTrigger>
              <SelectContent>
                {pastDeadlineWeeks.map((week) => (
                  <SelectItem key={week.id} value={week.id.toString()}>
                    {week.label} - Delivery: {new Date(week.deliveryDate).toLocaleDateString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedWeekId && (
          <div className="grid gap-4">
            {weekOrders.map((order) => {
              const user = getUserById(order.userId);
              const orderItems = orderItemsData?.[order.id] || [];
              
              return (
                <Card key={order.id} className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Order Info */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold">Order #{order.id}</h4>
                        <div className="flex items-center gap-2">
                          <Badge className={order.status === 'not_selected' ? 'bg-yellow-100 text-yellow-800' : 
                                          order.status === 'selected' ? 'bg-blue-100 text-blue-800' :
                                          order.status === 'skipped' ? 'bg-red-100 text-red-800' : 
                                          'bg-gray-100 text-gray-800'}>
                            {order.status}
                          </Badge>
                          {order.delivered && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              ✓ Delivered
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center">
                          <Users size={14} className="mr-2 text-gray-500" />
                          {user?.name || user?.username || `User #${order.userId}`}
                        </div>
                        <div className="flex items-center">
                          <Package size={14} className="mr-2 text-gray-500" />
                          {order.mealCount} meals • {formatCurrency(order.total)}
                        </div>
                        <div className="flex items-center">
                          <CreditCard size={14} className="mr-2 text-gray-500" />
                          {order.paymentMethod || "Not specified"}
                        </div>
                      </div>
                    </div>

                    {/* Delivery Info */}
                    <div>
                      <h5 className="font-medium mb-2">Delivery Information</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-start">
                          <MapPin size={14} className="mr-2 text-gray-500 mt-0.5" />
                          <div>
                            <div>{formatDeliveryAddress(order.deliveryAddress) || "No address provided"}</div>
                            {order.deliveryNotes && (
                              <div className="text-gray-600 mt-1">Note: {order.deliveryNotes}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Meal Items */}
                    <div>
                      <h5 className="font-medium mb-2">Items to Pack</h5>
                      {orderItems.length > 0 ? (
                        <div className="space-y-1 text-sm">
                          {orderItems.map((item: any, index: number) => {
                            const meal = getMealById(item.mealId);
                            return (
                              <div key={index} className="flex justify-between">
                                <span>{meal?.title || `Meal #${item.mealId}`}</span>
                                <span className="text-gray-600">{item.portionSize}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-gray-500 text-sm">No specific items selected</div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t flex justify-end space-x-2">
                    <Button
                      size="sm"
                      variant={order.delivered ? "default" : "outline"}
                      onClick={() => handleToggleDelivery(order.id, order.delivered)}
                      className={order.delivered ? "bg-green-600 hover:bg-green-700" : ""}
                    >
                      {order.delivered ? "✓ Delivered" : "Mark Delivered"}
                    </Button>
                  </div>
                </Card>
              );
            })}
            
            {weekOrders.length === 0 && (
              <Card className="p-8 text-center">
                <p className="text-gray-500">No orders found for the selected week.</p>
              </Card>
            )}
          </div>
        )}
      </div>
    );
  };

  // Meal Prep Component
  const MealPrepTab = () => {
    const weekOrders = selectedWeekId ? ordersData?.orders.filter(order => order.weekId === selectedWeekId) || [] : [];
    
    const { data: allOrderItems } = useQuery<any>({
      queryKey: [`/api/meal-prep`, selectedWeekId],
      queryFn: async () => {
        if (!selectedWeekId) return [];
        const allItems: any[] = [];
        
        // Only fetch items for orders that have selected meals
        const selectedOrders = weekOrders.filter(order => order.status === 'selected');
        
        for (const order of selectedOrders) {
          try {
            const items = await apiRequest('GET', `/api/orders/${order.id}/items`);
            if (items && Array.isArray(items)) {
              allItems.push(...items);
            }
          } catch (error) {
            console.error(`Failed to fetch items for order ${order.id}:`, error);
          }
        }
        return allItems;
      },
      enabled: !!selectedWeekId && weekOrders.length > 0,
    });

    // Aggregate meal counts and calculate random meals needed
    const mealCounts: { [key: number]: { standard: number; large: number; meal?: Meal } } = {};
    let randomMealsNeeded = { standard: 0, large: 0 };
    
    // Count selected meals
    allOrderItems?.forEach((item: any) => {
      if (!mealCounts[item.mealId]) {
        mealCounts[item.mealId] = { standard: 0, large: 0, meal: getMealById(item.mealId) };
      }
      if (item.portionSize === 'standard') {
        mealCounts[item.mealId].standard++;
      } else if (item.portionSize === 'large') {
        mealCounts[item.mealId].large++;
      }
    });

    // Calculate random meals needed for "not_selected" orders
    weekOrders.forEach(order => {
      if (order.status === 'not_selected') {
        // For not_selected orders, we need the full meal count as random meals
        if (order.defaultPortionSize === 'standard') {
          randomMealsNeeded.standard += order.mealCount;
        } else {
          randomMealsNeeded.large += order.mealCount;
        }
      }
    });

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Meal Preparation Overview</h3>
          <Select
            value={selectedWeekId?.toString() || ""}
            onValueChange={(value) => setSelectedWeekId(parseInt(value))}
          >
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select week" />
            </SelectTrigger>
            <SelectContent>
              {pastDeadlineWeeks.map((week) => (
                <SelectItem key={week.id} value={week.id.toString()}>
                  {week.label} - Delivery: {new Date(week.deliveryDate).toLocaleDateString()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedWeekId && (
          <Card>
            <CardHeader>
              <CardTitle>Meals to Prepare</CardTitle>
              <CardDescription>
                Total orders: {weekOrders.length} • Total meals: {Object.values(mealCounts).reduce((sum, counts) => sum + counts.standard + counts.large, 0) + randomMealsNeeded.standard + randomMealsNeeded.large}
                {(randomMealsNeeded.standard > 0 || randomMealsNeeded.large > 0) && (
                  <span className="text-yellow-600"> (includes {randomMealsNeeded.standard + randomMealsNeeded.large} random meals)</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Meal</TableHead>
                    <TableHead className="text-center">Standard Portions</TableHead>
                    <TableHead className="text-center">Large Portions</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(mealCounts).map(([mealId, counts]) => (
                    <TableRow key={mealId}>
                      <TableCell className="font-medium">
                        {counts.meal?.title || `Meal #${mealId}`}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{counts.standard}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{counts.large}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge>{counts.standard + counts.large}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {/* Random Meal entry for unselected orders */}
                  {(randomMealsNeeded.standard > 0 || randomMealsNeeded.large > 0) && (
                    <TableRow className="bg-yellow-50 border-yellow-200">
                      <TableCell className="font-medium text-yellow-800">
                        🎲 Random Meal (for unselected orders)
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                          {randomMealsNeeded.standard}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                          {randomMealsNeeded.large}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-yellow-200 text-yellow-900 hover:bg-yellow-200">
                          {randomMealsNeeded.standard + randomMealsNeeded.large}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              
              {Object.keys(mealCounts).length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No meals to prepare for the selected week.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // Upcoming Orders Component
  const UpcomingOrdersTab = () => {
    const [selectedUpcomingWeekId, setSelectedUpcomingWeekId] = useState<number | null>(
      upcomingWeeks.length > 0 ? upcomingWeeks[0].id : null
    );
    const [statusFilter, setStatusFilter] = useState<string>('all'); // 'all', 'selected', 'not_selected', 'skipped', 'cancelled'
    const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all'); // 'all', or specific payment methods
    
    const getStatusBadge = (status: string) => {
      switch (status) {
        case 'not_selected':
          return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Not Selected</Badge>;
        case 'selected':
          return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Selected</Badge>;
        case 'skipped':
          return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Skipped</Badge>;
        case 'cancelled':
          return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Cancelled</Badge>;
        default:
          return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Not Selected</Badge>;
      }
    };
    
    let weekOrders = selectedUpcomingWeekId ? ordersData?.orders.filter(order => order.weekId === selectedUpcomingWeekId) || [] : [];
    
    // Apply status filter
    if (statusFilter !== 'all') {
      weekOrders = weekOrders.filter(order => (order.status || 'not_selected') === statusFilter);
    }
    
    // Apply payment method filter
    if (paymentMethodFilter !== 'all') {
      weekOrders = weekOrders.filter(order => order.paymentMethod === paymentMethodFilter);
    }
    
    const allUsers = usersData?.users || [];
    const usersWithOrders = new Set(weekOrders.map(order => order.userId));
    
    // Get unique payment methods from all orders for filter options
    const allWeekOrders = selectedUpcomingWeekId ? ordersData?.orders.filter(order => order.weekId === selectedUpcomingWeekId) || [] : [];
    const uniquePaymentMethods = [...new Set(allWeekOrders.map(order => order.paymentMethod).filter(Boolean))];

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Upcoming Orders</h3>
          <div className="flex gap-4">
            <Select
              value={statusFilter}
              onValueChange={setStatusFilter}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="selected">Selected Only</SelectItem>
                <SelectItem value="not_selected">Not Selected Only</SelectItem>
                <SelectItem value="skipped">Skipped Only</SelectItem>
                <SelectItem value="cancelled">Cancelled Only</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={paymentMethodFilter}
              onValueChange={setPaymentMethodFilter}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payment Methods</SelectItem>
                {uniquePaymentMethods.map((method) => (
                  <SelectItem key={method} value={method}>
                    {method}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedUpcomingWeekId?.toString() || ""}
              onValueChange={(value) => setSelectedUpcomingWeekId(parseInt(value))}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select upcoming week" />
              </SelectTrigger>
              <SelectContent>
                {upcomingWeeks.map((week) => (
                  <SelectItem key={week.id} value={week.id.toString()}>
                    {week.label} - Deadline: {new Date(week.orderDeadline).toLocaleDateString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedUpcomingWeekId && (
          <div className="grid gap-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-500">Active Orders</p>
                    <h3 className="text-2xl font-bold mt-1">{weekOrders.length}</h3>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-500">Users Without Orders</p>
                    <h3 className="text-2xl font-bold mt-1">{allUsers.length - usersWithOrders.size}</h3>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-500">Expected Revenue</p>
                    <h3 className="text-2xl font-bold mt-1">
                      {formatCurrency(weekOrders.reduce((sum, order) => sum + order.total, 0))}
                    </h3>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Orders Table */}
            <Card>
              <CardHeader>
                <CardTitle>User Orders Status</CardTitle>
                <CardDescription>Track which users have placed orders for the upcoming week</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Meals</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Order Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allUsers.map((user) => {
                      const userOrder = weekOrders.find(order => order.userId === user.id);
                      const allUserOrders = selectedUpcomingWeekId ? ordersData?.orders.filter(order => 
                        order.weekId === selectedUpcomingWeekId && order.userId === user.id
                      ) || [] : [];
                      const hasOrder = allUserOrders.length > 0;
                      
                      // If we're filtering and this user doesn't match the filters, skip them
                      if (statusFilter !== 'all' || paymentMethodFilter !== 'all') {
                        if (!userOrder) return null; // Skip users without orders when filtering
                      }
                      
                      return (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {user.name || user.username}
                          </TableCell>
                          <TableCell>
                            {userOrder ? (
                              getStatusBadge(userOrder.status || 'not_selected')
                            ) : hasOrder ? (
                              getStatusBadge(allUserOrders[0].status || 'not_selected')
                            ) : (
                              <Badge variant="outline" className="bg-gray-100 text-gray-600">No Order</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {userOrder ? `${userOrder.mealCount} meals` : hasOrder ? `${allUserOrders[0].mealCount} meals` : "-"}
                          </TableCell>
                          <TableCell>
                            {userOrder?.paymentMethod || (hasOrder ? allUserOrders[0].paymentMethod : "-") || "-"}
                          </TableCell>
                          <TableCell>
                            {userOrder ? formatCurrency(userOrder.total) : hasOrder ? formatCurrency(allUserOrders[0].total) : "-"}
                          </TableCell>
                          <TableCell>
                            {userOrder?.createdAt ? new Date(userOrder.createdAt).toLocaleDateString() : 
                             hasOrder && allUserOrders[0].createdAt ? new Date(allUserOrders[0].createdAt).toLocaleDateString() : "-"}
                          </TableCell>
                        </TableRow>
                      );
                    }).filter(Boolean)}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  };

  // Show loading state while checking authentication
  if (adminLoading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-gray-600">Loading orders management...</p>
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
          <h1 className="text-3xl font-bold mb-2">Orders Management</h1>
          <p className="text-gray-600">Manage orders, meal prep, and track upcoming deliveries</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/admin')}>
          Back to Dashboard
        </Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="orders-list" className="flex items-center space-x-2">
            <Package size={16} />
            <span>Orders List</span>
          </TabsTrigger>
          <TabsTrigger value="meal-prep" className="flex items-center space-x-2">
            <Clock size={16} />
            <span>Meal Prep</span>
          </TabsTrigger>
          <TabsTrigger value="upcoming-orders" className="flex items-center space-x-2">
            <Users size={16} />
            <span>Upcoming Orders</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="orders-list">
          <OrdersListTab />
        </TabsContent>
        
        <TabsContent value="meal-prep">
          <MealPrepTab />
        </TabsContent>
        
        <TabsContent value="upcoming-orders">
          <UpcomingOrdersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OrdersManagement;
