# 🚀 PRODUCTION DEPLOYMENT SETUP - Vercel + Render

## Status: Ready for Configuration

**Projects Created:**
- ✅ Vercel Frontend: https://vercel.com/teja41627-5730s-projects/spendai-2-0/2UvxUdxXdbpnyuDW7vhpZxqto85n
- ✅ Render Backend: https://dashboard.render.com/web/srv-d6ckhuvfte5s73cr9c00/

---

## STEP 1: Configure Render Backend Environment Variables

**Go to:** https://dashboard.render.com/web/srv-d6ckhuvfte5s73cr9c00/

1. Click **"Environment"** tab
2. Add these environment variables:

```
SUPABASE_URL=https://jexipkocsmrqdzomqddy.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpleGlwa29jc21ycWR6b21xZGR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MDg4OTUsImV4cCI6MjA4NTA4NDg5NX0.un6HrQOPFwsLnkQt1MC9SuhPC5bB49y-cY-RtTUx344
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpleGlwa29jc21ycWR6b21xZGR5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTUwODg5NSwiZXhwIjoyMDg1MDg0ODk1fQ.hjKv5xJXdTZPoWvcCty-LHklNn2wDv4WnxuhKP5DGQQ
PORT=3001
NODE_ENV=production
PROXY_KEY_SECRET=a7f8e9d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8
OPENAI_KEY_ENCRYPTION_SECRET=f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2
OPENAI_API_KEY=your-openai-key-here
RESEND_API_KEY=re_cxcK7Xbk_4fLhXNd6WcmMmu4bgNxDVhkK
RESEND_FROM_EMAIL=SpendAI <onboarding@resend.dev>
ADMIN_ALERT_EMAIL=teja41627@gmail.com
APP_URL=https://YOUR_VERCEL_URL (update after Vercel deploys)
FRONTEND_URL=https://YOUR_VERCEL_URL (update after Vercel deploys)
```

3. **IMPORTANT:** After Vercel finishes deploying, come back and update:
   - `APP_URL` = your Vercel URL (e.g., `https://spendai-2-0.vercel.app`)
   - `FRONTEND_URL` = your Vercel URL

4. Click **"Save"** → Wait for backend to redeploy (auto-restart)

---

## STEP 2: Get Render Backend URL

1. After Render redeployment completes, copy your backend URL
   - Look for: "https://spendai-backend.onrender.com" (or similar)
   - Located in the **"Environment"** section or top of dashboard

---

## STEP 3: Configure Vercel Frontend Environment Variables

**Go to:** https://vercel.com/teja41627-5730s-projects/spendai-2-0/2UvxUdxXdbpnyuDW7vhpZxqto85n

1. Click **"Settings"** → **"Environment Variables"**
2. Add these variables:

```
VITE_SUPABASE_URL=https://jexipkocsmrqdzomqddy.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpleGlwa29jc21ycWR6b21xZGR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MDg4OTUsImV4cCI6MjA4NTA4NDg5NX0.un6HrQOPFwsLnkQt1MC9SuhPC5bB49y-cY-RtTUx344
VITE_API_BASE_URL=https://YOUR_RENDER_BACKEND_URL (e.g., https://spendai-backend.onrender.com)
```

3. Click **"Save"** → Vercel auto-redeploys

---

## STEP 4: Verify Deployment URLs

After both deploy:

```
Frontend: https://spendai-2-0.vercel.app (check project dashboard)
Backend: https://spendai-backend.onrender.com (check Render dashboard)
```

Copy these URLs - you'll need them next.

---

## STEP 5: Configure Supabase OAuth Redirect URLs

**Go to:** https://app.supabase.com/project/jexipkocsmrqdzomqddy

1. Left sidebar: **"Authentication"** → **"URL Configuration"**
2. In **"Redirect URLs"** section, add:
   ```
   https://YOUR_VERCEL_URL/auth/callback
   https://YOUR_VERCEL_URL/auth/google/callback
   ```

3. **Site URL:** Set to your Vercel URL
   ```
   https://YOUR_VERCEL_URL
   ```

4. Click **"Save"**

---

## STEP 6: Enable Google OAuth (Optional but Recommended)

1. In Supabase dashboard → **"Authentication"** → **"Providers"**
2. Click **"Google"** 
3. Toggle **"Enabled"** to ON
4. Enter your Google OAuth credentials (if you have them)
5. Click **"Save"**

---

## STEP 7: Test Production

1. **Open your Vercel URL** in browser
2. Navigate to **Login** page
3. Test **Email/Password login**
4. Verify you're redirected to **Dashboard**
5. Check **localStorage** for token (F12 → Application → localStorage)
6. Test **page refresh** → Auth persists
7. Test **Google OAuth** (if enabled)

---

## 🎯 FINAL CHECKLIST

- [ ] Render environment variables configured
- [ ] Vercel environment variables configured  
- [ ] Both projects redeployed (check for green checkmarks)
- [ ] Supabase OAuth redirect URLs updated
- [ ] Verified both URLs are live
- [ ] Tested login flow end-to-end
- [ ] Confirmed token persists after refresh
- [ ] (Optional) Google OAuth tested

---

## 📞 TROUBLESHOOTING

**If login fails:**
1. Check browser console (F12) for errors
2. Check Render logs: https://dashboard.render.com/web/srv-d6ckhuvfte5s73cr9c00/ → **"Logs"**
3. Verify `VITE_API_BASE_URL` is correct in Vercel
4. Verify `FRONTEND_URL` is correct in Render
5. Check CORS origin is set to your Vercel URL

**If Google OAuth shows "Provider not enabled":**
1. Go back to Supabase → Authentication → Providers
2. Verify Google provider is toggled ON
3. Check redirect URLs are exact match (case-sensitive)

**If API returns 500 errors:**
1. Check all environment variables are set in Render
2. Verify `NODE_ENV=production` is set
3. Check Render logs for specific error messages

