# Production Authentication Fix

## Immediate Action Required

Your production deployment is failing because of missing environment variables. Add these to your Replit deployment:

### Required Environment Variables
```
DATABASE_URL=postgresql://your-db-connection-string
SESSION_SECRET=generate-with-openssl-rand-base64-32
NODE_ENV=production
```

## The Root Cause

Production authentication fails when:
1. `SESSION_SECRET` is missing → sessions don't persist
2. `DATABASE_URL` is missing → fallback to memory store (sessions lost on restart)
3. Cookie security settings prevent session cookies in production

## Exact Configuration Steps

### 1. Set Environment Variables in Replit
Go to your deployment settings and add:

**DATABASE_URL**: Your PostgreSQL connection string from Neon/Supabase/etc.
**SESSION_SECRET**: Generate with `openssl rand -base64 32` or use any 32+ character random string
**NODE_ENV**: Set to `production`

### 2. Verify Configuration
After deployment, check your logs for:
```
=== DEPLOYMENT DIAGNOSTICS ===
NODE_ENV: production
DATABASE_URL present: true
SESSION_SECRET present: true
```

And:
```
=== SESSION CONFIGURATION DEBUG ===
Session store type: PgSession
```

### 3. Test Authentication
Use these commands against your deployed app:

```bash
# Replace YOUR_DOMAIN with your actual Replit domain
curl -c test.txt -X POST https://YOUR_DOMAIN.replit.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "test123",
    "email": "test@example.com",
    "name": "Test User",
    "phone": "+1234567890",
    "address": "{\"street\":\"Test\",\"building\":\"1\",\"apartment\":\"A\",\"area\":\"Test\",\"landmark\":\"Mall\"}"
  }'

curl -b test.txt -X POST https://YOUR_DOMAIN.replit.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "test123"}'

curl -b test.txt https://YOUR_DOMAIN.replit.app/api/auth/me
```

All three should return success responses.

## If Still Failing

Check your deployment logs for specific error messages:
- Session save errors → Database permissions issue
- Cookie not set → HTTPS configuration problem
- Session store fallback → DATABASE_URL format incorrect

The application now includes comprehensive debugging that will show exactly what's failing in your production environment.