import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectService, proxyKeyService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import './ProjectDetail.css';
import { toast } from 'react-hot-toast';

function ProjectDetail() {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [project, setProject] = useState(null);
    const [proxyKeys, setProxyKeys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Modal & form states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showRevokeModal, setShowRevokeModal] = useState(false);
    const [selectedKey, setSelectedKey] = useState(null);
    const [newKeyData, setNewKeyData] = useState(null);

    const [formData, setFormData] = useState({ name: '' });
    const [submitting, setSubmitting] = useState(false);
    const [copiedKeyId, setCopiedKeyId] = useState(null);

    useEffect(() => {
        if (user) loadData();
    }, [projectId, user]);

    const loadData = async () => {
        try {
            const [pRes, kRes] = await Promise.all([
                projectService.getProject(projectId),
                proxyKeyService.getProxyKeys(projectId)
            ]);
            setProject(pRes.project);
            setProxyKeys(kRes.keys || []);
        } catch (error) {
            setError(error.response?.status === 404 ? 'Project not found' : 'Failed to load project data');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateKey = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const result = await proxyKeyService.createProxyKey(projectId, formData.name);
            setNewKeyData(result.key);
            setFormData({ name: '' });
            setShowCreateModal(false);
            toast.success('Key generated successfully!');
            const kRes = await proxyKeyService.getProxyKeys(projectId);
            setProxyKeys(kRes.keys || []);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to create proxy key');
        } finally {
            setSubmitting(false);
        }
    };

    const handleRevokeKey = async () => {
        if (!selectedKey) return;
        setSubmitting(true);
        try {
            await proxyKeyService.revokeProxyKey(selectedKey.id);
            toast.success('Key revoked');
            setShowRevokeModal(false);
            setSelectedKey(null);
            const kRes = await proxyKeyService.getProxyKeys(projectId);
            setProxyKeys(kRes.keys || []);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to revoke key');
        } finally {
            setSubmitting(false);
        }
    };

    const copyToClipboard = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success('Copied to clipboard');
        } catch (err) { 
            toast.error('Failed to copy');
        }
    };

    const copyMasked = async (id, maskedValue) => {
        try {
            await navigator.clipboard.writeText(maskedValue);
            setCopiedKeyId(id);
            toast.success('Masked key copied');
            setTimeout(() => setCopiedKeyId(null), 2000);
        } catch (err) { 
            toast.error('Failed to copy');
        }
    };

    const isAdmin = user?.role === 'admin' || user?.role === 'owner' || user?.role === 'super_admin';

    if (loading) {
        return (
            <div className="app-shell">
                <Sidebar />
                <div className="main-content centered">
                    <div className="spinner"></div>
                    <p>Loading project details...</p>
                </div>
            </div>
        );
    }

    const budgetPct = project?.monthly_budget_usd > 0
        ? Math.min(100, (project.mtd_spend / project.monthly_budget_usd) * 100).toFixed(1)
        : null;

    return (
        <div className="app-shell">
            <Sidebar />

            <div className="main-content">
                <div className="topbar">
                    <div className="topbar-left">
                        <div className="breadcrumb-v2">
                            <span onClick={() => navigate('/projects')}>Projects</span>
                            <span className="sep">/</span>
                            <span className="curr">{project?.name}</span>
                        </div>
                        <h1 className="page-title">{project?.name}</h1>
                        <p className="page-sub">Project ID: <code className="id-code">{project?.id}</code></p>
                    </div>
                    {isAdmin && (
                        <button className="btn-quick-create" onClick={() => setShowCreateModal(true)}>
                            + Generate Key
                        </button>
                    )}
                </div>

                {error && <div className="dash-error">{error}</div>}

                {/* Info & Stats Row */}
                <div className="stat-grid">
                    <div className="stat-card">
                        <span className="stat-label">MTD Spend</span>
                        <div className="stat-value">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 4 }).format(project?.mtd_spend || 0)}
                        </div>
                        {budgetPct && (
                            <div className="mini-progress">
                                <div className="bar"><div className="fill" style={{ width: `${budgetPct}%` }}></div></div>
                                <span className="label">{budgetPct}% of ${project.monthly_budget_usd}</span>
                            </div>
                        )}
                    </div>
                    <div className="stat-card">
                        <span className="stat-label">Active Keys</span>
                        <div className="stat-value">{proxyKeys.filter(k => k.is_active).length}</div>
                        <span className="stat-sub">Issuing requests now</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-label">Description</span>
                        <div className="stat-value-sm">{project?.description || 'No description provided.'}</div>
                    </div>
                </div>

                {/* New Key Display */}
                {newKeyData && (
                    <div className="new-key-alert glass">
                        <div className="new-key-header">
                            <span className="icon">🔒</span>
                            <div>
                                <h4 className="title">Key Generated Successfully</h4>
                                <p className="subtitle">Copy and save this key now. It will never be shown again.</p>
                            </div>
                        </div>
                        <div className="key-reveal-box">
                            <code className="revealed-key">{newKeyData.keyValue}</code>
                            <button
                                className="copy-btn-v2"
                                onClick={() => copyToClipboard(newKeyData.keyValue)}
                            >
                                Copy Key
                            </button>
                        </div>
                        <button className="btn-save-confirm" onClick={() => setNewKeyData(null)}>I've saved it</button>
                    </div>
                )}

                {/* Keys Section */}
                <div className="dash-card">
                    <div className="dash-card-header">
                        <div>
                            <h3 className="dash-card-title">Proxy API Keys</h3>
                            <p className="dash-card-sub">All keys assigned to this project container</p>
                        </div>
                    </div>

                    <div className="table-scroll">
                        <table className="dash-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Masked Key</th>
                                    <th>Status</th>
                                    <th>Created</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {proxyKeys.length === 0 ? (
                                    <tr><td colSpan="5" className="empty-td">No keys generated for this project.</td></tr>
                                ) : (
                                    proxyKeys.map(key => (
                                        <tr key={key.id} className={!key.is_active ? 'row-revoked' : ''}>
                                            <td className="td-name">{key.name || key.masked}</td>
                                            <td className="td-mono">{key.masked}</td>
                                            <td>
                                                <span className={`status-pill ${key.is_active ? 'active' : 'revoked'}`}>
                                                    {key.is_active ? 'Active' : 'Revoked'}
                                                </span>
                                            </td>
                                            <td className="td-num">{new Date(key.created_at).toLocaleDateString()}</td>
                                            <td style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                {key.is_active && (
                                                    <button
                                                        title="Copy masked key preview to clipboard"
                                                        onClick={() => copyMasked(key.id, key.masked)}
                                                        style={{
                                                            background: copiedKeyId === key.id ? 'rgba(52,211,153,0.1)' : 'rgba(91,106,247,0.1)',
                                                            border: `1px solid ${copiedKeyId === key.id ? '#34d399' : '#5b6af7'}`,
                                                            color: copiedKeyId === key.id ? '#34d399' : '#5b6af7',
                                                            padding: '4px 10px',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            fontSize: '11px',
                                                            fontWeight: 600,
                                                            whiteSpace: 'nowrap',
                                                            transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        {copiedKeyId === key.id ? '✓ Copied' : '📋 Copy'}
                                                    </button>
                                                )}
                                                {isAdmin && key.is_active && (
                                                    <button
                                                        className="btn-revoke-sm"
                                                        onClick={() => {
                                                            setSelectedKey(key);
                                                            setShowRevokeModal(true);
                                                        }}
                                                    >
                                                        Revoke
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* How to Use Guide */}
                <div className="dash-card" style={{ marginTop: 24 }}>
                    <div className="dash-card-header">
                        <div>
                            <h3 className="dash-card-title">How to Use Your Proxy Key</h3>
                            <p className="dash-card-sub">Replace your OpenAI key and baseURL — everything else stays the same.</p>
                        </div>
                    </div>
                    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div>
                            <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Node.js / JavaScript</p>
                            <pre style={{ background: '#0d0d0d', border: '1px solid #222', borderRadius: 10, padding: 16, fontSize: 13, color: '#c8f135', overflow: 'auto', margin: 0 }}>{`import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: 'sk-sp-YOUR_PROXY_KEY_HERE',   // ← paste your proxy key
  baseURL: 'https://spendai-2-0.onrender.com/v1'  // ← SpendAI endpoint
});

const response = await client.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'Hello!' }]
});`}</pre>
                        </div>
                        <div>
                            <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>cURL</p>
                            <pre style={{ background: '#0d0d0d', border: '1px solid #222', borderRadius: 10, padding: 16, fontSize: 13, color: '#c8f135', overflow: 'auto', margin: 0 }}>{`curl https://spendai-2-0.onrender.com/v1/chat/completions \\
  -H "Authorization: Bearer sk-sp-YOUR_PROXY_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Hi"}]}'`}</pre>
                        </div>
                        <div style={{ background: 'rgba(91,106,247,0.06)', border: '1px solid rgba(91,106,247,0.2)', borderRadius: 8, padding: 12 }}>
                            <p style={{ margin: 0, fontSize: 13, color: '#9ca3af' }}>
                                <strong style={{ color: '#5b6af7' }}>✓ Supported models:</strong> All OpenAI (gpt-4o, gpt-4o-mini, o1...), Anthropic (claude-3-5-sonnet...), and Google (gemini-2.0-flash...) models. Just change the <code style={{ color: '#c8f135' }}>model</code> field.
                            </p>
                        </div>
                    </div>
                </div>

                {showCreateModal && (
                    <div className="modal-overlay" onClick={() => !submitting && setShowCreateModal(false)}>
                        <div className="modal-v2" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>Generate Proxy Key</h3>
                                <button className="close-btn" onClick={() => setShowCreateModal(false)}>✕</button>
                            </div>
                            <form onSubmit={handleCreateKey}>
                                <div className="form-group-v2">
                                    <label>Key Name (optional)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Frontend App"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ name: e.target.value })}
                                    />
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn-ghost" onClick={() => setShowCreateModal(false)}>Cancel</button>
                                    <button type="submit" className="btn-primary-v2" disabled={submitting}>
                                        {submitting ? 'Creating...' : 'Generate New Key'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {showRevokeModal && selectedKey && (
                    <div className="modal-overlay" onClick={() => !submitting && setShowRevokeModal(false)}>
                        <div className="modal-v2 danger" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>Revoke Key?</h3>
                                <button className="close-btn" onClick={() => setShowRevokeModal(false)}>✕</button>
                            </div>
                            <div className="modal-body">
                                <p>Immediate rejection for <strong>{selectedKey.name || selectedKey.masked}</strong>. Applications using this key will fail.</p>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn-ghost" onClick={() => setShowRevokeModal(false)}>Cancel</button>
                                <button type="button" className="btn-danger-v2" onClick={handleRevokeKey} disabled={submitting}>
                                    {submitting ? 'Revoking...' : 'Confirm Revocation'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ProjectDetail;
