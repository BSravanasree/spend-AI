import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Sidebar from '../components/Sidebar';

export default function Settings() {
    const { user, refreshUser } = useAuth();
    const [loading, setLoading] = useState('');
    const [msg, setMsg] = useState({ type: '', text: '' });
    const [displayName, setDisplayName] = useState(user?.display_name || user?.email?.split('@')[0] || '');
    const [orgProfile, setOrgProfile] = useState({
        name: user?.organization?.name || '',
        billing_email: user?.organization?.billing_email || ''
    });

    const [keys, setKeys] = useState({ openai: '', anthropic: '', google: '' });
    const [keyStatus, setKeyStatus] = useState({
        openai: false,
        anthropic: false,
        google: false
    });

    // Fetch live org data to accurately reflect key status
    useEffect(() => {
        const fetchOrgStatus = async () => {
            try {
                const res = await api.get('/api/settings/key-status');
                if (res.data?.success) {
                    setKeyStatus(res.data.status);
                }
            } catch (_) {
                // If endpoint not there yet, use user data as fallback
                setKeyStatus({
                    openai: !!user?.organization?.openai_api_key,
                    anthropic: !!user?.organization?.anthropic_api_key,
                    google: !!user?.organization?.google_api_key
                });
            }
        };
        fetchOrgStatus();
    }, [user]);

    const showMsg = (type, text) => {
        setMsg({ type, text });
        setTimeout(() => setMsg({ type: '', text: '' }), 4000);
    };

    const handleSaveKey = async (provider) => {
        if (!keys[provider]) return showMsg('error', 'Enter a key first');
        setLoading(provider);
        try {
            await api.put(`/api/settings/${provider}-key`, { apiKey: keys[provider] });
            showMsg('success', `${provider.charAt(0).toUpperCase() + provider.slice(1)} key saved!`);
            setKeyStatus(prev => ({ ...prev, [provider]: true }));
            setKeys(prev => ({ ...prev, [provider]: '' }));
            refreshUser?.();
        } catch (error) {
            showMsg('error', error.response?.data?.error || 'Failed to save key');
        } finally {
            setLoading('');
        }
    };

    const handleTestKey = async (provider) => {
        if (!keys[provider]) return showMsg('error', 'Enter a key to test first');
        setLoading(`test-${provider}`);
        try {
            await api.post(`/api/settings/test-${provider}-key`, { apiKey: keys[provider] });
            showMsg('success', `✓ ${provider.charAt(0).toUpperCase() + provider.slice(1)} connection successful!`);
        } catch (error) {
            showMsg('error', `${provider} test failed: ${error.response?.data?.error || 'Invalid key'}`);
        } finally {
            setLoading('');
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setLoading('profile');
        try {
            await api.put('/api/settings/org-profile', orgProfile);
            showMsg('success', 'Organization profile updated!');
            refreshUser?.();
        } catch (error) {
            showMsg('error', error.response?.data?.error || 'Failed to update profile');
        } finally {
            setLoading('');
        }
    };

    const handleUpdateAccount = async (e) => {
        e.preventDefault();
        setLoading('account');
        try {
            await api.put('/api/settings/profile', { displayName });
            showMsg('success', 'Account updated!');
        } catch (error) {
            showMsg('error', error.response?.data?.error || 'Failed to update account');
        } finally {
            setLoading('');
        }
    };

    const providerLabels = { openai: 'OpenAI', anthropic: 'Anthropic', google: 'Google (Gemini)' };
    const providerPlaceholders = {
        openai: 'sk-...',
        anthropic: 'sk-ant-...',
        google: 'AIza...'
    };

    return (
        <div className="app-shell">
            <Sidebar />
            <div className="main-content">
                <div className="topbar">
                    <div className="topbar-left">
                        <h1 className="page-title">Settings</h1>
                        <p className="page-sub">Manage your account and organization</p>
                    </div>
                </div>

                {/* Toast notification */}
                {msg.text && (
                    <div style={{
                        padding: '12px 20px',
                        borderRadius: '10px',
                        marginBottom: '20px',
                        fontSize: '14px',
                        fontWeight: 500,
                        background: msg.type === 'success' ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
                        border: `1px solid ${msg.type === 'success' ? '#34d399' : '#f87171'}`,
                        color: msg.type === 'success' ? '#34d399' : '#f87171'
                    }}>
                        {msg.text}
                    </div>
                )}

                <div style={{ maxWidth: 800, display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 80 }}>
                    {/* Account Settings */}
                    <div className="dash-card">
                        <div className="dash-card-header">
                            <div>
                                <h3 className="dash-card-title">Account</h3>
                                <p className="dash-card-sub">Your personal account information</p>
                            </div>
                        </div>
                        <form onSubmit={handleUpdateAccount} style={{ padding: 24 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: 6 }}>
                                        Display Name
                                    </label>
                                    <input
                                        type="text"
                                        style={{ width: '100%', background: '#111', border: '1px solid #222', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 14, boxSizing: 'border-box' }}
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        placeholder="Your name"
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: 6 }}>
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        style={{ width: '100%', background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 8, padding: '10px 14px', color: '#6b7280', fontSize: 14, boxSizing: 'border-box', cursor: 'not-allowed' }}
                                        value={user?.email || ''}
                                        readOnly
                                        title="Contact support to change your email"
                                    />
                                    <span style={{ fontSize: 11, color: '#4b5563', marginTop: 4, display: 'block' }}>Contact support to change email</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: 12, color: '#6b7280' }}>
                                        Role: <span style={{ color: '#5b6af7', fontWeight: 700, textTransform: 'uppercase' }}>{user?.role || 'member'}</span>
                                    </span>
                                    <span style={{ fontSize: 12, color: '#6b7280' }}>
                                        Plan: <span style={{ color: '#c8f135', fontWeight: 700, textTransform: 'uppercase' }}>{user?.organization?.plan_tier || 'free'}</span>
                                    </span>
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading === 'account'}
                                    style={{ padding: '10px 24px', background: '#5b6af7', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: loading === 'account' ? 0.5 : 1 }}
                                >
                                    {loading === 'account' ? 'Saving...' : 'Save Account'}
                                </button>
                            </div>
                        </form>
                    </div>
                    <div className="dash-card">
                        <div className="dash-card-header">
                            <div>
                                <h3 className="dash-card-title">AI Provider Keys</h3>
                                <p className="dash-card-sub">Keys are encrypted at rest. They are never shown or logged once saved.</p>
                            </div>
                        </div>
                        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
                            {['openai', 'anthropic', 'google'].map((provider) => (
                                <div key={provider}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <label style={{ fontSize: 14, fontWeight: 500, color: '#d1d5db' }}>
                                            {providerLabels[provider]}
                                        </label>
                                        <span style={{
                                            fontSize: 11,
                                            padding: '2px 10px',
                                            borderRadius: 20,
                                            background: keyStatus[provider] ? 'rgba(52,211,153,0.1)' : '#1a1a1a',
                                            color: keyStatus[provider] ? '#34d399' : '#6b7280',
                                            border: `1px solid ${keyStatus[provider] ? '#34d39930' : '#333'}`
                                        }}>
                                            {keyStatus[provider] ? '✓ Configured' : '○ Not Set'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <input
                                            type="password"
                                            placeholder={keyStatus[provider] ? '••••••••••••••••••••' : providerPlaceholders[provider]}
                                            style={{
                                                flex: 1,
                                                background: '#111',
                                                border: '1px solid #222',
                                                borderRadius: 8,
                                                padding: '10px 14px',
                                                color: '#fff',
                                                fontSize: 14,
                                                outline: 'none',
                                                fontFamily: 'monospace'
                                            }}
                                            value={keys[provider]}
                                            onChange={(e) => setKeys({ ...keys, [provider]: e.target.value })}
                                        />
                                        <button
                                            onClick={() => handleTestKey(provider)}
                                            disabled={!!loading}
                                            style={{
                                                padding: '10px 16px',
                                                background: '#1a1a1a',
                                                border: '1px solid #333',
                                                borderRadius: 8,
                                                color: '#9ca3af',
                                                fontSize: 13,
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                opacity: loading ? 0.5 : 1,
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            {loading === `test-${provider}` ? '...' : 'Test'}
                                        </button>
                                        <button
                                            onClick={() => handleSaveKey(provider)}
                                            disabled={!!loading || !keys[provider]}
                                            style={{
                                                padding: '10px 18px',
                                                background: '#5b6af7',
                                                border: 'none',
                                                borderRadius: 8,
                                                color: '#fff',
                                                fontSize: 13,
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                opacity: (loading || !keys[provider]) ? 0.5 : 1,
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            {loading === provider ? 'Saving...' : 'Save'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Organization Profile */}
                    <div className="dash-card">
                        <div className="dash-card-header">
                            <h3 className="dash-card-title">Organization Profile</h3>
                        </div>
                        <form onSubmit={handleUpdateProfile} style={{ padding: 24 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: 6 }}>
                                        Organization Name
                                    </label>
                                    <input
                                        type="text"
                                        style={{
                                            width: '100%',
                                            background: '#111',
                                            border: '1px solid #222',
                                            borderRadius: 8,
                                            padding: '10px 14px',
                                            color: '#fff',
                                            fontSize: 14,
                                            boxSizing: 'border-box'
                                        }}
                                        value={orgProfile.name}
                                        onChange={(e) => setOrgProfile({ ...orgProfile, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: 6 }}>
                                        Billing Email
                                    </label>
                                    <input
                                        type="email"
                                        style={{
                                            width: '100%',
                                            background: '#111',
                                            border: '1px solid #222',
                                            borderRadius: 8,
                                            padding: '10px 14px',
                                            color: '#fff',
                                            fontSize: 14,
                                            boxSizing: 'border-box'
                                        }}
                                        value={orgProfile.billing_email}
                                        onChange={(e) => setOrgProfile({ ...orgProfile, billing_email: e.target.value })}
                                        placeholder={user?.email}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 12, color: '#6b7280' }}>
                                    Current plan: <span style={{ color: '#5b6af7', fontWeight: 700, textTransform: 'uppercase' }}>{user?.organization?.plan_tier || 'Free'}</span>
                                </span>
                                <button
                                    type="submit"
                                    disabled={loading === 'profile'}
                                    style={{
                                        padding: '10px 24px',
                                        background: '#5b6af7',
                                        border: 'none',
                                        borderRadius: 8,
                                        color: '#fff',
                                        fontSize: 14,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        opacity: loading === 'profile' ? 0.5 : 1
                                    }}
                                >
                                    {loading === 'profile' ? 'Saving...' : 'Update Profile'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Danger Zone */}
                    <div className="dash-card" style={{ borderColor: 'rgba(239,68,68,0.15)' }}>
                        <div className="dash-card-header">
                            <h3 className="dash-card-title" style={{ color: '#ef4444' }}>Danger Zone</h3>
                        </div>
                        <div style={{ padding: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                            <div>
                                <h4 style={{ color: '#fff', margin: '0 0 4px 0', fontSize: 14, fontWeight: 600 }}>Delete Organization</h4>
                                <p style={{ color: '#6b7280', margin: 0, fontSize: 13 }}>This will permanently delete all projects, proxy keys, and usage data.</p>
                            </div>
                            <button
                                onClick={() => alert('To delete your organization, contact support@spendai.online')}
                                style={{
                                    padding: '10px 20px',
                                    background: 'transparent',
                                    border: '1px solid rgba(239,68,68,0.3)',
                                    borderRadius: 8,
                                    color: '#ef4444',
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Contact Support
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
