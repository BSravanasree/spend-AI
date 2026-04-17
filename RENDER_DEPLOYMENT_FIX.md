# 🔴 URGENT: Render Backend Not Running

## Problem
- Backend URL returns 404 (no server running)
- Frontend trying to call backend API fails with CORS error
- Need to deploy/restart Render backend

## Quick Fix (Choose ONE):

### Option A: Manual Redeploy on Render
1. Go: https://dashboard.render.com/web/srv-d6ckhuvfte5s73cr9c00/
2. Scroll down to "Latest Deployment"
3. Click the 3-dot menu → "Redeploy"
4. Wait 3-5 minutes for deployment to complete
5. Check logs for errors

### Option B: Add Missing Environment Variables
1. Go: https://dashboard.render.com/web/srv-d6ckhuvfte5s73cr9c00/
2. Click **"Environment"** tab
3. Verify ALL these variables are set:
   - SUPABASE_URL ✓
   - SUPABASE_ANON_KEY ✓
   - SUPABASE_SERVICE_KEY ✓
   - PROXY_KEY_SECRET ✓
   - OPENAI_KEY_ENCRYPTION_SECRET ✓
   - OPENAI_API_KEY ✓
   - RESEND_API_KEY ✓
   - RESEND_FROM_EMAIL ✓
   - ADMIN_ALERT_EMAIL ✓
   - NODE_ENV = `production` ✓
   - PORT = `3001` ✓
   - **FRONTEND_URL = `https://spendai-2-0.vercel.app`** ← CRITICAL!
   - **APP_URL = `https://spendai-2-0.vercel.app`** ← CRITICAL!

4. Click "Save" → Backend auto-redeploys
5. Wait 3-5 minutes
6. Check logs for "Server started on port 3001"

### Option C: Check Logs for Errors
1. Go: https://dashboard.render.com/web/srv-d6ckhuvfte5s73cr9c00/
2. Click **"Logs"** tab
3. **What errors do you see?**
   - Missing env var? (specific name?)
   - Syntax error?
   - Database connection error?
   - Port already in use?

## Verification

Once backend is running, test with:
```bash
curl https://spendai-backend.onrender.com/health
```

Should return: `{"message":"SpendAI Backend API is live","environment":"production"}`

## Then Test Login Flow
1. Go to https://spendai-2-0.vercel.app/login
2. Try login with test email
3. Should work without CORS errors
