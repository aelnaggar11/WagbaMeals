# Production Deployment Troubleshooting Guide

## Step 1: Check Application Logs

When you deploy your app, check the server logs for these diagnostic messages:

### Environment Validation
Look for:
```
=== DEPLOYMENT DIAGNOSTICS ===
NODE_ENV: production
DATABASE_URL present: true/false
SESSION_SECRET present: true/false
```

**If DATABASE_URL is false:**
- Add environment variable: `DATABASE_URL=your_postgresql_connection_string`

**If SESSION_SECRET is false:**
- Add environment variable: `SESSION_SECRET=your_secure_random_string`
- Generate with: `openssl rand -base64 32`

### Session Configuration
Look for:
```
=== SESSION CONFIGURATION DEBUG ===
Environment: production
Session secret source: provided/default
Session store type: PgSession/MemoryStore
```

**If using MemoryStore in production:**
- Your DATABASE_URL is not working properly
- Check PostgreSQL connection and permissions

## Step 2: Test Authentication Flow

Use these curl commands to test your deployed app:

### Test User Registration
```bash
curl -c cookies.txt -X POST https://your-app-domain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "testpass123",
    "email": "test@example.com",
    "name": "Test User",
    "phone": "+1234567890",
    "address": "{\"street\":\"Test St\",\"building\":\"123\",\"apartment\":\"1A\",\"area\":\"Test Area\",\"landmark\":\"Test Mall\"}"
  }'
```

### Test User Login
```bash
curl -b cookies.txt -X POST https://your-app-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "testpass123"}'
```

### Test Session Persistence
```bash
curl -b cookies.txt https://your-app-domain.com/api/auth/me
```

## Step 3: Check Detailed Login Logs

In your production logs, look for:
```
LOGIN DEBUG - Before setting session: { sessionId: '...', sessionExists: true, ... }
LOGIN DEBUG - After setting session: { sessionId: '...', userId: 123, ... }
LOGIN DEBUG - Session saved successfully for user: 123
```

**If you see session save errors:**
- Database permissions issue
- PostgreSQL connection problem
- Session table creation failure

## Step 4: Check Authentication Middleware Logs

Look for:
```
Auth middleware check: { sessionId: '...', userId: 123, sessionExists: true, cookieExists: true }
```

**If userId is undefined:**
- Session not persisting between requests
- Cookie not being sent by browser
- Session store not working

**If cookieExists is false:**
- Browser not sending cookies
- Domain/HTTPS configuration issue
- SameSite cookie policy problem

## Step 5: Common Production Issues & Fixes

### Issue: Sessions not persisting
**Symptoms:** Login works but immediately logs out
**Fix:** 
1. Ensure HTTPS is enabled for your domain
2. Check that SESSION_SECRET is set
3. Verify PostgreSQL session store is working

### Issue: Database connection failures
**Symptoms:** "Failed to initialize PostgreSQL session store"
**Fix:**
1. Verify DATABASE_URL format: `postgresql://user:pass@host:port/db`
2. Check database server is accessible
3. Verify database user has CREATE TABLE permissions

### Issue: CORS or cookie issues
**Symptoms:** Authentication works in development but not production
**Fix:**
1. Ensure your domain supports HTTPS
2. Check browser developer tools for cookie errors
3. Verify SameSite cookie policy

## Step 6: Emergency Fixes

If authentication still fails, apply these temporary fixes:

### 1. Force session store to memory (temporary)
In `server/routes.ts`, temporarily change session store initialization:
```javascript
// Temporary fix - force memory store
const SessionStore = MemoryStore(session);
sessionStore = new SessionStore({
  checkPeriod: 86400000
});
```

### 2. Disable secure cookies (temporary)
```javascript
cookie: { 
  secure: false, // Temporary - re-enable after HTTPS setup
  maxAge: 24 * 60 * 60 * 1000,
  httpOnly: true,
  sameSite: 'lax'
}
```

## Step 7: Verify Working Deployment

Run this test to confirm everything works:

```bash
# Test complete flow
curl -c prod_test.txt -X POST https://your-domain.com/api/auth/register -H "Content-Type: application/json" -d '{"username":"prodtest","password":"test123","email":"prod@test.com","name":"Prod Test","phone":"+1234567890","address":"{\"street\":\"Test\",\"building\":\"1\",\"apartment\":\"A\",\"area\":\"Test\",\"landmark\":\"Test\"}"}'

curl -b prod_test.txt -X POST https://your-domain.com/api/auth/login -H "Content-Type: application/json" -d '{"email":"prod@test.com","password":"test123"}'

curl -b prod_test.txt https://your-domain.com/api/auth/me
```

All three should return success responses.

## Default Admin Credentials
- Username: `admin`
- Password: `password`
- **Change immediately after deployment!**

## Support
If issues persist, share your deployment logs showing:
1. DEPLOYMENT DIAGNOSTICS section
2. SESSION CONFIGURATION DEBUG section  
3. Any LOGIN DEBUG messages
4. Authentication middleware logs