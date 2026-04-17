# SUPABASE & GOOGLE CONFIGURATION GUIDE

---

## 🔧 SUPABASE SETUP (Critical)

### Step 1: Supabase Auth URL Configuration

1. Go to https://supabase.com/dashboard/project/jexipkocsmrqdzomqddy
2. Click **Settings** (bottom left) → **Authentication**
3. Click **URL Configuration**

**Set these values:**

```
Site URL:       https://spendai-2-0.vercel.app
Redirect URLs:  https://spendai-2-0.vercel.app/auth/callback
                https://spendai-2-0.onrender.com/auth/callback
                http://localhost:5173/auth/callback
                http://localhost:3000/auth/callback
                http://127.0.0.1:5173/auth/callback
```

4. Click **Save**

---

### Step 2: Authorize Origins (CORS)

Same page, scroll down to **Authorized Origins**

**Add:**
```
https://spendai-2-0.vercel.app
https://spendai-2-0.onrender.com
http://localhost:5173
http://localhost:3000
http://127.0.0.1:5173
http://127.0.0.1:3000
```

---

### Step 3: Enable Google OAuth

1. Go to **Authentication** → **Providers**
2. Click **Google**
3. Toggle **Enabled** to ON
4. You'll see a form asking for:
   - Client ID
   - Client Secret

**Get these from Google Cloud:**

#### Get Google OAuth Credentials:

1. Go to https://console.cloud.google.com
2. Create new project or select existing
3. Click **APIs & Services** → **Credentials**
4. Click **+ Create Credentials** → **OAuth client ID**
5. Choose **Web application**
6. Add Authorized redirect URIs:
   ```
   https://jexipkocsmrqdzomqddy.supabase.co/auth/v1/callback
   ```
7. Click Create
8. Copy Client ID and Client Secret

#### Paste into Supabase:

1. Back to Supabase Google provider setup
2. Paste Client ID
3. Paste Client Secret
4. Click **Save**

---

### Step 4: Verify Supabase Keys

Still in **Settings** → Look for **API**

Copy these exact values - you'll need them:

```
Project URL:              https://jexipkocsmrqdzomqddy.supabase.co
Anon Key (Public):        eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpleGlwa29jc21ycWR6b21xZGR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MDg4OTUsImV4cCI6MjA4NTA4NDg5NX0.un6HrQOPFwsLnkQt1MC9SuhPC5bB49y-cY-RtTUx344

Service Key (Private):    [LOOK IN SETTINGS → API → SERVICE ROLE KEY]
```

---

## 🌐 GOOGLE CLOUD SETUP

### Google OAuth 2.0 Credentials

**From:** https://console.cloud.google.com

#### Create/Setup OAuth App:

1. **Create Project** (if not exists)
2. **APIs & Services** → **OAuth consent screen**
   - User Type: **External**
   - Add app name: "SpendAI"
   - User support email: your-email@domain.com
   - Developer contact: your-email@domain.com
   - Save & Continue

3. **APIs & Services** → **Credentials**
4. **+ Create Credentials** → **OAuth client ID**
5. Application type: **Web application**
6. Name: "SpendAI Frontend"
7. **Authorized JavaScript origins:**
   ```
   https://spendai-2-0.vercel.app
   http://localhost:5173
   http://localhost:3000
   ```

8. **Authorized redirect URIs:**
   ```
   https://jexipkocsmrqdzomqddy.supabase.co/auth/v1/callback
   ```

9. Click **Create**
10. Copy **Client ID** and **Client Secret**
11. Paste into Supabase (see above)

---

## 🚀 RENDER ENVIRONMENT VARIABLES

### Go to Render Dashboard

1. https://dashboard.render.com
2. Select your **spendai-2-0** backend service
3. Click **Environment** tab
4. **Add the following variables:**

```bash
# Core Supabase
SUPABASE_URL=https://jexipkocsmrqdzomqddy.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpleGlwa29jc21ycWR6b21xZGR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MDg4OTUsImV4cCI6MjA4NTA4NDg5NX0.un6HrQOPFwsLnkQt1MC9SuhPC5bB49y-cY-RtTUx344

# ⚠️ CRITICAL: Get from Supabase Settings → API → Service Role Key
SUPABASE_SERVICE_KEY=[PASTE_SUPABASE_SERVICE_KEY_HERE]

# Encryption keys - GENERATE NEW
# On Windows PowerShell:
#   $bytes = [byte[]]::new(32); [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes); -join($bytes | ForEach {$_.ToString('x2')})
OPENAI_KEY_ENCRYPTION_SECRET=[GENERATE_32_HEX_CHARS]
PROXY_KEY_SECRET=[GENERATE_32_HEX_CHARS]

# Environment & Frontend
NODE_ENV=production
FRONTEND_URL=https://spendai-2-0.vercel.app

# Optional - for email alerts
RESEND_API_KEY=[OPTIONAL_RESEND_KEY]
ADMIN_ALERT_EMAIL=your-email@domain.com
```

### How to Generate Encryption Keys

**Option 1: Windows PowerShell**
```powershell
$bytes = [byte[]]::new(32)
[System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
-join($bytes | ForEach {$_.ToString('x2')})
```

Copy the output → Paste into `OPENAI_KEY_ENCRYPTION_SECRET`
Repeat for `PROXY_KEY_SECRET`

**Option 2: Online Generator**
Use: https://www.uuidgenerator.net/
(Generate 2 UUIDs, remove dashes, take first 64 chars)

---

### Save & Auto-Deploy

1. After adding all variables
2. Click **Save**
3. Render will auto-redeploy backend
4. Wait 2-3 minutes for deployment
5. Check **Logs** to verify startup

Should see:
```
[STARTUP] SpendAI Server started on port 3001
[STARTUP] Environment: production
```

---

## 🔗 VERCEL FRONTEND CONFIGURATION

### No Changes Needed ✅

Your `frontend/vercel.json` already routes API calls correctly:

```json
{
    "rewrites": [
        {
            "source": "/api/(.*)",
            "destination": "https://spendai-2-0.onrender.com/api/$1"
        },
        {
            "source": "/v1/(.*)",
            "destination": "https://spendai-2-0.onrender.com/v1/$1"
        }
    ]
}
```

Just verify the Render URL is correct: `https://spendai-2-0.onrender.com`

---

## ✅ VERIFICATION CHECKLIST

After all configuration:

- [ ] Supabase URL Config set (Site URL + Redirect URLs)
- [ ] Authorized Origins added to Supabase
- [ ] Google OAuth enabled in Supabase
- [ ] Google OAuth credentials created in Google Cloud
- [ ] Client ID + Secret pasted into Supabase
- [ ] All Render env vars set
- [ ] Render backend redeployed
- [ ] Vercel frontend deployed

---

## 🧪 TEST FLOW

1. Open https://spendai-2-0.vercel.app
   - Should see landing page
   
2. Click "Sign In" → Should see Login page
   
3. Look for "Continue with Google" button
   - If not visible → Google OAuth not enabled in Supabase
   
4. Click Google button
   - Should redirect to Google sign-in
   - After sign-in, redirects to /auth/callback
   - Shows "Completing sign-in..."
   - Redirects to /dashboard
   
5. If error at any step:
   - Check Render logs: https://dashboard.render.com
   - Check browser console: F12 → Console tab
   - Check Network tab: F12 → Network tab

