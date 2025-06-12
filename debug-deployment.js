// Deployment Debug Script
// Run this to check your production environment

console.log('=== Wagba Deployment Debug ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);
console.log('SESSION_SECRET present:', !!process.env.SESSION_SECRET);
console.log('PORT:', process.env.PORT || '5000');

// Test database connection
if (process.env.DATABASE_URL) {
  console.log('Database URL format check:', process.env.DATABASE_URL.startsWith('postgresql://'));
} else {
  console.log('❌ DATABASE_URL environment variable is missing!');
}

if (!process.env.SESSION_SECRET) {
  console.log('❌ SESSION_SECRET environment variable is missing!');
} else if (process.env.SESSION_SECRET.length < 32) {
  console.log('⚠️  SESSION_SECRET should be at least 32 characters long');
}

console.log('================================');