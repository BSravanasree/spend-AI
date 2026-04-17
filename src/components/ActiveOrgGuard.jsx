import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ActiveOrgGuard = () => {
    const { user, loading } = useAuth();

    if (loading) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0f172a', color: '#94a3b8' }}>Loading...</div>;
    }

    // Super admins bypass org status checks
    if (user?.role === 'super_admin') {
        return <Outlet />;
    }

    if (user?.organization?.subscription_status === 'pending') {
        return <Navigate to="/pending-approval" replace />;
    }

    return <Outlet />;
};

export default ActiveOrgGuard;
