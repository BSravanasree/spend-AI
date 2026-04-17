import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell
} from 'recharts';
import { analyticsService, budgetService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import '../components/Sidebar.css';
import './Dashboard.css';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

const RANGES = [
    { label: 'Last 7 days', key: '7d' },
    { label: 'Last 30 days', key: '30d' },
    { label: 'Last 3 months', key: '3m' },
];

function StatCard({ label, value, sub, trend, trendDir, loading, onClick }) {
    if (loading) {
        return (
            <div style={{
                background: '#111',
                border: '1px solid #1e1e1e',
                borderRadius: '12px',
                padding: '20px 24px'
            }}>
                <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {label}
                </p>
                <div style={{
                    height: '32px',
                    background: '#1a1a1a',
                    borderRadius: '4px',
                    width: '100px',
                    animation: 'pulse 1.5s infinite'
                }} />
            </div>
        );
    }

    return (
        <div 
            onClick={onClick}
            style={{
                background: '#111',
                border: '1px solid #1e1e1e',
                borderRadius: '12px',
                padding: '20px 24px',
                cursor: onClick ? 'pointer' : 'default',
                transition: 'border-color 0.2s',
                ':hover': onClick ? { borderColor: '#5b6af7' } : {}
            }}
            className={onClick ? 'stat-card-hover' : ''}
        >
            <p style={{
                margin: '0 0 8px',
                fontSize: '13px',
                color: '#666',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
            }}>
                {label}
            </p>
            <div style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '8px'
            }}>
                <span style={{
                    fontSize: '28px',
                    fontWeight: '700',
                    color: '#f0f0ee'
                }}>
                    {value}
                </span>
                {trend && (
                    <span style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: trendDir === 'up' ? '#4caf50' : '#f44336'
                    }}>
                        {trendDir === 'up' ? '↗' : '↘'} {trend}
                    </span>
                )}
            </div>
            {sub && (
                <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#444' }}>
                    {sub}
                </p>
            )}
        </div>
    );
}

function Dashboard() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [summary, setSummary] = useState({ month_to_date: 0, last_7_days: 0, last_30_days: 0, budget: 0, total_requests: 0 });
    const [dailySpend, setDailySpend] = useState([]);
    const [projectSpend, setProjectSpend] = useState([]);
    const [modelSpend, setModelSpend] = useState([]);
    const [range, setRange] = useState('30d');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) fetchAnalytics(range);
    }, [user]);

    useEffect(() => {
        if (user) fetchAnalytics(range);
    }, [range]);

    const fetchAnalytics = async (currentRange = '30d') => {
        const getDays = (r) => r === '7d' ? 7 : r === '3m' ? 90 : 30;
        const days = getDays(currentRange);
        try {
            setLoading(true);
            const [sumData, dailyData, projectData, modelData, budgetData] = await Promise.all([
                analyticsService.getSummary(),
                analyticsService.getDailySpend(days),
                analyticsService.getProjectSpend(days),
                analyticsService.getModelSpend(days),
                budgetService.getSummary()
            ]);
            
            if (sumData.success) {
                const merged = { ...sumData.data };
                if (budgetData?.success) merged.budget = budgetData.data.organization?.budget || 0;
                setSummary(merged);
            }
            if (dailyData.success) setDailySpend(dailyData.data);
            if (projectData.success) setProjectSpend(projectData.data);
            if (modelData.success) setModelSpend(modelData.data);
        } catch (e) {
            setError('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const fmt = (val) => new Intl.NumberFormat('en-US', {
        style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2
    }).format(val || 0);

    const filteredDaily = dailySpend;

    const budgetPct = summary.budget > 0
        ? Math.min(100, ((summary.month_to_date / summary.budget) * 100))
        : 0;

    return (
        <div className="app-shell">
            <Sidebar />

            <div className="main-content">
                {/* Top Bar */}
                <div className="topbar">
                    <div className="topbar-left">
                        <h1 className="page-title">Dashboard</h1>
                        <span className="page-sub">Real-time AI spend analytics for <strong>{user?.organization?.name}</strong></span>
                    </div>
                </div>

                {/* No API Key Warning */}
                {!loading && !user?.organization?.openai_api_key && !user?.organization?.anthropic_api_key && !user?.organization?.google_api_key && (
                    <div style={{
                        background: 'rgba(91,106,247,0.08)',
                        border: '1px solid rgba(91,106,247,0.4)',
                        borderRadius: 12,
                        padding: '16px 20px',
                        marginBottom: 24,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 16,
                        flexWrap: 'wrap'
                    }}>
                        <div>
                            <strong style={{ color: '#fff', display: 'block', marginBottom: 4 }}>
                                Add your AI provider API key to get started
                            </strong>
                            <span style={{ color: '#9ca3af', fontSize: 13 }}>
                                SpendAI needs your OpenAI, Anthropic, or Google key to proxy and track requests.
                            </span>
                        </div>
                        <a href="/settings" style={{
                            background: '#5b6af7',
                            color: '#fff',
                            padding: '10px 20px',
                            borderRadius: 8,
                            textDecoration: 'none',
                            fontSize: 14,
                            fontWeight: 600,
                            whiteSpace: 'nowrap'
                        }}>
                            Go to Settings →
                        </a>
                    </div>
                )}

                {error && <div className="dash-error" style={{ marginBottom: 24 }}>❌ {error}</div>}

                {/* Stat Cards */}
                <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                    <StatCard
                        label="MTD Spend"
                        value={fmt(summary.month_to_date)}
                        loading={loading}
                        sub="Cumulative spend this month"
                    />
                    <StatCard
                        label="Budget Used"
                        value={`${budgetPct.toFixed(1)}%`}
                        loading={loading}
                        sub={summary.budget > 0 ? `of ${fmt(summary.budget)} limit` : 'No budget limit set'}
                        trend={null}
                        trendDir={budgetPct >= 90 ? 'down' : 'up'}
                    />
                    <StatCard
                        label="Total Requests"
                        value={summary.total_requests || '0'}
                        loading={loading}
                        sub="Volume this month"
                    />
                    <StatCard
                        label="Active Projects"
                        value={`${projectSpend.length}`}
                        loading={loading}
                        sub="Projects with recent usage"
                        onClick={() => navigate('/projects')}
                    />
                </div>

                {/* Daily Spend Area Chart */}
                <div className="dash-card" id="analytics">
                    <div className="dash-card-header">
                        <div>
                            <h3 className="dash-card-title">Total Spend</h3>
                            <p className="dash-card-sub">Cumulative daily cost over time</p>
                        </div>
                        <div className="range-tabs">
                            {RANGES.map(r => (
                                <button
                                    key={r.key}
                                    className={`range-tab${range === r.key ? ' active' : ''}`}
                                    onClick={() => setRange(r.key)}
                                >
                                    {r.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="chart-wrap">
                        {filteredDaily.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">📊</div>
                                <p>No data yet. Make your first API call to see insights.</p>
                                <button className="btn-primary-sm" onClick={() => navigate('/projects')}>
                                    Create a Project
                                </button>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={280}>
                                <AreaChart data={filteredDaily} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1a1a1a" />
                                    <XAxis
                                        dataKey="date"
                                        stroke="#333"
                                        tick={{ fill: '#4b5563', fontSize: 11 }}
                                        tickFormatter={v => v.slice(5)}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        stroke="#333"
                                        tick={{ fill: '#4b5563', fontSize: 11 }}
                                        tickFormatter={v => `$${v}`}
                                        axisLine={false}
                                        tickLine={false}
                                        width={50}
                                    />
                                    <Tooltip
                                        contentStyle={{ background: '#111', border: '1px solid #222', borderRadius: 8, fontSize: 12 }}
                                        labelStyle={{ color: '#9ca3af' }}
                                        itemStyle={{ color: '#6366f1' }}
                                        formatter={v => [fmt(v), 'Spend']}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="total_spend"
                                        stroke="#6366f1"
                                        strokeWidth={2}
                                        fill="url(#spendGrad)"
                                        dot={false}
                                        activeDot={{ r: 5, fill: '#6366f1', strokeWidth: 0 }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Bottom Row: Model Bar + Project Table */}
                <div className="dash-row">
                    {/* Model Spend */}
                    <div className="dash-card flex-1">
                        <div className="dash-card-header">
                            <div>
                                <h3 className="dash-card-title">Spend by Model</h3>
                                <p className="dash-card-sub">Distribution across LLMs</p>
                            </div>
                        </div>
                        <div className="chart-wrap" style={{ height: 220 }}>
                            {modelSpend.length === 0 ? (
                                <div className="empty-state small">No model data yet.</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={modelSpend.slice(0, 6)} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1a1a1a" />
                                        <XAxis
                                            dataKey="model"
                                            stroke="#333"
                                            tick={{ fill: '#4b5563', fontSize: 10 }}
                                            axisLine={false} tickLine={false}
                                            tickFormatter={v => v.length > 10 ? v.slice(0, 10) + '…' : v}
                                        />
                                        <YAxis
                                            stroke="#333"
                                            tick={{ fill: '#4b5563', fontSize: 10 }}
                                            tickFormatter={v => `$${v}`}
                                            axisLine={false} tickLine={false}
                                            width={42}
                                        />
                                        <Tooltip
                                            contentStyle={{ background: '#111', border: '1px solid #222', borderRadius: 8, fontSize: 12 }}
                                            formatter={v => [fmt(v), 'Spend']}
                                        />
                                        <Bar dataKey="total_spend" radius={[4, 4, 0, 0]}>
                                            {modelSpend.map((entry, i) => (
                                                <Cell
                                                    key={i}
                                                    fill={entry.model?.startsWith('gemini-') || entry.provider === 'google' ? '#4285f4' : COLORS[i % COLORS.length]}
                                                />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    {/* Project Table */}
                    <div className="dash-card flex-1" style={{ overflow: 'hidden' }}>
                        <div className="dash-card-header">
                            <div>
                                <h3 className="dash-card-title">Project Spend</h3>
                                <p className="dash-card-sub">Cost and request breakdown</p>
                            </div>
                            <button className="btn-ghost-sm" onClick={() => navigate('/projects')}>View all →</button>
                        </div>
                        <div className="table-scroll">
                            <table className="dash-table">
                                <thead>
                                    <tr>
                                        <th>Project</th>
                                        <th>Requests</th>
                                        <th>Spend</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {projectSpend.length === 0 ? (
                                        <tr><td colSpan="4" className="empty-td">No spend data yet.</td></tr>
                                    ) : (
                                        projectSpend.slice(0, 6).map(p => (
                                            <tr key={p.project_id}>
                                                <td className="td-name">{p.project_name}</td>
                                                <td className="td-num">{p.request_count?.toLocaleString() ?? '—'}</td>
                                                <td className="td-mono">{fmt(p.total_spend)}</td>
                                                <td>
                                                    <button
                                                        className="btn-row"
                                                        onClick={() => navigate(`/projects/${p.project_id}`)}
                                                    >→</button>
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

export default Dashboard;
