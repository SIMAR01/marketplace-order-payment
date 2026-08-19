import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../hooks/storeHooks';
import Spinner from '../components/common/Spinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isAuthenticated, isInitialized } = useAppSelector((state) => state.auth);
  const location = useLocation();

  // If the app is checking existing auth sessions on startup, show loading
  if (!isInitialized || (isAuthenticated && !user)) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Spinner size="lg" className="text-indigo-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Save current path to state for redirect after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
