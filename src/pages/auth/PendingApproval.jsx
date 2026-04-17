import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function PendingApproval() {
    const { user, refreshUser } = useAuth();
    const navigate = useNavigate();
    const [countdown, setCountdown] = useState(30);

    const checkApproval = useCallback(async () => {
        try {
            const res = await api.get('/api/auth/me');
            const org = res.data?.user?.organization || res.data?.organization;
            if (org?.subscription_status === 'active' || res.data?.user?.role === 'super_admin') {
                await refreshUser?.();
                navigate('/dashboard', { replace: true });
            }
        } catch (_) { /* still pending */ }
    }, [navigate, refreshUser]);

    useEffect(() => {
        // Redirect immediately if already active
        if (user?.organization?.subscription_status === 'active' || user?.role === 'super_admin') {
            navigate('/dashboard', { replace: true });
        }

        // Poll every 30 seconds
        const pollInterval = setInterval(() => {
            checkApproval();
            setCountdown(30);
        }, 30000);

        // Countdown timer for UX
        const countdownTimer = setInterval(() => {
            setCountdown(prev => (prev > 0 ? prev - 1 : 30));
        }, 1000);

        return () => {
            clearInterval(pollInterval);
            clearInterval(countdownTimer);
        };
    }, [user, navigate, checkApproval]);

    return (
        <div style={{
            minHeight: '100vh',
            background: '#080809',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            fontFamily: 'Inter, sans-serif'
        }}>
            <div style={{
                maxWidth: 460,
                width: '100%',
                background: '#111',
                border: '1px solid #222',
                borderRadius: 20,
                padding: 40,
                textAlign: 'center'
            }}>
                <div style={{
                    width: 64, height: 64,
                    background: 'rgba(91,106,247,0.1)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 24px',
                    fontSize: 28
                }}>⏳</div>

                <h2 style={{ color: '#fff', fontSize: 24, fontWeight: 700, margin: '0 0 8px' }}>Account Under Review</h2>
                <p style={{ color: '#9ca3af', margin: '0 0 24px', lineHeight: 1.6 }}>
                    We typically approve accounts within 24 hours. You'll receive an email the moment we're ready for you.
                </p>

                {/* Progress bar */}
                <div style={{ background: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 24, textAlign: 'left', border: '1px solid #222' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#5b6af7', animation: 'pulse 2s infinite' }}></div>
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#d1d5db' }}>
                            Auto-checking in {countdown}s...
                        </span>
                    </div>
                    <div style={{ width: '100%', background: '#222', height: 4, borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{
                            width: `${(countdown / 30) * 100}%`,
                            height: '100%',
                            background: '#5b6af7',
                            transition: 'width 1s linear'
                        }}></div>
                    </div>
                </div>

                {/* Steps */}
                <div style={{ textAlign: 'left', borderTop: '1px solid #222', paddingTop: 24, marginBottom: 24 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
                        What happens next?
                    </p>
                    {[
                        'We review your organization details manually.',
                        'You receive an approval email from SpendAI.',
                        'Access to your dashboard is granted automatically — no need to refresh.'
                    ].map((step, i) => (
                        <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'flex-start' }}>
                            <span style={{ color: '#5b6af7', fontWeight: 700, minWidth: 20 }}>{i + 1}.</span>
                            <span style={{ color: '#d1d5db', fontSize: 13, lineHeight: 1.5 }}>{step}</span>
                        </div>
                    ))}
                </div>

                <div style={{ borderTop: '1px solid #222', paddingTop: 24 }}>
                    <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
                        Signed up as <strong style={{ color: '#e5e7eb' }}>{user?.email}</strong>
                    </p>
                    <button
                        onClick={() => checkApproval()}
                        style={{
                            background: '#5b6af7',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 8,
                            padding: '10px 24px',
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: 'pointer',
                            marginRight: 12
                        }}
                    >
                        Check Now
                    </button>
                    <button
                        onClick={() => navigate('/login')}
                        style={{
                            background: 'transparent',
                            color: '#5b6af7',
                            border: 'none',
                            fontSize: 14,
                            fontWeight: 500,
                            cursor: 'pointer'
                        }}
                    >
                        Return to Login
                    </button>
                </div>
            </div>
        </div>
    );
}
