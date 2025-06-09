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
import { formatCurrency } from "@/lib/utils";
import { Package, Clock, MapPin, CreditCard, Users } from "lucide-react";
import OrderList from "@/components/admin/OrderList";

const OrdersManagement = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
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
  
  // Fetch orders data
  const { data: ordersData } = useQuery<{ orders: Order[] }>({
    queryKey: ['/api/admin/orders'],
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
  
  // Handle status update
  const handleUpdateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      await apiRequest('PATCH', `/api/admin/orders/${orderId}`, {
        status: newStatus
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      
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
                        <Badge className={order.status === 'not_selected' ? 'bg-gray-100 text-gray-800' : 
                                        order.status === 'selected' ? 'bg-blue-100 text-blue-800' :
                                        order.status === 'skipped' ? 'bg-yellow-100 text-yellow-800' :
                                        order.status === 'delivered' ? 'bg-green-100 text-green-800' : 
                                        'bg-red-100 text-red-800'}>
                          {order.status === 'not_selected' ? 'Not Selected' : 
                           order.status === 'selected' ? 'Selected' :
                           order.status === 'skipped' ? 'Skipped' :
                           order.status}
                        </Badge>
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
                      variant="outline"
                      onClick={() => handleUpdateOrderStatus(order.id, 'selected')}
                      disabled={order.status === 'selected' || order.status === 'delivered' || order.status === 'cancelled'}
                    >
                      Mark Selected
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleUpdateOrderStatus(order.id, 'delivered')}
                      disabled={order.status === 'delivered' || order.status === 'cancelled' || order.status === 'not_selected'}
                    >
                      Mark Delivered
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

    // Aggregate meal counts
    const mealCounts: { [key: number]: { standard: number; large: number; meal?: Meal } } = {};
    
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
                Total orders: {weekOrders.length} • Total meals: {Object.values(mealCounts).reduce((sum, counts) => sum + counts.standard + counts.large, 0)}
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
                              <Badge className="bg-green-100 text-green-800">Has Order</Badge>
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
