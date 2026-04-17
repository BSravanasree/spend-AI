# 🔥 LOCAL EXECUTION GUIDE - SPEND AI SAAS

**Goal: Get everything running locally in 2 hours**

---

## ✅ PRE-FLIGHT CHECK

### Check Node Version
```powershell
node --version
# Required: v18.x or v20.x
# If wrong: Download from https://nodejs.org/
```

### Check npm
```powershell
npm --version
# Should be 9.x or 10.x
```

---

# 1️⃣ BACKEND SETUP (15 minutes)

## Step 1.1: Install Dependencies
```powershell
cd "c:\Users\revan\OneDrive\Documents\Desktop\Documents\spendai 2.0\backend"

# Install all dependencies
npm install

# Install new SaaS dependencies
npm install helmet express-rate-limit zod bcrypt ioredis bullmq winston
```

**Expected output:**
```
added 150 packages in 45s
```

## Step 1.2: Verify .env File
Your `.env` is already configured. Verify it has:
```
SUPABASE_URL=https://jexipkocsmrqdzomqddy.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PORT=3001
NODE_ENV=development
```

## Step 1.3: Start Backend Server
```powershell
npm start
```

**Expected output:**
```
[STARTUP] SpendAI Server started on port 3001
[STARTUP] Environment: development
[STARTUP] Server listening on 0.0.0.0:3001
```

## Step 1.4: Verify Backend is Running

**Open new PowerShell window** and test:
```powershell
curl http://localhost:3001/health
```

**Expected response:**
```json
{
  "status": "ok",
  "uptime": 5.123,
  "timestamp": "2026-02-11T05:38:07.000Z",
  "node_version": "v20.11.0"
}
```

✅ **Backend is running!**

---

# 2️⃣ DATABASE SETUP (10 minutes)

You're using **Supabase** (cloud PostgreSQL), so no local PostgreSQL needed!

## Step 2.1: Run Migration

### Option A: Via Supabase Dashboard (RECOMMENDED)
1. Go to: https://supabase.com/dashboard/project/jexipkocsmrqdzomqddy
2. Click **SQL Editor** in left sidebar
3. Click **New Query**
4. Copy entire content of: `migrations/008_manual_billing_schema.sql`
5. Paste into SQL Editor
6. Click **Run** (or press Ctrl+Enter)

**Expected output:**
```
Success. No rows returned
```

### Option B: Via Command Line
```powershell
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login to Supabase
supabase login

# Run migration
supabase db push --db-url "postgresql://postgres:[YOUR-PASSWORD]@db.jexipkocsmrqdzomqddy.supabase.co:5432/postgres"
```

## Step 2.2: Verify Tables Created

In Supabase SQL Editor, run:
```sql
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('subscription_history', 'invoices', 'budget_alerts', 'admin_actions')
ORDER BY tablename;
```

**Expected output:**
```
admin_actions
budget_alerts
invoices
subscription_history
```

## Step 2.3: Verify Organizations Table Updated

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'organizations' 
AND column_name IN ('plan_tier', 'subscription_status', 'max_projects')
ORDER BY column_name;
```

**Expected output:**
```
max_projects        | integer
plan_tier           | character varying
subscription_status | character varying
```

✅ **Database migration complete!**

---

# 3️⃣ SUPER ADMIN CREATION (5 minutes)

## Step 3.1: Sign Up First (if not done)

1. Start frontend (see section 4)
2. Go to: http://localhost:5173
3. Sign up with your email
4. Complete signup

## Step 3.2: Create Super Admin

**Option A: Using Script (RECOMMENDED)**
```powershell
cd "c:\Users\revan\OneDrive\Documents\Desktop\Documents\spendai 2.0\backend"

node scripts/createSuperAdmin.js your-email@example.com
```

**Expected output:**
```
🔧 Creating super admin for: your-email@example.com

✅ Success! User is now a super admin:
{
  "id": "abc123...",
  "email": "your-email@example.com",
  "role": "super_admin",
  ...
}

🎉 You can now access admin routes!
```

**Option B: Manual SQL**

In Supabase SQL Editor:
```sql
UPDATE users 
SET role = 'super_admin' 
WHERE email = 'your-email@example.com';

-- Verify
SELECT id, email, role FROM users WHERE role = 'super_admin';
```

## Step 3.3: Verify Super Admin

```sql
SELECT email, role, organization_id 
FROM users 
WHERE role = 'super_admin';
```

**Expected output:**
```
your-email@example.com | super_admin | abc-123-def...
```

✅ **Super admin created!**

---

# 4️⃣ FRONTEND SETUP (10 minutes)

## Step 4.1: Install Dependencies
```powershell
cd "c:\Users\revan\OneDrive\Documents\Desktop\Documents\spendai 2.0\frontend"

npm install

# Install new dependencies
npm install react-query react-hot-toast date-fns
```

## Step 4.2: Verify .env File

Check `frontend/.env`:
```
VITE_API_URL=http://localhost:3001
VITE_API_BASE_URL=http://localhost:3001
VITE_SUPABASE_URL=https://jexipkocsmrqdzomqddy.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Step 4.3: Start Frontend
```powershell
npm run dev
```

**Expected output:**
```
  VITE v5.0.10  ready in 1234 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

## Step 4.4: Verify Frontend Works

Open browser: http://localhost:5173

**Expected:** You should see the Spend AI dashboard

## Step 4.5: Fix CORS Issues (if any)

If you see CORS errors in browser console:

**Backend fix** (already done in server.js):
```javascript
app.use(cors());
```

If still having issues, update to:
```javascript
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
```

✅ **Frontend is running!**

---

# 5️⃣ END-TO-END TEST FLOW (30 minutes)

## Test 1: Login as Super Admin

### Step 1: Get JWT Token
```powershell
# Using curl (PowerShell)
curl -X POST http://localhost:3001/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"your-email@example.com\",\"password\":\"your-password\"}'
```

**Expected response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "abc123",
    "email": "your-email@example.com",
    "role": "super_admin"
  }
}
```

**Save this token!** You'll need it for all admin API calls.

### Step 2: Test Admin Dashboard
```powershell
# Replace YOUR_JWT_TOKEN with the token from above
curl http://localhost:3001/api/admin/dashboard `
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected response:**
```json
{
  "success": true,
  "metrics": {
    "totalOrganizations": 1,
    "pendingApprovals": 0,
    "recentSignups": 1,
    "totalRevenue": "0.00",
    "mrr": "0.00",
    "statusBreakdown": {
      "pending": 0,
      "trial": 1
    },
    "planBreakdown": {
      "free": 1
    }
  }
}
```

✅ **Admin API working!**

---

## Test 2: Create Test Organization

### Step 1: Sign Up New User (Different Email)

**Option A: Via Frontend**
1. Open http://localhost:5173 in incognito/private window
2. Click Sign Up
3. Use different email: `test@example.com`
4. Complete signup

**Option B: Via API**
```powershell
curl -X POST http://localhost:3001/api/auth/signup `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"test@example.com\",\"password\":\"Test1234!\",\"organizationName\":\"Test Company\"}'
```

### Step 2: Check Pending Organizations
```powershell
curl http://localhost:3001/api/admin/organizations?status=pending `
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected:** Should show the new organization with status "pending"

---

## Test 3: Approve Organization

### Step 1: Get Organization ID

From previous response, copy the `id` field.

### Step 2: Approve
```powershell
curl -X POST http://localhost:3001/api/admin/organizations/ORG_ID/approve `
  -H "Authorization: Bearer YOUR_JWT_TOKEN" `
  -H "Content-Type: application/json" `
  -d '{\"planTier\":\"free\",\"trialDays\":14}'
```

**Expected response:**
```json
{
  "success": true,
  "organization": {
    "id": "...",
    "subscription_status": "trial",
    "plan_tier": "free",
    "trial_ends_at": "2026-02-25T...",
    "max_projects": 3,
    "max_users": 5
  }
}
```

✅ **Approval working!**

---

## Test 4: Activate Paid Subscription

### Step 1: Create Invoice
```powershell
curl -X POST http://localhost:3001/api/admin/invoices `
  -H "Authorization: Bearer YOUR_JWT_TOKEN" `
  -H "Content-Type: application/json" `
  -d '{\"organizationId\":\"ORG_ID\",\"planTier\":\"starter\",\"billingPeriodStart\":\"2026-02-11\",\"billingPeriodEnd\":\"2026-03-11\"}'
```

**Expected response:**
```json
{
  "success": true,
  "invoice": {
    "id": "invoice-123",
    "invoice_number": "INV-202602-00001",
    "amount_usd": "49.00",
    "status": "pending"
  }
}
```

### Step 2: Mark Invoice as Paid
```powershell
curl -X POST http://localhost:3001/api/admin/invoices/INVOICE_ID/mark-paid `
  -H "Authorization: Bearer YOUR_JWT_TOKEN" `
  -H "Content-Type: application/json" `
  -d '{\"paymentDetails\":{\"method\":\"bank_transfer\",\"reference\":\"TXN123456\",\"notes\":\"Received via UPI\"}}'
```

**Expected response:**
```json
{
  "success": true,
  "invoice": {
    "status": "paid",
    "paid_at": "2026-02-11T..."
  }
}
```

### Step 3: Verify Subscription Activated
```powershell
curl http://localhost:3001/api/admin/organizations/ORG_ID `
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected:**
```json
{
  "subscription_status": "active",
  "plan_tier": "starter",
  "subscription_ends_at": "2026-03-11T...",
  "max_projects": 10,
  "max_users": 20
}
```

✅ **Subscription activation working!**

---

## Test 5: Test Project Limit Enforcement

### Step 1: Login as Test User
```powershell
curl -X POST http://localhost:3001/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"test@example.com\",\"password\":\"Test1234!\"}'
```

Save the token as `TEST_USER_TOKEN`.

### Step 2: Create Projects (Up to Limit)

**Starter plan allows 10 projects**

Create project 1:
```powershell
curl -X POST http://localhost:3001/api/projects `
  -H "Authorization: Bearer TEST_USER_TOKEN" `
  -H "Content-Type: application/json" `
  -d '{\"name\":\"Project 1\",\"description\":\"Test project\"}'
```

Repeat for projects 2-10...

### Step 3: Try to Create 11th Project
```powershell
curl -X POST http://localhost:3001/api/projects `
  -H "Authorization: Bearer TEST_USER_TOKEN" `
  -H "Content-Type: application/json" `
  -d '{\"name\":\"Project 11\",\"description\":\"Should fail\"}'
```

**Expected response:**
```json
{
  "success": false,
  "error": "Project limit reached",
  "message": "Your Starter Plan allows 10 projects. You currently have 10 projects.",
  "upgradeRequired": true
}
```

✅ **Limit enforcement working!**

---

## Test 6: Manually Expire Subscription

### Step 1: Force Expire via SQL

In Supabase SQL Editor:
```sql
UPDATE organizations 
SET 
  subscription_status = 'expired',
  subscription_ends_at = NOW() - INTERVAL '1 day'
WHERE id = 'ORG_ID';

-- Verify
SELECT id, subscription_status, subscription_ends_at 
FROM organizations 
WHERE id = 'ORG_ID';
```

### Step 2: Try to Create Project (Should Fail)
```powershell
curl -X POST http://localhost:3001/api/projects `
  -H "Authorization: Bearer TEST_USER_TOKEN" `
  -H "Content-Type: application/json" `
  -d '{\"name\":\"Should Fail\",\"description\":\"Subscription expired\"}'
```

**Expected response:**
```json
{
  "success": false,
  "error": "Subscription required",
  "message": "Your trial has expired. Please contact us to activate your subscription.",
  "subscriptionStatus": "expired"
}
```

✅ **Access restriction working!**

---

# 6️⃣ DEBUGGING MODE

## Check Backend Logs

Backend logs are in console where you ran `npm start`.

**Look for:**
```
[HTTP] POST /api/auth/login
[HTTP] GET /api/admin/dashboard
[ERROR] Database connection failed
```

## Common Errors & Fixes

### Error: "Cannot find module './routes/admin'"

**Fix:**
```powershell
# Verify file exists
dir "c:\Users\revan\OneDrive\Documents\Desktop\Documents\spendai 2.0\backend\src\routes\admin.js"

# If missing, the file was created earlier. Restart backend.
```

### Error: "EADDRINUSE: address already in use :::3001"

**Fix:**
```powershell
# Find process using port 3001
netstat -ano | findstr :3001

# Kill process (replace PID with actual process ID)
taskkill /PID <PID> /F

# Restart backend
npm start
```

### Error: "Supabase connection failed"

**Fix:**
1. Check internet connection
2. Verify SUPABASE_URL in `.env`
3. Test connection:
```powershell
curl https://jexipkocsmrqdzomqddy.supabase.co
```

### Error: "Invalid JWT token"

**Fix:**
1. Token expired - login again to get new token
2. Wrong token - copy entire token including "eyJ..."
3. Missing "Bearer " prefix in Authorization header

### Error: "Column does not exist"

**Fix:**
Migration not run. Go back to Step 2.1 and run migration.

### Error: "Super admin required"

**Fix:**
```sql
-- Verify role in database
SELECT email, role FROM users WHERE email = 'your-email@example.com';

-- If not super_admin, update:
UPDATE users SET role = 'super_admin' WHERE email = 'your-email@example.com';
```

---

## Testing APIs with Thunder Client (VS Code)

1. Install Thunder Client extension in VS Code
2. Create new request
3. Set method: POST
4. Set URL: `http://localhost:3001/api/admin/dashboard`
5. Add header: `Authorization: Bearer YOUR_TOKEN`
6. Click Send

---

## Check Database Directly

### View All Organizations
```sql
SELECT 
  id, 
  name, 
  plan_tier, 
  subscription_status, 
  trial_ends_at,
  max_projects
FROM organizations
ORDER BY created_at DESC;
```

### View All Users
```sql
SELECT 
  id, 
  email, 
  role, 
  organization_id
FROM users
ORDER BY created_at DESC;
```

### View Subscription History
```sql
SELECT 
  sh.*,
  o.name as org_name
FROM subscription_history sh
JOIN organizations o ON sh.organization_id = o.id
ORDER BY sh.created_at DESC
LIMIT 20;
```

### View Invoices
```sql
SELECT 
  i.*,
  o.name as org_name
FROM invoices i
JOIN organizations o ON i.organization_id = o.id
ORDER BY i.created_at DESC;
```

---

# 7️⃣ FINAL CHECKLIST

## Backend
- [ ] Node v18+ or v20+ installed
- [ ] Dependencies installed (`npm install`)
- [ ] Backend running on port 3001
- [ ] Health check returns 200 OK
- [ ] Admin routes accessible

## Database
- [ ] Migration `008_manual_billing_schema.sql` run
- [ ] Tables created: `subscription_history`, `invoices`, `budget_alerts`, `admin_actions`
- [ ] Organizations table has new columns
- [ ] Can connect to Supabase

## Super Admin
- [ ] User signed up
- [ ] Role set to `super_admin`
- [ ] Can access `/api/admin/dashboard`
- [ ] JWT token working

## Frontend
- [ ] Dependencies installed
- [ ] Frontend running on port 5173
- [ ] Can access http://localhost:5173
- [ ] No CORS errors
- [ ] Can login

## End-to-End Flow
- [ ] Can create test organization
- [ ] Can approve organization
- [ ] Can create invoice
- [ ] Can mark invoice paid
- [ ] Subscription activates
- [ ] Project limits enforced
- [ ] Expired subscriptions blocked

---

# 🎯 QUICK REFERENCE

## Start Everything
```powershell
# Terminal 1: Backend
cd "c:\Users\revan\OneDrive\Documents\Desktop\Documents\spendai 2.0\backend"
npm start

# Terminal 2: Frontend
cd "c:\Users\revan\OneDrive\Documents\Desktop\Documents\spendai 2.0\frontend"
npm run dev
```

## Test Admin API
```powershell
# 1. Login
curl -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d '{\"email\":\"your@email.com\",\"password\":\"yourpass\"}'

# 2. Test dashboard (replace TOKEN)
curl http://localhost:3001/api/admin/dashboard -H "Authorization: Bearer TOKEN"
```

## Force Expire Subscription (SQL)
```sql
UPDATE organizations 
SET subscription_status = 'expired', subscription_ends_at = NOW() - INTERVAL '1 day'
WHERE id = 'ORG_ID';
```

## Create Super Admin (SQL)
```sql
UPDATE users SET role = 'super_admin' WHERE email = 'your@email.com';
```

---

**You're ready to run! Start with backend, then frontend, then test the flow! 🚀**
