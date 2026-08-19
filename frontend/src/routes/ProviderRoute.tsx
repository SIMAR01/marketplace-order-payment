import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../hooks/storeHooks';
import Spinner from '../components/common/Spinner';

interface ProviderRouteProps {
  children: React.ReactNode;
}

const ProviderRoute: React.FC<ProviderRouteProps> = ({ children }) => {
  const { user, isAuthenticated, isInitialized } = useAppSelector((state) => state.auth);
  const location = useLocation();

  // If startup auth verification is active, display spinner
  if (!isInitialized || (isAuthenticated && !user)) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Spinner size="lg" className="text-indigo-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect unauthenticated requests to login, storing return target path
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.role !== 'PROVIDER' && user?.role !== 'ADMIN') {
    // Redirect authenticated but unauthorized requests (e.g. CUSTOMER role)
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

export default ProviderRoute;
