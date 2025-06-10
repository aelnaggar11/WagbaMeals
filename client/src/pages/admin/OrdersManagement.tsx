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
import { Admin, Order, Week, User, Meal } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CacheManager } from "@/lib/cacheManager";
import { formatCurrency } from "@/lib/utils";
import { Package, Clock, MapPin, CreditCard, Users } from "lucide-react";
import OrderList from "@/components/admin/OrderList";

const OrdersManagement = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Force re-render state
  const [forceUpdate, setForceUpdate] = useState(0);
  
  // Check if admin is authenticated
  const { data: admin } = useQuery<Admin>({
    queryKey: ['/api/admin/auth/me'],
  });
  
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
    const weekOrders = selectedWeekId ? ordersData?.orders.filter(order => order.weekId === selectedWeekId) || [] : [];
    
    const { data: orderItemsData } = useQuery<any>({
      queryKey: [`/api/orders/items`, selectedWeekId],
      queryFn: async () => {
        if (!selectedWeekId) return null;
        const items: any = {};
        for (const order of weekOrders) {
          try {
            const response = await apiRequest('GET', `/api/orders/${order.id}/items`);
            items[order.id] = response;
          } catch (error) {
            console.error(`Failed to fetch items for order ${order.id}`);
            items[order.id] = [];
          }
        }
        return items;
      },
      enabled: !!selectedWeekId && weekOrders.length > 0,
    });

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Orders for Delivery</h3>
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
                            <div>{order.deliveryAddress || "No address provided"}</div>
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
        for (const order of weekOrders) {
          try {
            const items = await apiRequest('GET', `/api/orders/${order.id}/items`);
            allItems.push(...items);
          } catch (error) {
            console.error(`Failed to fetch items for order ${order.id}`);
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
        const orderItemCount = allOrderItems?.filter((item: any) => item.orderId === order.id).length || 0;
        const missingMeals = order.mealCount - orderItemCount;
        
        if (missingMeals > 0) {
          if (order.defaultPortionSize === 'standard') {
            randomMealsNeeded.standard += missingMeals;
          } else {
            randomMealsNeeded.large += missingMeals;
          }
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
          return <Badge variant="outline">{status}</Badge>;
      }
    };
    
    const weekOrders = selectedUpcomingWeekId ? ordersData?.orders.filter(order => order.weekId === selectedUpcomingWeekId) || [] : [];
    const allUsers = usersData?.users || [];
    const usersWithOrders = new Set(weekOrders.map(order => order.userId));

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Upcoming Orders</h3>
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
                      
                      return (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {user.name || user.username}
                          </TableCell>
                          <TableCell>
                            {userOrder ? (
                              getStatusBadge(userOrder.status || 'not_selected')
                            ) : (
                              <Badge variant="outline" className="bg-gray-100 text-gray-600">No Order</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {userOrder ? `${userOrder.mealCount} meals` : "-"}
                          </TableCell>
                          <TableCell>
                            {userOrder?.paymentMethod || "-"}
                          </TableCell>
                          <TableCell>
                            {userOrder ? formatCurrency(userOrder.total) : "-"}
                          </TableCell>
                          <TableCell>
                            {userOrder ? new Date(userOrder.createdAt).toLocaleDateString() : "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  };

  if (!admin) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center justify-center py-12">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">You don't have permission to access the orders management.</p>
          <Button onClick={() => navigate('/admin/login')}>Admin Login</Button>
        </div>
      </div>
    );
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
