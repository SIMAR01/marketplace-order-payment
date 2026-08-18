import React from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../hooks/storeHooks';
import {
  ShieldCheck,
  Zap,
  Users,
  CreditCard,
  ArrowRight,
  TrendingUp,
  Award,
  ChevronRight,
} from 'lucide-react';
import Button from '../components/common/Button';

const HomePage: React.FC = () => {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-20 pb-24 md:pt-28 md:pb-32 overflow-hidden">
        {/* Glow circles */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-slate-900 border border-slate-800 rounded-full mb-8 hover:border-slate-700 transition-colors">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-xs font-semibold text-slate-350 tracking-wider">
              MARKETPLACE MANAGEMENT SYSTEM 2.0
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight max-w-4xl mx-auto">
            Secure Order Processing &{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Flexible Payments
            </span>
          </h1>

          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            The next-generation framework built for customers and providers. Secure authentication, transparent transactions, and role-based permissions.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {isAuthenticated ? (
              <Link to="/dashboard">
                <Button rightIcon={<ArrowRight size={16} />}>
                  Go to Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/register">
                  <Button rightIcon={<ArrowRight size={16} />}>
                    Get Started Now
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="outline">Sign In</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Value Proposition / Features Section */}
      <section className="py-20 bg-slate-900/30 border-y border-slate-900 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">
              Engineered for Enterprise Performance
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Our marketplace ensures secure API processing, zero exposed secrets, and standard-compliant authorization models.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                icon: <ShieldCheck className="text-indigo-400 w-6 h-6" />,
                title: 'Dual-Token Auth',
                desc: 'Access tokens in-memory paired with long-lived HttpOnly refresh cookies for military-grade session security.',
              },
              {
                icon: <Zap className="text-purple-400 w-6 h-6" />,
                title: 'Vite & RTK Query',
                desc: 'State of the art client performance utilizing automatic caching, query queuing, and optimized payload validation.',
              },
              {
                icon: <Users className="text-pink-400 w-6 h-6" />,
                title: 'Role Partitioning',
                desc: 'Strict separation of permissions between CUSTOMERS and PROVIDERS checked directly by backend guard interfaces.',
              },
              {
                icon: <CreditCard className="text-emerald-400 w-6 h-6" />,
                title: 'Secure Checkout',
                desc: 'Double-validated transaction checkout models matching stock deductions with cryptographic authorization checks.',
              },
            ].map((prop, idx) => (
              <div
                key={idx}
                className="bg-slate-900/50 border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/5"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center mb-5 border border-slate-700">
                  {prop.icon}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{prop.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{prop.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">How the Platform Works</h2>
            <p className="text-sm text-slate-400">
              Get running in four simple steps and start trading products and provider services.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            {[
              {
                step: '01',
                title: 'Create Account',
                desc: 'Register as CUSTOMER or PROVIDER. Role-based fields adjust automatically.',
              },
              {
                step: '02',
                title: 'Publish / Discover',
                desc: 'Providers list products and inventories. Customers browse listings.',
              },
              {
                step: '03',
                title: 'Secure Checkout',
                desc: 'Transactions process with server-validated stock checks and order logs.',
              },
              {
                step: '04',
                title: 'Instant Invoicing',
                desc: 'Both parties receive real-time updates and historical order logs.',
              },
            ].map((item, idx) => (
              <div key={idx} className="relative group">
                <div className="text-5xl font-extrabold text-indigo-500/10 mb-4 font-mono group-hover:text-indigo-500/20 transition-colors">
                  {item.step}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                {idx < 3 && (
                  <div className="hidden md:block absolute top-8 right-0 translate-x-1/2 w-8 h-[1px] bg-slate-800" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Customer & Provider Benefits Section */}
      <section className="py-20 bg-slate-900/20 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* Customer Benefits */}
            <div className="bg-slate-900/40 border border-slate-850 p-8 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
              <div className="inline-flex items-center gap-1.5 text-xs text-indigo-400 font-bold px-2.5 py-1 bg-indigo-500/10 rounded-full mb-6">
                <Users size={12} />
                CUSTOMER ADVANTAGE
              </div>
              <h3 className="text-2xl font-bold text-white mb-6">Built for Purchasers</h3>
              <ul className="space-y-4">
                {[
                  'Browse products dynamically without manual API mock structures.',
                  'Maintain shopping cart states linked to database user sessions.',
                  'Secure ordering with stock limits matching live catalog database.',
                  'Retrieve historic order lists complete with status indicators.',
                ].map((benefit, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <ChevronRight className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                    <span className="text-xs text-slate-350 leading-relaxed">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Provider Benefits */}
            <div className="bg-slate-900/40 border border-slate-850 p-8 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />
              <div className="inline-flex items-center gap-1.5 text-xs text-purple-400 font-bold px-2.5 py-1 bg-purple-500/10 rounded-full mb-6">
                <TrendingUp size={12} />
                PROVIDER BENEFITS
              </div>
              <h3 className="text-2xl font-bold text-white mb-6">Made for Businesses</h3>
              <ul className="space-y-4">
                {[
                  'Display customized profiles with verified contact details.',
                  'Dedicated product administration features under protected views.',
                  'Dynamic form validates stock counts, images, and prices.',
                  'Track product views and transactions using our RTK Query tags.',
                ].map((benefit, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <ChevronRight className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                    <span className="text-xs text-slate-350 leading-relaxed">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden text-center border-t border-slate-900">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/20 to-purple-950/20" />
        <div className="max-w-4xl mx-auto px-4 relative z-10">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-6">
            Ready to Connect with Your Marketplace?
          </h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto mb-8 leading-relaxed">
            Create an account or login to access client panels. Experience dual token authentication rotation and secure API guards first hand.
          </p>
          <div className="flex justify-center gap-4">
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <span className="text-xs text-slate-400">
                  Logged in as <strong className="text-white">{user?.name}</strong> ({user?.role})
                </span>
                <Link to="/dashboard">
                  <Button size="md">Go to Dashboard</Button>
                </Link>
              </div>
            ) : (
              <Link to="/register">
                <Button size="md">Register Now</Button>
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
