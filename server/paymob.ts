import crypto from 'crypto';
import axios from 'axios';

const PAYMOB_API_URL = 'https://accept.paymob.com/v1';
const PAYMOB_SUBSCRIPTION_API_URL = 'https://accept.paymob.com/api';

/**
 * Resolve the webhook base URL for Paymob subscription webhooks
 * Validates and constructs a proper HTTPS URL from environment variables
 */
function resolveWebhookBaseUrl(): string {
  // Prefer explicit webhook URL from environment
  if (process.env.PAYMOB_SUBSCRIPTION_WEBHOOK_URL) {
    try {
      const url = new URL(process.env.PAYMOB_SUBSCRIPTION_WEBHOOK_URL);
      if (url.protocol === 'https:' || (process.env.NODE_ENV === 'development' && url.protocol === 'http:')) {
        return process.env.PAYMOB_SUBSCRIPTION_WEBHOOK_URL;
      }
      console.warn('⚠️ PAYMOB_SUBSCRIPTION_WEBHOOK_URL must use HTTPS protocol (or HTTP in development)');
    } catch (error) {
      console.warn('⚠️ PAYMOB_SUBSCRIPTION_WEBHOOK_URL is not a valid URL:', process.env.PAYMOB_SUBSCRIPTION_WEBHOOK_URL);
    }
  }

  // Fallback to REPLIT_DOMAINS (add https:// protocol)
  if (process.env.REPLIT_DOMAINS) {
    const domain = process.env.REPLIT_DOMAINS.split(',')[0].trim();
    if (domain) {
      try {
        const url = new URL(`https://${domain}`);
        console.log('✅ Using Replit domain for webhooks:', url.origin);
        return url.origin;
      } catch (error) {
        console.warn('⚠️ REPLIT_DOMAINS contains invalid domain:', domain);
      }
    }
  }

  // Development fallback (localhost)
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️ No webhook URL configured, using localhost (development only)');
    return 'http://localhost:5000';
  }

  // No valid webhook URL available
  throw new Error(
    'No valid webhook URL configured. Please set PAYMOB_SUBSCRIPTION_WEBHOOK_URL environment variable with your production HTTPS domain.'
  );
}

interface BillingData {
  apartment?: string;
  first_name: string;
  last_name: string;
  street: string;
  building?: string;
  phone_number: string;
  country: string;
  email: string;
  floor?: string;
  state?: string;
  city?: string;
}

interface PaymentIntentionData {
  amount: number; // Amount in cents (EGP)
  currency: string;
  billing_data: BillingData;
  customer: {
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
  };
  extras?: {
    merchant_order_id?: string;
    [key: string]: any;
  };
  save_token?: boolean; // Enable card tokenization for subscriptions
}

interface SavedCardPaymentData {
  amount: number; // Amount in cents (EGP)
  currency: string;
  card_token: string; // Saved card token
  billing_data: BillingData;
  customer: {
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
  };
  extras?: {
    merchant_order_id?: string;
    [key: string]: any;
  };
}

interface PaymentIntentionResponse {
  id: string;
  client_secret: string;
  status: string;
  amount: number;
  currency: string;
  payment_methods: any[];
  created: string;
}

export class PaymobService {
  private apiKey: string;
  private secretKey: string;
  private publicKey: string;
  private integrationId: string;
  private hmacSecret: string;
  private authToken: string | null = null;
  private authTokenExpiry: Date | null = null;

  constructor() {
    this.apiKey = process.env.PAYMOB_API_KEY || '';
    this.secretKey = process.env.PAYMOB_SECRET_KEY || '';
    this.publicKey = process.env.PAYMOB_PUBLIC_KEY || '';
    this.integrationId = process.env.PAYMOB_INTEGRATION_ID || '';
    this.hmacSecret = process.env.PAYMOB_HMAC_SECRET || '';

    // Validate required credentials
    if (!this.apiKey) {
      throw new Error('PAYMOB_API_KEY is required');
    }
    if (!this.secretKey) {
      throw new Error('PAYMOB_SECRET_KEY is required');
    }
    if (!this.integrationId) {
      throw new Error('PAYMOB_INTEGRATION_ID is required');
    }
    if (!this.hmacSecret) {
      throw new Error('PAYMOB_HMAC_SECRET is required');
    }
    
    // Validate integration ID is a valid number
    if (isNaN(parseInt(this.integrationId))) {
      throw new Error('PAYMOB_INTEGRATION_ID must be a valid number');
    }
  }

  /**
   * Get authentication token for subscription API calls
   * Tokens are cached and refreshed when expired
   */
  private async getAuthToken(): Promise<string> {
    // Return cached token if still valid
    if (this.authToken && this.authTokenExpiry && this.authTokenExpiry > new Date()) {
      return this.authToken;
    }

    try {
      const response = await axios.post(
        `${PAYMOB_SUBSCRIPTION_API_URL}/auth/tokens`,
        { api_key: this.apiKey },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const token = response.data.token;
      if (!token) {
        throw new Error('No token received from Paymob auth endpoint');
      }
      
      this.authToken = token;
      // Tokens typically expire after 1 hour, refresh after 50 minutes to be safe
      this.authTokenExpiry = new Date(Date.now() + 50 * 60 * 1000);
      
      console.log('✅ Paymob auth token obtained successfully');
      return token;
    } catch (error: any) {
      console.error('❌ Failed to get Paymob auth token:', error.response?.data || error.message);
      throw new Error(`Failed to authenticate with Paymob: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Create a payment intention with Paymob
   */
  async createPaymentIntention(data: PaymentIntentionData): Promise<PaymentIntentionResponse> {
    try {
      const payload: any = {
        amount: data.amount, // Already in cents
        currency: data.currency,
        payment_methods: [parseInt(this.integrationId)],
        items: [],
        billing_data: data.billing_data,
        customer: data.customer,
        extras: data.extras || {}
      };

      // Enable card tokenization for subscription payments
      if (data.save_token) {
        payload.special_reference = data.extras?.merchant_order_id || '';
        payload.save_token_to_be_used = true;
      }

      const response = await axios.post(
        `${PAYMOB_API_URL}/intention/`,
        payload,
        {
          headers: {
            'Authorization': `Token ${this.secretKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Paymob payment intention created:', response.data.id, data.save_token ? '(with tokenization)' : '');
      return response.data;
    } catch (error: any) {
      console.error('❌ Paymob payment intention error:', error.response?.data || error.message);
      throw new Error(`Failed to create payment intention: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Charge a saved card token for subscription payments
   */
  async chargeSubscriptionCard(data: SavedCardPaymentData): Promise<any> {
    try {
      console.log('🔄 Charging saved card for subscription payment...');
      
      const response = await axios.post(
        `${PAYMOB_API_URL}/intention/`,
        {
          amount: data.amount,
          currency: data.currency,
          payment_methods: [parseInt(this.integrationId)],
          items: [],
          billing_data: data.billing_data,
          customer: data.customer,
          extras: data.extras || {},
          card_token: data.card_token, // Use saved card token
          special_reference: data.extras?.merchant_order_id || ''
        },
        {
          headers: {
            'Authorization': `Token ${this.secretKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Subscription charge initiated:', response.data.id);
      return response.data;
    } catch (error: any) {
      console.error('❌ Subscription charge error:', error.response?.data || error.message);
      throw new Error(`Failed to charge subscription: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Retrieve saved card tokens for a payment (after successful tokenization)
   */
  async getCardTokens(transactionId: number): Promise<any> {
    try {
      // Paymob's token retrieval API
      const response = await axios.post(
        `https://flashapi.paymob.com/v1/customer/card/tokens/`,
        {
          transaction_id: transactionId
        },
        {
          headers: {
            'Authorization': `Token ${this.secretKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Card tokens retrieved:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error retrieving card tokens:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Verify HMAC signature from Paymob webhook
   * Following Paymob's official HMAC calculation order
   */
  verifyHmacSignature(data: any, receivedHmac: string): boolean {
    try {
      // Log all fields for debugging
      console.log('=== HMAC VERIFICATION DEBUG ===');
      console.log('Webhook data fields:', {
        amount_cents: data.amount_cents,
        created_at: data.created_at,
        currency: data.currency,
        error_occured: data.error_occured,
        has_parent_transaction: data.has_parent_transaction,
        id: data.id,
        integration_id: data.integration_id,
        is_3d_secure: data.is_3d_secure,
        is_auth: data.is_auth,
        is_capture: data.is_capture,
        is_refunded: data.is_refunded,
        is_standalone_payment: data.is_standalone_payment,
        is_voided: data.is_voided,
        order_id: data.order?.id || data.order,
        owner: data.owner,
        pending: data.pending,
        source_data_pan: data.source_data?.pan,
        source_data_sub_type: data.source_data?.sub_type,
        source_data_type: data.source_data?.type,
        success: data.success
      });
      
      // Paymob HMAC calculation for transaction processed callback
      // Order of fields is critical - must match Paymob's documentation exactly
      // Fields are: amount_cents, created_at, currency, error_occured, has_parent_transaction,
      // id, integration_id, is_3d_secure, is_auth, is_capture, is_refunded,
      // is_standalone_payment, is_voided, order.id, owner, pending,
      // source_data.pan, source_data.sub_type, source_data.type, success
      const concatenatedString = [
        data.amount_cents,
        data.created_at,
        data.currency,
        data.error_occured,
        data.has_parent_transaction,
        data.id,
        data.integration_id,
        data.is_3d_secure,
        data.is_auth,
        data.is_capture,
        data.is_refunded,
        data.is_standalone_payment,
        data.is_voided,
        data.order?.id || data.order,
        data.owner,
        data.pending,
        data.source_data?.pan || '',
        data.source_data?.sub_type || '',
        data.source_data?.type || '',
        data.success
      ].join('');

      console.log('Concatenated string for HMAC:', concatenatedString);
      console.log('Concatenated string length:', concatenatedString.length);

      const calculatedHmac = crypto
        .createHmac('sha512', this.hmacSecret)
        .update(concatenatedString)
        .digest('hex');

      const isValid = calculatedHmac === receivedHmac;
      
      if (!isValid) {
        console.error('❌ HMAC verification failed');
        console.log('Calculated HMAC:', calculatedHmac);
        console.log('Received HMAC:', receivedHmac);
        console.log('HMAC secret length:', this.hmacSecret.length);
      } else {
        console.log('✅ HMAC verification successful');
      }

      return isValid;
    } catch (error) {
      console.error('❌ HMAC verification error:', error);
      return false;
    }
  }

  /**
   * Get transaction details by transaction ID
   */
  async getTransactionDetails(transactionId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${PAYMOB_API_URL}/acceptance/transactions/${transactionId}`,
        {
          headers: {
            'Authorization': `Token ${this.secretKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to get transaction details:', error.response?.data || error.message);
      throw new Error(`Failed to get transaction: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get public key for frontend use
   */
  getPublicKey(): string {
    return this.publicKey;
  }

  /**
   * Get webhook URL for subscription webhooks
   */
  getWebhookUrl(path: string = '/api/payments/paymob/subscription-webhook'): string {
    const baseUrl = resolveWebhookBaseUrl();
    return `${baseUrl}${path}`;
  }

  /**
   * Create a subscription plan with Paymob
   */
  async createSubscriptionPlan(planData: {
    frequency: number; // in days (e.g., 7 for weekly)
    name: string;
    amount_cents: number;
    webhook_url?: string;
  }): Promise<any> {
    try {
      const authToken = await this.getAuthToken();
      
      const response = await axios.post(
        `${PAYMOB_SUBSCRIPTION_API_URL}/acceptance/subscription-plans`,
        {
          frequency: planData.frequency,
          name: planData.name,
          amount_cents: planData.amount_cents,
          use_transaction_amount: true,
          is_active: true,
          integration: parseInt(this.integrationId),
          webhook_url: planData.webhook_url || '',
          reminder_days: null,
          retrial_days: null,
          plan_type: 'rent',
          number_of_deductions: null,
          fee: null
        },
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Paymob subscription plan created:', response.data.id);
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to create subscription plan:', error.response?.data || error.message);
      throw new Error(`Failed to create subscription plan: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Create a subscription (attach customer to plan)
   * This uses the payment intention API with card token from initial payment
   */
  async createSubscription(subscriptionData: {
    plan_id: number;
    card_token: string;
    billing_data: BillingData;
    customer: {
      first_name: string;
      last_name: string;
      email: string;
      phone_number: string;
    };
    starts_at?: string; // YYYY-MM-DD format
  }): Promise<any> {
    try {
      console.log('=== CREATING PAYMOB SUBSCRIPTION ===');
      console.log('Plan ID:', subscriptionData.plan_id);
      console.log('Customer email:', subscriptionData.customer.email);
      console.log('Starts at:', subscriptionData.starts_at || new Date().toISOString().split('T')[0]);

      const response = await axios.post(
        `${PAYMOB_API_URL}/intention/`,
        {
          amount: 100, // Minimum amount required by Paymob (1 EGP in cents), actual amount from plan
          currency: 'EGP',
          payment_methods: [parseInt(this.integrationId)],
          items: [],
          billing_data: subscriptionData.billing_data,
          customer: subscriptionData.customer,
          card_token: subscriptionData.card_token,
          subscription_plan_id: subscriptionData.plan_id,
          starts_at: subscriptionData.starts_at || new Date().toISOString().split('T')[0]
        },
        {
          headers: {
            'Authorization': `Token ${this.secretKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('=== PAYMOB SUBSCRIPTION API RESPONSE ===');
      console.log('Response status:', response.status);
      console.log('Response data keys:', Object.keys(response.data));
      console.log('Full response data:', JSON.stringify(response.data, null, 2));

      // Extract subscription ID from response
      // Try multiple possible locations where the subscription ID might be
      let subscriptionId: number | null = null;

      // Try response.data.subscription_data.id (webhook format)
      if (response.data.subscription_data?.id && typeof response.data.subscription_data.id === 'number') {
        subscriptionId = response.data.subscription_data.id;
        console.log('✅ Found subscription ID in subscription_data.id:', subscriptionId);
      }
      // Try response.data.id (direct format)
      else if (response.data.id && typeof response.data.id === 'number') {
        subscriptionId = response.data.id;
        console.log('✅ Found subscription ID in root id:', subscriptionId);
      }
      // Try response.data.subscription.id
      else if (response.data.subscription?.id && typeof response.data.subscription.id === 'number') {
        subscriptionId = response.data.subscription.id;
        console.log('✅ Found subscription ID in subscription.id:', subscriptionId);
      }

      if (!subscriptionId) {
        console.error('❌ Could not find valid subscription ID in response');
        console.error('Response structure:', JSON.stringify(response.data, null, 2));
        throw new Error('Paymob API did not return a valid subscription ID in expected locations');
      }
      
      console.log('✅ Paymob subscription created with ID:', subscriptionId);
      console.log('=====================================');
      
      // Return enhanced response with extracted subscription ID
      return {
        ...response.data,
        subscriptionId: subscriptionId
      };
    } catch (error: any) {
      console.error('❌ Failed to create subscription');
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.error('Error message:', error.message);
      }
      throw new Error(`Failed to create subscription: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Suspend a subscription
   */
  async suspendSubscription(subscriptionId: string | number): Promise<any> {
    try {
      const authToken = await this.getAuthToken();
      
      const response = await axios.post(
        `${PAYMOB_SUBSCRIPTION_API_URL}/acceptance/subscriptions/${subscriptionId}/suspend`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Subscription suspended:', subscriptionId);
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to suspend subscription:', error.response?.data || error.message);
      throw new Error(`Failed to suspend subscription: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Resume a subscription
   */
  async resumeSubscription(subscriptionId: string | number): Promise<any> {
    try {
      const authToken = await this.getAuthToken();
      
      const response = await axios.post(
        `${PAYMOB_SUBSCRIPTION_API_URL}/acceptance/subscriptions/${subscriptionId}/resume`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Subscription resumed:', subscriptionId);
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to resume subscription:', error.response?.data || error.message);
      throw new Error(`Failed to resume subscription: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: string | number): Promise<any> {
    try {
      const authToken = await this.getAuthToken();
      
      const response = await axios.post(
        `${PAYMOB_SUBSCRIPTION_API_URL}/acceptance/subscriptions/${subscriptionId}/cancel`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Subscription cancelled:', subscriptionId);
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to cancel subscription:', error.response?.data || error.message);
      throw new Error(`Failed to cancel subscription: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Verify HMAC signature from Paymob TOKEN webhook
   * TOKEN webhooks use different fields than transaction webhooks
   * Based on Paymob's token callback structure
   */
  verifyTokenHmac(data: any, receivedHmac: string): boolean {
    try {
      console.log('=== TOKEN HMAC VERIFICATION ===');
      console.log('Token webhook data:', {
        id: data.id,
        token: data.token?.substring(0, 10) + '...',
        masked_pan: data.masked_pan,
        merchant_id: data.merchant_id,
        card_subtype: data.card_subtype,
        created_at: data.created_at,
        email: data.email,
        order_id: data.order_id
      });
      
      // Paymob TOKEN webhook HMAC concatenation
      // IMPORTANT: Fields are concatenated in ALPHABETICAL order
      // Order: card_subtype, created_at, email, id, masked_pan, merchant_id, order_id, token
      // This was determined through testing with actual webhook data from Paymob
      const concatenatedString = [
        data.card_subtype,
        data.created_at,
        data.email,
        data.id,
        data.masked_pan,
        data.merchant_id,
        data.order_id,
        data.token
      ].join('');

      console.log('Concatenated string for TOKEN HMAC (first 80 chars):', concatenatedString.substring(0, 80) + '...');
      console.log('Concatenated string length:', concatenatedString.length);

      const calculatedHmac = crypto
        .createHmac('sha512', this.hmacSecret)
        .update(concatenatedString)
        .digest('hex');

      const isValid = calculatedHmac === receivedHmac;
      
      if (!isValid) {
        console.error('❌ TOKEN HMAC verification failed');
        console.log('Calculated HMAC:', calculatedHmac);
        console.log('Received HMAC:', receivedHmac);
        console.log('Field values used:', {
          card_subtype: data.card_subtype,
          created_at: data.created_at,
          email: data.email,
          id: data.id,
          masked_pan: data.masked_pan,
          merchant_id: data.merchant_id,
          order_id: data.order_id,
          token: data.token?.substring(0, 10) + '...'
        });
      } else {
        console.log('✅ TOKEN HMAC verification successful');
      }

      return isValid;
    } catch (error) {
      console.error('❌ TOKEN HMAC verification error:', error);
      return false;
    }
  }

  /**
   * Verify HMAC signature from Paymob subscription webhook
   * HMAC format: "{trigger_type}for{subscription_id}"
   * Example: "suspendedfor1264"
   */
  verifySubscriptionHmac(subscriptionId: number, triggerType: string, receivedHmac: string): boolean {
    try {
      const concatenatedString = `${triggerType}for${subscriptionId}`;
      
      console.log('=== SUBSCRIPTION HMAC VERIFICATION ===');
      console.log('Subscription ID:', subscriptionId);
      console.log('Trigger Type:', triggerType);
      console.log('Concatenated string:', concatenatedString);

      const calculatedHmac = crypto
        .createHmac('sha512', this.hmacSecret)
        .update(concatenatedString)
        .digest('hex');

      const isValid = calculatedHmac === receivedHmac;
      
      if (!isValid) {
        console.error('❌ Subscription HMAC verification failed');
        console.log('Calculated HMAC:', calculatedHmac);
        console.log('Received HMAC:', receivedHmac);
      } else {
        console.log('✅ Subscription HMAC verification successful');
      }

      return isValid;
    } catch (error) {
      console.error('❌ Subscription HMAC verification error:', error);
      return false;
    }
  }
}

// Export singleton instance
export const paymobService = new PaymobService();
