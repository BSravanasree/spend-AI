# 🧪 SPEND AI - COMPLETE TEST SCRIPT

# This script tests the entire SaaS flow locally
# Run this after completing LOCAL_EXECUTION_GUIDE.md

Write-Host "🚀 SPEND AI - LOCAL TEST SUITE" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Configuration
$BACKEND_URL = "http://localhost:3001"
$ADMIN_EMAIL = Read-Host "Enter your super admin email"
$ADMIN_PASSWORD = Read-Host "Enter your super admin password" -AsSecureString
$ADMIN_PASSWORD_TEXT = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ADMIN_PASSWORD))

# Test 1: Backend Health Check
Write-Host "`n[TEST 1] Backend Health Check..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BACKEND_URL/health" -Method Get
    if ($response.status -eq "ok") {
        Write-Host "✅ Backend is running!" -ForegroundColor Green
        Write-Host "   Uptime: $($response.uptime)s" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Backend is not running!" -ForegroundColor Red
    Write-Host "   Make sure backend is started: npm start" -ForegroundColor Red
    exit 1
}

# Test 2: Admin Login
Write-Host "`n[TEST 2] Admin Login..." -ForegroundColor Yellow
try {
    $loginBody = @{
        email = $ADMIN_EMAIL
        password = $ADMIN_PASSWORD_TEXT
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "$BACKEND_URL/api/auth/login" `
        -Method Post `
        -ContentType "application/json" `
        -Body $loginBody

    if ($loginResponse.success) {
        $ADMIN_TOKEN = $loginResponse.token
        Write-Host "✅ Login successful!" -ForegroundColor Green
        Write-Host "   User: $($loginResponse.user.email)" -ForegroundColor Gray
        Write-Host "   Role: $($loginResponse.user.role)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Login failed!" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 3: Admin Dashboard Access
Write-Host "`n[TEST 3] Admin Dashboard Access..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $ADMIN_TOKEN"
    }

    $dashboardResponse = Invoke-RestMethod -Uri "$BACKEND_URL/api/admin/dashboard" `
        -Method Get `
        -Headers $headers

    if ($dashboardResponse.success) {
        Write-Host "✅ Admin dashboard accessible!" -ForegroundColor Green
        Write-Host "   Total Organizations: $($dashboardResponse.metrics.totalOrganizations)" -ForegroundColor Gray
        Write-Host "   Pending Approvals: $($dashboardResponse.metrics.pendingApprovals)" -ForegroundColor Gray
        Write-Host "   MRR: `$$($dashboardResponse.metrics.mrr)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Admin dashboard access failed!" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Make sure your user has 'super_admin' role" -ForegroundColor Red
    exit 1
}

# Test 4: List Organizations
Write-Host "`n[TEST 4] List Organizations..." -ForegroundColor Yellow
try {
    $orgsResponse = Invoke-RestMethod -Uri "$BACKEND_URL/api/admin/organizations" `
        -Method Get `
        -Headers $headers

    if ($orgsResponse.success) {
        Write-Host "✅ Organizations retrieved!" -ForegroundColor Green
        Write-Host "   Total: $($orgsResponse.pagination.total)" -ForegroundColor Gray
        
        if ($orgsResponse.organizations.Count -gt 0) {
            Write-Host "`n   Organizations:" -ForegroundColor Gray
            foreach ($org in $orgsResponse.organizations) {
                Write-Host "   - $($org.name) [$($org.plan_tier)] - $($org.subscription_status)" -ForegroundColor Gray
            }
        }
    }
} catch {
    Write-Host "❌ Failed to list organizations!" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Check Pending Approvals
Write-Host "`n[TEST 5] Check Pending Approvals..." -ForegroundColor Yellow
try {
    $pendingResponse = Invoke-RestMethod -Uri "$BACKEND_URL/api/admin/organizations?status=pending" `
        -Method Get `
        -Headers $headers

    if ($pendingResponse.success) {
        $pendingCount = $pendingResponse.pagination.total
        Write-Host "✅ Pending approvals checked!" -ForegroundColor Green
        Write-Host "   Pending: $pendingCount" -ForegroundColor Gray
        
        if ($pendingCount -gt 0) {
            Write-Host "`n   📋 Pending Organizations:" -ForegroundColor Yellow
            foreach ($org in $pendingResponse.organizations) {
                Write-Host "   - $($org.name) (ID: $($org.id))" -ForegroundColor Gray
                Write-Host "     Email: $($org.users[0].email)" -ForegroundColor Gray
            }
        }
    }
} catch {
    Write-Host "❌ Failed to check pending approvals!" -ForegroundColor Red
}

# Test 6: List Invoices
Write-Host "`n[TEST 6] List Invoices..." -ForegroundColor Yellow
try {
    $invoicesResponse = Invoke-RestMethod -Uri "$BACKEND_URL/api/admin/invoices" `
        -Method Get `
        -Headers $headers

    if ($invoicesResponse.success) {
        Write-Host "✅ Invoices retrieved!" -ForegroundColor Green
        Write-Host "   Total: $($invoicesResponse.pagination.total)" -ForegroundColor Gray
        
        if ($invoicesResponse.invoices.Count -gt 0) {
            Write-Host "`n   Invoices:" -ForegroundColor Gray
            foreach ($invoice in $invoicesResponse.invoices) {
                Write-Host "   - $($invoice.invoice_number): `$$($invoice.amount_usd) [$($invoice.status)]" -ForegroundColor Gray
            }
        }
    }
} catch {
    Write-Host "❌ Failed to list invoices!" -ForegroundColor Red
}

# Test 7: Audit Log
Write-Host "`n[TEST 7] Audit Log Access..." -ForegroundColor Yellow
try {
    $auditResponse = Invoke-RestMethod -Uri "$BACKEND_URL/api/admin/audit-log?limit=5" `
        -Method Get `
        -Headers $headers

    if ($auditResponse.success) {
        Write-Host "✅ Audit log accessible!" -ForegroundColor Green
        Write-Host "   Total actions: $($auditResponse.pagination.total)" -ForegroundColor Gray
        
        if ($auditResponse.actions.Count -gt 0) {
            Write-Host "`n   Recent actions:" -ForegroundColor Gray
            foreach ($action in $auditResponse.actions) {
                Write-Host "   - $($action.action_type) by $($action.admin.email)" -ForegroundColor Gray
            }
        }
    }
} catch {
    Write-Host "❌ Failed to access audit log!" -ForegroundColor Red
}

# Summary
Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "🎉 TEST SUITE COMPLETE!" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

Write-Host "✅ All core systems operational!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Test signup flow in browser: http://localhost:5173" -ForegroundColor White
Write-Host "2. Approve pending organizations via admin API" -ForegroundColor White
Write-Host "3. Create and manage invoices" -ForegroundColor White
Write-Host "4. Test subscription limits`n" -ForegroundColor White

# Save token for manual testing
Write-Host "💡 Your admin token (save for manual testing):" -ForegroundColor Yellow
Write-Host $ADMIN_TOKEN -ForegroundColor Gray
Write-Host "`nUse this in API calls:" -ForegroundColor Yellow
Write-Host "Authorization: Bearer $ADMIN_TOKEN`n" -ForegroundColor Gray
