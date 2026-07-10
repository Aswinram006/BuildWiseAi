import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading BuildWise sessions...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirect to login page but save the current location they were trying to access
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Role is not authorized
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="max-w-md text-center glass-panel p-8 rounded-2xl shadow-xl glow-card">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Access Denied</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Your role <b>{user.role}</b> does not have permissions to access this module. If you believe this is an error, please contact your company administrator.
          </p>
          <button
            onClick={() => window.history.back()}
            className="w-full rounded-xl bg-brand-600 hover:bg-brand-700 text-white py-2 px-4 text-sm font-semibold transition-all shadow-md shadow-brand-500/20"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
