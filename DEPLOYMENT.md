# Deployment Configuration Guide

## Required Environment Variables

To deploy this application successfully, configure the following environment variables in your deployment settings:

### Essential Variables

1. **DATABASE_URL** (Required)
   - PostgreSQL connection string
   - Format: `postgresql://username:password@host:port/database`
   - Example: `postgresql://user:pass@db.example.com:5432/myapp`

2. **SESSION_SECRET** (Required for Production)
   - Random string for session security
   - Generate with: `openssl rand -base64 32`
   - Example: `your-super-secure-random-string-here`

3. **NODE_ENV** (Recommended)
   - Set to `production` for production deployments
   - Enables production optimizations and error handling

### PostgreSQL Configuration

If using separate PostgreSQL environment variables instead of DATABASE_URL:

- **PGHOST** - Database host
- **PGPORT** - Database port (default: 5432)
- **PGUSER** - Database username
- **PGPASSWORD** - Database password
- **PGDATABASE** - Database name

## Deployment Steps

1. Configure all required environment variables in your deployment platform
2. Ensure PostgreSQL database is accessible from your deployment environment
3. Run database migrations: `npm run db:push`
4. Deploy using: `npm run build && npm run start`

## Health Check

The application includes a health check endpoint at `/health` that verifies:
- Server status
- Database connectivity
- Environment configuration

## Troubleshooting

### Database Connection Issues
- Verify DATABASE_URL is correctly formatted
- Ensure database server is accessible
- Check firewall settings allow connections

### Session Issues
- Ensure SESSION_SECRET is set in production
- Verify cookie settings for your domain

### Environment Variable Issues
- Check all required variables are configured
- Verify variable names match exactly (case-sensitive)