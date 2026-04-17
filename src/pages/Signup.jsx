import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import './Login.css'; // Reusing Login styles as they are shared

const pingBackend = () => fetch('/api/diagnostics/health').catch(() => { });

const Signup = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [orgName, setOrgName] = useState('');
    const [error, setError] = useState('');
    const [statusMsg, setStatusMsg] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);

    const { signup } = useAuth();
    const navigate = useNavigate();

    useEffect(() => { pingBackend(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        setStatusMsg('Creating account...');

        try {
            await signup(email, password, orgName);
            setStatusMsg('');
            navigate('/dashboard');
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.error || err.message || '';

            if (!msg || err.code === 'ECONNABORTED' || err.response?.status === 504) {
                setStatusMsg('Server is waking up, retrying...');
                try {
                    await new Promise(r => setTimeout(r, 5000));
                    await signup(email, password, orgName);
                    navigate('/dashboard');
                    return;
                } catch (retryErr) {
                    setError(retryErr.response?.data?.error || 'Registration failed. Please try again.');
                }
            } else {
                setError(msg || 'Failed to register. Please check your inputs.');
            }
            setStatusMsg('');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSignup = async () => {
        setIsGoogleLoading(true);
        setError('');
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: `${window.location.origin}/auth/callback` },
            });
            if (error) throw error;
        } catch (err) {
            setError(err.message || 'Google sign-up failed.');
            setIsGoogleLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <h2>Join SpendAI</h2>
                    <p>Start managing your AI infrastructure today</p>
                </div>

                {error && <div className="error-message">{error}</div>}
                {statusMsg && <div className="status-message">{statusMsg}</div>}

                <div className="login-google-section">
                    <button type="button" className="btn-google" onClick={handleGoogleSignup} disabled={isGoogleLoading || isLoading}>
                        <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4" />
                            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853" />
                            <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
                            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335" />
                        </svg>
                        {isGoogleLoading ? 'Redirecting...' : 'Sign up with Google'}
                    </button>
                </div>

                <div className="auth-divider"><span>or sign up with email</span></div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="orgName">Organization Name</label>
                        <input type="text" id="orgName" className="form-input" value={orgName}
                            onChange={(e) => setOrgName(e.target.value)} required placeholder="Acme Inc." />
                    </div>
                    <div className="form-group">
                        <label htmlFor="email">Work Email</label>
                        <input type="email" id="email" className="form-input" value={email}
                            onChange={(e) => setEmail(e.target.value)} required placeholder="name@company.com" />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input type="password" id="password" className="form-input" value={password}
                            onChange={(e) => setPassword(e.target.value)} required placeholder="Create a password" />
                    </div>
                    <button type="submit" className="btn-primary" disabled={isLoading || isGoogleLoading}>
                        {isLoading ? (statusMsg || 'Creating account...') : 'Create Account'}
                    </button>
                </form>

                <div className="auth-footer">
                    Already have an account? <Link to="/login" className="auth-link">Log in</Link>
                </div>
            </div>
        </div>
    );
};

export default Signup;
