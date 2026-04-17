# SpendAI Production System Repair Guide
**Emergency Fix for 2-Week Login Issue**

---

## ⚠️ CRITICAL ISSUES IDENTIFIED

### 1. **Google OAuth Button Not Appearing**
- ✅ Button code exists in Login.jsx
- ✅ Supabase OAuth config is correct
- **ISSUE**: Supabase Google OAuth not enabled in Supabase console

### 2. **After Login - Stuck on Login Page**
- ✅ Redirect logic exists (navigate('/dashboard'))
- **ISSUE**: Token not being stored OR authService.isAuthenticated() returning false

### 3. **Internal Server Error**
- **ISSUE**: Missing environment variables on Render
  - SUPABASE_URL
  - SUPABASE_ANON_KEY
  - SUPABASE_SERVICE_KEY
  - OPENAI_KEY_ENCRYPTION_SECRET
  - PROXY_KEY_SECRET

### 4. **Landing Page Display Issue**
- ✅ Landing page code is complete
- **LIKELY ISSUE**: Frontend routing or CSS loading

### 5. **Invalid Credentials Error**
- **ISSUE**: Login service might have issues with token response handling

---

## 📋 PHASE 1 — ROUTING CHECK (VERIFIED ✅)

### Current Routes Structure
```jsx
App.jsx Routes:
✅ / → Landing (public)
✅ /login → Login (public)
✅ /signup → Signup (public)
✅ /auth/callback → OAuthCallback (public)
✅ /dashboard → Protected (needs token)
✅ /projects/* → Protected
✅ /budgets → Protected
✅ /alerts → Protected
✅ /billing → Protected
```

**Status**: CORRECT ✅

---

## 🔐 PHASE 2 — FRONTEND AUTH FLOW CHECK

### Issue Found: Token Not Being Stored

**Current in api.js:**
```javascript
async login(email, password) {
    const response = await api.post('/api/auth/login', { email, password });
    const { session, user, organization } = response.data;
    if (session) {
        localStorage.setItem('accessToken', session.accessToken);
        localStorage.setItem('user', JSON.stringify({ ...user, organization }));
    }
    return response.data;
}
```

**Problem**: The session object structure might not match what backend returns.

**Backend Returns:**
```javascript
{
    success: true,
    user: { id, email, role, organizationId },
    organization: [{ id, name }],
    session: {
        accessToken: authData.session.access_token,
        refreshToken: authData.session.refresh_token,
        expiresAt: authData.session.expires_at
    }
}
```

**FIXED VERSION NEEDED** ✅ See corrections below

---

## 🔧 PHASE 3 — BACKEND AUTH CHECK

### CORS Configuration
**Current in server.js:**
```javascript
const allowedOrigins = new Set([
    'http://localhost:5173',
    'http://localhost:3000',
]);

if (process.env.FRONTEND_URL) {
    process.env.FRONTEND_URL.split(',').map(u => u.trim()).filter(Boolean).forEach(u => allowedOrigins.add(u));
}
```

**Status**: ✅ CORRECT (will read from env var)

### JWT Verification
**Current in middleware/auth.js:**
```javascript
async function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({...});
    }
    const token = authHeader.substring(7);
    const result = await authService.verifyToken(token);
    req.user = result.user;
    next();
}
```

**Status**: ✅ CORRECT

---

## 🔑 PHASE 4 — SUPABASE CONFIG REQUIRED

### Required Settings in Supabase Console

#### 4.1 Authentication → URL Configuration
```
Site URL:           https://spendai-2-0.vercel.app
Redirect URLs:      https://spendai-2-0.vercel.app/auth/callback
                    http://localhost:5173/auth/callback
                    http://localhost:3000/auth/callback
```

#### 4.2 Google OAuth Setup
1. Go to **Authentication → Providers → Google**
2. Enable Google
3. Add Google OAuth credentials:
   - Get from: https://console.cloud.google.com
   - Add Authorized Redirect URI: `https://jexipkocsmrqdzomqddy.supabase.co/auth/v1/callback`
4. Paste Client ID and Client Secret into Supabase

#### 4.3 Authorized Origins (Supabase Console)
```
https://spendai-2-0.vercel.app
http://localhost:5173
http://localhost:3000
```

---

## 🌐 PHASE 5 — GOOGLE LOGIN FIX

### Current Implementation (Line-by-line check)

**frontend/src/pages/Login.jsx:**
✅ Google button exists
✅ OAuth handler exists
✅ Redirect configured correctly

**Issue**: Google provider not enabled in Supabase

**Action Required**: Enable Google in Supabase console (see Phase 4)

---

## 🚀 PHASE 6 — RENDER ENVIRONMENT VARIABLES (CRITICAL ⚠️)

### Required Backend Variables on Render
```bash
NODE_ENV=production
FRONTEND_URL=https://spendai-2-0.vercel.app
SUPABASE_URL=https://jexipkocsmrqdzomqddy.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpleGlwa29jc21ycWR6b21xZGR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MDg4OTUsImV4cCI6MjA4NTA4NDg5NX0.un6HrQOPFwsLnkQt1MC9SuhPC5bB49y-cY-RtTUx344
SUPABASE_SERVICE_KEY=[Get from Supabase Settings → API]
OPENAI_KEY_ENCRYPTION_SECRET=[Generate: openssl rand -hex 32]
PROXY_KEY_SECRET=[Generate: openssl rand -hex 32]
RESEND_API_KEY=[Optional - get from Resend if using email]
```

### How to Set on Render
1. Go to https://dashboard.render.com
2. Select your spendai-2-0 backend service
3. Click **Environment** tab
4. Add all variables above
5. Click **Save** → auto-redeploy

---

## 🐛 PHASE 7 — DEBUG CHECKLIST

### Step 1: Test Landing Page
- [ ] Open https://spendai-2-0.vercel.app
- [ ] Should show landing page with pricing table
- [ ] NOT redirected to login
- [ ] All images/CSS load

### Step 2: Test Login Page
- [ ] Click "Sign in" link
- [ ] Navigate to /login
- [ ] See email + password form
- [ ] See Google login button
- [ ] **If no Google button**: Google OAuth not enabled in Supabase

### Step 3: Test Email/Password Login
- [ ] Create test account via /signup
- [ ] Login with test credentials
- [ ] **Check Browser Console (F12):**
  - Look for network errors
  - Check if /api/auth/login returns 200
  - Check if accessToken in localStorage
- [ ] After login, should redirect to /dashboard
- [ ] If stuck on /login: accessToken not saving

### Step 4: Test Google Login
- [ ] Click "Continue with Google" button
- [ ] Sign in with Google account
- [ ] Browser redirects to https://jexipkocsmrqdzomqddy.supabase.co/auth/v1/callback
- [ ] Then redirects back to https://spendai-2-0.vercel.app/auth/callback
- [ ] Should see loading spinner
- [ ] **If error**: Check Render env vars + Supabase redirect URLs

### Step 5: Check Network Tab
1. Open DevTools (F12)
2. Click Network tab
3. Refresh page
4. Try login
5. Click each request:
   - POST /api/auth/login → 200 OK? ✅
   - Response has `session.accessToken`? ✅
   - Check localStorage: `accessToken` present? ✅

### Step 6: Check Token Storage
1. Open DevTools (F12)
2. Click Application tab
3. Click Local Storage
4. Click https://spendai-2-0.vercel.app
5. Look for:
   - `accessToken` key
   - `user` key (JSON with email, role, organization)

### Step 7: Check Backend Logs
```bash
# SSH into Render or check Logs tab
# Should see:
GET /api/diagnostics/health - 200
POST /api/auth/login - 200
GET /api/auth/me - 200
```

---

## 📝 EXACT CODE FIXES NEEDED

See next sections for complete corrected files.

