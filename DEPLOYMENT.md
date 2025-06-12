# Production Deployment Guide

## Quick Setup Checklist

✅ **Configure Required Environment Variables**
✅ **Set Up PostgreSQL Database**  
✅ **Configure Production Secrets**
✅ **Deploy Application**

## Required Environment Variables

Configure these environment variables in your Replit Deployment settings:

### 🔑 Essential Production Secrets

1. **DATABASE_URL** (Critical)
   ```
   postgresql://username:password@hostname:port/database_name
   ```
   - Get this from your PostgreSQL provider (Neon, Supabase, AWS RDS, etc.)
   - Must be accessible from your deployment environment

2. **SESSION_SECRET** (Critical for Security)
   ```bash
   # Generate a secure random string:
   openssl rand -base64 32
   ```
   - Used for session encryption and security
   - Must be unique and kept secret

3. **NODE_ENV** (Recommended)
   ```
   production
   ```
   - Enables production optimizations
   - Improves error handling and security

## Alternative PostgreSQL Configuration

If your database provider uses separate connection variables:

```env
PGHOST=your-database-host.com
PGPORT=5432
PGUSER=your-username
PGPASSWORD=your-password
PGDATABASE=your-database-name
```

## Deployment Process

### Step 1: Configure Secrets in Replit
1. Go to your Replit project
2. Click on "Secrets" in the sidebar
3. Add each environment variable:
   - `DATABASE_URL`
   - `SESSION_SECRET`  
   - `NODE_ENV`

### Step 2: Database Setup
1. Ensure your PostgreSQL database is running
2. The application will automatically create tables on first run
3. Test connection using the health check endpoint

### Step 3: Deploy
1. Click "Deploy" in your Replit project
2. The deployment will automatically:
   - Build the application (`npm run build`)
   - Start the production server (`npm run start`)
   - Run health checks

## Health Monitoring

### Health Check Endpoint
```
GET /health
```
Returns comprehensive health status:
```json
{
  "status": "ok",
  "timestamp": "2025-06-12T20:47:58.635Z",
  "uptime": 24.008618382,
  "database": "connected",
  "environment": "production",
  "version": "1.0.0",
  "services": {
    "database": "healthy",
    "session": "healthy",
    "api": "healthy"
  }
}
```

### Readiness Probe
```
GET /ready  
```
Simple readiness check for load balancers:
```json
{
  "status": "ready"
}
```

## Production Features

### ✅ Applied Fixes

1. **Environment Validation**
   - Graceful handling of missing environment variables in production
   - Detailed warning messages for configuration issues

2. **Database Connection Resilience**
   - Automatic retry logic with exponential backoff
   - Connection pooling optimized for production
   - Comprehensive error handling and logging

3. **Session Security**
   - Production-ready session configuration
   - Secure cookie settings with httpOnly and sameSite
   - Warning system for missing SESSION_SECRET

4. **Error Handling**
   - Production-optimized error responses
   - Graceful degradation when services are unavailable
   - Detailed logging without exposing sensitive information

5. **Health Monitoring**
   - Comprehensive health check endpoints
   - Service status monitoring
   - Database connectivity verification

## Troubleshooting

### Common Issues

**❌ Database Connection Failed**
```
Solution: Verify DATABASE_URL format and network accessibility
Check: Firewall settings, VPN requirements, IP allowlists
```

**❌ Session Cookie Issues**
```
Solution: Ensure SESSION_SECRET is configured
Check: Cookie security settings match your domain setup
```

**❌ Application Won't Start**
```
Solution: Check all required environment variables are set
Check: Review deployment logs for specific error messages
```

### Getting Help

1. Check the `/health` endpoint for service status
2. Review deployment logs for error messages
3. Verify all environment variables are configured correctly
4. Test database connectivity independently

## Security Considerations

- Always use HTTPS in production
- Keep SESSION_SECRET secure and never commit to version control
- Regularly rotate database passwords
- Monitor application logs for suspicious activity
- Use strong, unique passwords for database connections

## Performance Optimization

The application includes production optimizations:
- Connection pooling with optimal settings
- Efficient session storage
- Graceful error handling
- Health check endpoints for monitoring
- Production-ready logging configuration