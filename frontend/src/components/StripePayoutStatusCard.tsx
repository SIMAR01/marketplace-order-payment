import React, { useState } from 'react';
import {
  useGetStripeStatusQuery,
  useCreateOnboardingLinkMutation,
  useCreateLoginLinkMutation,
} from '../api/stripeConnectApi';
import { AlertTriangle, CheckCircle2, ShieldAlert, CreditCard, ExternalLink } from 'lucide-react';
import Button from './common/Button';
import Spinner from './common/Spinner';

const StripePayoutStatusCard: React.FC = () => {
  const { data: stripeStatus, isLoading, error } = useGetStripeStatusQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  const [createOnboardingLink, { isLoading: isLinking }] = useCreateOnboardingLinkMutation();
  const [createLoginLink, { isLoading: isLoggingIn }] = useCreateLoginLinkMutation();
  const [localError, setLocalError] = useState<string | null>(null);

  const handleOnboarding = async () => {
    setLocalError(null);
    try {
      const response = await createOnboardingLink().unwrap();
      if (response?.url) {
        window.location.href = response.url;
      }
    } catch (err: any) {
      setLocalError(err?.data?.message || 'Failed to initialize Stripe Connect onboarding.');
    }
  };

  const handleDashboardRedirect = async () => {
    setLocalError(null);
    try {
      const response = await createLoginLink().unwrap();
      if (response?.url) {
        window.location.href = response.url;
      }
    } catch (err: any) {
      setLocalError(err?.data?.message || 'Failed to generate Stripe Dashboard login link.');
    }
  };

  if (isLoading) {
    return (
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 animate-pulse flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full">
          <div className="w-10 h-10 bg-slate-800 rounded-full shrink-0" />
          <div className="space-y-2 w-full">
            <div className="h-4 bg-slate-800 rounded w-1/3" />
            <div className="h-3 bg-slate-800 rounded w-2/3" />
          </div>
        </div>
        <div className="w-full sm:w-32 h-10 bg-slate-800 rounded-lg shrink-0" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/5 border border-red-500/10 text-red-400 p-4 rounded-xl text-xs flex gap-2.5 items-center">
        <ShieldAlert size={16} className="text-red-500" />
        <span>Failed to retrieve Stripe Connect status. Please verify your connection.</span>
      </div>
    );
  }

  const isConnected = stripeStatus?.isConnected || false;
  const isStripeReady = stripeStatus?.isStripeReady || false;
  const detailsSubmitted = stripeStatus?.detailsSubmitted || false;

  return (
    <div className="space-y-3">
      {/* 1. NOT CONNECTED STATE */}
      {!isConnected && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md backdrop-blur-sm">
          <div className="flex gap-3">
            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg shrink-0 h-fit border border-amber-500/10">
              <AlertTriangle size={20} className="animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Stripe Payouts Setup Required</h4>
              <p className="text-xs text-slate-450 mt-1 leading-normal">
                To list items for sale and receive payouts from customers, you must configure your Stripe Connected merchant account.
              </p>
            </div>
          </div>
          <Button
            onClick={handleOnboarding}
            disabled={isLinking}
            size="sm"
            className="w-full md:w-auto shrink-0 shadow-lg shadow-indigo-500/10"
            leftIcon={isLinking ? <Spinner size="sm" /> : <CreditCard size={14} />}
          >
            {isLinking ? 'Redirecting...' : 'Setup Stripe Payouts'}
          </Button>
        </div>
      )}

      {/* 2. CONNECTED BUT INCOMPLETE ONBOARDING STATE */}
      {isConnected && !isStripeReady && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md backdrop-blur-sm">
          <div className="flex gap-3">
            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg shrink-0 h-fit border border-amber-500/10">
              <AlertTriangle size={20} className="animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Payout Onboarding Incomplete</h4>
              <p className="text-xs text-slate-450 mt-1 leading-normal">
                Your Stripe Connect payouts details are pending or restricted. Resume the setup process to verify details with Stripe.
              </p>
            </div>
          </div>
          <Button
            onClick={handleOnboarding}
            disabled={isLinking}
            size="sm"
            className="w-full md:w-auto shrink-0 shadow-lg shadow-indigo-500/10 animate-bounce"
            leftIcon={isLinking ? <Spinner size="sm" /> : <CreditCard size={14} />}
          >
            {isLinking ? 'Redirecting...' : 'Resume Stripe Onboarding'}
          </Button>
        </div>
      )}

      {/* 3. ACTIVE CONNECTED PORTAL STATE */}
      {isConnected && isStripeReady && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md backdrop-blur-sm">
          <div className="flex gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg shrink-0 h-fit border border-emerald-500/10">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Payouts Active (Stripe Connected)</h4>
              <p className="text-xs text-slate-450 mt-1 leading-normal">
                Your Stripe payouts account is fully verified. You can list items, update inventory, and manage payouts in your dashboard.
              </p>
            </div>
          </div>
          <Button
            onClick={handleDashboardRedirect}
            disabled={isLoggingIn}
            size="sm"
            variant="outline"
            className="w-full md:w-auto shrink-0 border-emerald-500/20 text-emerald-400 hover:text-white hover:bg-emerald-500/10"
            leftIcon={isLoggingIn ? <Spinner size="sm" /> : <ExternalLink size={14} />}
          >
            {isLoggingIn ? 'Redirecting...' : 'Manage Stripe Payouts'}
          </Button>
        </div>
      )}

      {localError && (
        <div className="bg-red-500/5 border border-red-500/20 text-red-400 p-4 rounded-lg text-xs flex gap-2">
          <ShieldAlert size={16} className="shrink-0 text-red-500" />
          <span>{localError}</span>
        </div>
      )}
    </div>
  );
};

export default StripePayoutStatusCard;
