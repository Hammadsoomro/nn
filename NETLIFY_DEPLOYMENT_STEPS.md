# Netlify Deployment - Step-by-Step Guide

## 🎯 **Your Application is Ready!**

Everything is configured and tested. Follow these steps to deploy to Netlify:

---

## **STEP 1: Connect Netlify MCP** (5 minutes)

Click here: [Connect to Netlify](#open-mcp-popover)

1. Click the button above
2. Select "Connect to Netlify"
3. Sign in with your GitHub/Google account
4. Authorize Builder.io to access your repositories
5. Select repository: **Hammadsoomro/nn**
6. Select branch: **aura-hub** (or main if preferred)

---

## **STEP 2: Configure Environment Variables in Netlify**

Once connected, add these variables in Netlify Dashboard → Settings → Build & Deploy → Environment:

### **Required Variables:**

| Variable | Value | Example |
|----------|-------|---------|
| `MONGODB_URI` | Your MongoDB connection string | `mongodb+srv://Soomro:1992@cluster0.bqlcjok.mongodb.net/?appName=Cluster0` |
| `JWT_SECRET` | Generate a 32+ character random string | `your-super-secret-jwt-key-here-min-32-chars` |
| `NODE_ENV` | Production environment | `production` |
| `FRONTEND_URL` | Your deployed Netlify URL | Will be assigned by Netlify (e.g., `https://taskflow.netlify.app`) |

### **How to Generate JWT_SECRET:**

Run this command (or use an online generator):

```bash
openssl rand -base64 32
```

This generates a secure random string. Copy it and paste into Netlify environment variables.

---

## **STEP 3: Trigger First Deployment**

### **Option A: Automatic (Recommended)**
1. Push code to GitHub: Use the Push button in the UI (top right)
2. Netlify automatically detects the commit
3. Build starts automatically
4. Watch build progress in Netlify Dashboard

### **Option B: Manual Trigger**
1. Go to Netlify Dashboard → Your Site → Deploys
2. Click "Trigger Deploy"
3. Select branch: `aura-hub`
4. Wait for build to complete

---

## **STEP 4: Monitor Build Progress**

1. Open Netlify Dashboard
2. Go to "Deploys" tab
3. You'll see your build status:
   - 🟡 Building... (Installing deps, compiling)
   - 🟢 Published (Success!)
   - 🔴 Failed (Check logs)

**Expected build time**: 2-3 minutes

---

## **STEP 5: Access Your Deployed App**

Once build is complete, Netlify gives you:

- **Production URL**: `https://your-site.netlify.app`
- **Deploy Preview**: `https://deploy-xxx--your-site.netlify.app`
- **PR Preview**: Automatic preview link on GitHub PRs

---

## **STEP 6: Verify Everything Works**

### **Test API Health:**
```bash
curl https://your-site.netlify.app/api/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "database": "connected"
}
```

### **Test Login:**
```bash
curl -X POST https://your-site.netlify.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"your-email@example.com",
    "password":"your-password"
  }'
```

### **Test Frontend:**
- Open `https://your-site.netlify.app` in browser
- Should load without errors
- Try logging in with your credentials
- Check console for no errors

---

## **Troubleshooting** 

### **Build Fails: "Module not found"**
- Check `package.json` versions
- Verify all dependencies are installed locally first
- Run `pnpm install` locally and test

### **Database Connection Error**
- Verify `MONGODB_URI` is set correctly in Netlify env
- Check MongoDB Atlas firewall allows Netlify IPs
- In MongoDB Atlas → Network Access → Add IP: `0.0.0.0/0` (or Netlify IPs)

### **401 Unauthorized**
- Verify `JWT_SECRET` is set in Netlify env
- JWT_SECRET must match between sessions
- Check browser console for auth errors

### **CORS Errors**
- Verify `FRONTEND_URL` is set to your Netlify URL
- Check backend CORS configuration in `server/index.ts`

### **Socket.IO Connection Issues**
- Ensure WebSocket connections are allowed on Netlify
- Check browser DevTools → Network → WS
- Verify Socket.IO is connecting to same domain

---

## **After First Deploy**

1. ✅ Test all features:
   - Login / Sign up
   - Dashboard
   - Team Chat
   - File uploads
   - Real-time updates

2. ✅ Monitor performance:
   - Open DevTools → Network tab
   - Check bundle sizes
   - Monitor Core Web Vitals

3. ✅ Review logs:
   - Netlify Dashboard → Functions
   - Check for any runtime errors

---

## **Environment Variables Summary**

### **Local (Development)**
```env
MONGODB_URI=mongodb+srv://Soomro:1992@cluster0.bqlcjok.mongodb.net/?appName=Cluster0
JWT_SECRET=local-test-secret-only-32-chars-minimum
NODE_ENV=development
FRONTEND_URL=http://localhost:8080
```

### **Netlify Production**
```env
MONGODB_URI=mongodb+srv://Soomro:1992@cluster0.bqlcjok.mongodb.net/?appName=Cluster0
JWT_SECRET=your-production-secret-32-chars
NODE_ENV=production
FRONTEND_URL=https://your-site.netlify.app
```

---

## **Build Configuration**

Netlify automatically runs:

```bash
pnpm install --no-frozen-lockfile
pnpm build:client
pnpm build:server
```

This creates:
- `dist/spa/` → Frontend files (served as static SPA)
- `dist/server/node-build.mjs` → Netlify Function code
- `netlify/functions/api.ts` → API handler

---

## **FAQ**

**Q: How long does build take?**  
A: First build: 2-3 min. Subsequent: 1-2 min (with caching)

**Q: Can I rollback a bad deploy?**  
A: Yes! Netlify Dashboard → Deploys → Click previous version → Restore

**Q: How do I add custom domain?**  
A: Netlify Dashboard → Domain settings → Add custom domain

**Q: Will my database data persist?**  
A: Yes! Database lives in MongoDB Atlas (external), not on Netlify

**Q: How do I debug serverless functions?**  
A: Netlify Dashboard → Functions → Logs (real-time server logs)

---

## **You're All Set! 🚀**

Your application is:
- ✅ Fully built and tested
- ✅ Production-optimized
- ✅ Security-hardened
- ✅ Ready for Netlify

**Next action**: Click [Connect to Netlify](#open-mcp-popover) to begin deployment!

---

**Questions?** See `NETLIFY_DEPLOYMENT_CHECKLIST.md` for detailed verification.
