import React from 'react';
import { useAppSelector } from '../hooks/storeHooks';
import { Shield, Mail, Calendar, User, Phone, Briefcase } from 'lucide-react';

const DashboardPage: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Client Dashboard</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            Protected area. Authenticated session verified.
          </p>
        </div>

        {/* Profile Card */}
        <div className="bg-slate-950/60 border border-slate-850 rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400 font-extrabold text-2xl uppercase">
                {user?.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{user?.name}</h2>
                <div className="inline-block mt-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {user?.role}
                </div>
              </div>
            </div>
            <div className="text-xs text-slate-500">
              Account ID: <code className="text-slate-400 font-mono">{user?._id}</code>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center gap-3">
              <Mail size={16} className="text-slate-400 shrink-0" />
              <div>
                <div className="text-[10px] uppercase text-slate-500 tracking-wider font-semibold">
                  Email Address
                </div>
                <div className="text-sm text-slate-200">{user?.email}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar size={16} className="text-slate-400 shrink-0" />
              <div>
                <div className="text-[10px] uppercase text-slate-500 tracking-wider font-semibold">
                  Registered Since
                </div>
                <div className="text-sm text-slate-200">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                </div>
              </div>
            </div>

            {user?.role === 'PROVIDER' && (
              <>
                <div className="flex items-center gap-3">
                  <Briefcase size={16} className="text-slate-400 shrink-0" />
                  <div>
                    <div className="text-[10px] uppercase text-slate-500 tracking-wider font-semibold">
                      Business Name
                    </div>
                    <div className="text-sm text-slate-200">{user?.businessName || 'N/A'}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Phone size={16} className="text-slate-400 shrink-0" />
                  <div>
                    <div className="text-[10px] uppercase text-slate-500 tracking-wider font-semibold">
                      Contact Phone
                    </div>
                    <div className="text-sm text-slate-200">{user?.phone || 'N/A'}</div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
