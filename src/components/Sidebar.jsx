import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

const NAV_ITEMS = [
    { label: 'Dashboard', icon: '▣', path: '/dashboard' },
    { label: 'Projects', icon: '◫', path: '/projects' },
    { label: 'Budgets', icon: '◈', path: '/budgets' },
    { label: 'Alerts', icon: '◉', path: '/alerts' },
    { label: 'Billing', icon: '▤', path: '/billing' },
];

const UTILITY_ITEMS = [
    { label: 'Settings', icon: '⚙', path: '/settings' },
    { label: 'Docs', icon: '▩', path: '/docs' },
];

const ADMIN_ITEMS = [
    { label: 'Admin Panel', icon: '⬛', path: '/admin' },
];

export default function Sidebar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const isSuperAdmin = user?.role === 'super_admin';

    return (
        <aside className="sidebar">
            {/* Logo / Org */}
            <div className="sidebar-brand" onClick={() => navigate('/dashboard')} style={{
                cursor: 'pointer',
                padding: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px'
            }}>
                <div style={{
                    width: '32px',
                    height: '32px',
                    background: 'linear-gradient(135deg, #5b6af7 0%, #3f49c5 100%)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    fontWeight: '700',
                    color: 'white'
                }}>S</div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '15px', fontWeight: '700', color: '#f0f0ee', letterSpacing: '-0.2px' }}>SpendAI</span>
                    <span style={{ fontSize: '11px', color: '#555', fontWeight: '500', textTransform: 'uppercase' }}>Beta</span>
                </div>
            </div>

            {/* Main Nav */}
            <nav className="sidebar-nav">
                <span style={{ padding: '0 24px', fontSize: '11px', fontWeight: '600', color: '#444', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', display: 'block' }}>Platform</span>
                {NAV_ITEMS.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `sidebar-link${isActive ? ' active' : ''}`
                        }
                    >
                        <span className="sidebar-link-icon" style={{ fontSize: '18px' }}>{item.icon}</span>
                        <span style={{ flex: 1 }}>{item.label}</span>
                        {item.label === 'Projects' && (
                            <span style={{
                                background: '#1a1a1a',
                                color: '#666',
                                fontSize: '10px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontWeight: '600'
                            }}>PRO</span>
                        )}
                    </NavLink>
                ))}

                <span style={{ padding: '0 24px', fontSize: '11px', fontWeight: '600', color: '#444', textTransform: 'uppercase', letterSpacing: '1px', margin: '24px 0 12px', display: 'block' }}>Resources</span>
                {UTILITY_ITEMS.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `sidebar-link${isActive ? ' active' : ''}`
                        }
                    >
                        <span className="sidebar-link-icon" style={{ fontSize: '18px' }}>{item.icon}</span>
                        {item.label}
                    </NavLink>
                ))}

                {isSuperAdmin && (
                    <>
                        <span className="sidebar-section-label" style={{ marginTop: '1.5rem' }}>Admin</span>
                        {ADMIN_ITEMS.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) =>
                                    `sidebar-link${isActive ? ' active' : ''}`
                                }
                            >
                                <span className="sidebar-link-icon">{item.icon}</span>
                                {item.label}
                            </NavLink>
                        ))}
                    </>
                )}
            </nav>

            {/* User Footer */}
            <div className="sidebar-footer">
                <div className="sidebar-user">
                    <div className="sidebar-user-avatar">{user?.email?.charAt(0)?.toUpperCase()}</div>
                    <div className="sidebar-user-info">
                        <span className="sidebar-user-email">{user?.email}</span>
                        <span className="sidebar-user-role">{user?.role}</span>
                    </div>
                </div>
                <button className="sidebar-logout" onClick={logout} title="Log out">⎋</button>
            </div>
        </aside>
    );
}
