import crypto from 'crypto';
import axios from 'axios';

const PAYMOB_API_URL = 'https://accept.paymob.com/v1';

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

  constructor() {
    this.apiKey = process.env.PAYMOB_API_KEY || '';
    this.secretKey = process.env.PAYMOB_SECRET_KEY || '';
    this.publicKey = process.env.PAYMOB_PUBLIC_KEY || '';
    this.integrationId = process.env.PAYMOB_INTEGRATION_ID || '';
    this.hmacSecret = process.env.PAYMOB_HMAC_SECRET || '';

    // Validate required credentials
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
}

// Export singleton instance
export const paymobService = new PaymobService();
