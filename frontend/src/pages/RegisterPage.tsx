import React from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/auth/AuthLayout';
import RegisterForm from '../components/auth/RegisterForm';

const RegisterPage: React.FC = () => {
  return (
    <AuthLayout
      title="Create Account"
      subtitle="Register as Customer or Provider and access the trade catalog"
    >
      <RegisterForm />
      <div className="mt-6 text-center text-xs">
        <span className="text-slate-400">Already have an account? </span>
        <Link
          to="/login"
          className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          Sign In Here
        </Link>
      </div>
    </AuthLayout>
  );
};

export default RegisterPage;
