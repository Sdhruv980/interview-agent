import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

const CREDIT_PACKAGES = [
  { credits: 5,  price: 50,  label: 'Starter', desc: '5 Full AI Interviews' },
  { credits: 10, price: 100, label: 'Basic', popular: true, desc: '10 Full AI Interviews (Best Value)' },
  { credits: 25, price: 225, label: 'Pro', desc: '25 Full AI Interviews (10% Off)' },
  { credits: 50, price: 400, label: 'Premium', desc: '50 Full AI Interviews (20% Off)' },
];

export default function BuyCredits() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const [selectedPackage, setSelectedPackage] = useState(CREDIT_PACKAGES[1]); // default: Basic
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/payments/history');
      if (res.data.success) {
        setHistory(res.data.data);
      }
    } catch (err) {
      console.warn('Could not load payment history:', err.message);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handlePurchase = async () => {
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      // Step 1: Create Razorpay order on backend
      const { data: orderData } = await api.post('/payments/create-order', {
        credits: selectedPackage.credits,
      });

      const { orderId, amount, currency, key } = orderData;

      // Step 2: Open Razorpay checkout modal
      const options = {
        key: key || 'rzp_test_placeholder',
        amount,
        currency: currency || 'INR',
        name: 'Interview Agent AI',
        description: `Top up ${selectedPackage.credits} Interview Credits`,
        order_id: orderId,
        handler: async (response) => {
          // Step 3: Verify payment signature server-side
          try {
            const verifyRes = await api.post('/payments/verify', {
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              credits:             selectedPackage.credits,
            });

            if (verifyRes.data.success) {
              const meRes = await api.get('/auth/me');
              setUser(meRes.data.user);
              setSuccessMsg(`🎉 Payment successful! ${selectedPackage.credits} credits added to your account.`);
              fetchHistory();
            }
          } catch (err) {
            setError('Payment verification failed: ' + (err.response?.data?.message || err.message));
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name:  user?.name || '',
          email: user?.email || '',
        },
        theme: {
          color: '#10B981', // Emerald 500
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
      };

      if (!window.Razorpay) {
        throw new Error('Razorpay SDK failed to load. Please check your internet connection.');
      }

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 py-10 space-y-10">
        {/* Header and Current Balance */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="space-y-2 text-center md:text-left">
            <span className="text-xs uppercase font-bold tracking-widest text-emerald-400">
              Credit Top-Up System
            </span>
            <h1 className="text-3xl font-extrabold text-white">Buy Interview Credits</h1>
            <p className="text-sm text-slate-400 max-w-lg">
              1 credit = 1 complete AI-powered Technical or HR interview session with speech synthesis, live timer, and 4-metric rubric feedback.
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 text-center min-w-[170px] shadow-inner">
            <span className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Your Balance</span>
            <div className="text-4xl font-black text-emerald-400 mt-1">
              {user?.credits ?? 0}
              <span className="text-xs font-semibold text-slate-400 block mt-0.5">Credits Available</span>
            </div>
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div role="alert" className="bg-rose-950/70 border border-rose-800 text-rose-300 rounded-2xl p-4 text-sm flex items-center gap-3">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div role="alert" className="bg-emerald-950/70 border border-emerald-800 text-emerald-300 rounded-2xl p-4 text-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span>✅</span>
              <span>{successMsg}</span>
            </div>
            <Link to="/dashboard" className="text-xs underline font-bold hover:text-white">
              Go to Dashboard →
            </Link>
          </div>
        )}

        {/* Credit packages grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {CREDIT_PACKAGES.map((pkg) => {
            const isSelected = selectedPackage.credits === pkg.credits;
            return (
              <button
                key={pkg.credits}
                type="button"
                onClick={() => setSelectedPackage(pkg)}
                className={`relative bg-slate-900 rounded-3xl p-6 border-2 transition-all text-left flex flex-col justify-between space-y-4 shadow-xl ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-950/10 shadow-emerald-950/50 scale-[1.02]'
                    : 'border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
                }`}
              >
                {pkg.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-slate-950 font-black text-[11px] uppercase tracking-wider px-3 py-0.5 rounded-full shadow-md">
                    Most Popular
                  </span>
                )}

                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{pkg.label}</span>
                  <div className="text-4xl font-extrabold text-white">
                    {pkg.credits}
                    <span className="text-slate-500 text-sm font-normal ml-1.5">credits</span>
                  </div>
                  <p className="text-xs text-slate-400">{pkg.desc}</p>
                </div>

                <div className="pt-4 border-t border-slate-800/80 w-full flex items-baseline justify-between">
                  <span className="text-2xl font-black text-emerald-400">₹{pkg.price}</span>
                  <span className="text-[11px] text-slate-500">₹{(pkg.price / pkg.credits).toFixed(0)} / credit</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Checkout Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-xl mx-auto space-y-6 shadow-2xl">
          <h3 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-3">
            Order Summary
          </h3>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-slate-400">
              <span>Selected Tier:</span>
              <span className="font-semibold text-white">{selectedPackage.label} Package</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Credits to Add:</span>
              <span className="font-semibold text-emerald-400">+{selectedPackage.credits} Credits</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Payment Gateway:</span>
              <span className="font-semibold text-white">Razorpay (UPI / Cards / NetBanking)</span>
            </div>
            <div className="flex justify-between pt-3 border-t border-slate-800 text-base font-bold">
              <span className="text-white">Total Amount:</span>
              <span className="text-2xl font-black text-emerald-400">₹{selectedPackage.price}</span>
            </div>
          </div>

          <button
            onClick={handlePurchase}
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed rounded-2xl py-4 font-bold text-white transition-all shadow-xl shadow-emerald-950/50 text-base flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Spinner /> Launching Razorpay…
              </span>
            ) : (
              `Pay ₹${selectedPackage.price} with Razorpay`
            )}
          </button>

          <div className="flex items-center justify-center gap-2 text-xs text-slate-500 text-center">
            <span>🔒</span>
            <span>256-bit encrypted checkout with instant credit top-up.</span>
          </div>
        </div>

        {/* Payment History Section */}
        <div className="space-y-4 pt-6">
          <h2 className="text-xl font-bold text-slate-200 flex items-center gap-2">
            <span>🧾</span> Top-Up & Payment History
          </h2>

          {loadingHistory ? (
            <p className="text-xs text-slate-500">Loading purchase history…</p>
          ) : history.length === 0 ? (
            <div className="bg-slate-900/60 rounded-2xl p-6 border border-slate-800 text-center text-slate-400 text-sm">
              No previous transactions found. Your top-ups will appear here with instant receipts.
            </div>
          ) : (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950/80 text-xs uppercase text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Credits Added</th>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Order / Payment ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {history.map((tx) => (
                      <tr key={tx._id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-6 py-4 text-xs text-slate-400">
                          {new Date(tx.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                        </td>
                        <td className="px-6 py-4 font-bold text-emerald-400">
                          +{tx.credits} Credits
                        </td>
                        <td className="px-6 py-4 font-semibold text-white">
                          ₹{tx.amount}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full capitalize font-medium ${
                              tx.status === 'captured'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {tx.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-400">
                          {tx.paymentId || tx.orderId}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-5 w-5 text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}
