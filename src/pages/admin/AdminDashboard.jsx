import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Sidebar from '../../components/Sidebar';
import './AdminDashboard.css';

const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0);
const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString() : '—';

export default function AdminDashboard() {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [metrics, setMetrics] = useState(null);
    const [orgs, setOrgs] = useState([]);
    const [pending, setPending] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [approving, setApproving] = useState({});
    const [toast, setToast] = useState(null);
    const [selectedPlan, setSelectedPlan] = useState({});

    useEffect(() => {
        if (user && user.role !== 'super_admin') {
            navigate('/dashboard', { replace: true });
        }
    }, [user, navigate]);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [dashRes, orgsRes, pendingRes] = await Promise.all([
                api.get('/api/admin/dashboard'),
                api.get('/api/admin/organizations?limit=10'),
                api.get('/api/admin/organizations?status=pending&limit=50'),
            ]);

            if (dashRes.data.success) setMetrics(dashRes.data.metrics);
            if (orgsRes.data.success) setOrgs(orgsRes.data.organizations ?? []);
            if (pendingRes.data.success) setPending(pendingRes.data.organizations ?? []);
        } catch (err) {
            setError(err.response?.data?.error ?? err.message ?? 'Failed to load admin data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user?.role === 'super_admin') fetchAll();
    }, [user, fetchAll]);

    const handleApprove = async (orgId, orgName) => {
        const planTier = selectedPlan[orgId] || 'free';
        setApproving(prev => ({ ...prev, [orgId]: true }));
        try {
            const res = await api.post(`/api/admin/organizations/${orgId}/approve`, {
                planTier,
                trialDays: 14,
            });
            if (res.data.success) {
                showToast(`Approved "${orgName}" on ${planTier} plan`);
                await fetchAll();
            }
        } catch (err) {
            showToast(`Approval failed`, 'error');
        } finally {
            setApproving(prev => ({ ...prev, [orgId]: false }));
        }
    };

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    };

    if (loading) {
        return (
            <div className="app-shell">
                <Sidebar />
                <div className="main-content centered">
                    <div className="spinner"></div>
                    <p>Loading administration panel...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="app-shell">
            <Sidebar />

            <div className="main-content">
                <div className="topbar">
                    <div className="topbar-left">
                        <h1 className="page-title">Admin Controller</h1>
                        <p className="page-sub">Global platform management and approvals</p>
                    </div>
                    <button className="btn-primary-v2" onClick={fetchAll}>↻ Refresh Metrics</button>
                </div>

                {toast && <div className={`dash-msg ${toast.type}`}>{toast.msg}</div>}
                {error && <div className="dash-error">{error}</div>}

                {/* STATS */}
                <div className="stat-grid">
                    <div className="stat-card">
                        <span className="stat-label">Total Orgs</span>
                        <div className="stat-value">{metrics?.totalOrganizations ?? 0}</div>
                        <span className="stat-sub">+{metrics?.recentSignups ?? 0} last 30d</span>
                    </div>
                    <div className="stat-card clickable" onClick={() => document.getElementById('pending').scrollIntoView({ behavior: 'smooth' })}>
                        <span className="stat-label">Waitlist</span>
                        <div className="stat-value" style={{ color: metrics?.pendingApprovals > 0 ? '#f59e0b' : 'inherit' }}>
                            {metrics?.pendingApprovals ?? 0}
                        </div>
                        <span className="stat-sub">Pending review</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-label">Active Subs</span>
                        <div className="stat-value" style={{ color: '#10b981' }}>{metrics?.statusBreakdown?.active ?? 0}</div>
                        <span className="stat-sub">{metrics?.statusBreakdown?.trial ?? 0} in trial</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-label">Est. MRR</span>
                        <div className="stat-value" style={{ color: '#6366f1' }}>{fmt(metrics?.mrr)}</div>
                        <span className="stat-sub">Across all tiers</span>
                    </div>
                </div>

                {/* PENDING APPROVALS */}
                <div id="pending" className="dash-card">
                    <div className="dash-card-header">
                        <h3 className="dash-card-title">Pending Approvals</h3>
                    </div>
                    <div className="table-scroll">
                        <table className="dash-table">
                            <thead>
                                <tr>
                                    <th>Organization</th>
                                    <th>Email</th>
                                    <th>Joined</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pending.length === 0 ? (
                                    <tr><td colSpan="4" className="empty-td">Waitlist is empty. Good job!</td></tr>
                                ) : (
                                    pending.map(org => (
                                        <tr key={org.id}>
                                            <td className="td-name">{org.name}</td>
                                            <td className="td-num">{org.billing_email}</td>
                                            <td className="td-num">{fmtDate(org.created_at)}</td>
                                            <td style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                             <select
                                                 value={selectedPlan[org.id] || 'free'}
                                                 onChange={e => setSelectedPlan(prev => ({ ...prev, [org.id]: e.target.value }))}
                                                 style={{ background: '#1a1a1a', color: '#ccc', border: '1px solid #333', borderRadius: '6px', padding: '4px 8px', fontSize: '12px' }}
                                             >
                                                 <option value="free">Free</option>
                                                 <option value="starter">Starter</option>
                                                 <option value="growth">Growth</option>
                                                 <option value="enterprise">Enterprise</option>
                                             </select>
                                             <button
                                                 className="btn-save-sm"
                                                 disabled={!!approving[org.id]}
                                                 onClick={() => handleApprove(org.id, org.name)}
                                                 style={{ color: '#34d399', borderColor: '#064e3b', background: '#062016' }}
                                             >
                                                 {approving[org.id] ? '...' : 'Approve'}
                                             </button>
                                         </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* RECENT ORGS */}
                <div className="dash-card">
                    <div className="dash-card-header">
                        <h3 className="dash-card-title">Organization Registry</h3>
                    </div>
                    <div className="table-scroll">
                        <table className="dash-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Tier</th>
                                    <th>Status</th>
                                    <th>Since</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orgs.map(org => (
                                    <tr key={org.id} onClick={() => navigate(`/admin/organizations/${org.id}`)} style={{ cursor: 'pointer' }}>
                                        <td className="td-name">
                                            {org.name}
                                            <div className="td-sub">{org.billing_email}</div>
                                        </td>
                                        <td><span className="project-tag">{org.plan_tier}</span></td>
                                        <td>
                                            <span className={`status-pill ${org.subscription_status === 'active' ? 'active' : org.subscription_status === 'pending' ? 'pending' : 'revoked'}`}>
                                                {org.subscription_status}
                                            </span>
                                        </td>
                                        <td className="td-num">{fmtDate(org.created_at)}</td>
                                        <td><span className="go-arrow">→</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
