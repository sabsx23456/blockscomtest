import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../lib/store';

export const ProtectedRoute = () => {
    const { session, profile, loading, refreshProfile } = useAuthStore();

    useEffect(() => {
        if (session && !profile && !loading) {
            refreshProfile();
            const interval = setInterval(() => {
                refreshProfile();
            }, 2000);
            return () => clearInterval(interval);
        }
    }, [session, profile, loading, refreshProfile]);

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
            </div>
        );
    }

    if (!session) return <Navigate to="/login" replace />;

    // If session exists but profile is not loaded yet (e.g. delayed creation), show loader
    if (session && !profile) {
        return (
            <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
                <p className="text-gray-400 text-sm animate-pulse">Setting up your profile...</p>
            </div>
        );
    }

    // If account is pending, force logout to prevent access
    if (profile?.status === 'pending') {
        const { signOut } = useAuthStore.getState();
        signOut(); // Force sign out
        return <Navigate to="/login" replace />;
    }

    // If account is active, don't allow access to the pending page
    if (profile?.status === 'active' && window.location.pathname === '/pending') {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
};
