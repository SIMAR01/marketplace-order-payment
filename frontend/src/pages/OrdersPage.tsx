import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useGetOrdersQuery,
  useRequestCancellationMutation,
  useUpdateOrderStatusMutation,
  useReleasePayoutMutation,
  IOrder,
} from '../api/paymentApi';
import { useAppSelector } from '../hooks/storeHooks';
import {
  ShoppingBag,
  Clock,
  CheckCircle,
  Truck,
  AlertTriangle,
  Package,
  Calendar,
  DollarSign,
  User,
} from 'lucide-react';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';

const OrdersPage: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const isCustomer = user?.role === 'CUSTOMER';
  const isProvider = user?.role === 'PROVIDER';

  const { data: orders = [], isLoading, error, refetch } = useGetOrdersQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  const [requestCancellation, { isLoading: isCancelling }] = useRequestCancellationMutation();
  const [updateStatus, { isLoading: isUpdating }] = useUpdateOrderStatusMutation();
  const [releasePayout, { isLoading: isReleasing }] = useReleasePayoutMutation();

  const [actionError, setActionError] = useState<string | null>(null);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PLACED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-500/10 text-green-400 border border-green-500/20">Order Placed</span>;
      case 'PACKED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">Packed</span>;
      case 'SHIPPED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1"><Truck size={12} /> Shipped</span>;
      case 'DELIVERED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Delivered</span>;
      case 'CANCEL_REQUESTED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">Cancel Requested</span>;
      case 'CANCELLED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">Cancelled</span>;
      case 'COMPLETED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-500/15 text-slate-300 border border-slate-700/50 flex items-center gap-1"><CheckCircle size={12} className="text-emerald-400" /> Completed</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-500/10 text-slate-450">{status}</span>;
    }
  };

  const getPayoutStatusBadge = (status: string) => {
    switch (status) {
      case 'HELD_IN_ESCROW':
        return <span className="text-[10px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded border border-slate-800">Held in Escrow</span>;
      case 'TRANSFERRED':
        return <span className="text-[10px] bg-green-500/10 text-green-400 px-2 py-0.5 rounded border border-green-500/15 font-semibold">Released to Connect</span>;
      case 'CANCELLED':
        return <span className="text-[10px] bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded border border-rose-500/15">Refunded</span>;
      default:
        return <span className="text-[10px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded">{status}</span>;
    }
  };

  const handleCancelRequest = async (orderId: string) => {
    if (!window.confirm('Are you sure you want to request cancellation for this order?')) return;
    setActionError(null);
    try {
      await requestCancellation({ orderId }).unwrap();
    } catch (err: any) {
      setActionError(err?.data?.message || err?.message || 'Failed to request cancellation');
    }
  };

  const handleReleasePayout = async (orderId: string) => {
    if (!window.confirm('Are you sure you want to confirm delivery receipt? This will release funds in escrow to the merchant.')) return;
    setActionError(null);
    try {
      await releasePayout(orderId).unwrap();
    } catch (err: any) {
      setActionError(err?.data?.message || err?.message || 'Failed to release escrow payout');
    }
  };

  const handleUpdateStatus = async (orderId: string, status: string) => {
    setActionError(null);
    try {
      await updateStatus({ orderId, status }).unwrap();
    } catch (err: any) {
      setActionError(err?.data?.message || err?.message || 'Failed to update order status');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <Spinner size="lg" className="text-indigo-500" />
        <p className="text-sm text-slate-400">Loading your orders list...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center bg-slate-950 text-slate-100">
        <div className="w-14 h-14 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-6 border border-red-500/20">
          <AlertTriangle size={24} />
        </div>
        <h2 className="text-xl font-bold mb-2">Error Loading Orders</h2>
        <p className="text-slate-400 mb-6 text-sm">Failed to retrieve your order documents.</p>
        <Link to="/">
          <Button variant="outline">Back to Home</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen bg-slate-950 text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-900 pb-6 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent flex items-center gap-2">
            <ShoppingBag className="text-indigo-500" /> {isCustomer ? 'My Purchases' : 'Merchant Packages Orders'}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {isCustomer
              ? 'Track single-vendor orders, manage delivery receipts, and authorize escrow transfers.'
              : 'Fulfill customer packages, update transit status, and view pending Connect escrow payouts.'
            }
          </p>
        </div>
      </div>

      {actionError && (
        <div className="bg-red-500/5 border border-red-500/20 text-red-400 p-4 rounded-lg text-xs flex gap-2 mb-6">
          <AlertTriangle size={16} className="shrink-0 text-red-500" />
          <span>{actionError}</span>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="bg-slate-900/20 border border-slate-800 border-dashed rounded-xl p-12 text-center">
          <ShoppingBag size={48} className="text-slate-700 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">No Orders Found</h3>
          <p className="text-sm text-slate-500 mb-6">You have no order records in this account role.</p>
          {isCustomer && (
            <Link to="/products">
              <Button>Browse Products</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {orders?.map((order: IOrder) => {
            const dateStr = new Date(order.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' });
            
            // Calculate Customer Total Charge
            const customerTotal = order.financials.grossAmount + 5.0 + order.financials.grossAmount * 0.03;

            return (
              <div key={order._id} className="bg-slate-900/40 border border-slate-900 rounded-xl overflow-hidden backdrop-blur-sm">
                
                {/* Order Top Summary Ribbon */}
                <div className="bg-slate-950/80 px-6 py-4 border-b border-slate-900 flex flex-wrap gap-4 items-center justify-between">
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
                    <div>
                      <span className="text-slate-500 block">ORDER NUMBER</span>
                      <span className="font-mono text-indigo-400 font-semibold">{order.orderNumber}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">DATE ORDERED</span>
                      <span className="text-slate-205 font-semibold flex items-center gap-1">
                        <Calendar size={12} className="text-indigo-400" /> {dateStr}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">DELIVERY ADDRESS</span>
                      <span className="text-slate-205 font-semibold">
                        {order.shippingAddress.street}, {order.shippingAddress.city}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <span className="text-slate-500 block text-xs">TOTAL CHARGED</span>
                    <span className="text-sm font-black text-indigo-400 font-mono">
                      ${customerTotal.toFixed(2)} USD
                    </span>
                  </div>
                </div>

                {/* Main Order Details Body */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                  
                  {/* Left Column: Product lists & merchant labels */}
                  <div className="md:col-span-6 space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs bg-slate-950 px-2 py-0.5 border border-slate-850 rounded font-semibold text-slate-350 flex items-center gap-1">
                        <User size={10} />
                        {isCustomer 
                          ? `Vendor: ${order.provider?.businessName || order.provider?.name || 'Seller'}` 
                          : `Buyer: ${(order.customer as any)?.name || 'Client'}`
                        }
                      </span>
                      {getStatusBadge(order.status)}
                      {getPayoutStatusBadge(order.payoutStatus)}
                    </div>

                    <div className="space-y-2">
                      {order.items?.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-slate-950/20 p-2.5 rounded border border-slate-900 text-xs">
                          <div className="flex items-center gap-2">
                            {item.imageUrl && (
                              <img src={item.imageUrl} alt={item.title} className="w-8 h-8 rounded object-cover bg-slate-900 border border-slate-800" />
                            )}
                            <span className="text-slate-200 font-semibold">
                              {item.title} <span className="text-slate-500 font-normal">x{item.quantity}</span>
                            </span>
                          </div>
                          <span className="font-mono text-slate-400 font-semibold">${(item.unitPrice / 100).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Middle Column: Financial Breakdown (Conditional display for Customer vs. Provider) */}
                  <div className="md:col-span-3 text-xs space-y-1.5 bg-slate-950/30 border border-slate-900 p-4 rounded-lg font-mono">
                    {isCustomer ? (
                      <>
                        <h4 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5 border-b border-slate-850 pb-1">Receipt Summary</h4>
                        <div className="flex justify-between text-slate-500">
                          <span>Items Subtotal:</span>
                          <span>${order.financials.grossAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Shipping Fee:</span>
                          <span>$5.00</span>
                        </div>
                        <div className="flex justify-between text-slate-550">
                          <span>Estimated Tax (3%):</span>
                          <span>${(order.financials.grossAmount * 0.03).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-indigo-400 border-t border-slate-850 pt-1.5 mt-2">
                          <span>Total Paid:</span>
                          <span>${(order.financials.grossAmount + 5.0 + order.financials.grossAmount * 0.03).toFixed(2)}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <h4 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5 border-b border-slate-850 pb-1">Escrow Calculations</h4>
                        <div className="flex justify-between text-slate-500">
                          <span>Gross subtotal:</span>
                          <span>${order.financials.grossAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-slate-550">
                          <span>Marketplace Fee (10%):</span>
                          <span>-${order.financials.platformFee.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-slate-550">
                          <span>Stripe Fee Deduction:</span>
                          <span>-${order.financials.stripeFee.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-indigo-400 border-t border-slate-850 pt-1.5 mt-2">
                          <span>Net Vendor Payout:</span>
                          <span>${order.financials.netPayout.toFixed(2)}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Right Column: Actions Control */}
                  <div className="md:col-span-3 flex flex-col gap-2 h-full justify-center">
                    <h4 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1 font-mono">Fulfillment Actions</h4>

                    {/* CUSTOMER CONTROLS */}
                    {isCustomer && (
                      <>
                        {order.status === 'DELIVERED' && order.payoutStatus === 'HELD_IN_ESCROW' && (
                          <Button
                            size="sm"
                            className="shadow-md shadow-emerald-500/10 py-2.5 font-bold"
                            disabled={isReleasing}
                            onClick={() => handleReleasePayout(order._id)}
                          >
                            Confirm Order Received
                          </Button>
                        )}

                        {['PLACED', 'PACKED', 'SHIPPED'].includes(order.status) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-400 border-red-500/20 hover:bg-red-500/10 py-2"
                            disabled={isCancelling}
                            onClick={() => handleCancelRequest(order._id)}
                          >
                            Request Cancellation
                          </Button>
                        )}
                      </>
                    )}

                    {/* PROVIDER CONTROLS */}
                    {isProvider && (
                      <>
                        {order.status === 'PLACED' && (
                          <Button
                            size="sm"
                            disabled={isUpdating}
                            onClick={() => handleUpdateStatus(order._id, 'PACKED')}
                          >
                            Simulate Pack Package
                          </Button>
                        )}
                        
                        {order.status === 'PACKED' && (
                          <Button
                            size="sm"
                            disabled={isUpdating}
                            onClick={() => handleUpdateStatus(order._id, 'SHIPPED')}
                          >
                            Simulate Ship Package
                          </Button>
                        )}

                        {order.status === 'SHIPPED' && (
                          <Button
                            size="sm"
                            disabled={isUpdating}
                            onClick={() => handleUpdateStatus(order._id, 'DELIVERED')}
                          >
                            Simulate Deliver Package
                          </Button>
                        )}
                      </>
                    )}

                    {/* Status Explanations / Static states messages */}
                    {order.status === 'DELIVERED' && isProvider && (
                      <div className="bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 p-2.5 rounded-lg text-[10px] leading-normal flex gap-1 items-start font-sans">
                        <Clock size={12} className="shrink-0 mt-0.5" />
                        <span>Escrow held. Payout is awaiting customer receipt confirmation or 5-hour cron release fallback.</span>
                      </div>
                    )}

                    {order.status === 'CANCEL_REQUESTED' && (
                      <div className="bg-amber-500/5 border border-amber-500/10 text-amber-500 p-2.5 rounded-lg text-[10px] leading-normal flex gap-1 items-start font-sans">
                        <Clock size={12} className="shrink-0 mt-0.5" />
                        <span>Cancellation requested. Funds are locked in escrow awaiting Admin refund approval.</span>
                      </div>
                    )}

                    {order.status === 'CANCELLED' && (
                      <div className="bg-red-500/5 border border-red-500/10 text-rose-400 p-2.5 rounded-lg text-[10px] font-semibold font-sans">
                        Order cancelled. {order.cancelReason ? `Reason: ${order.cancelReason}` : 'Refund completed.'}
                      </div>
                    )}

                    {order.status === 'COMPLETED' && (
                      <div className="bg-slate-905 border border-slate-850 p-2.5 rounded-lg text-[10px] flex flex-col gap-1 text-slate-400 font-mono leading-relaxed">
                        <div className="flex gap-1 items-center text-green-400 font-semibold">
                          <CheckCircle size={12} /> Payout Released
                        </div>
                        {order.stripeTransferId && (
                          <span className="truncate">Stripe Tx: {order.stripeTransferId}</span>
                        )}
                        {order.completedAt && (
                          <span>Transferred: {new Date(order.completedAt).toLocaleString()}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
