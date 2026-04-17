# 🎯 SPEND AI - QUICK REFERENCE CARD

## 🚀 START EVERYTHING (2 Commands)

### Terminal 1: Backend
```powershell
cd "c:\Users\revan\OneDrive\Documents\Desktop\Documents\spendai 2.0\backend"
npm start
```

### Terminal 2: Frontend
```powershell
cd "c:\Users\revan\OneDrive\Documents\Desktop\Documents\spendai 2.0\frontend"
npm run dev
```

**URLs:**
- Backend: http://localhost:3001
- Frontend: http://localhost:5173
- Supabase: https://supabase.com/dashboard/project/jexipkocsmrqdzomqddy

---

## 🔑 ESSENTIAL COMMANDS

### Get Admin Token
```powershell
curl -X POST http://localhost:3001/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"YOUR_EMAIL\",\"password\":\"YOUR_PASSWORD\"}'
```

### Test Admin Dashboard
```powershell
curl http://localhost:3001/api/admin/dashboard `
  -H "Authorization: Bearer YOUR_TOKEN"
```

### List Pending Organizations
```powershell
curl http://localhost:3001/api/admin/organizations?status=pending `
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Approve Organization
```powershell
curl -X POST http://localhost:3001/api/admin/organizations/ORG_ID/approve `
  -H "Authorization: Bearer YOUR_TOKEN" `
  -H "Content-Type: application/json" `
  -d '{\"planTier\":\"free\",\"trialDays\":14}'
```

### Create Invoice
```powershell
curl -X POST http://localhost:3001/api/admin/invoices `
  -H "Authorization: Bearer YOUR_TOKEN" `
  -H "Content-Type: application/json" `
  -d '{\"organizationId\":\"ORG_ID\",\"planTier\":\"starter\",\"billingPeriodStart\":\"2026-02-11\",\"billingPeriodEnd\":\"2026-03-11\"}'
```

### Mark Invoice Paid
```powershell
curl -X POST http://localhost:3001/api/admin/invoices/INVOICE_ID/mark-paid `
  -H "Authorization: Bearer YOUR_TOKEN" `
  -H "Content-Type: application/json" `
  -d '{\"paymentDetails\":{\"method\":\"bank_transfer\",\"reference\":\"TXN123\"}}'
```

---

## 🗄️ ESSENTIAL SQL QUERIES

### Create Super Admin
```sql
UPDATE users SET role = 'super_admin' WHERE email = 'your@email.com';
```

### View All Organizations
```sql
SELECT id, name, plan_tier, subscription_status, trial_ends_at 
FROM organizations 
ORDER BY created_at DESC;
```

### View Pending Organizations
```sql
SELECT id, name, created_at 
FROM organizations 
WHERE subscription_status = 'pending';
```

### Force Expire Subscription
```sql
UPDATE organizations 
SET subscription_status = 'expired', 
    subscription_ends_at = NOW() - INTERVAL '1 day'
WHERE id = 'ORG_ID';
```

### Extend Trial
```sql
UPDATE organizations 
SET trial_ends_at = NOW() + INTERVAL '30 days'
WHERE id = 'ORG_ID';
```

### View Subscription History
```sql
SELECT sh.*, o.name 
FROM subscription_history sh
JOIN organizations o ON sh.organization_id = o.id
ORDER BY sh.created_at DESC
LIMIT 20;
```

### View All Invoices
```sql
SELECT i.*, o.name 
FROM invoices i
JOIN organizations o ON i.organization_id = o.id
ORDER BY i.created_at DESC;
```

---

## 🐛 TROUBLESHOOTING

### Backend Won't Start
```powershell
# Check if port is in use
netstat -ano | findstr :3001

# Kill process
taskkill /PID <PID> /F

# Restart
npm start
```

### Database Connection Failed
```powershell
# Test Supabase connection
curl https://jexipkocsmrqdzomqddy.supabase.co

# Check .env file has correct SUPABASE_URL and keys
```

### Admin API Returns 403
```sql
-- Verify super admin role
SELECT email, role FROM users WHERE email = 'your@email.com';

-- Fix if needed
UPDATE users SET role = 'super_admin' WHERE email = 'your@email.com';
```

### Migration Not Applied
```sql
-- Check if tables exist
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('subscription_history', 'invoices');

-- If missing, run migration in Supabase SQL Editor
```

---

## 📊 PLAN LIMITS

| Plan | Price | Projects | Users | AI Spend |
|------|-------|----------|-------|----------|
| Free | $0 | 3 | 5 | $100/mo |
| Starter | $49/mo | 10 | 20 | $1,000/mo |
| Pro | $199/mo | 50 | 100 | Unlimited |
| Enterprise | Custom | ∞ | ∞ | ∞ |

---

## 🔄 MANUAL BILLING WORKFLOW

```
1. User Signs Up → Organization created (status: pending)
2. You Review → Approve via admin API
3. Trial Starts → 14 days free access
4. Trial Ends → Create invoice
5. Send Invoice → Email/WhatsApp to customer
6. Payment Received → Mark invoice as paid
7. Subscription Activates → Full access granted
8. Monthly Renewal → Repeat steps 4-7
```

---

## 📁 KEY FILES

### Backend
- `backend/src/server.js` - Main server
- `backend/src/routes/admin.js` - Admin API
- `backend/src/services/manualBillingService.js` - Billing logic
- `backend/src/middleware/subscription.js` - Limit enforcement
- `backend/src/config/plans.js` - Plan configuration

### Frontend
- `frontend/src/components/PricingTable.jsx` - Pricing display
- `frontend/src/components/SubscriptionBanner.jsx` - Status banner

### Database
- `migrations/008_manual_billing_schema.sql` - SaaS schema

### Documentation
- `LOCAL_EXECUTION_GUIDE.md` - Complete setup guide
- `QUICK_START.md` - 1-hour setup
- `SAAS_TRANSFORMATION_ROADMAP.md` - 30-day plan
- `LAUNCH_CHECKLIST.md` - Track progress

---

## 🧪 RUN AUTOMATED TESTS

```powershell
# Run complete test suite
.\test-saas.ps1
```

---

## 📞 ADMIN API ENDPOINTS

```
GET    /api/admin/dashboard              - Metrics
GET    /api/admin/organizations          - List orgs
GET    /api/admin/organizations/:id      - Org details
POST   /api/admin/organizations/:id/approve - Approve
POST   /api/admin/organizations/:id/activate - Activate
POST   /api/admin/organizations/:id/expire - Expire
GET    /api/admin/invoices               - List invoices
POST   /api/admin/invoices               - Create invoice
POST   /api/admin/invoices/:id/mark-paid - Mark paid
GET    /api/admin/audit-log              - Audit log
POST   /api/admin/check-expired          - Check expired
```

---

## 🎯 NEXT STEPS

1. ✅ Run migration: `migrations/008_manual_billing_schema.sql`
2. ✅ Create super admin: `node scripts/createSuperAdmin.js`
3. ✅ Start backend: `npm start`
4. ✅ Start frontend: `npm run dev`
5. ✅ Test admin API: `.\test-saas.ps1`
6. 📝 Build admin dashboard UI (Week 1)
7. 📝 Update signup flow (Week 2)
8. 📝 Add email system (Week 3)
9. 🚀 Deploy and launch! (Week 4)

---

**Print this and keep it handy! 📌**
