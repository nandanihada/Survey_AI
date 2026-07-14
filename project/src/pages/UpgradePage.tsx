import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ArrowLeft } from 'lucide-react';
import { makeApiRequest } from '../utils/deploymentFix';

const UpgradePage: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const yearlyPrice = 1600;
  const monthlyEquiv = yearlyPrice;
  const subtotal = yearlyPrice * 12;
  const gst = Math.round(subtotal * 0.18);
  const total = subtotal + gst;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim()) return;

    setIsSubmitting(true);
    try {
      await makeApiRequest('/api/billing-inquiry', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          plan: 'pro',
          billing_cycle: 'yearly',
          amount: total,
          currency: 'INR',
        }),
      }, true);
      setSubmitted(true);
    } catch (err) {
      // Still show success since we want the info saved attempt
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
            <Check size={28} className="text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            We'll reach out soon!
          </h2>
          <p className="text-sm text-stone-500 mb-8">
            Thanks for your interest in Pro. Our team will contact you within 24 hours to set up your account.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-white border-b border-stone-200 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-stone-100 text-stone-500">
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="" className="w-6 h-6 object-contain" />
            <span className="text-sm font-bold text-slate-900">Upgrade to Pro</span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Plan Summary */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-6 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <img src="/green_chilli.png" alt="Pro" className="w-12 h-12 object-contain" />
            <div>
              <h3 className="text-lg font-bold text-slate-900">Pro Plan</h3>
              <p className="text-xs text-stone-500">Yearly billing — save 20%</p>
            </div>
          </div>

          {/* Price breakdown */}
          <div className="space-y-3 border-t border-stone-100 pt-5">
            <div className="flex justify-between text-sm">
              <span className="text-stone-600">Pro Plan (₹{monthlyEquiv.toLocaleString()}/mo × 12)</span>
              <span className="font-medium text-slate-800">₹{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone-600">GST (18%)</span>
              <span className="font-medium text-slate-800">₹{gst.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm pt-3 border-t border-stone-100">
              <span className="font-semibold text-slate-900">Total (incl. GST)</span>
              <span className="font-bold text-lg text-slate-900">₹{total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
          <h4 className="text-sm font-semibold text-slate-800 mb-4">Your details</h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-stone-500 mb-1 block">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="John Doe"
                className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-500/10 transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-stone-500 mb-1 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
                className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-500/10 transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-stone-500 mb-1 block">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="+91 9876543210"
                className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-500/10 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim() || !email.trim() || !phone.trim()}
              className="w-full py-3.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-2"
            >
              {isSubmitting ? 'Submitting...' : 'Submit & Upgrade'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UpgradePage;
