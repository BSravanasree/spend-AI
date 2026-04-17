import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/api';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            try {
                const hasToken = authService.isAuthenticated();
                if (hasToken) {
                    const userData = authService.getUser();
                    if (userData) {
                        setUser(userData);
                        setIsAuthenticated(true);
                    } else {
                        try {
                            const response = await authService.getCurrentUser();
                            setUser(response.user);
                            setIsAuthenticated(true);
                        } catch (err) {
                            authService.logout();
                        }
                    }
                }
            } catch (error) {
                // Silent fail — user stays on public page
            } finally {
                setLoading(false);
            }
        };

        initAuth();

        // Listen for Supabase session changes (token refresh, sign out)
        // This is critical for OAuth users whose Supabase JWT auto-refreshes every ~1h
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'TOKEN_REFRESHED' && session?.access_token) {
                // Supabase silently refreshed the token — update our stored copy
                localStorage.setItem('accessToken', session.access_token);
                // Nudge user state so downstream hooks pick up fresh token
                setUser(prev => prev ? { ...prev, _tokenRefreshedAt: Date.now() } : prev);
            }
            if (event === 'SIGNED_OUT') {
                // Supabase session ended externally — clean up our state
                localStorage.removeItem('accessToken');
                localStorage.removeItem('user');
                setUser(null);
                setIsAuthenticated(false);
                window.location.href = '/login';
            }
        });

        return () => {
            subscription?.unsubscribe();
        };
    }, []);

    const login = async (email, password) => {
        const data = await authService.login(email, password);
        setUser(data.user);
        setIsAuthenticated(true);
        return data;
    };

    const signup = async (email, password, organizationName) => {
        await authService.signup(email, password, organizationName);
        const loginData = await login(email, password);
        return loginData;
    };

    const logout = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            if (token) {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
            }
        } catch (err) {
            // Never block logout
        } finally {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('user');
            setUser(null);
            setIsAuthenticated(false);
            window.location.href = '/login';
        }
    };

    /**
     * Refreshes the user profile from the server (e.g. after saving settings)
     * and updates the stored user data.
     */
    const refreshUser = useCallback(async () => {
        try {
            const response = await authService.getCurrentUser();
            if (response?.user) {
                setUser(response.user);
                // Persist updated user to localStorage
                localStorage.setItem('user', JSON.stringify(response.user));
                return response.user;
            }
        } catch (err) {
            // Silent — don't kick user out on refresh failure
        }
        return null;
    }, []);

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, login, signup, logout, refreshUser, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
