import axios from 'axios';
import crypto from 'crypto';

const PAYMOB_API_KEY = process.env.PAYMOB_API_KEY;
const PAYMOB_INTEGRATION_ID = process.env.PAYMOB_INTEGRATION_ID;
const PAYMOB_IFRAME_ID = process.env.PAYMOB_IFRAME_ID;
const PAYMOB_HMAC_SECRET = process.env.PAYMOB_HMAC_SECRET;

const PAYMOB_BASE_URL = 'https://accept.paymob.com/api';

interface BillingData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  apartment?: string;
  floor?: string;
  street?: string;
  building?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  state?: string;
}

interface PaymobOrderItem {
  name: string;
  amountCents: number;
  description: string;
  quantity: number;
}

export class PaymobService {
  private async authenticate(): Promise<string> {
    try {
      const response = await axios.post(`${PAYMOB_BASE_URL}/auth/tokens`, {
        api_key: PAYMOB_API_KEY
      });
      return response.data.token;
    } catch (error) {
      console.error('Paymob authentication error:', error);
      throw new Error('Failed to authenticate with Paymob');
    }
  }

  private async registerOrder(
    authToken: string,
    amountCents: number,
    items: PaymobOrderItem[]
  ): Promise<number> {
    try {
      const response = await axios.post(`${PAYMOB_BASE_URL}/ecommerce/orders`, {
        auth_token: authToken,
        delivery_needed: 'true',
        amount_cents: amountCents.toString(),
        currency: 'EGP',
        items: items.map(item => ({
          name: item.name,
          amount_cents: item.amountCents.toString(),
          description: item.description,
          quantity: item.quantity.toString()
        }))
      });
      return response.data.id;
    } catch (error) {
      console.error('Paymob order registration error:', error);
      throw new Error('Failed to register order with Paymob');
    }
  }

  private async getPaymentToken(
    authToken: string,
    orderId: number,
    amountCents: number,
    billingData: BillingData,
    redirectUrl?: string
  ): Promise<string> {
    try {
      const paymentKeyData: any = {
        auth_token: authToken,
        amount_cents: amountCents.toString(),
        expiration: 3600,
        order_id: orderId.toString(),
        billing_data: {
          apartment: billingData.apartment || 'NA',
          email: billingData.email,
          floor: billingData.floor || 'NA',
          first_name: billingData.firstName,
          street: billingData.street || 'NA',
          building: billingData.building || 'NA',
          phone_number: billingData.phone,
          shipping_method: 'NA',
          postal_code: billingData.postalCode || 'NA',
          city: billingData.city || 'Cairo',
          country: billingData.country || 'EG',
          last_name: billingData.lastName,
          state: billingData.state || 'NA'
        },
        currency: 'EGP',
        integration_id: parseInt(PAYMOB_INTEGRATION_ID!)
      };

      // Add redirect URL if provided - this tells Paymob where to send users after payment
      if (redirectUrl) {
        paymentKeyData.redirection_url = redirectUrl;
        console.log('Setting Paymob redirect URL:', redirectUrl);
      }

      const response = await axios.post(`${PAYMOB_BASE_URL}/acceptance/payment_keys`, paymentKeyData);
      return response.data.token;
    } catch (error) {
      console.error('Paymob payment token error:', error);
      throw new Error('Failed to generate payment token');
    }
  }

  async createPaymentUrl(
    amountEGP: number,
    billingData: BillingData,
    items: PaymobOrderItem[],
    iframeId?: string,
    redirectUrl?: string
  ): Promise<{ paymentToken: string; iframeUrl: string; orderId: number }> {
    const amountCents = Math.round(amountEGP * 100);

    const authToken = await this.authenticate();
    const orderId = await this.registerOrder(authToken, amountCents, items);
    const paymentToken = await this.getPaymentToken(authToken, orderId, amountCents, billingData, redirectUrl);

    // Use hosted payment URL for redirect-based flow (not iframe URL)
    const checkoutUrl = `https://accept.paymob.com/api/acceptance/payments/pay?payment_token=${paymentToken}`;
    console.log('Using hosted payment URL for redirect flow');

    console.log('=== PAYMOB PAYMENT URL CREATED ===');
    console.log('Order ID:', orderId);
    console.log('Amount (EGP):', amountEGP);
    console.log('Payment Token:', paymentToken);
    console.log('Checkout URL:', checkoutUrl);
    console.log('=====================================');

    return {
      paymentToken,
      iframeUrl: checkoutUrl,
      orderId
    };
  }

  verifyCallback(callbackData: any): boolean {
    try {
      const {
        amount_cents,
        created_at,
        currency,
        error_occured,
        has_parent_transaction,
        id,
        integration_id,
        is_3d_secure,
        is_auth,
        is_capture,
        is_refunded,
        is_standalone_payment,
        is_voided,
        order,
        owner,
        pending,
        source_data_pan,
        source_data_sub_type,
        source_data_type,
        success,
        hmac
      } = callbackData;

      const concatenatedString = [
        amount_cents,
        created_at,
        currency,
        error_occured,
        has_parent_transaction,
        id,
        integration_id,
        is_3d_secure,
        is_auth,
        is_capture,
        is_refunded,
        is_standalone_payment,
        is_voided,
        order?.id || order,
        owner,
        pending,
        source_data_pan,
        source_data_sub_type,
        source_data_type,
        success
      ].join('');

      const calculatedHmac = crypto
        .createHmac('sha512', PAYMOB_HMAC_SECRET!)
        .update(concatenatedString)
        .digest('hex');

      return calculatedHmac === hmac;
    } catch (error) {
      console.error('HMAC verification error:', error);
      return false;
    }
  }
}

export const paymobService = new PaymobService();
