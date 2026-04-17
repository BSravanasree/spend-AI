import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import BudgetSettings from './pages/BudgetSettings';
import Alerts from './pages/Alerts';
import Billing from './pages/Billing';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Settings from './pages/Settings';
import Docs from './pages/Docs';
import NotFound from './pages/NotFound';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AdminDashboard from './pages/admin/AdminDashboard';
import OrgDetail from './pages/admin/OrgDetail';
import PendingApproval from './pages/auth/PendingApproval';
import OAuthCallback from './pages/auth/OAuthCallback';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import SuperAdminRoute from './components/SuperAdminRoute';
import ActiveOrgGuard from './components/ActiveOrgGuard';

// Wake up Render backend immediately when the page loads
// (Render free tier sleeps after 15 mins of inactivity)
const BACKEND_URL = 'https://spendai-2-0.onrender.com';

function WakeUpBackend() {
    useEffect(() => {
        fetch(`${BACKEND_URL}/health`).catch(() => { });
    }, []);
    return null;
}

function App() {
    return (
        <AuthProvider>
            <Toaster 
                position="top-right"
                toastOptions={{
                    style: {
                        background: '#111',
                        color: '#eee',
                        border: '1px solid #333',
                        fontSize: '14px',
                        borderRadius: '10px',
                    },
                }}
            />
            <WakeUpBackend />
            <Router>
                <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<Landing />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/auth/callback" element={<OAuthCallback />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/docs" element={<Docs />} />

                    {/* Protected Routes */}
                    <Route element={<PrivateRoute />}>
                        <Route path="/pending-approval" element={<PendingApproval />} />

                        <Route element={<ActiveOrgGuard />}>
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/projects" element={<Projects />} />
                            <Route path="/projects/:projectId" element={<ProjectDetail />} />
                            <Route path="/budgets" element={<BudgetSettings />} />
                            <Route path="/alerts" element={<Alerts />} />
                            <Route path="/billing" element={<Billing />} />
                            <Route path="/settings" element={<Settings />} />
                        </Route>
                    </Route>

                    {/* Super Admin Only Routes */}
                    <Route element={<SuperAdminRoute />}>
                        <Route path="/admin" element={<AdminDashboard />} />
                        <Route path="/admin/organizations/:id" element={<OrgDetail />} />
                    </Route>

                    {/* Default Fallback */}
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;
