# 🚀 QUICK START GUIDE - Get Your SaaS Running in 1 Hour

## Step 1: Run Database Migration (5 minutes)

1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the entire content of `migrations/008_manual_billing_schema.sql`
3. Click "Run"
4. Verify success: You should see new tables created

**Verify:**
```sql
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('subscription_history', 'invoices', 'budget_alerts', 'admin_actions');
```

---

## Step 2: Create Your Super Admin Account (3 minutes)

1. Sign up normally through your app (if not already done)
2. Go to Supabase → SQL Editor
3. Run this query (replace with your email):

```sql
UPDATE users 
SET role = 'super_admin' 
WHERE email = 'YOUR_EMAIL@example.com';
```

4. Verify:
```sql
SELECT email, role FROM users WHERE role = 'super_admin';
```

---

## Step 3: Install New Dependencies (5 minutes)

### Backend
```bash
cd backend
npm install helmet express-rate-limit zod bcrypt ioredis bullmq winston
```

### Frontend
```bash
cd frontend
npm install react-query react-hot-toast date-fns
```

---

## Step 4: Update Backend Server (5 minutes)

Add admin routes to your server.js:

```javascript
// In backend/src/server.js

// Add this import
const adminRoutes = require('./routes/admin');

// Add this route (after other routes)
app.use('/api/admin', adminRoutes);
```

---

## Step 5: Test Admin API (10 minutes)

### Using Thunder Client / Postman / curl

**1. Login to get JWT token:**
```bash
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "your-email@example.com",
  "password": "your-password"
}
```

Save the `token` from response.

**2. Test Admin Dashboard:**
```bash
GET http://localhost:3000/api/admin/dashboard
Authorization: Bearer YOUR_JWT_TOKEN
```

You should see metrics like:
```json
{
  "success": true,
  "metrics": {
    "totalOrganizations": 1,
    "pendingApprovals": 0,
    "mrr": "0.00",
    ...
  }
}
```

**3. Test Organization List:**
```bash
GET http://localhost:3000/api/admin/organizations
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## Step 6: Test Approval Workflow (15 minutes)

### Scenario: Approve a test organization

**1. Create a test signup** (use different email):
- Sign up through your app
- This creates an organization with status "pending"

**2. List pending organizations:**
```bash
GET http://localhost:3000/api/admin/organizations?status=pending
Authorization: Bearer YOUR_JWT_TOKEN
```

**3. Approve the organization:**
```bash
POST http://localhost:3000/api/admin/organizations/{ORG_ID}/approve
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "planTier": "free",
  "trialDays": 14
}
```

**4. Verify approval:**
```bash
GET http://localhost:3000/api/admin/organizations/{ORG_ID}
Authorization: Bearer YOUR_JWT_TOKEN
```

Should show:
```json
{
  "subscription_status": "trial",
  "plan_tier": "free",
  "trial_ends_at": "2026-02-25T..."
}
```

---

## Step 7: Test Subscription Activation (10 minutes)

### Scenario: Customer pays, you activate their subscription

**1. Create an invoice:**
```bash
POST http://localhost:3000/api/admin/invoices
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "organizationId": "{ORG_ID}",
  "planTier": "starter",
  "billingPeriodStart": "2026-02-11",
  "billingPeriodEnd": "2026-03-11"
}
```

Response will include `invoice.id` and `invoice.invoice_number` (e.g., "INV-202602-00001")

**2. Mark invoice as paid:**
```bash
POST http://localhost:3000/api/admin/invoices/{INVOICE_ID}/mark-paid
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "paymentDetails": {
    "method": "bank_transfer",
    "reference": "TXN123456",
    "notes": "Received via UPI on 2026-02-11"
  }
}
```

**3. Verify subscription activated:**
```bash
GET http://localhost:3000/api/admin/organizations/{ORG_ID}
Authorization: Bearer YOUR_JWT_TOKEN
```

Should show:
```json
{
  "subscription_status": "active",
  "plan_tier": "starter",
  "subscription_ends_at": "2026-03-11T..."
}
```

---

## Step 8: Test Plan Limits (5 minutes)

### Test project limit enforcement

**1. Login as the test user** (not super admin)

**2. Try to create projects:**
```bash
POST http://localhost:3000/api/projects
Authorization: Bearer TEST_USER_JWT_TOKEN
Content-Type: application/json

{
  "name": "Test Project 1",
  "description": "Testing limits"
}
```

**3. Create 3 projects** (free plan limit)

**4. Try to create 4th project:**
Should get error:
```json
{
  "success": false,
  "error": "Project limit reached",
  "message": "Your Free Trial allows 3 projects. You currently have 3 projects.",
  "upgradeRequired": true
}
```

---

## Step 9: Environment Variables Checklist (5 minutes)

### Backend `.env`
```bash
# Required
NODE_ENV=development
PORT=3000
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_KEY=xxx

# Optional (for production)
ENCRYPTION_KEY=  # Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
REDIS_URL=redis://localhost:6379
SENTRY_DSN=
```

### Frontend `.env`
```bash
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

---

## Step 10: Start Building Admin Dashboard UI (Next)

Now that the backend is working, you can build the frontend admin panel.

See `SAAS_TRANSFORMATION_ROADMAP.md` for the complete Week 1 tasks.

---

## 🎯 YOU'RE READY!

You now have:
- ✅ Multi-tenant database with subscriptions
- ✅ Manual billing service working
- ✅ Admin API endpoints functional
- ✅ Plan limit enforcement active
- ✅ Approval workflow tested

**Next Steps:**
1. Build admin dashboard UI (Week 1, Day 5-7)
2. Update signup flow to create pending orgs
3. Add subscription banners to user dashboard
4. Create email templates

---

## 🆘 Troubleshooting

### "Column does not exist" error
- Run the migration again
- Check if you're connected to the right database

### "Permission denied" error
- Make sure you're using SUPABASE_SERVICE_KEY in backend
- Check RLS policies are correct

### "Super admin required" error
- Verify your user has role 'super_admin'
- Check JWT token is valid

### Can't create projects
- Check subscription_status is 'trial' or 'active'
- Verify trial_ends_at is in the future
- Check project count hasn't exceeded limit

---

## 📞 Need Help?

Common issues and solutions:

**Q: How do I reset a subscription?**
```sql
UPDATE organizations 
SET subscription_status = 'trial',
    trial_ends_at = NOW() + INTERVAL '14 days'
WHERE id = 'ORG_ID';
```

**Q: How do I manually extend a trial?**
```sql
UPDATE organizations 
SET trial_ends_at = NOW() + INTERVAL '30 days'
WHERE id = 'ORG_ID';
```

**Q: How do I see all admin actions?**
```bash
GET http://localhost:3000/api/admin/audit-log
Authorization: Bearer YOUR_JWT_TOKEN
```

---

**You're all set! Time to build the admin UI and start onboarding customers! 🚀**
