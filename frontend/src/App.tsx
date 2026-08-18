import React, { useEffect } from 'react';
import { useRoutes } from 'react-router-dom';
import routes from './routes';
import { useGetProfileQuery } from './api/authApi';
import { useAppSelector, useAppDispatch } from './hooks/storeHooks';
import { setInitialized } from './store/slices/authSlice';
import Spinner from './components/common/Spinner';

const App: React.FC = () => {
  const { isInitialized } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();

  // Execute profile check on startup to restore session if cookie is present
  const { isLoading } = useGetProfileQuery();

  useEffect(() => {
    if (!isLoading) {
      dispatch(setInitialized());
    }
  }, [isLoading, dispatch]);

  const element = useRoutes(routes);

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <Spinner size="xl" className="text-indigo-500" />
        <p className="text-sm font-semibold text-slate-500 tracking-wider animate-pulse">
          INITIALIZING SESSION...
        </p>
      </div>
    );
  }

  return <>{element}</>;
};

export default App;
