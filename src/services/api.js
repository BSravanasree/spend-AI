import axios from 'axios';
import { supabase } from '../lib/supabase';

// Listen for auth changes to sync our manually managed localStorage
supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (session) {
            localStorage.setItem('accessToken', session.access_token);
        }
    } else if (event === 'SIGNED_OUT') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
    }
});

// - Dev:  VITE_API_URL is unset → '' → Vite dev proxy forwards /api/* to localhost:3001
// - Prod: VITE_API_URL is unset → '' → Vercel edge rewrite forwards /api/* to Render
// - Alt:  Set VITE_API_URL=https://... to hit Render directly 
const API_BASE_URL = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '').trim();

// Create axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    },
    timeout: 30000,
});

// Enhanced token fetcher (Fix G)
const getAuthToken = () => {
    // Try our own stored key first
    const direct = localStorage.getItem('accessToken');
    if (direct && direct.length > 20) return direct;

    // Fallback: scan for Supabase's own session key (OAuth / social login)
    const keys = Object.keys(localStorage);
    const sbKey = keys.find(k => k.includes('auth-token') || k.startsWith('sb-'));
    
    if (sbKey) {
        try {
            const session = JSON.parse(localStorage.getItem(sbKey) || '{}');
            return session?.access_token || session?.session?.access_token || null;
        } catch (_) { return null; }
    }
    return null;
};

// Add request interceptor to attach auth token
api.interceptors.request.use(
    (config) => {
        const token = getAuthToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Add response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Only redirect if not already on login/signup/callback pages and not an auth request
            const isAuthPage = ['/login', '/signup', '/auth/callback'].some(p => window.location.pathname.includes(p));
            const isAuthRequest = error.config.url.includes('/api/auth');

            if (!isAuthPage && !isAuthRequest) {
                console.warn('[API] Token expired or invalid. Redirecting to login.');
                localStorage.removeItem('accessToken');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }
        }
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

            return response.data;
        } catch (error) {
            console.error('[Auth] Login failed:', error.message);
            throw error;
        }
    },

    logout() {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
    },

    async getCurrentUser() {
        const response = await api.get('/api/auth/me');
        return response.data;
    },

    isAuthenticated() {
        const hasHashToken = window.location.hash.includes('access_token');
        return !!localStorage.getItem('accessToken') || hasHashToken;
    },

    getUser() {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },

    async loginWithGoogle() {
        return await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: `${window.location.origin}/auth/callback` }
        });
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
    async getDailySpend(days = 30) {
        const response = await api.get(`/api/analytics/daily?days=${days}`);
        return response.data;
    },
    async getProjectSpend(days = 30) {
        const response = await api.get(`/api/analytics/projects?days=${days}`);
        return response.data;
    },
    async getModelSpend(days = 30) {
        const response = await api.get(`/api/analytics/models?days=${days}`);
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
        const response = await api.put(`/api/budgets/projects/${projectId}`, { budget: amount });
        return response.data;
    },
    async getAlerts() {
        const response = await api.get('/api/budgets/alerts');
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
    async createProject(name, description, budget = 0) {
        const response = await api.post('/api/projects', { 
            name, 
            description,
            monthly_budget_usd: budget 
        });
        return response.data;
    },
    async updateProject(projectId, updates) {
        const response = await api.put(`/api/projects/${projectId}`, updates);
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
    async getProxyKeys(projectId) {
        const response = await api.get(`/api/proxy-keys/project/${projectId}`);
        return response.data;
    },
    async getProxyKey(keyId) {
        const response = await api.get(`/api/proxy-keys/${keyId}`);
        return response.data;
    },
    async createProxyKey(projectId, name) {
        const response = await api.post('/api/proxy-keys', { projectId, name });
        return response.data;
    },
    async revokeProxyKey(keyId) {
        const response = await api.post(`/api/proxy-keys/${keyId}/revoke`);
        return response.data;
    },
};

/**
 * Billing Service
 */
export const billingService = {
    async getOverview() {
        const response = await api.get('/api/billing/overview');
        return response.data;
    },
    async getInvoices() {
        const response = await api.get('/api/billing/invoices');
        return response.data;
    },
};

// Default export the raw axios instance for pages that import it directly (admin pages)
export default api;

/**
 * Admin Service
 */
export const adminService = {
    async getOrganization(orgId) {
        const response = await api.get(`/api/admin/organizations/${orgId}`);
        return response.data;
    },
    async activateSubscription(orgId, planTier, payment) {
        const response = await api.post(`/api/admin/organizations/${orgId}/activate`, { planTier, payment });
        return response.data;
    },
    async expireSubscription(orgId) {
        const response = await api.post(`/api/admin/organizations/${orgId}/expire`);
        return response.data;
    },
    async updateOrgKeys(orgId, keys) {
        const response = await api.put(`/api/admin/organizations/${orgId}/keys`, keys);
        return response.data;
    },
};


