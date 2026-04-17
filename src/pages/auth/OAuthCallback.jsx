import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { authService } from '../../services/api';

/**
 * OAuthCallback
 * 
 * Supabase redirects here after Google OAuth. We:
 * 1. Get the Supabase session from the URL hash
 * 2. Call our backend /api/auth/google-callback with the access token
 * 3. Backend creates/links the user + org, returns our own JWT
 * 4. Store our JWT and redirect to /dashboard
 */
const OAuthCallback = () => {
    const [status, setStatus] = useState('Completing sign-in...');
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const handleCallback = async () => {
            try {
                // Get session from URL (Supabase puts it in the hash after OAuth)
                // We use a small retry loop because sometimes the session isn't processed immediately by the SDK
                let session = null;
                let retries = 0;
                while (retries < 5) {
                    const { data: { session: s }, error: sessionError } = await supabase.auth.getSession();
                    if (s) {
                        session = s;
                        break;
                    }
                    if (sessionError) throw sessionError;

                    retries++;
                    await new Promise(r => setTimeout(r, 500)); // Wait 500ms
                }

                if (!session) {
                    throw new Error('No session found after OAuth redirect. Please try again.');
                }

                setStatus('Connecting your account...');

                // Call our backend with the Supabase access token
                const result = await authService.googleCallback(session.access_token);

                // Store our backend's JWT + user profile
                localStorage.setItem('accessToken', result.session.accessToken);
                localStorage.setItem('user', JSON.stringify({ ...result.user, organization: result.organization }));

                setStatus('Done! Redirecting...');

                // Route based on org status — don't land pending users on the dashboard
                const orgStatus = result.organization?.subscription_status;
                if (orgStatus === 'pending') {
                    navigate('/pending-approval', { replace: true });
                } else if (orgStatus === 'suspended' || orgStatus === 'expired') {
                    // Dashboard will show an expired/suspended banner via authorizeStatus
                    navigate('/dashboard', { replace: true });
                } else {
                    navigate('/dashboard', { replace: true });
                }

            } catch (err) {
                console.error('OAuth callback error:', err);
                const msg = err.response?.data?.error || err.message || 'Sign-in failed. Please try again.';
                setError(msg);
            }
        };

        handleCallback();
    }, [navigate]);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            background: '#0f172a',
            color: '#e2e8f0',
            fontFamily: 'Inter, sans-serif',
            gap: '1rem'
        }}>
            {error ? (
                <>
                    <div style={{ fontSize: '2rem' }}>❌</div>
                    <h2 style={{ color: '#f87171' }}>Sign-in Failed</h2>
                    <p style={{ color: '#94a3b8', maxWidth: 400, textAlign: 'center' }}>{error}</p>
                    <button
                        onClick={() => navigate('/login')}
                        style={{
                            marginTop: '1rem',
                            padding: '0.6rem 1.5rem',
                            background: '#6366f1',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.9rem'
                        }}
                    >
                        Back to Login
                    </button>
                </>
            ) : (
                <>
                    <div style={{
                        width: 40, height: 40,
                        border: '3px solid #6366f1',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite'
                    }} />
                    <p style={{ color: '#94a3b8' }}>{status}</p>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </>
            )}
        </div>
    );
};

export default OAuthCallback;
