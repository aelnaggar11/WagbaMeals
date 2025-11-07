import crypto from 'crypto';

const HMAC_SECRET = process.env.PAYMOB_HMAC_SECRET || '';

const tokenWebhookData = {
  id: 12084066,
  token: "97351f76f2382a897b99a274d01109447dcff20f0a3d4230bb2dbe38",
  masked_pan: "xxxx-xxxx-xxxx-8769",
  merchant_id: 1087279,
  card_subtype: "Visa",
  created_at: "2025-11-07T21:50:27.021725",
  email: "hgvcghd@sghvch.com",
  order_id: "413892036",
  user_added: false,
  next_payment_intention: "pi_test_071c60b3a0b34498a3cef25218ab8a51"
};

const receivedHmac = "8de5811e8fe6e3edcee94890518acc761c942da0858c2d49b3cc59d4e29e65a81bce57c403dcb2d075f54243c8f21ec1e1c15322e32c42b97ffac37ca4e86352";

console.log('=== TOKEN WEBHOOK HMAC TESTING ===\n');
console.log('Received HMAC:', receivedHmac);
console.log('HMAC secret length:', HMAC_SECRET.length);
console.log('\nTesting different field combinations...\n');

const testCombinations = [
  {
    name: 'Method 1: created_at, email, id, merchant_id, order_id, token',
    fields: [
      tokenWebhookData.created_at,
      tokenWebhookData.email,
      tokenWebhookData.id,
      tokenWebhookData.merchant_id,
      tokenWebhookData.order_id,
      tokenWebhookData.token
    ]
  },
  {
    name: 'Method 2: id, token, merchant_id, created_at, email, order_id',
    fields: [
      tokenWebhookData.id,
      tokenWebhookData.token,
      tokenWebhookData.merchant_id,
      tokenWebhookData.created_at,
      tokenWebhookData.email,
      tokenWebhookData.order_id
    ]
  },
  {
    name: 'Method 3: email, id, merchant_id, order_id, token',
    fields: [
      tokenWebhookData.email,
      tokenWebhookData.id,
      tokenWebhookData.merchant_id,
      tokenWebhookData.order_id,
      tokenWebhookData.token
    ]
  },
  {
    name: 'Method 4: id, merchant_id, order_id, token',
    fields: [
      tokenWebhookData.id,
      tokenWebhookData.merchant_id,
      tokenWebhookData.order_id,
      tokenWebhookData.token
    ]
  },
  {
    name: 'Method 5: token, masked_pan, merchant_id, card_subtype, created_at, email, order_id',
    fields: [
      tokenWebhookData.token,
      tokenWebhookData.masked_pan,
      tokenWebhookData.merchant_id,
      tokenWebhookData.card_subtype,
      tokenWebhookData.created_at,
      tokenWebhookData.email,
      tokenWebhookData.order_id
    ]
  },
  {
    name: 'Method 6: All fields alphabetically',
    fields: [
      tokenWebhookData.card_subtype,
      tokenWebhookData.created_at,
      tokenWebhookData.email,
      tokenWebhookData.id,
      tokenWebhookData.masked_pan,
      tokenWebhookData.merchant_id,
      tokenWebhookData.order_id,
      tokenWebhookData.token
    ]
  }
];

for (const test of testCombinations) {
  const concatenatedString = test.fields.join('');
  const calculatedHmac = crypto
    .createHmac('sha512', HMAC_SECRET)
    .update(concatenatedString)
    .digest('hex');
  
  const matches = calculatedHmac === receivedHmac;
  
  console.log(`${test.name}:`);
  console.log(`  Concatenated: ${concatenatedString.substring(0, 80)}...`);
  console.log(`  Calculated:   ${calculatedHmac}`);
  console.log(`  Match: ${matches ? '✅ YES!' : '❌ No'}`);
  console.log('');
}

console.log('\n=== INSTRUCTIONS ===');
console.log('Run this script with: tsx server/test-token-hmac.ts');
console.log('Make sure PAYMOB_HMAC_SECRET is set in your environment');
