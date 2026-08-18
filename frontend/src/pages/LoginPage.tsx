import React from 'react';
import { Link } from 'react-router-dom';

const LoginPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-xl p-8 shadow-2xl text-center">
        <h1 className="text-2xl font-extrabold text-white mb-4">
          Login
        </h1>
        <p className="text-sm text-slate-400 mb-6">
          Authentication will be implemented later.
        </p>
        <Link 
          to="/" 
          className="inline-flex justify-center items-center px-4 py-2 text-sm font-semibold text-slate-900 bg-slate-400 hover:bg-slate-300 rounded-lg transition duration-200"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
};

export default LoginPage;
