# ⚡ Quick Deployment Guide - TaskFlow on Netlify

## 5-Minute Setup

### 1️⃣ Generate JWT Secret
```bash
openssl rand -base64 32
```
Copy the output - you'll need this.

### 2️⃣ Get MongoDB Connection String
From MongoDB Atlas:
```
mongodb+srv://username:password@cluster.mongodb.net/?appName=taskflow
```

### 3️⃣ Connect to Netlify
Click [Connect to Netlify](#open-mcp-popover) and authorize.

### 4️⃣ Set Environment Variables
In Netlify Dashboard:
- **Site Settings** → **Build & Deploy** → **Environment**
- Add these variables:

```
MONGODB_URI=mongodb+srv://...your-connection-string...
JWT_SECRET=...paste-the-generated-secret...
NODE_ENV=production
FRONTEND_URL=https://your-site.netlify.app
```

### 5️⃣ Deploy
Push code to GitHub or click "Deploy Site" in Netlify.

### 6️⃣ Verify
Wait for build to complete, then test:
```bash
curl https://your-site.netlify.app/api/health
```

Expected response:
```json
{
  "status": "ok",
  "database": "connected"
}
```

---

## ✅ Checklist

- [ ] MongoDB cluster created
- [ ] Connection string copied
- [ ] JWT secret generated
- [ ] Connected to Netlify
- [ ] Environment variables set
- [ ] Build triggered
- [ ] Health endpoint verified
- [ ] App tested (signup/login)

---

## 🔗 Key URLs

| Resource | URL |
|----------|-----|
| **Netlify Dashboard** | https://app.netlify.com |
| **MongoDB Atlas** | https://www.mongodb.com/cloud/atlas |
| **Your Site** | https://your-site.netlify.app |
| **Health Check** | https://your-site.netlify.app/api/health |

---

## 🆘 Common Issues

**Build Failed?**
- Check MongoDB connection string
- Verify JWT_SECRET is set
- Review Netlify build logs

**404 on API?**
- Wait for build to complete
- Check `/api/health` endpoint
- Verify environment variables

**Database Connection Error?**
- Check MongoDB URI is correct
- Whitelist 0.0.0.0/0 in MongoDB IP Access
- Verify credentials

**Slow First Request?**
- Normal for serverless (2-5 seconds)
- Warm requests are fast (50-200ms)

---

## 📊 Expected Performance

| Operation | Time |
|-----------|------|
| Health check (cold) | 2-5s |
| Health check (warm) | <100ms |
| API request (warm) | 200-500ms |
| Signup | 1-2s |
| Login | 500-1000ms |

---

## 🎯 Next Steps

1. **Complete deployment checklist above**
2. **Create test account**
3. **Send test message**
4. **Verify notifications**
5. **Enable custom domain (optional)**

---

## 📖 Full Guides

For more details, see:
- `NETLIFY_PRODUCTION_GUIDE.md` - Complete guide
- `PRODUCTION_DEPLOYMENT_SUMMARY.md` - Full summary
- `DEPLOYMENT.md` - General deployment

---

**Status**: Ready to deploy  
**Estimated Time**: 5-10 minutes  
**Build Time**: 5-10 minutes  
**Go Live**: Total ~15-20 minutes
