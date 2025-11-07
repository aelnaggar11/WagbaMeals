import { DatabaseStorage } from './database-storage';
import { PaymobService } from './paymob';

async function retrySubscriptionCreation() {
  const storage = new DatabaseStorage();
  const paymobService = new PaymobService();
  
  try {
    // Get user 283
    const user = await storage.getUser(283);
    if (!user) {
      console.error('❌ User 283 not found');
      return;
    }
    
    console.log('✅ Found user:', user.id, user.email);
    
    // Get order 967
    const order = await storage.getOrder(967);
    if (!order) {
      console.error('❌ Order 967 not found');
      return;
    }
    
    console.log('✅ Found order:', order.id, 'Total:', order.total);
    
    // Get payment method
    const paymentMethod = await storage.getPaymentMethod(2);
    if (!paymentMethod) {
      console.error('❌ Payment method 2 not found');
      return;
    }
    
    console.log('✅ Found payment method:', paymentMethod.id, 'Card:', paymentMethod.maskedPan);
    
    // Check if user already has subscription
    if (user.paymobSubscriptionId) {
      console.log('⚠️ User already has subscription ID:', user.paymobSubscriptionId);
      return;
    }
    
    console.log('\n=== CREATING PAYMOB SUBSCRIPTION ===\n');
    
    // Get or create weekly subscription plan
    const webhookUrl = paymobService.getWebhookUrl();
    console.log('Webhook URL:', webhookUrl);
    
    let planId: number | null = process.env.PAYMOB_WEEKLY_PLAN_ID ? parseInt(process.env.PAYMOB_WEEKLY_PLAN_ID) : null;
    
    if (!planId) {
      console.log('Creating new weekly subscription plan...');
      const plan = await paymobService.createSubscriptionPlan({
        frequency: 7,
        name: 'Weekly Meal Delivery',
        amount_cents: Math.round(order.total * 100),
        webhook_url: webhookUrl
      });
      planId = plan.id;
      console.log(`✅ Created subscription plan: ${planId}`);
    } else {
      console.log('Using existing plan ID:', planId);
    }
    
    // Get delivery address
    const address = order.deliveryAddress ? JSON.parse(order.deliveryAddress) : {};
    const nameParts = user.name?.split(' ') || ['Customer'];
    const firstName = nameParts[0] || 'Customer';
    const lastName = nameParts.slice(1).join(' ') || 'Name'; // Default to 'Name' if no last name
    
    const billingData = {
      apartment: address.apartment || 'NA',
      first_name: firstName,
      last_name: lastName,
      street: address.street || 'NA',
      building: address.building || 'NA',
      phone_number: address.phone || user.phone || '+201000000000',
      country: 'EG',
      email: user.email,
      floor: address.floor || 'NA',
      state: address.area || 'Cairo',
      city: address.city || 'Cairo'
    };
    
    // Create subscription
    const subscription = await paymobService.createSubscription({
      plan_id: planId,
      card_token: paymentMethod.paymobCardToken,
      billing_data: billingData,
      customer: {
        first_name: billingData.first_name,
        last_name: billingData.last_name,
        email: user.email,
        phone_number: billingData.phone_number
      },
      starts_at: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
    
    console.log(`\n✅ Paymob subscription created: ${subscription.id}\n`);
    
    // Update user with subscription IDs
    await storage.updateUser(user.id, {
      paymobSubscriptionId: subscription.id.toString(),
      paymobPlanId: planId.toString(),
      subscriptionStatus: 'active',
      subscriptionStartedAt: new Date(),
      isSubscriber: true,
      userType: 'subscription'
    });
    
    console.log(`✅ User ${user.id} subscription setup complete!`);
    console.log('Subscription ID:', subscription.id);
    console.log('Plan ID:', planId);
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Details:', error.response?.data || error);
  } finally {
    process.exit(0);
  }
}

retrySubscriptionCreation();
