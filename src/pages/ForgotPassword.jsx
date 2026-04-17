import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import './Login.css';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleReset = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: 'https://spendai-2-0.vercel.app/reset-password'
            });
            if (error) throw error;
            setSuccess(true);
        } catch (err) {
            setError(err.message || 'Failed to send reset email. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <h2>Reset Password</h2>
                    <p>Enter your email and we'll send you a reset link</p>
                </div>

                {error && <div className="error-message">{error}</div>}

                {success ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '24px',
                        background: 'rgba(52,211,153,0.08)',
                        border: '1px solid rgba(52,211,153,0.3)',
                        borderRadius: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <div style={{ fontSize: '40px' }}>✅</div>
                        <h3 style={{ color: '#34d399', margin: 0 }}>Check your email</h3>
                        <p style={{ color: '#9ca3af', margin: 0, fontSize: '14px' }}>
                            We sent a password reset link to <strong style={{ color: '#e5e7eb' }}>{email}</strong>.
                            Check your inbox (and spam folder).
                        </p>
                        <Link to="/login" style={{ color: '#5b6af7', fontSize: '14px', textDecoration: 'none', marginTop: '8px' }}>
                            ← Back to login
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleReset}>
                        <div className="form-group">
                            <label htmlFor="email">Email Address</label>
                            <input
                                type="email"
                                id="email"
                                className="form-input"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="name@company.com"
                                autoComplete="email"
                            />
                        </div>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                    </form>
                )}

                {!success && (
                    <div className="auth-footer">
                        Remember your password? <Link to="/login" className="auth-link">Sign in</Link>
                    </div>
                )}
            </div>
        </div>
    );
}
