import React from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/auth/AuthLayout';
import LoginForm from '../components/auth/LoginForm';

const LoginPage: React.FC = () => {
  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to manage your orders, invoices, and payments"
    >
      <LoginForm />
      <div className="mt-6 text-center text-xs">
        <span className="text-slate-400">New to the marketplace? </span>
        <Link
          to="/register"
          className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          Create an Account
        </Link>
      </div>
    </AuthLayout>
  );
};

export default LoginPage;
