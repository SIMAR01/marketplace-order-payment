import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, ShoppingBag, FileText, ArrowRight } from 'lucide-react';
import Button from '../components/common/Button';

const CheckoutSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId') || '';
  const paymentIntentId = searchParams.get('payment_intent') || '';

  return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center">
      {/* Icon header */}
      <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-6 border border-emerald-500/20 animate-pulse">
        <CheckCircle2 size={32} className="stroke-[1.5]" />
      </div>

      {/* Message heading */}
      <h1 className="text-3xl font-black bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent leading-tight mb-2">
        Payment Successful!
      </h1>
      <p className="text-sm text-slate-400 max-w-md mx-auto mb-8 leading-relaxed">
        Thank you for your order. Your transaction has been securely captured, and your order is being processed for shipment.
      </p>

      {/* Transaction references metadata */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 text-left space-y-3 mb-10 max-w-md mx-auto backdrop-blur-md">
        {orderId && (
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 font-bold uppercase tracking-wider">Order ID</span>
            <span className="font-mono text-slate-300 select-all">{orderId}</span>
          </div>
        )}
        {paymentIntentId && (
          <div className="flex justify-between items-center text-xs border-t border-slate-850 pt-3">
            <span className="text-slate-500 font-bold uppercase tracking-wider">Transaction ID</span>
            <span className="font-mono text-slate-350 select-all truncate max-w-[200px]" title={paymentIntentId}>
              {paymentIntentId}
            </span>
          </div>
        )}
      </div>

      {/* Navigation action buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-sm mx-auto">
        <Link to="/products" className="w-full">
          <Button className="w-full shadow-lg shadow-indigo-500/10" leftIcon={<ShoppingBag size={16} />}>
            Continue Shopping
          </Button>
        </Link>
        <Link to="/dashboard" className="w-full">
          <Button variant="outline" className="w-full text-slate-300 border-slate-850" rightIcon={<ArrowRight size={14} />}>
            Go to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default CheckoutSuccessPage;
