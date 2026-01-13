# TaskFlow - Netlify Serverless Production Deployment Guide

## 🚀 Production Ready Checklist

### ✅ Project Status
- [x] Source code clean and optimized
- [x] Dependencies updated and secured
- [x] Serverless function handler configured
- [x] Database connection pooling enabled
- [x] Authentication (JWT + bcryptjs) implemented
- [x] CORS properly configured
- [x] CSP headers configured for security
- [x] PWA fully implemented
- [x] SEO optimized
- [x] Performance optimized (code splitting, lazy loading)

---

## 📋 Pre-Deployment Requirements

### 1. Environment Variables Setup

Set these variables in your Netlify site settings:

**Critical Variables:**
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?appName=taskflow
JWT_SECRET=<your-secure-random-string-minimum-32-characters>
NODE_ENV=production
```

**Optional Variables:**
```
MONGODB_DB=taskflow
MONGO_MAX_POOL_SIZE=10
MONGO_SERVER_SELECTION_TIMEOUT_MS=5000
FRONTEND_URL=https://your-netlify-domain.netlify.app
```

### 2. Database Preparation

Ensure your MongoDB:
- ✅ Has proper connection string with IP whitelist including Netlify's IPs
- ✅ Connection timeout is set appropriately (5000-10000ms recommended)
- ✅ Automatic index creation is enabled (app handles this)

### 3. Build Verification

The build process:
```bash
pnpm install      # Install dependencies
pnpm run build    # Build client (dist/spa) and server
                  # Outputs:
                  # - dist/spa/ (React SPA)
                  # - dist/server/ (Netlify Function)
```

---

## 🔧 Architecture Overview

### Frontend
- **Type**: React SPA (Single Page Application)
- **Build Output**: `dist/spa/`
- **Hosting**: Netlify CDN (automatic)
- **Served by**: Static hosting + SPA routing

### Backend
- **Type**: Express.js wrapped with serverless-http
- **Deployment**: Netlify Functions
- **Function Handler**: `netlify/functions/api.ts`
- **Build Output**: `dist/server/api.mjs` (Netlify Function)
- **Routing**: `/api/*` routes redirect to function

### Database
- **Type**: MongoDB (Atlas recommended)
- **Connection**: Global client reuse across warm invocations
- **Pooling**: maxPoolSize: 10 (serverless optimized)

---

## 🌐 Netlify Configuration Details

### netlify.toml Overview

**Build Settings:**
```toml
[build]
  command = "pnpm run build"
  functions = "netlify/functions"
  publish = "dist/spa"
  environment = { NODE_VERSION = "22" }
```

**Function Configuration:**
```toml
[functions]
  external_node_modules = [
    "express", "mongodb", "socket.io", "cors",
    "dotenv", "jsonwebtoken", "bcryptjs", "zod"
  ]
  node_bundler = "esbuild"
```

**Routing:**
- `/api/*` → Netlify Function
- `/*` → `index.html` (SPA routing)

**Security Headers:**
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Content-Security-Policy with unsafe-eval (for Socket.IO)

---

## 🔒 Security Configuration

### Authentication Flow
1. User logs in via `/api/auth/login`
2. Server returns JWT token (expires: 7 days)
3. Token stored in client localStorage
4. All API requests include `Authorization: Bearer <token>` header

### Password Security
- Hashing: bcryptjs (10 rounds)
- Salting: Automatic with bcryptjs
- Verification: Constant-time comparison

### API Security
- CORS: Whitelist only your domain
- Rate limiting: Handled by Netlify
- Timeout: 10s default (serverless limit)

---

## 📦 Deployment Steps

### Step 1: Connect Netlify
1. Click [Connect to Netlify](#open-mcp-popover)
2. Authorize the connection
3. Create new site or select existing

### Step 2: Configure Environment
1. Go to Netlify Site Settings
2. Build & Deploy → Environment
3. Add environment variables:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `FRONTEND_URL` (your Netlify domain)
   - `NODE_ENV=production`

### Step 3: Trigger Deploy
1. Push code to repository or manually trigger build
2. Netlify automatically:
   - Runs `pnpm run build`
   - Builds React frontend
   - Bundles Express server as Function
   - Deploys to CDN and Functions

### Step 4: Verify Deployment
```bash
curl https://your-domain.netlify.app/api/health
# Expected response: { "status": "ok", "database": "connected" }
```

---

## 🧪 Testing Production

### Health Check
```bash
curl https://your-domain.netlify.app/api/health
```

### Authentication Test
```bash
# Signup
curl -X POST https://your-domain.netlify.app/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'

# Login
curl -X POST https://your-domain.netlify.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Protected Route Test
```bash
curl https://your-domain.netlify.app/api/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## ⚙️ Serverless Function Details

### Cold Start Optimization

**Implemented:**
✅ Lazy handler creation
✅ Global MongoDB client reuse
✅ Connection pooling
✅ Dependency bundling

**Typical Cold Start Time:** 2-5 seconds
**Warm Invocation Time:** 50-200ms

### Function Lifecycle

```typescript
// First invocation (cold start)
1. Load dependencies
2. Create MongoDB client
3. Connect to database
4. Await database ready
5. Create serverless handler
6. Handle request

// Subsequent invocations (warm)
1. Reuse cached handler
2. Reuse cached client
3. Handle request immediately
```

---

## 🔄 Deployment Best Practices

### Before Each Deploy
- [ ] Run local tests: `pnpm run test`
- [ ] Type check: `pnpm run typecheck`
- [ ] Format code: `pnpm run format.fix`
- [ ] Verify build locally: `pnpm run build`

### Monitoring Post-Deploy
- [ ] Check Netlify function logs
- [ ] Monitor error rates
- [ ] Test critical user flows
- [ ] Verify database connectivity

### Environment Variable Management
- ✅ Never commit secrets to repository
- ✅ Use Netlify environment variables
- ✅ Rotate JWT_SECRET periodically
- ✅ Update FRONTEND_URL for custom domains

---

## 🐛 Troubleshooting

### Build Failures

**Error: "No matching version found for..."**
- **Solution**: Check package.json versions are published on npm
- **Example**: jsonwebtoken@9.1.2 doesn't exist → use 9.0.3

**Error: "Cannot find module..."**
- **Solution**: Ensure all imports use correct paths
- **Check**: Path aliases in tsconfig.json and vite.config.ts

### Runtime Errors

**Error: "MONGODB_URI is not set"**
- **Solution**: Add MONGODB_URI to Netlify environment
- **Verify**: Netlify Site Settings → Environment

**Error: "JWT_SECRET is not set"**
- **Solution**: Add JWT_SECRET to Netlify environment
- **Generate**: Use `openssl rand -base64 32`

**Error: "Connection timed out"**
- **Solution**: Check MongoDB whitelist includes Netlify IPs
- **Verify**: MongoDB Atlas → Network Access

### Cold Start Issues

**Slow first request (10+ seconds)**
- Normal for Netlify Functions (expected behavior)
- Subsequent requests are faster (warm invocations)
- Consider upgrading Netlify plan for better cold starts

---

## 📊 Performance Targets

### API Response Times
- **Health check**: < 1s (includes DB connection)
- **Login/Signup**: < 2s (includes hashing)
- **Chat messages**: < 500ms (cached)
- **List operations**: < 500ms (indexed queries)

### Serverless Limits
- **Execution time**: 10 seconds (hard limit)
- **Memory**: 1024MB
- **Max payload**: 6MB

---

## 🔐 Production Checklist

### Security
- [ ] JWT_SECRET is strong (32+ characters)
- [ ] CORS origin is specific (not wildcard)
- [ ] Database credentials are secure
- [ ] HTTPS is enforced
- [ ] Security headers are set

### Reliability
- [ ] Database has backups enabled
- [ ] Error logging is configured
- [ ] Health checks are working
- [ ] Failover strategy is in place

### Performance
- [ ] CDN is enabled (Netlify default)
- [ ] Code splitting is working
- [ ] Service Worker is registered
- [ ] Images are optimized

### Maintenance
- [ ] Dependencies are up to date
- [ ] Security patches are applied
- [ ] Monitoring is configured
- [ ] Logs are reviewed regularly

---

## 📞 Support & Monitoring

### Netlify Dashboard
- Function logs: Site Settings → Functions
- Performance: Analytics section
- Errors: Functions tab → Logs

### Recommended Tools
- Sentry: Error tracking
- LogRocket: Session replay
- Datadog: Monitoring
- New Relic: Performance APM

---

## 🎯 Next Steps

1. **Verify Environment Variables**
   ```
   Set MONGODB_URI, JWT_SECRET, and FRONTEND_URL
   ```

2. **Deploy to Netlify**
   - Click [Connect to Netlify](#open-mcp-popover)
   - Push code or trigger build

3. **Test Production**
   - Verify health endpoint
   - Test authentication flow
   - Check API responses

4. **Monitor Deployment**
   - Review function logs
   - Monitor performance
   - Watch error rates

---

## 📚 Additional Resources

- [Netlify Functions Documentation](https://docs.netlify.com/functions/overview/)
- [MongoDB Connection Pooling](https://www.mongodb.com/docs/drivers/node/current/fundamentals/connection/connection-pooling/)
- [Express.js Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Vite Build Optimization](https://vitejs.dev/guide/build.html)

---

**Status**: ✅ **PRODUCTION READY**  
**Last Updated**: 2024-01-15  
**Node Version**: 22  
**Build Tool**: Vite + Rollup  
**Runtime**: Netlify Functions (AWS Lambda)
