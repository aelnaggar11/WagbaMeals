import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import OrderList from "@/components/admin/OrderList";
import { User, Order, Week } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";

const OrdersManagement = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Check if user is admin
  const { data: user } = useQuery<User>({
    queryKey: ['/api/auth/me'],
  });
  
  const isAdmin = user?.isAdmin;
  
  // State for filtering
  const [activeWeekId, setActiveWeekId] = useState<number | string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Fetch weeks data
  const { data: weeksData } = useQuery<{ weeks: Week[] }>({
    queryKey: ['/api/weeks'],
  });
  
  // Fetch orders data
  const { data: ordersData } = useQuery<{ orders: Order[] }>({
    queryKey: ['/api/admin/orders'],
  });
  
  // Filter orders based on selected week and status
  const filteredOrders = ordersData?.orders.filter(order => {
    const weekMatch = activeWeekId === "all" || order.weekId === activeWeekId;
    const statusMatch = statusFilter === "all" || order.status === statusFilter;
    return weekMatch && statusMatch;
  }) || [];
  
  // Calculate totals for filtered orders
  const orderTotals = {
    count: filteredOrders.length,
    meals: filteredOrders.reduce((sum, order) => sum + order.mealCount, 0),
    revenue: filteredOrders.reduce((sum, order) => sum + order.total, 0),
  };
  
  // Handle status update
  const handleUpdateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      await apiRequest('PATCH', `/api/admin/orders/${orderId}`, {
        status: newStatus
      });
      
      // Invalidate orders query to refresh data
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
  
  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center justify-center py-12">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">You don't have permission to access the orders management.</p>
          <Button onClick={() => navigate('/')}>Return to Home</Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Orders Management</h1>
          <p className="text-gray-600">View and manage customer orders</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/admin')}>
          Back to Dashboard
        </Button>
      </div>
      
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <Card className="flex-1">
          <CardContent className="pt-6">
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium">Filter by Week</label>
              <Select
                value={activeWeekId.toString()}
                onValueChange={(value) => setActiveWeekId(value === "all" ? "all" : parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Week" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Weeks</SelectItem>
                  {weeksData?.weeks.map((week) => (
                    <SelectItem key={week.id} value={week.id.toString()}>
                      {week.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        
        <Card className="flex-1">
          <CardContent className="pt-6">
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium">Filter by Status</label>
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Order Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500">Total Orders</p>
              <h3 className="text-3xl font-bold mt-1">{orderTotals.count}</h3>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500">Total Meals</p>
              <h3 className="text-3xl font-bold mt-1">{orderTotals.meals}</h3>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500">Total Revenue</p>
              <h3 className="text-3xl font-bold mt-1">{formatCurrency(orderTotals.revenue)}</h3>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
          <CardDescription>
            {filteredOrders.length} orders found
            {activeWeekId !== "all" && weeksData?.weeks && ` for ${weeksData.weeks.find(w => w.id === activeWeekId)?.label}`}
            {statusFilter !== "all" && ` with status "${statusFilter}"`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrderList 
            orders={filteredOrders}
            onUpdateStatus={handleUpdateOrderStatus}
            showActions
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default OrdersManagement;
