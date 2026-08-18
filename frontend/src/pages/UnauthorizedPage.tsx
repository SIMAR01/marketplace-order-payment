import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import Button from '../components/common/Button';

const UnauthorizedPage: React.FC = () => {
  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-950">
      <div className="max-w-md w-full text-center space-y-6 bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 mx-auto flex items-center justify-center text-red-400">
          <ShieldAlert size={32} />
        </div>
        <h1 className="text-2xl font-extrabold text-white">Access Denied</h1>
        <p className="text-sm text-slate-400 leading-relaxed max-w-xs mx-auto">
          You do not have the required permissions to view this resource. Please contact administrator if you think this is a mistake.
        </p>
        <Link to="/" className="inline-block mt-4">
          <Button variant="outline" leftIcon={<ArrowLeft size={16} />}>
            Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
