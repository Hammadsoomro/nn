# TaskFlow - Deployment & Production Readiness Guide

## Overview

This guide covers the complete deployment process and production readiness checklist for TaskFlow.

## Prerequisites

### Environment Variables

Ensure all required environment variables are set before deployment:

```bash
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?appName=AppName
MONGODB_DB=taskflow
MONGO_MAX_POOL_SIZE=10
MONGO_SERVER_SELECTION_TIMEOUT_MS=5000

# Authentication
JWT_SECRET=<secure-random-string-32-chars-minimum>

# Frontend
FRONTEND_URL=https://your-domain.com
NODE_ENV=production
```

### Database Setup

1. Ensure MongoDB is accessible with the provided `MONGODB_URI`
2. The application will automatically create collections and indexes on first connection
3. For better performance, ensure proper MongoDB connection pooling is configured

## Deployment Steps

### 1. Local Testing

```bash
# Install dependencies
pnpm install

# Run build
pnpm run build

# Test production build locally
pnpm run start
```

### 2. Netlify Deployment

#### Connect to Netlify MCP

1. Click [Connect to Netlify](#open-mcp-popover)
2. Authorize the connection
3. Select or create a new project

#### Deploy via Netlify MCP

The application will automatically deploy through Netlify Functions. The deployment process:

1. Builds the React frontend (outputs to `dist/spa`)
2. Bundles the Express server as a Netlify Function
3. Configures routing through `netlify.toml`
4. Deploys all assets to Netlify CDN

#### Environment Variables on Netlify

Set the following environment variables in Netlify Site Settings > Build & Deploy > Environment:

- `MONGODB_URI`
- `JWT_SECRET`
- `FRONTEND_URL` (your Netlify site URL)
- `NODE_ENV=production`

### 3. Custom Domain Setup

1. Go to Netlify Site Settings > Domain Management
2. Add your custom domain
3. Update DNS records to point to Netlify nameservers
4. Enable automatic HTTPS

## Architecture Overview

### Frontend (React SPA)

- Built with Vite for optimal bundle size
- Lazy-loaded routes for better initial load performance
- Service Worker for offline support and caching

### Backend (Express + Netlify Functions)

- Express server wrapped with `serverless-http`
- MongoDB for persistent data storage
- Socket.IO for real-time communication (requires separate server)

### Database (MongoDB)

- Connection pooling with configurable pool size
- Automatic index creation for optimal query performance
- Global client reuse across serverless invocations

## Production Optimizations

### Frontend Optimizations

✅ **Code Splitting**

- Routes are lazy-loaded using React.lazy
- Vendor dependencies are split into separate chunks
- UI libraries are bundled together

✅ **Caching Strategies**

- Service Worker caches static assets
- Network-first strategy for API calls
- Cache-first strategy for images and fonts

✅ **Performance Features**

- Minified and optimized JavaScript
- CSS code splitting
- Asset fingerprinting for cache busting

### Backend Optimizations

✅ **Serverless Optimization**

- Proper async handler in Netlify Function
- Global MongoDB client reuse across warm invocations
- Connection pooling to prevent connection exhaustion

✅ **Security**

- bcryptjs for password hashing
- jsonwebtoken for secure token generation
- CORS properly configured to prevent security issues

### Database Optimizations

✅ **Connection Management**

- Client stored globally for reuse
- Connection pool limits: max 10, server selection timeout 5s
- Socket timeout: 45s for long-running operations

✅ **Indexing**

- Automatic index creation on collections
- Indexes on frequently queried fields (teamId, createdAt, email)

## Monitoring & Debugging

### View Deployment Logs

1. Go to Netlify site dashboard
2. Click "Deploys"
3. Select the latest deployment
4. View logs for build and function execution

### Common Issues & Solutions

#### JWT_SECRET Not Set

- **Error**: "JWT_SECRET environment variable is not set"
- **Solution**: Set JWT_SECRET in Netlify environment variables

#### MongoDB Connection Timeout

- **Error**: "Server selection timed out after..."
- **Solution**: Verify MONGODB_URI is correct, check MongoDB whitelist IP

#### CORS Errors

- **Error**: "Access to XMLHttpRequest blocked by CORS policy"
- **Solution**: Ensure FRONTEND_URL is set correctly in environment variables

#### Socket.IO Connection Issues

- **Issue**: Real-time features not working
- **Note**: Socket.IO requires a long-running server, not supported on Netlify Functions
- **Solution**: Deploy Socket.IO server separately (Railway, Heroku, etc.)

## Performance Targets

### Core Web Vitals

- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1

### Build Size

- **Initial Bundle**: < 200KB (gzipped)
- **Total Assets**: < 500KB (gzipped)

### Load Time

- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3.5s

## SEO & PWA

### PWA Features

✅ Web App Manifest (`manifest.webmanifest`)
✅ Service Worker (`sw.js`)
✅ Offline Support
✅ Install Prompts

### SEO Features

✅ Meta Tags (Open Graph, Twitter Card)
✅ Schema Markup (JSON-LD)
✅ Sitemap (`sitemap.xml`)
✅ Robots.txt (`robots.txt`)
✅ Semantic HTML
✅ Canonical URLs

## Rollback Procedure

If issues occur after deployment:

1. Go to Netlify Deploys page
2. Find the previous working deployment
3. Click "Publish deploy"
4. Changes will be live immediately

## Maintenance

### Regular Tasks

- [ ] Monitor error logs weekly
- [ ] Review performance metrics monthly
- [ ] Update dependencies quarterly
- [ ] Audit security vulnerabilities monthly

### Database Maintenance

- [ ] Monitor MongoDB connection pool usage
- [ ] Review query performance
- [ ] Archive old data regularly

## Security Checklist

- [ ] JWT_SECRET is strong and unique
- [ ] MONGODB_URI is secure (not in code)
- [ ] CORS is properly configured
- [ ] Passwords are hashed with bcryptjs
- [ ] HTTPS is enforced
- [ ] Security headers are set

## Support

For deployment issues:

1. Check the deployment logs in Netlify
2. Review error messages in application
3. Verify environment variables are set correctly
4. Contact support if issues persist

---

**Last Updated**: 2024-01-15
**Version**: 1.0
