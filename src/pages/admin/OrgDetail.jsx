import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminService } from '../../services/api';
import './AdminDashboard.css';

const PLAN_TIERS = ['free', 'starter', 'pro', 'enterprise'];

const statusColor = {
    active: { bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.3)', text: '#34d399' },
    trial: { bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.3)', text: '#fbbf24' },
    pending: { bg: 'rgba(156,163,175,0.1)', border: 'rgba(156,163,175,0.25)', text: '#9ca3af' },
    expired: { bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.3)', text: '#f87171' },
    cancelled: { bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.3)', text: '#f87171' },
};

function StatusDot({ status }) {
    const c = statusColor[status] || statusColor.pending;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 12px', borderRadius: 20,
            background: c.bg, border: `1px solid ${c.border}`,
            color: c.text, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em'
        }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.text, display: 'inline-block' }} />
            {status}
        </span>
    );
}

export default function OrgDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [org, setOrg] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [toast, setToast] = useState({ show: false, type: '', msg: '' });

    const [showActivate, setShowActivate] = useState(false);
    const [activateForm, setActivateForm] = useState({
        planTier: 'starter', amount: '', method: 'wire_transfer', reference: ''
    });

    const [showKeys, setShowKeys] = useState(false);
    const [keysForm, setKeysForm] = useState({ openai_api_key: '', anthropic_api_key: '' });

    const showToast = (type, msg) => {
        setToast({ show: true, type, msg });
        setTimeout(() => setToast({ show: false, type: '', msg: '' }), 3500);
    };

    const fetchOrg = useCallback(async () => {
        setLoading(true);
        try {
            const data = await adminService.getOrganization(id);
            if (data.success) setOrg(data.organization);
            else setError(data.error);
        } catch (err) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchOrg(); }, [fetchOrg]);

    const handleUpdateKeys = async (e) => {
        e.preventDefault();
        setProcessing(true);
        try {
            const res = await adminService.updateOrgKeys(id, keysForm);
            if (res.success) {
                showToast('success', 'API keys updated successfully');
                setShowKeys(false);
                setKeysForm({ openai_api_key: '', anthropic_api_key: '' });
                fetchOrg();
            } else showToast('error', res.error);
        } catch (err) {
            showToast('error', err.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleActivate = async (e) => {
        e.preventDefault();
        setProcessing(true);
        try {
            const res = await adminService.activateSubscription(id, activateForm.planTier, {
                amount: parseFloat(activateForm.amount),
                method: activateForm.method,
                reference: activateForm.reference
            });
            if (res.success) {
                showToast('success', 'Subscription activated successfully');
                setShowActivate(false);
                fetchOrg();
            } else showToast('error', res.error);
        } catch (err) {
            showToast('error', err.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleExpire = async () => {
        if (!window.confirm('Are you sure you want to expire this subscription? The organization will lose access immediately.')) return;
        setProcessing(true);
        try {
            const res = await adminService.expireSubscription(id);
            if (res.success) {
                showToast('success', 'Subscription expired');
                fetchOrg();
            }
        } catch (err) {
            showToast('error', err.message);
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return (
        <div className="admin-loading">
            <div className="spinner" />
        </div>
    );

    if (error) return (
        <div className="admin-page">
            <div className="container" style={{ paddingTop: 80, alignItems: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
                    <h2 style={{ color: '#f87171', marginBottom: 8 }}>Failed to load organization</h2>
                    <p style={{ color: '#6b7280', marginBottom: 20 }}>{error}</p>
                    <button className="btn btn-outline" onClick={() => navigate('/admin')}>← Back to Dashboard</button>
                </div>
            </div>
        </div>
    );

    if (!org) return null;

    const isActive = org.subscription_status === 'active';
    const canActivate = !isActive || org.plan_tier === 'free';

    return (
        <div className="admin-page">

            {/* ── Toast ── */}
            {toast.show && (
                <div style={{
                    position: 'fixed', top: 20, right: 20, zIndex: 999,
                    padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                    background: toast.type === 'success' ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)',
                    border: `1px solid ${toast.type === 'success' ? '#34d399' : '#f87171'}`,
                    color: toast.type === 'success' ? '#34d399' : '#f87171',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    animation: 'fadeIn 0.2s ease',
                    display: 'flex', alignItems: 'center', gap: 8
                }}>
                    {toast.type === 'success' ? '✓' : '✗'} {toast.msg}
                </div>
            )}

            {/* ── Header ── */}
            <header className="dashboard-header">
                <div className="dashboard-header-content">
                    <button
                        className="btn btn-outline"
                        style={{ padding: '7px 14px', fontSize: 12 }}
                        onClick={() => navigate('/admin')}
                    >
                        ← Admin Dashboard
                    </button>
                    <span style={{ fontSize: 12, color: '#4b5563' }}>
                        Org ID: <span style={{ fontFamily: 'monospace', color: '#6b7280' }}>{id.slice(0, 18)}…</span>
                    </span>
                </div>
            </header>

            <main className="dashboard-main">
                <div className="container">

                    {/* ── Org Header Card ── */}
                    <div className="org-header glass fade-in">

                        {/* Title row */}
                        <div className="org-title-row">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                {/* Avatar */}
                                <div style={{
                                    width: 52, height: 52, borderRadius: 14,
                                    background: 'linear-gradient(135deg, #5b6af7, #7c3aed)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 22, fontWeight: 800, color: '#fff',
                                    flexShrink: 0
                                }}>
                                    {org.name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                <div>
                                    <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{org.name}</h1>
                                    <span style={{ fontSize: 12, color: '#6b7280' }}>
                                        {org.billing_email || 'No billing email'}
                                    </span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <StatusDot status={org.subscription_status} />
                                <span className={`badge badge-${org.plan_tier}`}>{org.plan_tier}</span>
                            </div>
                        </div>

                        {/* Meta Grid */}
                        <div className="org-meta-grid">
                            <div className="meta-item">
                                <label>Total Spend</label>
                                <span style={{ color: '#34d399', fontSize: 18, fontWeight: 700 }}>
                                    ${parseFloat(org.totalSpend || 0).toFixed(2)}
                                </span>
                            </div>
                            <div className="meta-item">
                                <label>Trial Ends</label>
                                <span>{org.trial_ends_at ? new Date(org.trial_ends_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
                            </div>
                            <div className="meta-item">
                                <label>Subscription Ends</label>
                                <span>{org.subscription_ends_at ? new Date(org.subscription_ends_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No end date'}</span>
                            </div>
                            <div className="meta-item">
                                <label>Created</label>
                                <span>{new Date(org.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            </div>
                            <div className="meta-item">
                                <label>Users</label>
                                <span>{org.users?.length || 0}</span>
                            </div>
                            <div className="meta-item">
                                <label>Invoices</label>
                                <span>{org.invoices?.length || 0}</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="org-actions-bar">
                            <button
                                className="btn btn-primary"
                                onClick={() => setShowActivate(true)}
                                disabled={!canActivate}
                                title={!canActivate ? 'Already on a paid active plan' : ''}
                            >
                                ⚡ {isActive && org.plan_tier !== 'free' ? 'Upgrade Plan' : 'Activate Subscription'}
                            </button>
                            <button className="btn btn-outline" onClick={() => setShowKeys(true)}>
                                🔑 Configure API Keys
                            </button>
                            {isActive && (
                                <button className="btn btn-outline btn-danger" onClick={handleExpire} disabled={processing}>
                                    ⛔ Expire Access
                                </button>
                            )}
                        </div>
                    </div>

                    {/* ── 2-column row ── */}
                    <div className="charts-grid">

                        {/* Users Card */}
                        <div className="chart-container glass">
                            <h3>👥 Team Members ({org.users?.length || 0})</h3>
                            {org.users?.length > 0 ? (
                                <ul className="admin-list">
                                    {org.users.map(u => (
                                        <li key={u.id} className="admin-list-item">
                                            <div>
                                                <div style={{ fontWeight: 600, color: '#e5e7eb', fontSize: 13 }}>{u.email}</div>
                                                {u.created_at && (
                                                    <div style={{ fontSize: 11, color: '#4b5563', marginTop: 2 }}>
                                                        Joined {new Date(u.created_at).toLocaleDateString()}
                                                    </div>
                                                )}
                                            </div>
                                            <span className={`badge badge-${u.role === 'owner' ? 'starter' : 'secondary'}`}>
                                                {u.role}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="admin-list-empty">No users in this organization</div>
                            )}
                        </div>

                        {/* Provider Keys Card */}
                        <div className="chart-container glass">
                            <h3>🔌 AI Providers</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {[
                                    { label: 'OpenAI', key: org.openai_api_key, color: '#10b981' },
                                    { label: 'Anthropic', key: org.anthropic_api_key, color: '#f97316' },
                                    { label: 'Google (Gemini)', key: org.google_api_key, color: '#3b82f6' },
                                ].map(({ label, key, color }) => (
                                    <div key={label} className="provider-row">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{
                                                width: 8, height: 8, borderRadius: '50%',
                                                background: key ? color : '#374151'
                                            }} />
                                            <span>{label}</span>
                                        </div>
                                        <span className={`badge ${key ? 'badge-active' : 'badge-pending'}`}>
                                            {key ? 'Configured' : 'Missing'}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div style={{
                                marginTop: 20, padding: '12px 14px', borderRadius: 8,
                                background: 'rgba(91,106,247,0.06)',
                                border: '1px solid rgba(91,106,247,0.15)',
                                fontSize: 12, color: '#6b7280', lineHeight: 1.5
                            }}>
                                💡 API keys are stored encrypted (AES-256-GCM). Click "Configure API Keys" above to add or rotate keys.
                            </div>
                        </div>
                    </div>

                    {/* ── Invoice History ── */}
                    <div className="table-container glass">
                        <h3>🧾 Invoice History</h3>
                        <table className="analytics-table">
                            <thead>
                                <tr>
                                    <th>Invoice ID</th>
                                    <th>Amount</th>
                                    <th>Plan</th>
                                    <th>Status</th>
                                    <th>Period</th>
                                    <th>Created</th>
                                </tr>
                            </thead>
                            <tbody>
                                {org.invoices?.length > 0 ? org.invoices.map(inv => (
                                    <tr key={inv.id}>
                                        <td className="font-mono text-muted text-sm">{inv.id.slice(0, 8)}…</td>
                                        <td style={{ color: '#34d399', fontWeight: 600 }}>${inv.amount_usd}</td>
                                        <td>
                                            <span className={`badge badge-${inv.plan_tier}`}>{inv.plan_tier}</span>
                                        </td>
                                        <td>
                                            <span className={`badge ${inv.status === 'paid' ? 'badge-active' : 'badge-pending'}`}>
                                                {inv.status}
                                            </span>
                                        </td>
                                        <td className="text-sm text-muted">
                                            {new Date(inv.billing_period_start).toLocaleDateString()} –{' '}
                                            {new Date(inv.billing_period_end).toLocaleDateString()}
                                        </td>
                                        <td className="text-sm text-muted">
                                            {new Date(inv.created_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="6" className="empty-td">
                                            No invoices yet — payments will appear here after activation
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                </div>
            </main>

            {/* ── Activate Modal ── */}
            {showActivate && (
                <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowActivate(false)}>
                    <div className="modal-content glass">
                        <h2>⚡ Activate Subscription</h2>
                        <p>Manually record a payment and activate a paid plan for this organization.</p>

                        <form onSubmit={handleActivate} className="admin-form">
                            <div className="form-group">
                                <label>Plan Tier</label>
                                <select
                                    value={activateForm.planTier}
                                    onChange={e => setActivateForm({ ...activateForm, planTier: e.target.value })}
                                >
                                    {PLAN_TIERS.map(t => (
                                        <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Amount Paid (USD)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    required
                                    placeholder="e.g. 99.00"
                                    value={activateForm.amount}
                                    onChange={e => setActivateForm({ ...activateForm, amount: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Payment Method</label>
                                <select
                                    value={activateForm.method}
                                    onChange={e => setActivateForm({ ...activateForm, method: e.target.value })}
                                >
                                    <option value="wire_transfer">Wire Transfer</option>
                                    <option value="stripe_link">Stripe Payment Link</option>
                                    <option value="check">Check</option>
                                    <option value="cash">Cash / Other</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Reference ID / Notes</label>
                                <input
                                    type="text"
                                    placeholder="e.g. TXN-882910 or 'Paid via email invoice'"
                                    value={activateForm.reference}
                                    onChange={e => setActivateForm({ ...activateForm, reference: e.target.value })}
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-outline" onClick={() => setShowActivate(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={processing}>
                                    {processing ? 'Activating…' : 'Confirm & Activate'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── API Keys Modal ── */}
            {showKeys && (
                <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowKeys(false)}>
                    <div className="modal-content glass">
                        <h2>🔑 Configure API Keys</h2>
                        <p>Keys are stored encrypted with AES-256-GCM. Leave a field empty to keep the existing key.</p>

                        <form onSubmit={handleUpdateKeys} className="admin-form">
                            <div className="form-group">
                                <label>OpenAI API Key</label>
                                <input
                                    type="password"
                                    placeholder={org.openai_api_key ? '• • • • • • • • (key exists)' : 'sk-proj-...'}
                                    value={keysForm.openai_api_key}
                                    onChange={e => setKeysForm({ ...keysForm, openai_api_key: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Anthropic API Key</label>
                                <input
                                    type="password"
                                    placeholder={org.anthropic_api_key ? '• • • • • • • • (key exists)' : 'sk-ant-api03-...'}
                                    value={keysForm.anthropic_api_key}
                                    onChange={e => setKeysForm({ ...keysForm, anthropic_api_key: e.target.value })}
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-outline" onClick={() => setShowKeys(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={processing}>
                                    {processing ? 'Saving…' : 'Save Encrypted Keys'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
