import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { billingService } from '../services/api';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import './Billing.css';

/* ─── Plan metadata (mirrors backend plans.js) ─────────────────────────── */
const PLAN_META = {
    free: { label: 'Free Trial', price: '$0', color: '#64748b', badge: '#1e293b' },
    starter: { label: 'Starter', price: '$49/mo', color: '#3b82f6', badge: '#1e3a5f' },
    pro: { label: 'Professional', price: '$199/mo', color: '#8b5cf6', badge: '#2e1065' },
    enterprise: { label: 'Enterprise', price: 'Custom', color: '#f59e0b', badge: '#451a03' },
};

const STATUS_META = {
    active: { label: 'Active', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    trial: { label: 'Trial', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    pending: { label: 'Pending', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
    suspended: { label: 'Suspended', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
    expired: { label: 'Expired', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
};

const UPGRADE_PLANS = [
    {
        tier: 'starter',
        name: 'Starter',
        price: '$49',
        period: '/mo',
        highlight: false,
        features: ['10 projects', '20 team members', '$1,000 spend tracking', '90-day retention', 'Advanced analytics'],
    },
    {
        tier: 'pro',
        name: 'Pro',
        price: '$199',
        period: '/mo',
        highlight: true,
        features: ['50 projects', '100 team members', 'Unlimited spend tracking', '1-year retention', 'Custom integrations', '24/7 support'],
    },
    {
        tier: 'enterprise',
        name: 'Enterprise',
        price: 'Custom',
        period: '',
        highlight: false,
        features: ['Unlimited everything', 'SSO & SAML', 'On-premise option', 'SLA guarantee', 'Dedicated team'],
    },
];

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function fmt(n) {
    return typeof n === 'number' ? `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';
}
function fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
function daysLeft(iso) {
    if (!iso) return null;
    const diff = new Date(iso) - new Date();
    return Math.max(0, Math.ceil(diff / 86400000));
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */
function Skeleton({ w = '100%', h = 18, r = 6 }) {
    return (
        <div style={{
            width: w, height: h, borderRadius: r,
            background: 'linear-gradient(90deg,#1e293b 25%,#263348 50%,#1e293b 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.4s infinite',
        }} />
    );
}

function StatusBadge({ status }) {
    const m = STATUS_META[status] || { label: status, color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' };
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600,
            color: m.color, background: m.bg, border: `1px solid ${m.color}33`,
        }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: m.color, display: 'inline-block' }} />
            {m.label}
        </span>
    );
}

function Card({ children, style = {} }) {
    return (
        <div style={{
            background: 'rgba(15,23,42,0.7)',
            border: '1px solid rgba(99,102,241,0.15)',
            borderRadius: 16,
            padding: '24px 28px',
            backdropFilter: 'blur(12px)',
            ...style
        }}>
            {children}
        </div>
    );
}

function SectionTitle({ children }) {
    return (
        <h2 style={{ color: '#e2e8f0', fontSize: 16, fontWeight: 700, margin: '0 0 18px', letterSpacing: 0.3 }}>
            {children}
        </h2>
    );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
export default function Billing() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [overview, setOverview] = useState(null);
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [upgradeLoading, setUpgradeLoading] = useState(null);
    const [upgradeMsg, setUpgradeMsg] = useState(null);

    useEffect(() => {
        if (!user) return;
        (async () => {
            try {
                const [ovRes, invRes] = await Promise.all([
                    billingService.getOverview(),
                    billingService.getInvoices(),
                ]);
                if (ovRes.success) setOverview(ovRes.data);
                if (invRes.success) setInvoices(invRes.data);
            } catch (e) {
                setError('Failed to load billing data.');
            } finally {
                setLoading(false);
            }
        })();
    }, [user]);

    const handleUpgrade = async (tier, planName) => {
        setUpgradeLoading(tier);
        setUpgradeMsg(null);
        try {
            const res = await api.post('/api/billing/request-upgrade', { requestedPlan: tier });
            setUpgradeMsg(res.data.message || `Upgrade request for ${planName} sent! We'll contact you within 24 hours.`);
            setTimeout(() => setUpgradeMsg(null), 8000);
        } catch (err) {
            setUpgradeMsg(`Failed to send request. Please email us directly at teja41627@gmail.com`);
            setTimeout(() => setUpgradeMsg(null), 8000);
        } finally {
            setUpgradeLoading(null);
        }
    };

    const plan = overview ? (PLAN_META[overview.plan_tier] || PLAN_META.free) : PLAN_META.free;
    const spendLimit = overview?.max_monthly_spend_usd ?? overview?.monthly_budget_usd ?? null;
    const mtd = overview?.mtd_spend ?? 0;
    const pct = spendLimit ? Math.min(100, (mtd / spendLimit) * 100) : 0;
    const barGradient = pct >= 90 ? '#ef4444' : pct >= 75 ? '#f59e0b' : '#6366f1';

    if (loading) {
        return (
            <div className="app-shell">
                <Sidebar />
                <div className="main-content centered">
                    <div className="spinner"></div>
                    <p>Loading billing profile...</p>
                </div>
            </div>
        );
    }

    const trialDaysActive = overview?.trial_ends_at ? daysLeft(overview.trial_ends_at) : null;

    return (
        <div className="app-shell">
            <Sidebar />

            <div className="main-content">
                <div className="topbar">
                    <div className="topbar-left">
                        <h1 className="page-title">Billing & Subscription</h1>
                        <p className="page-sub">Resource allocation and payment history</p>
                    </div>
                </div>

                {error && <div className="dash-error">{error}</div>}
                {upgradeMsg && <div className="dash-msg success">{upgradeMsg}</div>}

                {/* ── BETA ACCESS BANNER ──────────────────────────────────── */}
                <div style={{
                    background: 'linear-gradient(135deg, rgba(91,106,247,0.15), rgba(200,241,53,0.05))',
                    border: '1px solid rgba(91,106,247,0.4)',
                    borderRadius: '12px',
                    padding: '20px 24px',
                    marginBottom: '24px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '16px'
                }}>
                    <div>
                        <h3 style={{ margin: '0 0 4px', fontSize: '17px', color: '#e2e8f0' }}>
                            🚀 Beta Access — All Features Free
                        </h3>
                        <p style={{ color: '#94a3b8', margin: 0, fontSize: '13px', lineHeight: '1.5' }}>
                            You have full access to all SpendAI features during our beta period.
                            Unlimited projects, proxy keys, and analytics. No credit card required.
                        </p>
                    </div>
                    <div style={{
                        background: '#5b6af7',
                        color: 'white',
                        padding: '6px 18px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '700',
                        letterSpacing: '0.05em',
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                    }}>BETA</div>
                </div>
                {/* ──────────────────────────────────────────────────────── */}

                <div className="billing-grid">
                    {/* CURRENT PLAN */}
                    <div className="dash-card">
                        <div className="dash-card-header">
                            <h3 className="dash-card-title">Active Plan</h3>
                        </div>

                        <div className="plan-card">
                            <div className="plan-item">
                                <span className="label-sm">Tier</span>
                                <div className="plan-badge-v2" style={{ background: plan.badge, border: `1px solid ${plan.color}33` }}>
                                    <span style={{ color: plan.color, fontWeight: 700 }}>{plan.label}</span>
                                </div>
                            </div>
                            <div className="plan-item">
                                <span className="label-sm">Status</span>
                                <div className={`status-pill-v2`} style={{ color: STATUS_META[overview?.subscription_status]?.color, background: STATUS_META[overview?.subscription_status]?.bg }}>
                                    <span className="dot" style={{ background: STATUS_META[overview?.subscription_status]?.color }}></span>
                                    {STATUS_META[overview?.subscription_status]?.label || overview?.subscription_status}
                                </div>
                            </div>
                            <div className="plan-item">
                                <span className="label-sm">Invoicing Limit</span>
                                <div className="usage-amount-v2" style={{ fontSize: 18 }}>{spendLimit ? fmt(spendLimit) : 'Unlimited'}</div>
                            </div>
                            {trialDaysActive !== null && (
                                <div className="plan-item">
                                    <span className="label-sm">Trial Expiry</span>
                                    <div className="usage-amount-v2" style={{ fontSize: 15, color: trialDaysActive < 3 ? '#ef4444' : '#e2e8f0' }}>
                                        {fmtDate(overview.trial_ends_at)} <span style={{ fontSize: 11, color: '#374151' }}>({trialDaysActive}d)</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* USAGE BAR */}
                    <div className="dash-card">
                        <div className="dash-card-header">
                            <h3 className="dash-card-title">Consumption</h3>
                        </div>
                        <div className="usage-stats-v2">
                            <div className="usage-header-v2">
                                <span className="usage-label-v2">Total Platform Spend (MTD)</span>
                                <div className="usage-amount-v2">
                                    {fmt(mtd)} <span className="total">/ {spendLimit ? fmt(spendLimit) : 'No Limit'}</span>
                                </div>
                            </div>
                            <div className="progress-track-v2">
                                <div className="progress-fill-v2" style={{ width: `${pct}%`, background: barGradient }}></div>
                            </div>
                            <div className="usage-footer-v2">
                                <span>{pct.toFixed(1)}% of allowance consumed</span>
                                {pct > 80 && <span style={{ color: barGradient }}>⚠ Approaching Limit</span>}
                            </div>
                        </div>
                    </div>

                    {/* UPGRADE OPTIONS */}
                    <div className="dash-card">
                        <div className="dash-card-header">
                            <h3 className="dash-card-title">Available Plans</h3>
                        </div>
                        <div className="upgrade-options-v2">
                            {UPGRADE_PLANS.map(p => {
                                const isCurrent = overview?.plan_tier === p.tier;
                                return (
                                    <div key={p.tier} className={`upgrade-card-v2 ${p.highlight ? 'highlight' : ''}`}>
                                        {p.highlight && <div className="pop-tag">MOST POPULAR</div>}
                                        <div className="card-tier-info">
                                            <span className="card-tier-name">{p.name}</span>
                                            <div className="card-tier-price">
                                                {p.price}<span className="per">{p.period}</span>
                                            </div>
                                        </div>
                                        <ul className="features-list-v2">
                                            {p.features.map(f => (
                                                <li key={f}><span className="check-icon">✓</span> {f}</li>
                                            ))}
                                        </ul>
                                        {/* BETA: Upgrade disabled — paid plans coming soon */}
                                        <button
                                            className="btn-plan-v2 secondary"
                                            disabled
                                            style={{ opacity: 0.5, cursor: 'not-allowed' }}
                                        >
                                            Paid plans coming soon
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* INVOICES */}
                    <div className="dash-card">
                        <div className="dash-card-header">
                            <h3 className="dash-card-title">Invoice History</h3>
                        </div>
                        <div className="table-scroll">
                            <table className="dash-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Period</th>
                                        <th>Plan</th>
                                        <th>Amount</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoices.length === 0 ? (
                                        <tr><td colSpan="5" className="empty-td">No billing history found.</td></tr>
                                    ) : (
                                        invoices.map(inv => (
                                            <tr key={inv.id}>
                                                <td className="td-num">{fmtDate(inv.created_at)}</td>
                                                <td className="td-num" style={{ fontSize: '11px' }}>
                                                    {inv.billing_period_start ? `${fmtDate(inv.billing_period_start)} – ${fmtDate(inv.billing_period_end)}` : '—'}
                                                </td>
                                                <td><span className="project-tag">{inv.plan_tier}</span></td>
                                                <td className="td-name">{fmt(parseFloat(inv.amount_usd || 0))}</td>
                                                <td>
                                                    <span className={`status-pill ${inv.status === 'paid' ? 'active' : 'revoked'}`}>
                                                        {inv.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
