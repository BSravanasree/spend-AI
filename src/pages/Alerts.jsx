import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { budgetService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import './Alerts.css';

function Alerts() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [alerts, setAlerts] = useState([]);

    useEffect(() => {
        if (user) loadAlerts();
    }, [user]);

    const loadAlerts = async () => {
        try {
            setLoading(true);
            const response = await budgetService.getAlerts();
            if (response.success) setAlerts(response.data);
        } catch (error) {
            console.error('Error loading alerts:', error);
        } finally {
            setLoading(false);
        }
    };

    const fmt = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);

    if (loading) {
        return (
            <div className="app-shell">
                <Sidebar />
                <div className="main-content centered">
                    <div className="spinner"></div>
                    <p>Fetching alerts...</p>
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
                        <h1 className="page-title">Notifications & Alerts</h1>
                        <p className="page-sub">Chronological history of budget threshold events</p>
                    </div>
                    <button className="btn-ghost-sm" onClick={() => navigate('/budgets')}>Configure Budgets →</button>
                </div>

                <div className="dash-card">
                    <div className="dash-card-header">
                        <div>
                            <h3 className="dash-card-title">Recent Activity</h3>
                            <p className="dash-card-sub">Historical record of spend guardrails triggered</p>
                        </div>
                    </div>

                    <div className="alert-feed-v2">
                        {alerts.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">🛡️</div>
                                <p>No alerts triggered yet. SpendAI is monitoring your accounts.</p>
                            </div>
                        ) : (
                            alerts.map(alert => (
                                <div key={alert.id} className={`alert-row-v2 p-${alert.threshold_percent}`}>
                                    <div className="alert-meta-v2">
                                        <div className={`threshold-dot t-${alert.threshold_percent}`}></div>
                                        <div className="alert-info-v2">
                                            <span className="alert-title-v2">
                                                {alert.threshold_percent}% {alert.alert_level} Limit Crossed
                                            </span>
                                            <span className="alert-sub-v2">
                                                {alert.alert_level === 'project' ? `Project: ${alert.projects?.name}` : 'Organization-wide'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="alert-body-v2">
                                        Reached {fmt(alert.actual_spend)} of {fmt(alert.budget_amount)} budget
                                    </div>
                                    <div className="alert-time-v2">
                                        {new Date(alert.created_at).toLocaleDateString()} {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Alerts;
