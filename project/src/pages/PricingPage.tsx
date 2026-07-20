import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, ArrowLeft, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { trackPricingClick } from '../hooks/useTracking';

const PricingPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const isLight = searchParams.get('theme') === 'light';
  const { authenticated } = useAuth();

  // Track pricing page visit on mount
  useEffect(() => {
    trackPricingClick('pricing_page_view', '', 'Page Opened');
  }, []);

  const plans = [
    {
      name: 'Free',
      pepper: '/red_chilli.png',
      description: 'Get started with surveys — no credit card needed.',
      price: billing === 'monthly' ? '₹0' : '₹0',
      priceSuffix: '/ forever',
      priceNote: 'Free to start',
      cta: 'Start Free',
      ctaStyle: 'border-2 border-red-500 text-red-500 hover:bg-red-50',
      popular: false,
      features: [
        '2,000 responses / month',
        '70 AI-generated surveys / month',
        'AI editing assistance',
        'Survey widget embed',
        'Pepperwahl branding',
      ],
    },
    {
      name: 'Pro',
      pepper: '/green_chilli.png',
      description: 'For growing teams that need insights and exports.',
      price: billing === 'monthly' ? '₹2,000' : '₹1,600',
      priceSuffix: '/ month',
      priceNote: billing === 'annual' ? 'billed annually' : 'billed monthly',
      cta: 'Upgrade to Pro',
      ctaStyle: 'bg-red-500 text-white hover:bg-red-600',
      popular: true,
      prefix: 'EVERYTHING IN FREE, PLUS:',
      features: [
        '10,000 responses / month',
        '200 AI-generated surveys / month',
        'Download CSV exports',
        'Advanced analytics & AI summary',
        'Priority support',
      ],
    },
    {
      name: 'Enterprise',
      pepper: '/yellow_chilli.png',
      description: 'Custom scale, full control, dedicated support.',
      price: 'Custom',
      priceSuffix: '',
      priceNote: 'tailored to your team',
      cta: 'Contact Sales',
      ctaStyle: 'border-2 border-stone-300 text-stone-700 hover:bg-stone-50',
      popular: false,
      prefix: 'EVERYTHING IN PRO, PLUS:',
      features: [
        'Unlimited responses',
        'Unlimited AI surveys',
        'Remove Pepperwahl branding',
        'Custom domain',
        'Webhooks & API access',
        'Team members & roles',
        'Dedicated account manager',
        'SSO & advanced security',
      ],
    },
  ];

  return (
    <div className={`min-h-screen ${isLight ? 'bg-white text-slate-900' : 'bg-slate-950 text-white'}`}>
      {/* Close button - top right */}
      <div className="max-w-6xl mx-auto px-4 pt-4 flex justify-end">
        <button
          onClick={() => navigate(-1)}
          className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${isLight ? 'text-stone-500 hover:bg-stone-100 hover:text-stone-800' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          title="Close"
        >
          <X size={20} />
        </button>
      </div>

      {/* Header */}
      <div className="text-center pt-16 pb-12 px-4">
        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 ${isLight ? 'bg-stone-100 border border-stone-200' : 'bg-slate-800 border border-slate-700'}`}>
          <img src="/logo.png" alt="" className="w-4 h-4 object-contain" />
          <span className={`text-[11px] font-bold tracking-widest uppercase ${isLight ? 'text-stone-600' : 'text-slate-300'}`}>Simple, Spicy Pricing</span>
        </div>
        <h1 className={`text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-4 ${isLight ? 'text-slate-900' : ''}`} style={{ fontFamily: "'Outfit', sans-serif" }}>
          Pick Your <span className="text-red-500">Pepper</span>
        </h1>
        <p className={`text-sm sm:text-base max-w-md mx-auto ${isLight ? 'text-stone-500' : 'text-slate-400'}`}>
          From solo creators to enterprise teams — every plan is packed with flavor. No hidden costs, no surprises.
        </p>

        {/* Billing toggle */}
        <div className={`flex items-center justify-center gap-1 mt-8 rounded-full p-1 w-fit mx-auto ${isLight ? 'bg-stone-100' : 'bg-slate-800'}`}>
          <button
            onClick={() => setBilling('monthly')}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${billing === 'monthly' ? 'bg-red-500 text-white' : isLight ? 'text-stone-500 hover:text-stone-800' : 'text-slate-400 hover:text-white'}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling('annual')}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${billing === 'annual' ? 'bg-red-500 text-white' : isLight ? 'text-stone-500 hover:text-stone-800' : 'text-slate-400 hover:text-white'}`}
          >
            Annual <span className="text-[10px] bg-green-500 text-white px-1.5 py-0.5 rounded-full font-bold">Save 20%</span>
          </button>
        </div>
      </div>

      {/* Plans */}
      <div className="max-w-6xl mx-auto px-4 pb-20 grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`relative rounded-2xl p-8 flex flex-col transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_60px_rgba(239,68,68,0.15)] ${
              plan.popular
                ? isLight ? 'bg-white border-2 border-red-200 shadow-lg' : 'bg-slate-800 border-2 border-slate-600 ring-1 ring-red-500/20'
                : isLight ? 'bg-white border border-stone-200 shadow-sm hover:border-stone-300' : 'bg-slate-900 border border-slate-800 hover:border-slate-600'
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-full">
                Most Popular
              </div>
            )}

            {/* Pepper image */}
            <div className="w-16 h-16 mb-5">
              <img src={plan.pepper} alt={plan.name} className="w-full h-full object-contain" />
            </div>

            {/* Plan name & description */}
            <h3 className={`text-xl font-bold mb-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>{plan.name}</h3>
            <p className={`text-xs mb-5 ${isLight ? 'text-stone-500' : 'text-slate-400'}`}>{plan.description}</p>

            {/* Price */}
            <div className="mb-1">
              <span className={`text-3xl font-extrabold ${isLight ? 'text-slate-900' : 'text-white'}`}>{plan.price}</span>
              <span className={`text-sm ml-1 ${isLight ? 'text-stone-500' : 'text-slate-400'}`}>{plan.priceSuffix}</span>
            </div>
            <p className={`text-[11px] mb-6 ${isLight ? 'text-stone-400' : 'text-slate-500'}`}>{plan.priceNote}</p>

            {/* CTA */}
            <button
              onClick={() => {
                trackPricingClick('pricing_cta_click', plan.name.toLowerCase(), plan.cta);
                if (plan.name === 'Pro') navigate('/upgrade');
                else if (plan.name === 'Enterprise') window.location.href = 'mailto:business@moustacheleads.com?subject=Pepperwahl Enterprise Plan Inquiry';
                else navigate(authenticated ? '/dashboard' : '/login?mode=signup');
              }}
              className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${plan.ctaStyle}`}
            >
              {plan.cta}
            </button>

            {/* Features */}
            <div className={`mt-6 pt-6 border-t ${isLight ? 'border-stone-100' : 'border-slate-700/50'}`}>
              {plan.prefix && (
                <p className={`text-[10px] font-bold tracking-wider uppercase mb-3 ${isLight ? 'text-stone-400' : 'text-slate-500'}`}>{plan.prefix}</p>
              )}
              {!plan.prefix && (
                <p className={`text-[10px] font-bold tracking-wider uppercase mb-3 ${isLight ? 'text-stone-400' : 'text-slate-500'}`}>What's included:</p>
              )}
              <ul className="space-y-2.5">
                {plan.features.map((f, i) => (
                  <li key={i} className={`flex items-center gap-2.5 text-[13px] ${isLight ? 'text-stone-700' : 'text-slate-300'}`}>
                    <Check size={14} className="text-green-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PricingPage;
