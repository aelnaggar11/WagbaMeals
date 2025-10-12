import cron from 'node-cron';
import { IStorage } from './storage';
import { paymobService } from './paymob';

export class BillingScheduler {
  private storage: IStorage;
  private isRunning: boolean = false;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Start the billing scheduler
   * Runs every hour to check for weeks that need billing
   */
  start() {
    console.log('🔄 Starting weekly billing scheduler...');
    
    // Run every hour at :00
    cron.schedule('0 * * * *', async () => {
      await this.processWeeklyBilling();
    });

    // Also run immediately on startup (for testing/debugging)
    setTimeout(() => this.processWeeklyBilling(), 5000);
    
    console.log('✅ Billing scheduler started - runs every hour');
  }

  /**
   * Process weekly billing for all eligible orders
   */
  async processWeeklyBilling() {
    if (this.isRunning) {
      console.log('⏭️ Billing job already running, skipping...');
      return;
    }

    this.isRunning = true;
    console.log('=== WEEKLY BILLING JOB STARTED ===');
    console.log('Time:', new Date().toISOString());

    try {
      // Find weeks that need billing
      // Use 90-minute window to handle cron delays, cold starts, and operational jitter
      const now = new Date();
      const ninetyMinutesAgo = new Date(now.getTime() - (90 * 60 * 1000)); // 1.5 hours
      
      const weeks = await this.storage.getWeeks();
      const weeksToBill = weeks.filter(week => {
        const deadline = new Date(week.orderDeadline);
        const billingTime = new Date(deadline.getTime() + (2 * 60 * 60 * 1000));
        
        // Bill if billing time (deadline + 2h) falls within the last 90 minutes
        // Wider window handles operational delays while order filtering prevents duplicates
        return billingTime >= ninetyMinutesAgo && billingTime <= now;
      });

      console.log(`Found ${weeksToBill.length} weeks in billing window (${ninetyMinutesAgo.toISOString()} to ${now.toISOString()})`);

      for (const week of weeksToBill) {
        await this.billWeek(week.id);
      }

      console.log('=== WEEKLY BILLING JOB COMPLETED ===');
    } catch (error) {
      console.error('❌ Error in billing job:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Bill all eligible subscription orders for a specific week
   */
  private async billWeek(weekId: number) {
    console.log(`\n--- Billing week ${weekId} ---`);

    try {
      // Get all orders for this week
      const allOrders = await this.storage.getOrdersByWeek(weekId);
      
      // Filter to subscription orders that need billing
      const ordersToBill = allOrders.filter(order => {
        return (
          order.orderType === 'subscription' &&
          order.status !== 'skipped' &&
          // Only bill orders that haven't been successfully charged
          order.paymentStatus !== 'paid' &&
          // Only bill orders with pending or null billing status (not success/failed)
          (!order.subscriptionBillingStatus || order.subscriptionBillingStatus === 'pending') &&
          order.paymentMethodId && // Must have a saved payment method
          // Don't rebill if already attempted (unless it's been long enough for a retry)
          (!order.subscriptionBillingAttemptedAt || 
           order.subscriptionBillingStatus === null || 
           order.subscriptionBillingStatus === 'pending')
        );
      });

      console.log(`Found ${ordersToBill.length} subscription orders to bill for week ${weekId}`);

      for (const order of ordersToBill) {
        await this.billOrder(order.id);
      }
    } catch (error) {
      console.error(`❌ Error billing week ${weekId}:`, error);
    }
  }

  /**
   * Bill a single subscription order
   */
  private async billOrder(orderId: number) {
    console.log(`\n--- Billing order ${orderId} ---`);

    try {
      const order = await this.storage.getOrder(orderId);
      if (!order) {
        console.error(`Order ${orderId} not found`);
        return;
      }

      // Get user to check subscription status
      const user = await this.storage.getUser(order.userId);
      if (!user) {
        console.error(`User ${order.userId} not found`);
        return;
      }

      // Skip if subscription is cancelled or paused
      if (user.subscriptionStatus === 'cancelled' || user.subscriptionStatus === 'paused') {
        console.log(`⏭️ Skipping order ${orderId} - subscription is ${user.subscriptionStatus}`);
        await this.storage.updateOrder(orderId, {
          subscriptionBillingStatus: 'skipped',
          subscriptionBillingAttemptedAt: new Date(),
          subscriptionBillingError: `Subscription ${user.subscriptionStatus}`
        });
        return;
      }

      // Get payment method
      const paymentMethod = await this.storage.getPaymentMethod(order.paymentMethodId!);
      if (!paymentMethod || !paymentMethod.isActive) {
        console.error(`❌ No active payment method for order ${orderId}`);
        await this.storage.updateOrder(orderId, {
          subscriptionBillingStatus: 'failed',
          subscriptionBillingAttemptedAt: new Date(),
          subscriptionBillingError: 'No active payment method'
        });
        return;
      }

      console.log(`💳 Charging card ending in ${paymentMethod.maskedPan}`);
      console.log(`Amount: ${order.total} EGP`);

      // Get delivery fee
      const baseDeliveryConfig = await this.storage.getPricingConfig('delivery', 'base_delivery');
      const deliveryFee = baseDeliveryConfig?.price || 0;
      const totalAmount = order.total + deliveryFee;

      // Mark billing as attempted
      await this.storage.updateOrder(orderId, {
        subscriptionBillingAttemptedAt: new Date(),
        subscriptionBillingStatus: 'pending'
      });

      // Charge the card using saved token
      const billingData = order.deliveryAddress ? JSON.parse(order.deliveryAddress) : {
        apartment: 'NA',
        first_name: user.name?.split(' ')[0] || 'Customer',
        last_name: user.name?.split(' ').slice(1).join(' ') || '',
        street: 'NA',
        building: 'NA',
        phone_number: user.phone || '+201000000000',
        country: 'EG',
        email: user.email,
        floor: 'NA',
        state: 'Cairo',
        city: 'Cairo'
      };

      const result = await paymobService.chargeSubscriptionCard({
        card_token: paymentMethod.paymobCardToken,
        amount: Math.round(totalAmount * 100), // Convert to cents
        currency: 'EGP',
        billing_data: billingData,
        customer: {
          first_name: billingData.first_name || user.name?.split(' ')[0] || 'Customer',
          last_name: billingData.last_name || user.name?.split(' ').slice(1).join(' ') || '',
          email: user.email,
          phone_number: billingData.phone_number || user.phone || '+201000000000'
        },
        extras: {
          merchant_order_id: orderId.toString()
        }
      });

      // Update order based on result
      if (result.success) {
        console.log(`✅ Payment successful for order ${orderId}`);
        console.log(`Transaction ID: ${result.transaction_id}`);
        
        await this.storage.updateOrder(orderId, {
          subscriptionBillingStatus: 'success',
          paymentStatus: 'paid',
          paymobTransactionId: result.transaction_id.toString()
        });
      } else {
        console.error(`❌ Payment failed for order ${orderId}: ${result.error}`);
        
        await this.storage.updateOrder(orderId, {
          subscriptionBillingStatus: 'failed',
          subscriptionBillingError: result.error || 'Payment declined'
        });
      }
    } catch (error: any) {
      console.error(`❌ Error billing order ${orderId}:`, error);
      
      // Update order with error
      await this.storage.updateOrder(orderId, {
        subscriptionBillingStatus: 'failed',
        subscriptionBillingAttemptedAt: new Date(),
        subscriptionBillingError: error.message || 'Unknown error'
      });
    }
  }

  /**
   * Manually trigger billing for a specific week (for testing)
   */
  async manualBillWeek(weekId: number) {
    console.log(`📋 Manual billing triggered for week ${weekId}`);
    await this.billWeek(weekId);
  }
}
