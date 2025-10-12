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
      const response = await axios.post(
        `${PAYMOB_API_URL}/intention/`,
        {
          amount: data.amount, // Already in cents
          currency: data.currency,
          payment_methods: [parseInt(this.integrationId)],
          items: [],
          billing_data: data.billing_data,
          customer: data.customer,
          extras: data.extras || {}
        },
        {
          headers: {
            'Authorization': `Token ${this.secretKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Paymob payment intention created:', response.data.id);
      return response.data;
    } catch (error: any) {
      console.error('❌ Paymob payment intention error:', error.response?.data || error.message);
      throw new Error(`Failed to create payment intention: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Verify HMAC signature from Paymob webhook
   * Following Paymob's official HMAC calculation order
   */
  verifyHmacSignature(data: any, receivedHmac: string): boolean {
    try {
      // Paymob HMAC calculation for transaction processed callback
      // Order of fields is critical - must match Paymob's documentation exactly
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
        data.source_data_pan,
        data.source_data_sub_type,
        data.source_data_type, // This was missing!
        data.success
      ].join('');

      const calculatedHmac = crypto
        .createHmac('sha512', this.hmacSecret)
        .update(concatenatedString)
        .digest('hex');

      const isValid = calculatedHmac === receivedHmac;
      
      if (!isValid) {
        console.error('❌ HMAC verification failed');
        console.log('Calculated HMAC:', calculatedHmac);
        console.log('Received HMAC:', receivedHmac);
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
