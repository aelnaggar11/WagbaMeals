/**
 * HMAC Verification Test Tool
 * Use this to manually test HMAC verification with webhook data
 * 
 * Usage:
 * 1. Copy webhook JSON from Paymob (from logs or webhook.site)
 * 2. Run: tsx server/test-hmac.ts
 * 3. Check if HMAC verification passes
 */

import crypto from 'crypto';

// Example webhook data structure (replace with real data when testing)
const exampleWebhookData = {
  obj: {
    id: 123456789,
    pending: false,
    amount_cents: 139100,
    success: true,
    is_auth: false,
    is_capture: false,
    is_standalone_payment: true,
    is_voided: false,
    is_refunded: false,
    is_3d_secure: true,
    integration_id: 123456,
    profile_id: 123456,
    has_parent_transaction: false,
    order: {
      id: 123456789,
      merchant_order_id: '854'
    },
    created_at: '2025-10-13T19:22:11.000000',
    currency: 'EGP',
    source_data: {
      type: 'card',
      pan: '9999',
      sub_type: 'MasterCard'
    },
    api_source: 'ACCEPT',
    terminal_id: null,
    merchant_commission: 0,
    installment: null,
    discount_details: [],
    is_void: false,
    is_refund: false,
    data: {
      klass: 'VoidTransaction',
      message: 'Approved',
      amount: 1391.0,
      gateway_integration_pk: 123456,
      currency: 'EGP',
      due_amount: 1391.0,
      merchant_txn_ref: '854',
      order_info: 'paymentToken=token_123',
      card_num: '999999******9999',
      txn_response_code: '000'
    },
    is_hidden: false,
    payment_key_claims: {
      user_id: 123456,
      amount_cents: 139100,
      currency: 'EGP',
      integration_id: 123456,
      billing_data: {}
    },
    error_occured: false,
    is_live: false,
    other_endpoint_reference: null,
    refunded_amount_cents: 0,
    source_id: -1,
    is_captured: false,
    captured_amount: 0,
    merchant_staff_tag: null,
    updated_at: '2025-10-13T19:22:11.000000',
    is_settled: false,
    bill_balanced: false,
    is_bill: false,
    owner: 123456,
    parent_transaction: null,
    acq_response_code: '00',
    pos_data: null,
    order_url: null,
    token: {
      card_token: 'token_abc123',
      masked_pan: '9999',
      card_subtype: 'MasterCard'
    }
  }
};

// HMAC secret from environment (replace with your actual secret)
const HMAC_SECRET = process.env.PAYMOB_HMAC_SECRET || 'your-hmac-secret-here';

function verifyHmacSignature(data: any, receivedHmac: string): boolean {
  try {
    console.log('=== HMAC VERIFICATION TEST ===');
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
    
    // Paymob HMAC calculation - exact field order per documentation
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

    console.log('\nConcatenated string:', concatenatedString);
    console.log('Concatenated length:', concatenatedString.length);

    const calculatedHmac = crypto
      .createHmac('sha512', HMAC_SECRET)
      .update(concatenatedString)
      .digest('hex');

    console.log('\nCalculated HMAC:', calculatedHmac);
    console.log('Received HMAC:', receivedHmac);
    
    const isValid = calculatedHmac === receivedHmac;
    
    if (isValid) {
      console.log('\n✅ HMAC VERIFICATION SUCCESSFUL');
    } else {
      console.log('\n❌ HMAC VERIFICATION FAILED');
      console.log('HMACs do not match');
    }

    return isValid;
  } catch (error) {
    console.error('❌ HMAC verification error:', error);
    return false;
  }
}

// Test with example data
// Replace receivedHmac with actual HMAC from Paymob webhook query parameter
const receivedHmac = 'paste-hmac-from-webhook-query-parameter-here';

console.log('Testing HMAC verification...\n');
verifyHmacSignature(exampleWebhookData.obj, receivedHmac);

console.log('\n=== HOW TO USE THIS TOOL ===');
console.log('1. Copy webhook JSON data from Paymob (check server logs)');
console.log('2. Replace exampleWebhookData with your actual webhook data');
console.log('3. Copy HMAC value from webhook query parameter (?hmac=...)');
console.log('4. Replace receivedHmac with the actual HMAC');
console.log('5. Run: tsx server/test-hmac.ts');
console.log('6. Check if verification passes');
