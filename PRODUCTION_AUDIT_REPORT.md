# SpendAI Production Audit Report

**Audit Date:** 2026-02-21  
**Deployment:** Vercel (frontend) + Render (backend) + Supabase  
**Scope:** Full-stack line-by-line audit

---

## PHASE 1 — BACKEND STRUCTURE CHECK

### server.js

| Item | Status | Notes |
|------|--------|-------|
| CORS config | ✅ OK | Uses `allowedOrigins` from `FRONTEND_URL` env + localhost |
| Trust proxy | ✅ OK | Set for prod (line 16-18); comment says "Railway/Vercel" — see Cleanup |
| Global rate limit | ✅ OK | 1000 req/15min, `validate: false` for prod stability |
| Routes mounted | ✅ OK | auth, googleAuth, projects, proxyKeys, analytics, budgets, diagnostics, admin, billing, /v1 |
| 404 handler | ✅ OK | Returns JSON |
| Error handler | ✅ OK | Hides stack in prod |
| Listen on 0.0.0.0 | ✅ OK | Required for Render |

**Broken/Risky:** None.

---

### config/env.js

| Var | Required | Prod-Only |
|-----|----------|-----------|
| SUPABASE_URL | ✓ | |
| SUPABASE_ANON_KEY | ✓ | |
| SUPABASE_SERVICE_KEY | ✓ | |
| OPENAI_KEY_ENCRYPTION_SECRET | ✓ | |
| PROXY_KEY_SECRET | ✓ | |
| FRONTEND_URL | | ✓ |
| NODE_ENV | | ✓ |

**Broken:** Line 47 error message says "Railway → Variables" — wrong platform (you use Render).

---

### config/supabase.js

| Item | Status |
|------|--------|
| supabaseAdmin | ✅ Uses SUPABASE_SERVICE_KEY |
| supabaseClient | ✅ Uses SUPABASE_ANON_KEY for login |
| No hardcoded URLs | ✅ |

---

### middleware/auth.js

| Item | Status |
|------|--------|
| authenticate | ✅ Reads Bearer token, calls authService.verifyToken |
| requireAdmin | ✅ Checks req.user.role === 'admin' |
| 401 response | ✅ JSON with error |

**Broken:** None.

---

### middleware/authorizeStatus.js

**CRITICAL BUG:** `req.user.organization?.subscription_status` is used to block pending orgs.  
`authService.verifyToken` returns `user.organization` from join `organizations:organization_id (id, name)` — **subscription_status is NOT selected**.  
Result: `req.user.organization?.subscription_status` is **always undefined**.  
Effect: **Pending organizations are NOT blocked** — they can access protected routes.

**Fix:** Either:
1. Include `subscription_status` in the organizations join in `authService.verifyToken`, or  
2. Fetch org status in `authorizeStatus` before checking.

---

### middleware/subscription.js

**CRITICAL BUG:** Uses `req.user.organization_id` (snake_case).  
`authService.verifyToken` returns `user.organizationId` (camelCase).  
Result: `req.user.organization_id` is **undefined** in:
- `requireActiveSubscription` (line 15)
- `checkProjectLimit` (line 58)
- `checkUserLimit` (line 97)
- `checkSpendLimit` (line 159)
- `attachSubscriptionInfo` (line 243)

Effect: **500 errors or null DB queries** when these middlewares run.

---

### routes/auth.js

| Route | Status |
|-------|--------|
| POST /signup | ✅ Validation, calls authService.signup |
| POST /login | ✅ Calls authService.login |
| GET /me | ✅ Uses authenticate |

**Broken:** None.

---

### routes/googleAuth.js

| Route | Status |
|-------|--------|
| POST /google-callback | ✅ Verifies Supabase token, JIT provisioning, returns session |

**Broken:** None.

---

### routes/projects.js

| Route | Status |
|-------|--------|
| GET / | ✅ Uses organizationId (correct) |
| GET /count | ✅ |
| GET /:id | ✅ UUID validation |
| POST / | ✅ requireAdmin, requireActiveSubscription, checkProjectLimit |
| PUT /:id | ✅ |
| DELETE /:id | ✅ |

**Broken:** POST / fails when `checkProjectLimit` runs because `subscription.js` uses `organization_id` (undefined).

---

### routes/analytics.js

**CRITICAL BUG:** Uses `req.user.organization_id` (lines 18, 38, 58, 78).  
`req.user` has `organizationId`, not `organization_id`.  
Result: **undefined passed to services** → 500 or empty data.

---

### routes/budgets.js

**CRITICAL BUG:** Same — uses `req.user.organization_id` (lines 19, 45, 78).  
Effect: **500 errors or null org** when fetching/updating budgets.

---

### routes/billing.js

**CRITICAL BUG:** Uses `req.user.organization_id` (lines 21, 71).  
Effect: **500 errors** on /api/billing/overview and /api/billing/invoices.

---

### routes/proxyKeys.js, openaiProxy.js, admin.js, diagnostics.js

- proxyKeys: ✅ Uses `organizationId`  
- openaiProxy: ✅ Uses proxy key auth, no req.user.organization_id  
- admin: ✅ Uses super admin, fetches org separately  
- diagnostics: ✅ Public routes

---

## PHASE 2 — AUTHENTICATION FLOW CHECK

### Email/Password Login

1. **Browser** → POST /api/auth/login (email, password)  
2. **Backend** → authService.login → supabaseClient.auth.signInWithPassword  
3. **Supabase** → returns session  
4. **Backend** → fetches user + org, returns { user, organization, session }  
5. **Frontend** → stores accessToken + user in localStorage, navigates to /dashboard  

**What could break:**  
- CORS if FRONTEND_URL not set on Render  
- Cold start timeout (frontend has retry logic)

**How to test:** DevTools → Network: POST /api/auth/login → 200, check response has session.accessToken.

---

### Google OAuth Login

1. **Browser** → Click "Continue with Google" → Supabase signInWithOAuth(provider: 'google', redirectTo: origin/auth/callback)  
2. **Supabase** → Redirects to Google  
3. **Google** → User approves → Redirects to Supabase  
4. **Supabase** → Redirects to `{origin}/auth/callback` with hash `#access_token=...`  
5. **Frontend** → OAuthCallback mounts, calls `supabase.auth.getSession()`  
6. **Potential race:** Supabase may not have processed the hash yet when getSession() runs → returns null → "No session found" error  
7. **Frontend** → If session found: POST /api/auth/google-callback with accessToken  
8. **Backend** → verifyToken (JIT provisioning), returns session  
9. **Frontend** → Stores token + user, navigates to /dashboard  

**What could break:**  
- Supabase Redirect URLs missing `https://spendai-2-0.vercel.app/auth/callback`  
- Supabase Site URL not set to `https://spendai-2-0.vercel.app`  
- OAuth race: getSession() before hash is processed  

**How to test:** DevTools → Application → check Redirect URLs in Supabase. Try Google login; if "No session found", add retry/wait in OAuthCallback.

**Fix for race:** Use `supabase.auth.getSession()` in a short retry loop or listen to `onAuthStateChange` before calling googleCallback.

---

### JWT / API Auth

- **Token:** Supabase access_token (JWT) stored in localStorage  
- **Header:** Authorization: Bearer {token}  
- **Backend:** authService.verifyToken(token) → supabaseAdmin.auth.getUser(token)  
- **req.user:** { id, email, role, organizationId, organization }  

**Broken:** organization lacks subscription_status; organizationId vs organization_id inconsistency (see above).

---

## PHASE 3 — FRONTEND API VALIDATION

### api.js

| Setting | Value | OK? |
|---------|-------|-----|
| baseURL | '' (empty) | ✅ Relative paths → Vite proxy (dev) or Vercel rewrite (prod) |
| timeout | 30000 | ✅ |
| Authorization | From localStorage.accessToken | ✅ Interceptor adds Bearer |
| 401 handling | console.warn only | ⚠️ Does not redirect to /login |
| 403 ORG_PENDING | Redirects to /pending-approval | ✅ |

**All API calls use relative paths (/api/...):** Correct for Vercel rewrite to Render.

**401 behavior:** User stays on page; subsequent API calls fail. Consider redirecting to /login on 401.

---

### OAuth redirect URL

- Login, Signup, api.loginWithGoogle: `redirectTo: ${window.location.origin}/auth/callback`  
- App route: `/auth/callback` → OAuthCallback  
- **Production:** Must be `https://spendai-2-0.vercel.app/auth/callback` in Supabase Redirect URLs.

---

## PHASE 4 — PRODUCTION CONFIG VALIDATION

### Render (Backend)

| Var | Required | Notes |
|-----|----------|-------|
| SUPABASE_URL | ✓ | |
| SUPABASE_ANON_KEY | ✓ | |
| SUPABASE_SERVICE_KEY | ✓ | |
| OPENAI_KEY_ENCRYPTION_SECRET | ✓ | |
| PROXY_KEY_SECRET | ✓ | |
| FRONTEND_URL | ✓ | Must be `https://spendai-2-0.vercel.app` (no trailing slash) |
| NODE_ENV | ✓ | `production` |

---

### Vercel (Frontend)

| Var | Required | Notes |
|-----|----------|-------|
| VITE_SUPABASE_URL | ✓ | For OAuth |
| VITE_SUPABASE_ANON_KEY | ✓ | |
| VITE_API_BASE_URL | Empty | ✅ Uses Vercel rewrites |

**vercel.json:** Rewrites /api/* and /v1/* to `https://spendai-2-0.onrender.com` — correct.

---

### Supabase

| Setting | Value |
|---------|-------|
| Site URL | `https://spendai-2-0.vercel.app` |
| Redirect URLs | `https://spendai-2-0.vercel.app`, `https://spendai-2-0.vercel.app/**`, `https://spendai-2-0.vercel.app/auth/callback` |

---

### CORS

- allowedOrigins: localhost:5173, localhost:3000 + FRONTEND_URL split by comma  
- **If FRONTEND_URL is `https://spendai-2-0.vercel.app`:** CORS allows that origin. ✅

---

## PHASE 5 — CLEANUP

### Railway Leftovers (must remove/update)

| File | Issue |
|------|-------|
| backend/src/config/env.js:47 | Error message says "Railway → Variables" → change to "Render → Environment" |
| backend/src/config/env.js:5-6 | Comment says "Railway surfaces the error" → change to "Render" |
| backend/src/server.js:15 | Comment "Railway/Vercel" → OK (Vercel applies); can change to "Render/Vercel" |
| backend/src/routes/diagnostics.js:38 | Comment "Railway healthcheck" → change to "Render healthcheck" |
| frontend/.env.production:4 | Comment says "Railway" → change to "Render" |
| frontend/src/services/api.js:24-25 | Comments say "Railway" → change to "Render" |
| netlify.toml | Points to `https://spendai-20-production.up.railway.app` — WRONG. If using Netlify, change to `https://spendai-2-0.onrender.com`. If not using Netlify, delete or ignore. |
| railway.json (root) | Remove if not using Railway |
| backend/railway.json | Remove if not using Railway |
| .dockerignore, Dockerfile | Railway-specific; remove if not using Railway |
| backend/Dockerfile | Same |

---

### Dead / Unused Code

- `netlify.toml`: Used only if deploying frontend to Netlify. If using Vercel only, this is dead config.  
- No obvious dead routes or unused services.

---

### Duplicate / Inconsistent Env

- Supabase keys hardcoded as fallbacks in frontend (OAuthCallback.jsx, Login.jsx, Signup.jsx, api.js). Acceptable for dev; prod should use VITE_* from Vercel env.

---

### Security

1. **Error details in dev:** `authenticate` returns `details: error.message` on 401. In prod, consider removing `details` to avoid leakage.  
2. **diagnostics/check-supabase:** Exposes `supabase_url_preview` and key presence. Restrict to internal/super-admin or remove in prod.  
3. **diagnostics/net-test:** Public. Consider removing or protecting.  
4. **Supabase anon key in frontend:** Expected; it is public.  
5. **console.log in api.js:** `console.log('Auth event change:', event)` — remove or guard for prod.

---

## CRITICAL ISSUES (must fix now)

1. **organization_id vs organizationId**  
   - **Location:** analytics.js, budgets.js, billing.js, subscription.js  
   - **Problem:** req.user has `organizationId`; code uses `organization_id`  
   - **Fix:** In authService.verifyToken and authService.login, add `organization_id: userData.organization_id` (or use `organizationId` everywhere). Standardize on one; ensure all consumers use it.

2. **authorizeStatus does not block pending orgs**  
   - **Location:** middleware/authorizeStatus.js  
   - **Problem:** req.user.organization has no subscription_status (join only selects id, name)  
   - **Fix:** In authService.verifyToken, extend organizations join to include subscription_status, e.g. `organizations:organization_id (id, name, subscription_status)`.

3. **netlify.toml wrong backend URL**  
   - **Location:** netlify.toml  
   - **Problem:** Redirects to `spendai-20-production.up.railway.app`  
   - **Fix:** If using Netlify, set to `https://spendai-2-0.onrender.com`. If not, delete netlify.toml.

---

## MEDIUM ISSUES

4. **OAuth callback race**  
   - getSession() may run before Supabase processes the hash  
   - **Fix:** Retry getSession() with short delay, or use onAuthStateChange before calling googleCallback.

5. **401 handling**  
   - Frontend only logs 401; does not redirect to login  
   - **Fix:** In api interceptor, redirect to /login on 401 (except for /api/auth/*).

6. **Error message mentions Railway**  
   - backend/config/env.js line 47  
   - **Fix:** Change to "Render → Environment".

---

## MINOR IMPROVEMENTS

7. Replace all "Railway" references with "Render" in comments.  
8. Remove or restrict diagnostics/check-supabase and diagnostics/net-test in production.  
9. Remove `details` from 401 response in auth middleware for production.  
10. Remove or guard `console.log('Auth event change:', event)` in api.js.

---

## EXACT FIX INSTRUCTIONS

### Fix 1: organization_id compatibility

**File:** `backend/src/services/authService.js`

In `login()` return (around line 140):
```javascript
user: {
    id: userData.id,
    email: userData.email,
    role: userData.role,
    organizationId: userData.organization_id,
    organization_id: userData.organization_id,  // ADD THIS
    ...
}
```

In `verifyToken()` return (around line 238):
```javascript
user: {
    id: userData.id,
    email: userData.email,
    role: userData.role,
    organizationId: userData.organization_id,
    organization_id: userData.organization_id,  // ADD THIS
    organization: userData.organizations
}
```

### Fix 2: Include subscription_status in authorizeStatus

**File:** `backend/src/services/authService.js`

In verifyToken, change the users select join from:
```javascript
organizations:organization_id (id, name)
```
to:
```javascript
organizations:organization_id (id, name, subscription_status)
```

And in login(), same change for the organizations join.

### Fix 3: netlify.toml

**File:** `netlify.toml`

Replace `https://spendai-20-production.up.railway.app` with `https://spendai-2-0.onrender.com` in both redirects, or delete the file if not using Netlify.

### Fix 4: env.js error message

**File:** `backend/src/config/env.js` line 47

Change:
```javascript
console.error('\x1b[31m[FATAL] SpendAI cannot start. Set these vars in Railway → Variables.\x1b[0m');
```
to:
```javascript
console.error('\x1b[31m[FATAL] SpendAI cannot start. Set these vars in Render → Environment.\x1b[0m');
```

### Fix 5: Railway → Render in comments

- frontend/.env.production line 4  
- frontend/src/services/api.js lines 24-25  
- backend/src/config/env.js lines 5-6  
- backend/src/routes/diagnostics.js line 38  
- backend/src/server.js line 15 (optional)

---

## CONFIRMATION CHECKLIST

After applying fixes:

- [ ] Render: FRONTEND_URL = `https://spendai-2-0.vercel.app`
- [ ] Render: All required env vars set (SUPABASE_*, OPENAI_KEY_ENCRYPTION_SECRET, PROXY_KEY_SECRET, NODE_ENV=production)
- [ ] Vercel: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY set (or use .env.production)
- [ ] Supabase: Site URL = `https://spendai-2-0.vercel.app`
- [ ] Supabase: Redirect URLs include `https://spendai-2-0.vercel.app/auth/callback`
- [ ] Google Cloud: OAuth consent screen and credentials configured for Supabase
- [ ] Test: Visit https://spendai-2-0.vercel.app → landing loads
- [ ] Test: Sign up with email → creates org → dashboard loads
- [ ] Test: Log in with email → dashboard loads
- [ ] Test: Log in with Google → redirect → dashboard loads
- [ ] Test: /api/projects returns 200 with projects (or empty array)
- [ ] Test: /api/analytics/summary returns 200
- [ ] Test: /api/budgets/summary returns 200
- [ ] Test: /api/billing/overview returns 200
- [ ] Test: Pending org user → gets 403 ORG_PENDING → redirected to /pending-approval
- [ ] Test: https://spendai-2-0.onrender.com/health returns 200
