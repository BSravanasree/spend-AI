# 🚨 PRODUCTION EMERGENCY REPAIR - IMMEDIATE ACTION PLAN

**Status:** Code fixes applied locally ✅  
**Next:** Apply 7-step fix sequence

---

## SUMMARY OF CHANGES MADE

### ✅ Code Files Fixed (Applied to Local Repo)

1. **frontend/src/services/api.js** - Fixed login() to properly handle token storage
2. **frontend/src/context/AuthContext.jsx** - Fixed auth initialization logic with better error handling
3. **backend/src/server.js** - Improved CORS logging and configuration
4. **backend/src/services/authService.js** - Fixed organization response handling

All changes are committed locally. Next: Push to GitHub and deploy.

---

## 🎯 7-STEP REPAIR SEQUENCE

### STEP 1: Push Code Changes to GitHub
```bash
cd "c:\Users\revan\OneDrive\Documents\Desktop\Documents\spendai 2.0"
git add frontend/src/services/api.js frontend/src/context/AuthContext.jsx backend/src/server.js backend/src/services/authService.js
git commit -m "CRITICAL FIX: Auth token storage, CORS logging, organization response handling"
git push origin main
```

**Expected:** Changes deployed to Vercel (auto-redeploy)

---

### STEP 2: Configure Supabase (5 minutes)

**Go to:** https://supabase.com/dashboard/project/jexipkocsmrqdzomqddy

#### 2.1 URL Configuration
Settings → Authentication → URL Configuration

```
Site URL:           https://spendai-2-0.vercel.app

Redirect URLs (add all):
  https://spendai-2-0.vercel.app/auth/callback
  https://spendai-2-0.onrender.com/auth/callback
  http://localhost:5173/auth/callback
  http://localhost:3000/auth/callback
  http://127.0.0.1:5173/auth/callback
```

**Save** ✅

#### 2.2 Authorized Origins
Same page, scroll down

```
https://spendai-2-0.vercel.app
https://spendai-2-0.onrender.com
http://localhost:5173
http://localhost:3000
http://127.0.0.1:5173
http://127.0.0.1:3000
```

**Save** ✅

---

### STEP 3: Enable Google OAuth in Supabase (10 minutes)

**Still in:** https://supabase.com/dashboard/project/jexipkocsmrqdzomqddy

#### 3.1 Get Google Credentials

Go to **Google Cloud Console:** https://console.cloud.google.com

1. Create/select project
2. **APIs & Services** → **OAuth consent screen**
   - User type: **External**
   - App name: SpendAI
   - Add your email
   - Save

3. **APIs & Services** → **Credentials**
4. **+ Create Credentials** → **OAuth 2.0 Client IDs**
   - Type: **Web application**
   - Name: SpendAI Frontend
   - **Authorized JavaScript origins:**
     ```
     https://spendai-2-0.vercel.app
     http://localhost:5173
     http://localhost:3000
     ```
   - **Authorized redirect URIs:**
     ```
     https://jexipkocsmrqdzomqddy.supabase.co/auth/v1/callback
     ```
   - **Create**
5. Copy **Client ID** and **Client Secret**

#### 3.2 Paste into Supabase

Back to Supabase:

1. **Authentication** → **Providers** → **Google**
2. Toggle **Enabled**
3. Paste Client ID
4. Paste Client Secret
5. **Save**

**Verify:** Google button should appear on login page within 2 minutes

---

### STEP 4: Set Render Environment Variables (5 minutes)

**Go to:** https://dashboard.render.com

1. Select **spendai-2-0** backend service
2. Click **Environment** tab
3. Add each variable:

#### 4.1 Supabase Keys

```
SUPABASE_URL = https://jexipkocsmrqdzomqddy.supabase.co

SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpleGlwa29jc21ycWR6b21xZGR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MDg4OTUsImV4cCI6MjA4NTA4NDg5NX0.un6HrQOPFwsLnkQt1MC9SuhPC5bB49y-cY-RtTUx344
```

**Get Service Key:**
- Go to Supabase Settings → API
- Copy **Service Role Key** (NOT anon key)

```
SUPABASE_SERVICE_KEY = [PASTE_HERE]
```

#### 4.2 Encryption Keys

**Generate in PowerShell:**
```powershell
$bytes = [byte[]]::new(32)
[System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
-join($bytes | ForEach {$_.ToString('x2')})
```

Copy output → Paste into:
```
OPENAI_KEY_ENCRYPTION_SECRET = [GENERATED_VALUE]
```

Run again for:
```
PROXY_KEY_SECRET = [GENERATED_VALUE]
```

#### 4.3 Environment & Frontend

```
NODE_ENV = production
FRONTEND_URL = https://spendai-2-0.vercel.app
```

#### 4.4 Optional - Email Alerts

```
RESEND_API_KEY = [OPTIONAL - get from https://resend.com]
ADMIN_ALERT_EMAIL = your-email@company.com
```

**SAVE** ✅

**Render will auto-redeploy** - wait 2-3 minutes

---

### STEP 5: Verify Render Backend (2 minutes)

1. Go to https://dashboard.render.com
2. Select **spendai-2-0** service
3. Click **Logs** tab
4. Should see:
   ```
   [STARTUP] SpendAI Server started on port 3001
   [STARTUP] Environment: production
   [CORS] Added origin: https://spendai-2-0.vercel.app
   ```

If you see errors → Check env vars are correct

---

### STEP 6: Test Frontend (5 minutes)

#### 6.1 Test Landing Page
1. Open https://spendai-2-0.vercel.app
2. Should see landing page (NOT login page)
3. Check for errors in browser console (F12)
4. All images should load

#### 6.2 Test Login Page
1. Click "Sign In" link
2. Navigate to https://spendai-2-0.vercel.app/login
3. Look for **Google button** with logo
4. If not visible:
   - Wait 2-3 min (cache clearing)
   - Hard refresh (Ctrl+Shift+R)
   - Check Google OAuth enabled in Supabase

#### 6.3 Test Email Login
1. Enter test email: `test@spendai.dev`
2. Enter password: `TestPassword123!`
3. Click Sign In
4. Open browser console (F12 → Console)
5. Should see: `[Auth] Login successful: test@spendai.dev`
6. Automatically redirect to /dashboard

**If stuck on login:**
- Check Network tab: POST /api/auth/login → Status 200?
- Check Response: Has `session.accessToken`?
- Check Application tab: localStorage has `accessToken`?

#### 6.4 Test Google Login
1. Click "Continue with Google"
2. Sign in with Google account
3. Browser redirects to Supabase auth endpoint
4. Shows /auth/callback with spinner
5. Automatically redirects to /dashboard
6. Should see dashboard (not login page)

**If fails at redirect:**
- Check Supabase redirect URL config
- Check Google console authorized origins
- Check browser console for errors

---

### STEP 7: Debug Checklist (If Issues)

#### Network Issues
- [ ] Open DevTools (F12)
- [ ] Click **Network** tab
- [ ] Refresh page
- [ ] Try login
- [ ] Check POST /api/auth/login:
  - Status should be **200**
  - Response should have `session.accessToken`

#### Token Storage
- [ ] Open DevTools (F12)
- [ ] Click **Application** tab
- [ ] Click **Local Storage**
- [ ] Select https://spendai-2-0.vercel.app
- [ ] Look for `accessToken` key
- [ ] Look for `user` key with JSON

#### Backend Logs
- [ ] Go to https://dashboard.render.com
- [ ] Click **spendai-2-0** service
- [ ] Click **Logs** tab
- [ ] Search for your email
- [ ] Should see POST /api/auth/login entries

#### Browser Console Errors
- [ ] Open DevTools (F12)
- [ ] Click **Console** tab
- [ ] Look for red errors
- [ ] Note exact error message
- [ ] Copy for debugging

---

## 📋 FINAL VERIFICATION CHECKLIST

Before declaring success:

- [ ] Landing page loads (https://spendai-2-0.vercel.app)
- [ ] Login page accessible (/login)
- [ ] Google OAuth button visible
- [ ] Can login with email/password
- [ ] Redirected to /dashboard after login
- [ ] Token persists after page refresh
- [ ] Can logout
- [ ] Render backend logs show no errors
- [ ] No CORS errors in browser console
- [ ] Google OAuth flow completes

---

## 🆘 TROUBLESHOOTING

### "Internal Server Error" on Login
**Cause:** Missing Render env vars  
**Fix:** Follow Step 4, verify all vars set, check Render logs

### "Google button not appearing"
**Cause:** Google OAuth not enabled in Supabase  
**Fix:** Follow Step 3.2, enable Google provider, wait 2-3 min for cache clear

### "Stuck on login page after sign-in"
**Cause:** Token not stored in localStorage  
**Fix:** 
- Open DevTools → Application → Local Storage
- Check if `accessToken` key exists
- If not: Check Network tab for POST /api/auth/login response
- Verify response has `session.accessToken`

### "CORS error in console"
**Cause:** Frontend URL not in Render allowed origins  
**Fix:** Follow Step 4, add FRONTEND_URL=https://spendai-2-0.vercel.app

### "401 Invalid token"
**Cause:** Token expired or invalid  
**Fix:** 
- Clear localStorage (DevTools → Application → Local Storage → Clear)
- Try login again
- Check Render logs for token verification errors

---

## 📞 SUPPORT

If stuck on any step:
1. Note the exact error message
2. Check browser console (F12)
3. Check Render logs
4. Compare with SUPABASE_GOOGLE_CONFIG.md guide
5. Re-read the relevant step above

**Success indicator:** You can see dashboard after login ✅

