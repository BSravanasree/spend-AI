import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { budgetService, projectService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import './BudgetSettings.css';

function BudgetSettings() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [orgBudget, setOrgBudget] = useState('');
    const [projects, setProjects] = useState([]);
    const [projectBudgets, setProjectBudgets] = useState({});

    const [message, setMessage] = useState(null);

    useEffect(() => {
        if (user) loadBudgets();
    }, [user]);

    const loadBudgets = async () => {
        setLoading(true);
        try {
            const [sumRes, projRes] = await Promise.all([
                budgetService.getSummary(),
                projectService.getProjects()
            ]);

            if (sumRes.success) {
                const b = sumRes.data.organization.budget;
                setOrgBudget(b != null ? b : '');
            }

            if (projRes.success) {
                const plist = projRes.projects || [];
                setProjects(plist);
                const budgets = {};
                plist.forEach(p => budgets[p.id] = p.monthly_budget_usd || '');
                setProjectBudgets(budgets);
            }
        } catch (e) {
            console.error('Failed to load budgets', e);
        } finally {
            setLoading(false);
        }
    };

    const handleOrgBudgetSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);
        try {
            const val = String(orgBudget).replace(/[^0-9.]/g, '');
            const amount = val === '' ? 0 : parseFloat(val);
            await budgetService.updateOrgBudget(amount);
            setMessage({ type: 'success', text: 'Organization budget updated.' });
            loadBudgets();
        } catch (error) {
            setMessage({ type: 'error', text: 'Update failed.' });
        } finally {
            setSaving(false);
        }
    };

    const saveProjectBudget = async (projectId) => {
        setSaving(true);
        setMessage(null);
        try {
            const val = String(projectBudgets[projectId]).replace(/[^0-9.]/g, '');
            const amount = val === '' ? 0 : parseFloat(val);
            await budgetService.updateProjectBudget(projectId, amount);
            setMessage({ type: 'success', text: `Budget updated for project.` });
        } catch (error) {
            setMessage({ type: 'error', text: 'Update failed.' });
        } finally {
            setSaving(false);
        }
    };

    const isAdmin = user?.role === 'admin' || user?.role === 'owner' || user?.role === 'super_admin';

    if (loading) {
        return (
            <div className="app-shell">
                <Sidebar />
                <div className="main-content centered">
                    <div className="spinner"></div>
                    <p>Loading budgets...</p>
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
                        <h1 className="page-title">Budgets & Guardrails</h1>
                        <p className="page-sub">Establish spend limits to avoid billing surprises</p>
                    </div>
                </div>

                {message && (
                    <div className={`dash-msg ${message.type}`}>
                        {message.text}
                        <button className="msg-close" onClick={() => setMessage(null)}>✕</button>
                    </div>
                )}

                {/* Enforcement Notice */}
                <div className="notice-box dark">
                    <div className="notice-icon">🛡️</div>
                    <div className="notice-text">
                        <h4>Budget Enforcement: Hard Block</h4>
                        <p>Budget limits are <strong>strictly enforced</strong>. When a project or organization reaches <strong>100% of its budget</strong>, all AI requests are automatically <strong>blocked</strong> until the budget is increased or the month resets. Alerts are sent at 80% and 100% thresholds.</p>
                    </div>
                </div>

                <div className="settings-grid">
                    {/* Left: Global Settings */}
                    <div className="settings-col">
                        <div className="dash-card">
                            <div className="dash-card-header">
                                <div>
                                    <h3 className="dash-card-title">Organization Budget</h3>
                                    <p className="dash-card-sub">Global monthly cap for the entire workspace</p>
                                </div>
                            </div>
                            <form onSubmit={handleOrgBudgetSubmit} className="budget-form-v2">
                                <div className="input-group-v2">
                                    <span className="pref">$</span>
                                    <input
                                        type="text"
                                        placeholder="No limit"
                                        value={orgBudget}
                                        onChange={(e) => setOrgBudget(e.target.value)}
                                        disabled={!isAdmin || saving}
                                    />
                                    <button
                                        type="submit"
                                        className="btn-primary-v2"
                                        disabled={!isAdmin || saving}
                                    >
                                        {saving ? '...' : 'Save'}
                                    </button>
                                </div>
                                {!isAdmin && <p className="read-only-hint">You do not have permission to edit budgets.</p>}
                            </form>
                        </div>

                        <div className="dash-card" style={{ marginTop: '16px' }}>
                            <div className="dash-card-header">
                                <div>
                                    <h3 className="dash-card-title">Threshold Policies</h3>
                                    <p className="dash-card-sub">Alerts are sent to admins at these markers</p>
                                </div>
                            </div>
                            <div className="policy-stack">
                                <div className="policy-item"><span>Usage reaches <strong>50%</strong></span><span className="dot info"></span></div>
                                <div className="policy-item"><span>Usage reaches <strong>75%</strong></span><span className="dot info"></span></div>
                                <div className="policy-item"><span>Usage reaches <strong>90%</strong></span><span className="dot warn"></span></div>
                                <div className="policy-item critical"><span>Usage reaches <strong>100%</strong></span><span className="dot error"></span></div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Project Budgets */}
                    <div className="settings-col flex-2">
                        <div className="dash-card">
                            <div className="dash-card-header">
                                <div>
                                    <h3 className="dash-card-title">Project-Level Budgets</h3>
                                    <p className="dash-card-sub">Break down your global budget into safe-zones</p>
                                </div>
                            </div>

                            <div className="budget-list-v2">
                                {projects.length === 0 ? (
                                    <div className="empty-p">No projects found. Create one to set a budget.</div>
                                ) : (
                                    projects.map(p => (
                                        <div key={p.id} className="budget-row-v2">
                                            <div className="info">
                                                <span className="name">{p.name}</span>
                                                <span className="id">{p.id.slice(0, 8)}…</span>
                                            </div>
                                            <div className="action">
                                                <div className="input-row">
                                                    <span className="pref">$</span>
                                                    <input
                                                        type="number"
                                                        placeholder="No limit"
                                                        value={projectBudgets[p.id] || ''}
                                                        onChange={(e) => setProjectBudgets({ ...projectBudgets, [p.id]: e.target.value })}
                                                        disabled={!isAdmin || saving}
                                                    />
                                                    <button
                                                        className="btn-save-sm"
                                                        onClick={() => saveProjectBudget(p.id)}
                                                        disabled={!isAdmin || saving}
                                                    >
                                                        Save
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default BudgetSettings;
