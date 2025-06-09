import { queryClient } from './queryClient';

/**
 * Comprehensive cache management utilities to ensure UI updates are immediate and consistent
 */
export class CacheManager {
  /**
   * Invalidates all order-related queries to ensure UI consistency
   * @param orderId - Optional specific order ID to target
   */
  static async invalidateOrderQueries(orderId?: number): Promise<void> {
    const invalidationPromises = [
      // Admin order queries
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] }),
      
      // User order queries
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/user/orders'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/user/upcoming-meals'] }),
      
      // Specific order item queries
      ...(orderId ? [
        queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}/items`] }),
        queryClient.invalidateQueries({ queryKey: ['/api/orders', orderId, 'items'] })
      ] : []),
      
      // Predicate-based invalidation for dynamic queries
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const firstKey = query.queryKey[0];
          return typeof firstKey === 'string' && (
            firstKey.includes('/api/orders') || 
            firstKey.includes('/api/admin/orders') ||
            firstKey.includes('/api/user/orders') ||
            firstKey.includes('/api/user/upcoming-meals')
          );
        }
      })
    ];

    await Promise.all(invalidationPromises);
  }

  /**
   * Forces immediate refetch of critical order data
   */
  static async refetchOrderQueries(): Promise<void> {
    const refetchPromises = [
      queryClient.refetchQueries({ queryKey: ['/api/admin/orders'] }),
      queryClient.refetchQueries({ queryKey: ['/api/orders'] }),
      queryClient.refetchQueries({ queryKey: ['/api/user/upcoming-meals'] })
    ];

    await Promise.all(refetchPromises);
  }

  /**
   * Performs optimistic update for order status changes
   * @param orderId - The order ID to update
   * @param newStatus - The new status to apply
   */
  static optimisticUpdateOrderStatus(orderId: number, newStatus: string): void {
    // Update admin orders cache
    queryClient.setQueryData(['/api/admin/orders'], (oldData: any) => {
      if (!oldData?.orders) return oldData;
      
      return {
        ...oldData,
        orders: oldData.orders.map((order: any) => 
          order.id === orderId 
            ? { ...order, status: newStatus, updatedAt: new Date().toISOString() }
            : order
        )
      };
    });

    // Update user orders cache if it exists
    queryClient.setQueryData(['/api/orders'], (oldData: any) => {
      if (!oldData?.orders) return oldData;
      
      return {
        ...oldData,
        orders: oldData.orders.map((order: any) => 
          order.id === orderId 
            ? { ...order, status: newStatus, updatedAt: new Date().toISOString() }
            : order
        )
      };
    });
  }

  /**
   * Complete cache refresh for order status updates with rollback capability
   * @param orderId - The order ID being updated
   * @param newStatus - The new status
   * @param updateFn - The async function that performs the actual update
   */
  static async updateOrderStatusWithCache(
    orderId: number, 
    newStatus: string, 
    updateFn: () => Promise<any>
  ): Promise<void> {
    // Store original data for rollback
    const adminOrdersData = queryClient.getQueryData(['/api/admin/orders']);
    const userOrdersData = queryClient.getQueryData(['/api/orders']);

    try {
      // Apply optimistic update
      this.optimisticUpdateOrderStatus(orderId, newStatus);

      // Perform the actual update
      await updateFn();

      // Invalidate and refetch to ensure consistency
      await this.invalidateOrderQueries(orderId);
      await this.refetchOrderQueries();

    } catch (error) {
      // Rollback on error
      if (adminOrdersData) {
        queryClient.setQueryData(['/api/admin/orders'], adminOrdersData);
      }
      if (userOrdersData) {
        queryClient.setQueryData(['/api/orders'], userOrdersData);
      }
      
      throw error;
    }
  }
}