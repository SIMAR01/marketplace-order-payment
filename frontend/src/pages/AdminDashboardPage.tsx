import React, { useState } from 'react';
import {
  useGetOrdersQuery,
  useApproveRefundMutation,
  useTriggerCronMutation,
  IOrder,
} from '../api/paymentApi';
import { useAppSelector } from '../hooks/storeHooks';
import { Navigate } from 'react-router-dom';
import {
  Lock,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Briefcase,
  Layers,
  ArrowRight,
  Shield,
  Activity,
} from 'lucide-react';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';

const AdminDashboardPage: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);

  // Gated strictly to ADMIN role
  if (!user || user.role !== 'ADMIN') {
    return <Navigate to="/unauthorized" replace />;
  }

  const { data: orders = [], isLoading, error, refetch } = useGetOrdersQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  const [approveRefund, { isLoading: isRefunding }] = useApproveRefundMutation();
  const [triggerCron, { isLoading: isRunningCron }] = useTriggerCronMutation();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cronResult, setCronResult] = useState<any | null>(null);

  const handleApproveRefund = async (orderId: string) => {
    if (!window.confirm('Are you sure you want to approve this refund? Stripe transaction refund will be executed and items restocked.')) return;
    setErrorMessage(null);
    try {
      await approveRefund(orderId).unwrap();
    } catch (err: any) {
      setErrorMessage(err?.data?.message || err?.message || 'Failed to approve refund');
    }
  };

  const handleTriggerCron = async () => {
    setErrorMessage(null);
    setCronResult(null);
    try {
      const response = await triggerCron().unwrap();
      setCronResult(response);
      refetch();
    } catch (err: any) {
      setErrorMessage(err?.data?.message || err?.message || 'Failed to trigger cron job');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <Spinner size="lg" className="text-indigo-500" />
        <p className="text-sm text-slate-400">Loading admin operations panel...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center bg-slate-950 text-slate-100">
        <div className="w-14 h-14 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-6 border border-red-500/20">
          <AlertTriangle size={24} />
        </div>
        <h2 className="text-xl font-bold mb-2">Error Loading Admin Data</h2>
        <p className="text-slate-400 mb-6 text-sm">Failed to retrieve escrow system details.</p>
      </div>
    );
  }

  // Calculate Escrow Financial Metrics (in Dollars)
  const totalProcessed = orders.reduce((sum: number, o: IOrder) => {
    if (o.paymentStatus === 'PAID' || o.status === 'COMPLETED') {
      const customerTotal = o.financials.grossAmount + 5.0 + o.financials.grossAmount * 0.03;
      return sum + customerTotal;
    }
    return sum;
  }, 0);

  const totalHeldEscrow = orders.reduce((sum: number, o: IOrder) => {
    return o.payoutStatus === 'HELD_IN_ESCROW' && o.paymentStatus === 'PAID' ? sum + o.financials.netPayout : sum;
  }, 0);

  const totalPlatformFees = orders.reduce((sum: number, o: IOrder) => {
    return o.payoutStatus === 'TRANSFERRED' ? sum + o.financials.platformFee : sum;
  }, 0);

  const pendingRefundRequests = orders.filter((o: IOrder) => o.status === 'CANCEL_REQUESTED');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-900 pb-6 mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent flex items-center gap-2">
            <Shield className="text-indigo-500" /> Admin Escrow & Refund Control
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Oversee single-vendor checkout financials, trigger automated cron escrow releases, and authorize customer refunds.
          </p>
        </div>

        {/* Cron Simulation Trigger Button */}
        <Button
          onClick={handleTriggerCron}
          disabled={isRunningCron}
          className="shadow-md shadow-indigo-600/10 font-bold animate-pulse hover:animate-none"
          leftIcon={isRunningCron ? <Spinner size="sm" /> : <Activity size={16} />}
        >
          {isRunningCron ? 'Running Cron Simulation...' : 'Trigger Payout Release Cron'}
        </Button>
      </div>

      {errorMessage && (
        <div className="bg-red-500/5 border border-red-500/20 text-red-400 p-4 rounded-lg text-xs flex gap-2 mb-6">
          <AlertTriangle size={16} className="shrink-0 text-red-500" />
          <span>{errorMessage}</span>
        </div>
      )}

      {cronResult && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 p-4 rounded-lg text-xs flex flex-col gap-2 mb-6 font-mono">
          <div className="flex gap-1 items-center font-bold">
            <CheckCircle size={16} /> Cron Completed Successfully
          </div>
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div>• Payouts Processed: {cronResult.processed}</div>
            <div>• Eligible Scanned: {cronResult.eligibleTotal}</div>
            {cronResult.failures?.length > 0 && (
              <div className="col-span-2 text-rose-400">
                • Failed Transfers: {cronResult.failures.length} (inspect logs)
              </div>
            )}
          </div>
        </div>
      )}

      {/* Financial Metrics Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-xl backdrop-blur-sm">
          <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest font-mono">Total Sales Volume</span>
          <div className="text-2xl font-black text-white mt-1.5 font-mono">${totalProcessed.toFixed(2)}</div>
          <span className="text-[10px] text-slate-400 mt-2 block">Excludes cancelled & pending</span>
        </div>

        <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-xl backdrop-blur-sm">
          <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest font-mono">Escrow Held Balance</span>
          <div className="text-2xl font-black text-amber-400 mt-1.5 font-mono">${totalHeldEscrow.toFixed(2)}</div>
          <span className="text-[10px] text-slate-400 mt-2 block flex items-center gap-1">
            <Clock size={10} className="text-amber-500" /> Held pending delivery
          </span>
        </div>

        <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-xl backdrop-blur-sm">
          <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest font-mono">Platform Commissions</span>
          <div className="text-2xl font-black text-emerald-400 mt-1.5 font-mono">${totalPlatformFees.toFixed(2)}</div>
          <span className="text-[10px] text-slate-400 mt-2 block">10% from completed payouts</span>
        </div>

        <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-xl backdrop-blur-sm">
          <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest font-mono">Refund Queue</span>
          <div className="text-2xl font-black text-rose-500 mt-1.5 font-mono">{pendingRefundRequests.length}</div>
          <span className="text-[10px] text-slate-400 mt-2 block">Awaiting admin review</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 gap-8">
        {/* Refund requests table */}
        <div className="bg-slate-900/40 border border-slate-900 rounded-xl overflow-hidden backdrop-blur-sm p-6">
          <h2 className="text-lg font-bold text-white mb-6 border-b border-slate-800 pb-3 flex items-center gap-2">
            <AlertTriangle size={18} className="text-rose-500" /> Cancellation & Refund Requests
          </h2>

          {pendingRefundRequests.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              <CheckCircle size={36} className="text-slate-700 mx-auto mb-3" />
              <span>No pending cancellation refund requests.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 font-extrabold font-mono uppercase tracking-wider">
                    <th className="py-3 px-4">Order Details</th>
                    <th className="py-3 px-4">Customer Details</th>
                    <th className="py-3 px-4">Merchant Account</th>
                    <th className="py-3 px-4 text-right">Customer Paid</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {pendingRefundRequests?.map((order: IOrder) => {
                    const customerTotal = order.financials.grossAmount + 5.0 + order.financials.grossAmount * 0.03;
                    return (
                      <tr key={order._id} className="hover:bg-slate-950/20 transition-colors">
                        {/* Order info */}
                        <td className="py-4 px-4">
                          <div className="font-semibold text-slate-200">No: {order.orderNumber}</div>
                          <div className="text-[10px] text-slate-400 mt-1 max-w-xs truncate">
                            {order.items?.map((i: any) => `${i.title} (x${i.quantity})`).join(', ') || ''}
                          </div>
                          {order.cancelReason && (
                            <div className="text-[10px] text-amber-500 mt-1">Reason: "{order.cancelReason}"</div>
                          )}
                        </td>

                        {/* Customer */}
                        <td className="py-4 px-4 font-mono text-slate-350 text-[11px]">
                          <div>User: {(order.customer as any)?.name || 'N/A'}</div>
                          <div>Date: {new Date(order.createdAt).toLocaleDateString()}</div>
                        </td>

                        {/* Provider */}
                        <td className="py-4 px-4">
                          <div className="font-semibold text-slate-350">
                            {order.provider?.businessName || order.provider?.name || 'Seller'}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            Connect ID: {order.provider?.stripeAccountId || 'N/A'}
                          </div>
                        </td>

                        {/* Paid Amount */}
                        <td className="py-4 px-4 text-right font-mono font-bold text-rose-400">
                          ${customerTotal.toFixed(2)}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 text-center">
                          <Button
                            size="sm"
                            variant="default"
                            className="bg-rose-600 hover:bg-rose-500 text-white border-none py-1.5 shadow-md shadow-rose-600/10"
                            disabled={isRefunding}
                            onClick={() => handleApproveRefund(order._id)}
                          >
                            Approve Refund
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
