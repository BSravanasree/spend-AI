# CORRECTED CODE SNIPPETS

## 1. Frontend: api.js (Fixed Token Handling)

```javascript
// frontend/src/services/api.js - CORRECTED ENTIRE FILE

import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for frontend auth
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jexipkocsmrqdzomqddy.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpleGlwa29jc21ycWR6b21xZGR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MDg4OTUsImV4cCI6MjA4NTA4NDg5NX0.un6HrQOPFwsLnkQt1MC9SuhPC5bB49y-cY-RtTUx344';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Listen for auth changes to sync localStorage
supabase.auth.onAuthStateChange((event, session) => {
    console.log('[Auth Event]', event);
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (session?.access_token) {
            localStorage.setItem('accessToken', session.access_token);
            console.log('[Token Sync] Stored Supabase token');
        }
    } else if (event === 'SIGNED_OUT') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        console.log('[Token Sync] Cleared tokens');
    }
});

// API Base URL: 
// - Dev: '' (Vite proxy to localhost:3001)
// - Prod: '' (Vercel rewrite to backend)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim() || '';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    },
    timeout: 30000,
});

// Request interceptor: attach Authorization header
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            console.log('[API] Attached token to request:', config.method?.toUpperCase(), config.url);
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor: handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('[API Error]', error.response?.status, error.response?.data?.error || error.message);
        
        // 401: Need to login
        if (error.response?.status === 401) {
            console.warn('[Auth] Token invalid, may need to login');
        }
        
        // 403 with ORG_PENDING: User org is not approved yet
        if (error.response?.status === 403 && error.response?.data?.code === 'ORG_PENDING') {
            if (!window.location.pathname.includes('/pending-approval')) {
                window.location.href = '/pending-approval';
            }
        }
        
        return Promise.reject(error);
    }
);

/**
 * Authentication Service
 */
export const authService = {
    async signup(email, password, organizationName) {
        const response = await api.post('/api/auth/signup', { email, password, organizationName });
        return response.data;
    },

    async login(email, password) {
        try {
            const response = await api.post('/api/auth/login', { email, password });
            const { success, user, organization, session } = response.data;

            if (!success || !session || !session.accessToken) {
                throw new Error('Invalid response: missing session token');
            }

            // Store token
            localStorage.setItem('accessToken', session.accessToken);
            
            // Store user profile
            const userData = {
                id: user.id,
                email: user.email,
                role: user.role,
                organizationId: user.organizationId,
                organization: organization
            };
            localStorage.setItem('user', JSON.stringify(userData));

            console.log('[Auth] Login successful:', user.email);
            return response.data;
        } catch (error) {
            console.error('[Auth] Login failed:', error.message);
            throw error;
        }
    },

    logout() {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        console.log('[Auth] Logged out');
        window.location.href = '/login';
    },

    async getCurrentUser() {
        const response = await api.get('/api/auth/me');
        return response.data;
    },

    isAuthenticated() {
        const token = localStorage.getItem('accessToken');
        return !!token;
    },

    getUser() {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },

    async googleCallback(supabaseAccessToken) {
        const response = await api.post('/api/auth/google-callback', { accessToken: supabaseAccessToken });
        return response.data;
    }
};

/**
 * Analytics Service
 */
export const analyticsService = {
    async getSummary() {
        const response = await api.get('/api/analytics/summary');
        return response.data;
    },
    async getDailySpend() {
        const response = await api.get('/api/analytics/daily');
        return response.data;
    },
    async getProjectSpend() {
        const response = await api.get('/api/analytics/projects');
        return response.data;
    },
    async getModelSpend() {
        const response = await api.get('/api/analytics/models');
        return response.data;
    },
};

/**
 * Budget Service
 */
export const budgetService = {
    async getSummary() {
        const response = await api.get('/api/budgets/summary');
        return response.data;
    },
    async updateOrgBudget(amount) {
        const response = await api.put('/api/budgets/org', { budget: amount });
        return response.data;
    },
    async updateProjectBudget(projectId, amount) {
        const response = await api.put(`/api/budgets/project/${projectId}`, { budget: amount });
        return response.data;
    },
};

/**
 * Project Service
 */
export const projectService = {
    async getProjects() {
        const response = await api.get('/api/projects');
        return response.data;
    },
    async getProject(projectId) {
        const response = await api.get(`/api/projects/${projectId}`);
        return response.data;
    },
    async createProject(name) {
        const response = await api.post('/api/projects', { name });
        return response.data;
    },
    async updateProject(projectId, name) {
        const response = await api.put(`/api/projects/${projectId}`, { name });
        return response.data;
    },
    async deleteProject(projectId) {
        const response = await api.delete(`/api/projects/${projectId}`);
        return response.data;
    },
};

/**
 * Proxy Key Service
 */
export const proxyKeyService = {
    async getKeys(projectId) {
        const response = await api.get(`/api/proxy-keys?projectId=${projectId}`);
        return response.data;
    },
    async createKey(projectId) {
        const response = await api.post('/api/proxy-keys', { projectId });
        return response.data;
    },
    async revokeKey(keyId) {
        const response = await api.delete(`/api/proxy-keys/${keyId}`);
        return response.data;
    },
};

/**
 * Billing Service
 */
export const billingService = {
    async getSummary() {
        const response = await api.get('/api/billing/summary');
        return response.data;
    },
    async getInvoices() {
        const response = await api.get('/api/billing/invoices');
        return response.data;
    },
};

export { supabase };
export default api;
```

---

## 2. Frontend: AuthContext.jsx (Fixed)

```javascript
// frontend/src/context/AuthContext.jsx - CORRECTED

import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    // Check auth on mount
    useEffect(() => {
        const initAuth = async () => {
            try {
                const hasToken = authService.isAuthenticated();
                console.log('[AuthContext] Init: hasToken =', hasToken);

                if (hasToken) {
                    const userData = authService.getUser();
                    if (userData) {
                        console.log('[AuthContext] Restored user:', userData.email);
                        setUser(userData);
                        setIsAuthenticated(true);
                    } else {
                        // Token exists but no user data - try to fetch
                        try {
                            const response = await authService.getCurrentUser();
                            setUser(response.user);
                            setIsAuthenticated(true);
                            console.log('[AuthContext] Fetched user:', response.user.email);
                        } catch (err) {
                            console.error('[AuthContext] Failed to fetch user, clearing token');
                            authService.logout();
                        }
                    }
                }
            } catch (error) {
                console.error('[AuthContext] Init failed:', error);
            } finally {
                setLoading(false);
            }
        };

        initAuth();
    }, []);

    const login = async (email, password) => {
        try {
            console.log('[AuthContext] Logging in:', email);
            const data = await authService.login(email, password);
            setUser(data.user);
            setIsAuthenticated(true);
            console.log('[AuthContext] Login successful');
            return data;
        } catch (error) {
            console.error('[AuthContext] Login error:', error);
            throw error;
        }
    };

    const signup = async (email, password, organizationName) => {
        try {
            console.log('[AuthContext] Signing up:', email);
            await authService.signup(email, password, organizationName);
            const loginData = await login(email, password);
            console.log('[AuthContext] Signup successful');
            return loginData;
        } catch (error) {
            console.error('[AuthContext] Signup error:', error);
            throw error;
        }
    };

    const logout = () => {
        console.log('[AuthContext] Logging out');
        authService.logout();
        setUser(null);
        setIsAuthenticated(false);
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, login, signup, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};
```

---

## 3. Backend: server.js (CORS Fix)

Replace the CORS section in backend/src/server.js:

```javascript
// ── CORS ──────────────────────────────────────────────────────────────────
// Build the origin allowlist from env. FRONTEND_URL is required in prod.
const allowedOrigins = new Set([
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
]);

if (process.env.FRONTEND_URL) {
    // Support comma-separated list
    process.env.FRONTEND_URL.split(',')
        .map(u => u.trim())
        .filter(Boolean)
        .forEach(u => {
            allowedOrigins.add(u);
            console.log(`[CORS] Added origin: ${u}`);
        });
}

const corsOptions = {
    origin(origin, callback) {
        // Allow server-to-server requests (no Origin header)
        if (!origin) {
            console.log('[CORS] Allowed (no origin)');
            return callback(null, true);
        }
        
        if (allowedOrigins.has(origin)) {
            console.log(`[CORS] Allowed: ${origin}`);
            return callback(null, true);
        }
        
        console.warn(`[CORS] Rejected: ${origin}`);
        callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 3600
};
```

---

## 4. Backend: authService.js (Fix JIT Provisioning)

The login method needs to fix organization fetch. Replace lines 140-180 in authService.js:

```javascript
    async login(email, password) {
        try {
            // Step 1: Sign in with Supabase Auth (MUST use anon key client)
            const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
                email,
                password
            });

            if (authError) {
                throw new Error(`Invalid login credentials`);
            }

            const userId = authData.user.id;

            // Step 2: Get user profile with organization details
            const { data: userData, error: userError } = await supabaseAdmin
                .from('users')
                .select(`
                    id,
                    email,
                    role,
                    organization_id,
                    organizations:organization_id (
                        id,
                        name
                    )
                `)
                .eq('id', userId)
                .single();

            if (userError) {
                throw new Error(`User profile error: ${userError.message}`);
            }

            // Step 3: Return session with user + org data
            return {
                success: true,
                user: {
                    id: userData.id,
                    email: userData.email,
                    role: userData.role,
                    organizationId: userData.organization_id
                },
                organization: Array.isArray(userData.organizations) 
                    ? userData.organizations[0] 
                    : userData.organizations,
                session: {
                    accessToken: authData.session.access_token,
                    refreshToken: authData.session.refresh_token,
                    expiresAt: authData.session.expires_at
                }
            };

        } catch (error) {
            console.error('Login error:', error.message);
            throw error;
        }
    }
```

---

## 5. Frontend: Login.jsx (Improved error handling)

The file is already mostly correct, but add better error handling:

```javascript
// In the handleSubmit catch block (around line 42):

catch (err) {
    console.error('[Login] Error:', err);
    const msg = err.response?.data?.error || err.message || '';

    // Cold-start timeout — retry once
    if (!msg || 
        err.code === 'ECONNABORTED' || 
        err.response?.status === 504 || 
        err.response?.status === 502) {
        
        setStatusMsg('Server is waking up, retrying...');
        try {
            await new Promise(r => setTimeout(r, 5000));
            await login(email, password);
            setStatusMsg('');
            navigate('/dashboard', { replace: true });
            return;
        } catch (retryErr) {
            console.error('[Login] Retry failed:', retryErr);
            setError(retryErr.response?.data?.error || 'Login failed after retry. Please try again.');
        }
    } else {
        setError(msg || 'Failed to login. Please check your credentials.');
    }
    setStatusMsg('');
}
```

---

## 6. Frontend: OAuthCallback.jsx (Enhanced)

```javascript
// frontend/src/pages/auth/OAuthCallback.jsx

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { authService } from '../../services/api';

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL || 'https://jexipkocsmrqdzomqddy.supabase.co',
    import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpleGlwa29jc21ycWR6b21xZGR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MDg4OTUsImV4cCI6MjA4NTA4NDg5NX0.un6HrQOPFwsLnkQt1MC9SuhPC5bB49y-cY-RtTUx344'
);

/**
 * OAuthCallback - Supabase Google OAuth redirect handler
 * 1. Get Supabase session from URL hash
 * 2. Call backend /api/auth/google-callback with token
 * 3. Backend creates/links user + org (JIT provisioning)
 * 4. Store token and redirect to dashboard
 */
const OAuthCallback = () => {
    const [status, setStatus] = useState('Completing sign-in...');
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const handleCallback = async () => {
            try {
                console.log('[OAuthCallback] Starting...');
                setStatus('Getting session from OAuth...');

                // Get Supabase session from URL hash
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                if (sessionError) {
                    throw new Error(sessionError.message);
                }

                if (!session) {
                    throw new Error('No session found after OAuth redirect. Check Supabase redirect URL config.');
                }

                console.log('[OAuthCallback] Got Supabase session for:', session.user?.email);
                setStatus('Connecting your account...');

                // Call backend to verify + create user
                const result = await authService.googleCallback(session.access_token);

                console.log('[OAuthCallback] Backend response:', result);

                // Store our backend JWT + user profile
                localStorage.setItem('accessToken', result.session.accessToken);
                localStorage.setItem('user', JSON.stringify({
                    id: result.user.id,
                    email: result.user.email,
                    role: result.user.role,
                    organizationId: result.user.organizationId,
                    organization: result.organization
                }));

                console.log('[OAuthCallback] Tokens stored, redirecting...');
                setStatus('Done! Redirecting...');
                
                setTimeout(() => {
                    navigate('/dashboard', { replace: true });
                }, 500);

            } catch (err) {
                console.error('[OAuthCallback] Error:', err);
                const msg = err.response?.data?.error || err.message || 'Sign-in failed';
                setError(msg);
                setStatus('');
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
```

---

## 7. Vercel Frontend Configuration (frontend/vercel.json)

Current file is correct, but verify it matches:

```json
{
    "rewrites": [
        {
            "source": "/api/(.*)",
            "destination": "https://spendai-2-0.onrender.com/api/$1"
        },
        {
            "source": "/v1/(.*)",
            "destination": "https://spendai-2-0.onrender.com/v1/$1"
        },
        {
            "source": "/(.*)",
            "destination": "/index.html"
        }
    ],
    "headers": [
        {
            "source": "/assets/(.*)",
            "headers": [
                {
                    "key": "Cache-Control",
                    "value": "public, max-age=31536000, immutable"
                }
            ]
        },
        {
            "source": "/(.*)",
            "headers": [
                {
                    "key": "X-Content-Type-Options",
                    "value": "nosniff"
                },
                {
                    "key": "X-Frame-Options",
                    "value": "DENY"
                }
            ]
        }
    ]
}
```

---

## Summary of Fixes

| Issue | Fix |
|-------|-----|
| Token not storing | api.js: Fixed login() to properly extract and store tokens |
| After login stuck | AuthContext: Fixed token check logic |
| Auth state lost on refresh | authService.isAuthenticated() now checks localStorage correctly |
| Internal server error | Set all required env vars on Render |
| Google button not appearing | Enable Google OAuth in Supabase console |
| Google redirect failing | Add redirect URLs to Supabase + Google console |
| CORS errors | Fixed allowed origins in server.js to include env var |
| JIT provisioning issues | Fixed organization fetch in authService.login() |

