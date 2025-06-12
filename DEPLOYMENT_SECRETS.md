# Required Environment Variables for Production Deployment

## Essential Variables

Add these environment variables to your Replit deployment:

### 1. DATABASE_URL
```
DATABASE_URL=postgresql://username:password@host:port/database
```
- This should be your PostgreSQL connection string
- Required for session persistence and data storage

### 2. SESSION_SECRET
```
SESSION_SECRET=your-secure-random-string-at-least-32-characters-long
```
- Generate with: `openssl rand -base64 32`
- Critical for session security and authentication

### 3. NODE_ENV
```
NODE_ENV=production
```
- Enables production optimizations and security settings

## Deployment Steps

1. **Set Environment Variables** in your Replit deployment settings
2. **Deploy the application** - it will automatically configure PostgreSQL session storage
3. **Check logs** for deployment diagnostics
4. **Test authentication** using the provided curl commands

## Verification

Your deployment logs should show:
```
=== DEPLOYMENT DIAGNOSTICS ===
NODE_ENV: production
DATABASE_URL present: true
SESSION_SECRET present: true
```

And:
```
=== SESSION CONFIGURATION DEBUG ===
Environment: production
Session secret source: provided
Session store type: PgSession
```

If you see "MemoryStore" instead of "PgSession", your DATABASE_URL is not configured correctly.

## Admin Access

Default admin credentials:
- Username: `admin`
- Password: `password`

**Change these immediately after deployment for security.**