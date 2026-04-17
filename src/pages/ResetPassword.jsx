import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import './Login.css';

export default function ResetPassword() {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [ready, setReady] = useState(false);
    const navigate = useNavigate();

    // Supabase puts the recovery token in the URL hash.
    // onAuthStateChange fires with event=PASSWORD_RECOVERY once the SDK processes it.
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') {
                setReady(true);
            }
        });
        // Also check if already in a session (user navigated here from email link)
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) setReady(true);
        });
        return () => subscription.unsubscribe();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            // Navigate to login with a success indicator
            navigate('/login?reset=success');
        } catch (err) {
            setError(err.message || 'Failed to update password. Please request a new reset link.');
        } finally {
            setLoading(false);
        }
    };

    if (!ready) {
        return (
            <div className="login-container">
                <div className="login-card">
                    <div className="login-header">
                        <h2>Verifying link…</h2>
                        <p>Please wait while we verify your reset link.</p>
                    </div>
                    <div style={{ textAlign: 'center', padding: '24px', color: '#6b7280' }}>
                        If nothing happens, your link may have expired.{' '}
                        <a href="/forgot-password" style={{ color: '#5b6af7' }}>Request a new one →</a>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <h2>Set New Password</h2>
                    <p>Choose a strong password for your account</p>
                </div>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="newPassword">New Password</label>
                        <input
                            type="password"
                            id="newPassword"
                            className="form-input"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            placeholder="At least 8 characters"
                            autoComplete="new-password"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm Password</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            className="form-input"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            placeholder="Repeat your new password"
                            autoComplete="new-password"
                        />
                    </div>
                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading ? 'Updating...' : 'Update Password'}
                    </button>
                </form>
            </div>
        </div>
    );
}
