# Production Deployment Guide for Wagba

This guide covers deploying the Wagba meal delivery application to production environments with proper authentication, session management, and database configuration.

## Prerequisites

1. **PostgreSQL Database**: A production PostgreSQL database with connection URL
2. **Environment Variables**: Required secrets and configuration values
3. **Domain Configuration**: HTTPS-enabled domain for secure cookie handling

## Required Environment Variables

Set these environment variables in your production environment:

```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database

# Session Management
SESSION_SECRET=your-super-secure-random-string-minimum-32-characters

# Node Environment
NODE_ENV=production

# Optional: Custom Port (defaults to 5000)
PORT=5000
```

## Database Setup

1. **Create Database Tables**: The application will automatically create tables on first run
2. **Seed Initial Data**: Default admin account will be created automatically
3. **Default Admin Credentials**:
   - Username: `admin`
   - Password: `password`
   - **Important**: Change these credentials immediately after first login

## Session Store Configuration

The application automatically configures session storage based on environment:

- **Development**: Uses memory store (sessions lost on restart)
- **Production**: Uses PostgreSQL-backed session store (persistent sessions)

## Key Production Features

### 1. Secure Session Management
- HttpOnly cookies prevent XSS attacks
- Secure cookies over HTTPS
- SameSite protection against CSRF
- PostgreSQL-backed session persistence

### 2. Database Connection Resilience
- Automatic connection retry with exponential backoff
- Connection pooling for optimal performance
- Graceful error handling and recovery

### 3. Enhanced Security
- Password hashing with bcrypt
- Separate admin and user authentication systems
- Session validation on every protected request

## Deployment Steps

### 1. Environment Setup
```bash
# Set required environment variables
export DATABASE_URL="your-postgres-connection-string"
export SESSION_SECRET="your-secure-session-secret"
export NODE_ENV="production"
```

### 2. Database Initialization
The application will automatically:
- Test database connectivity
- Create necessary tables
- Seed initial admin account
- Set up session storage

### 3. Application Startup
```bash
npm run dev
```

The server will start on `0.0.0.0:5000` and be accessible from any network interface.

## Post-Deployment Checklist

### 1. Verify Database Connection
- Check server logs for "Database connection successful"
- Ensure tables are created without errors

### 2. Test Authentication
- Admin login at `/admin`
- User registration and login
- Session persistence across browser refreshes

### 3. Verify Session Management
- Login should persist after browser refresh
- Logout should clear sessions completely
- Session should expire after 24 hours of inactivity

### 4. Security Validation
- Change default admin password
- Verify HTTPS is working (required for secure cookies)
- Test that sessions work across different browser tabs

## Troubleshooting

### Authentication Issues
1. **Sessions not persisting**: Ensure `SESSION_SECRET` is set
2. **Login redirects failing**: Check HTTPS configuration
3. **Database connection errors**: Verify `DATABASE_URL` format

### Database Issues
1. **Connection timeout**: Check database server status
2. **Permission errors**: Verify database user permissions
3. **SSL connection issues**: Ensure database supports SSL if required

### Session Storage Issues
1. **Memory store in production**: Ensure `NODE_ENV=production`
2. **Session table errors**: Check database permissions for table creation
3. **Cookie not set**: Verify domain configuration and HTTPS

## Monitoring and Maintenance

### 1. Database Monitoring
- Monitor connection pool usage
- Track query performance
- Set up backup schedules

### 2. Session Management
- Monitor session table growth
- Set up cleanup for expired sessions
- Track authentication failures

### 3. Application Health
- Monitor server response times
- Track error rates
- Set up log aggregation

## Security Best Practices

1. **Change Default Credentials**: Immediately change admin password
2. **Use HTTPS**: Required for secure session cookies
3. **Regular Updates**: Keep dependencies updated
4. **Monitor Access**: Track admin and user login attempts
5. **Backup Strategy**: Regular database backups

## Support

For deployment issues:
1. Check server logs for specific error messages
2. Verify all environment variables are set correctly
3. Test database connectivity independently
4. Ensure HTTPS is properly configured for your domain

The application includes comprehensive error handling and logging to help diagnose production issues quickly.