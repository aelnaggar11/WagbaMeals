// Production Debug Script - Run this to diagnose your deployed app
const https = require('https');

const deploymentUrl = process.argv[2] || 'https://your-app.replit.app';

console.log('🔍 Debugging Production Deployment:', deploymentUrl);
console.log('================================\n');

// Test 1: Basic connectivity
console.log('1. Testing basic connectivity...');
https.get(deploymentUrl + '/api/weeks', (res) => {
  console.log('   Status:', res.statusCode);
  console.log('   Headers:', JSON.stringify(res.headers, null, 2));
}).on('error', (err) => {
  console.log('   ERROR:', err.message);
});

// Test 2: Check authentication endpoint
console.log('\n2. Testing auth endpoint...');
const postData = JSON.stringify({
  email: 'test@example.com',
  password: 'test123'
});

const options = {
  hostname: deploymentUrl.replace('https://', ''),
  port: 443,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = https.request(options, (res) => {
  console.log('   Login Status:', res.statusCode);
  console.log('   Set-Cookie:', res.headers['set-cookie']);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('   Response:', data);
  });
});

req.on('error', (err) => {
  console.log('   ERROR:', err.message);
});

req.write(postData);
req.end();