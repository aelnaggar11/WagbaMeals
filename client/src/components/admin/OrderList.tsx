import React, { useState } from "react";
import { Calendar, Clock, DollarSign, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Order, User as UserType } from "@shared/schema";
import { formatCurrency, formatDate, getStatusClass } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { CacheManager } from "@/lib/cacheManager";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface OrderListProps {
  orders: Order[];
  showActions?: boolean;
  onUpdateStatus?: (orderId: number, status: string) => void;
  onToggleDelivery?: (orderId: number, currentDelivered: boolean) => void;
}

const OrderList = ({ orders, showActions = false, onUpdateStatus, onToggleDelivery }: OrderListProps) => {
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const { toast } = useToast();

  // Internal status update handler with cache management
  const handleStatusUpdate = async (orderId: number, newStatus: string) => {
    if (onUpdateStatus) {
      // Use parent handler if provided
      onUpdateStatus(orderId, newStatus);
    } else {
      // Internal handler with cache management
      try {
        await CacheManager.updateOrderStatusWithCache(
          orderId,
          newStatus,
          () => apiRequest('PATCH', `/api/admin/orders/${orderId}`, { status: newStatus })
        );
        
        toast({
          title: "Order updated",
          description: `Order #${orderId} status updated to ${newStatus}`
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to update order status. Please try again.",
          variant: "destructive"
        });
      }
    }
  };
  
  // Get users data for showing names
  const { data: usersData } = useQuery<{ users: UserType[] }>({
    queryKey: ['/api/admin/users'],
    enabled: showActions,
  });
  
  // Helper to get user name by ID
  const getUserNameById = (userId: number) => {
    const user = usersData?.users.find(u => u.id === userId);
    return user?.name || user?.username || `User #${userId}`;
  };
  
  const toggleExpandOrder = (orderId: number) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
    } else {
      setExpandedOrderId(orderId);
    }
  };
  
  // Get order items for an expanded order
  const { data: orderItems } = useQuery<any>({
    queryKey: [`/api/orders/${expandedOrderId}/items`],
    enabled: !!expandedOrderId,
  });
  
  if (orders.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-500">No orders found</p>
      </div>
    );
  }
  
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
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">{status}</Badge>;
    }
  };
  
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order ID</TableHead>
            {showActions && <TableHead>Customer</TableHead>}
            <TableHead>Date</TableHead>
            <TableHead>Items</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Delivery Date</TableHead>
            {showActions && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).map((order) => (
            <React.Fragment key={order.id}>
              <TableRow className={expandedOrderId === order.id ? "border-b-0" : ""}>
                <TableCell className="font-medium">#{order.id}</TableCell>
                {showActions && (
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center">
                      <User size={14} className="mr-1 text-gray-500" />
                      {getUserNameById(order.userId)}
                    </div>
                  </TableCell>
                )}
                <TableCell className="whitespace-nowrap">
                  <div className="flex items-center">
                    <Calendar size={14} className="mr-1 text-gray-500" />
                    {new Date(order.createdAt || 0).toLocaleDateString()}
                  </div>
                </TableCell>
                <TableCell>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => toggleExpandOrder(order.id)}
                    className="p-0 h-auto font-normal"
                  >
                    {order.mealCount} meals
                  </Button>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <div className="flex items-center">
                    <DollarSign size={14} className="mr-1 text-gray-500" />
                    {formatCurrency(order.total)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(order.status || 'not_selected')}
                    {order.delivered && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        ✓ Delivered
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <div className="flex items-center">
                    <Clock size={14} className="mr-1 text-gray-500" />
                    {order.deliveryDate}
                  </div>
                </TableCell>
                {showActions && (
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">Update Status</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={() => onToggleDelivery && onToggleDelivery(order.id, order.delivered || false)}
                        >
                          {order.delivered ? "Mark as Not Delivered" : "Mark as Delivered"}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleStatusUpdate(order.id, 'cancelled')}
                          disabled={order.status === 'cancelled'}
                          className="text-red-500"
                        >
                          Set as Cancelled
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
              
              {/* Expanded order details */}
              {expandedOrderId === order.id && (
                <TableRow>
                  <TableCell colSpan={showActions ? 8 : 7} className="bg-gray-50 p-4">
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-medium mb-2">Order Details</h4>
                          <div className="text-sm space-y-1">
                            <p><span className="font-medium">Portion Size:</span> {order.defaultPortionSize.charAt(0).toUpperCase() + order.defaultPortionSize.slice(1)}</p>
                            <p><span className="font-medium">Subtotal:</span> {formatCurrency(order.subtotal)}</p>
                            {order.discount > 0 && (
                              <p><span className="font-medium">Discount:</span> {formatCurrency(order.discount)}</p>
                            )}
                            <p><span className="font-medium">Total:</span> {formatCurrency(order.total)}</p>
                          </div>
                        </div>
                        
                        {order.deliveryAddress && (
                          <div>
                            <h4 className="text-sm font-medium mb-2">Delivery Information</h4>
                            <div className="text-sm space-y-1">
                              <p><span className="font-medium">Address:</span> {order.deliveryAddress}</p>
                              {order.deliveryNotes && (
                                <p><span className="font-medium">Notes:</span> {order.deliveryNotes}</p>
                              )}
                              <p><span className="font-medium">Payment Method:</span> {order.paymentMethod || "Not specified"}</p>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {orderItems && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Selected Meals</h4>
                          <div className="text-sm space-y-1">
                            {/* Placeholder for order items */}
                            <p className="text-gray-500">Order items information not available</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default OrderList;
