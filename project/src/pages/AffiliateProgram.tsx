import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Share2, DollarSign, TrendingUp, ArrowRight, Zap, Target, ShieldCheck, Users } from 'lucide-react';
import Header from '../components/Header';

const AffiliateProgram = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F8F9FC] font-['Outfit',sans-serif] overflow-hidden">
      <Header />
      
      {/* Hero Section */}
      <div className="relative pt-20 pb-24 lg:pt-32 lg:pb-32 overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-0 inset-x-0 h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-red-400/20 rounded-full blur-3xl opacity-50 animate-pulse" />
          <div className="absolute top-20 -left-20 w-72 h-72 bg-orange-400/20 rounded-full blur-3xl opacity-50" />
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-full max-w-3xl h-64 bg-amber-400/10 rounded-full blur-3xl opacity-50" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center" style={{ animation: 'sfFadeUp 0.8s ease-out both' }}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-100 text-orange-600 font-bold text-sm mb-6 border border-orange-200">
            <Zap size={16} className="text-orange-500" /> PepperAds Publisher Network
          </div>
          
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-gray-900 tracking-tight leading-tight mb-6">
            Turn Surveys Into <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500 line-clamp-2 pb-2">
              Passive Income.
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-10 font-medium">
            Promote targeted surveys, capture massive audiences, and earn high-tier commissions for every successful conversion. Your bonus increases the more you drive!
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={() => navigate('/signup')}
              className="px-8 py-4 w-full sm:w-auto bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold rounded-2xl shadow-xl shadow-red-500/30 hover:shadow-2xl hover:shadow-red-500/40 hover:-translate-y-1 transition-all flex items-center justify-center gap-2 text-lg"
            >
              Become a Publisher <ArrowRight size={20} />
            </button>
            <button 
              onClick={() => navigate('/')}
              className="px-8 py-4 w-full sm:w-auto bg-white text-gray-700 font-bold rounded-2xl shadow-lg border border-gray-100 hover:bg-gray-50 transition-all flex items-center justify-center gap-2 text-lg"
            >
              Learn More
            </button>
          </div>
        </div>
      </div>

      {/* How it Works Section */}
      <div className="py-20 bg-white relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">How The Machine Works</h2>
            <p className="text-gray-500 font-medium text-lg">Three simple steps to start monetizing your traffic.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-1/2 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-red-100 via-orange-100 to-amber-100 -translate-y-1/2 z-0" />
            
            {/* Step 1 */}
            <div className="relative z-10 bg-white rounded-3xl p-8 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-center group hover:-translate-y-2 transition-all duration-300">
              <div className="w-16 h-16 mx-auto bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Share2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">1. Promote This Survey</h3>
              <p className="text-gray-500 font-medium leading-relaxed">
                Copy your unique affiliate tracking link for high-converting surveys (like Pocket Option or Crypto offers) and share it with your audience.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative z-10 bg-white rounded-3xl p-8 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-center group hover:-translate-y-2 transition-all duration-300">
              <div className="w-16 h-16 mx-auto bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <DollarSign size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">2. Earn Per Sale</h3>
              <p className="text-gray-500 font-medium leading-relaxed">
                When users complete the survey and trigger an offer conversion, you instantly earn a high-tier commission dumped right into your wallet.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative z-10 bg-white rounded-3xl p-8 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-center group hover:-translate-y-2 transition-all duration-300">
              <div className="w-16 h-16 mx-auto bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <TrendingUp size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">3. Scale Your Bonus</h3>
              <p className="text-gray-500 font-medium leading-relaxed">
                The more volume you drive, the higher your conversion multiplier gets! Your bonus percentage increases automatically over time.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Highlights */}
      <div className="py-20 bg-slate-900 text-white relative z-10 overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Why promote with PepperAds?</h2>
              <p className="text-slate-400 text-lg mb-8">We treat our publishers like true partners. With ultra-optimized survey funnels, the conversion rates are significantly higher than raw affiliate links.</p>
              
              <ul className="space-y-6">
                <li className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0 text-red-400">
                    <Target />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold mb-1">Pre-Warmed Leads</h4>
                    <p className="text-slate-400">Surveys pre-qualify and warm up traffic before sending them to the final offer. Conversions skyrocket.</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0 text-orange-400">
                    <ShieldCheck />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold mb-1">Pristine Tracking</h4>
                    <p className="text-slate-400">Our Postback logic and link masking technology ensure every single one of your leads is tracked perfectly.</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0 text-amber-400">
                    <Users />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold mb-1">Dedicated Support</h4>
                    <p className="text-slate-400">Get access to custom creatives, priority payouts, and account managers to help you scale.</p>
                  </div>
                </li>
              </ul>
            </div>
            
            {/* Glass Dashboard Preview */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-red-500 to-orange-500 rounded-[2.5rem] blur-2xl opacity-30 animate-pulse" />
              <div className="relative bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-[2.5rem] p-8 overflow-hidden">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <p className="text-slate-400 text-sm font-semibold tracking-wide uppercase">Your Earnings</p>
                    <h3 className="text-4xl font-extrabold text-white mt-1">$12,458.00</h3>
                  </div>
                  <div className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                    <TrendingUp size={14} /> +32%
                  </div>
                </div>
                
                <div className="space-y-4">
                  {[
                    { offer: 'Pocket Option Trading', conv: 142, payout: '$4,260' },
                    { offer: 'Crypto Elite Masterclass', conv: 89, payout: '$3,115' },
                    { offer: 'Premium VPN Sub', conv: 310, payout: '$2,480' }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-slate-700/30 border border-slate-600/30">
                      <div>
                        <p className="font-bold text-white text-sm">{item.offer}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{item.conv} Conversions</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-orange-400">{item.payout}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">+ Level 3 Bonus</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-8 pt-6 border-t border-slate-700 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center">
                      <Zap size={14} className="text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Tier 3 Publisher</p>
                      <p className="text-[10px] text-slate-400">15% Commission Bonus Active</p>
                    </div>
                  </div>
                  <button className="text-orange-400 text-sm font-bold hover:text-orange-300">Withdraw</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AffiliateProgram;
