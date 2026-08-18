import { RouteObject } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import HomePage from '../pages/HomePage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import DashboardPage from '../pages/DashboardPage';
import UnauthorizedPage from '../pages/UnauthorizedPage';
import NotFoundPage from '../pages/NotFoundPage';
import ProtectedRoute from './ProtectedRoute';
import PublicRoute from './PublicRoute';
import ProviderRoute from './ProviderRoute';

// Provider/Merchant Pages
import ProductListPage from '../pages/provider/ProductListPage';
import ProductFormPage from '../pages/provider/ProductFormPage';

// Public Pages
import ProductsSearchPage from '../pages/ProductsSearchPage';
import ProductDetailPage from '../pages/ProductDetailPage';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        path: '',
        element: <HomePage />,
      },
      {
        path: 'login',
        element: (
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        ),
      },
      {
        path: 'register',
        element: (
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        ),
      },
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        ),
      },
      // Public Search Catalog
      {
        path: 'products',
        element: <ProductsSearchPage />,
      },
      // Public Product Detail Page (PDP)
      {
        path: 'p/:slug/:id',
        element: <ProductDetailPage />,
      },
      // Protected Merchant Inventory Management
      {
        path: 'inventory',
        element: (
          <ProviderRoute>
            <ProductListPage />
          </ProviderRoute>
        ),
      },
      {
        path: 'inventory/new',
        element: (
          <ProviderRoute>
            <ProductFormPage />
          </ProviderRoute>
        ),
      },
      {
        path: 'inventory/edit/:id',
        element: (
          <ProviderRoute>
            <ProductFormPage />
          </ProviderRoute>
        ),
      },
      {
        path: 'unauthorized',
        element: <UnauthorizedPage />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
];

export default routes;
