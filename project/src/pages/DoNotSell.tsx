/**
 * Do Not Sell or Share My Personal Information Page
 */
import React, { useState } from 'react';
import { Shield, Check } from 'lucide-react';

const DoNotSell: React.FC = () => {
  const [optedOut, setOptedOut] = useState(() => localStorage.getItem('dns_opted_out') === 'true');
  const [saved, setSaved] = useState(false);

  const handleOptOut = () => {
    localStorage.setItem('dns_opted_out', 'true');
    setOptedOut(true);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleOptIn = () => {
    localStorage.removeItem('dns_opted_out');
    setOptedOut(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <style>{`::-webkit-scrollbar{width:8px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.15);border-radius:4px}`}</style>
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-3xl mx-auto px-6 py-5">
          <span className="text-[11px] font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full uppercase tracking-wider">Privacy</span>
          <h1 className="text-3xl font-bold text-stone-900 mt-2" style={{ fontFamily: "'Outfit','Inter',sans-serif" }}>Do Not Sell or Share My Personal Information</h1>
          <p className="text-sm text-stone-500 mt-1">California Consumer Privacy Act (CCPA) / CPRA Compliance</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-10">

          <div className="flex items-start gap-4 mb-8">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center shrink-0">
              <Shield size={24} className="text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900 mb-2">Your Privacy Rights</h2>
              <p className="text-[14px] text-stone-600 leading-relaxed">Under the California Consumer Privacy Act (CCPA) and California Privacy Rights Act (CPRA), you have the right to opt out of the "sale" or "sharing" of your personal information for cross-context behavioral advertising.</p>
            </div>
          </div>

          <div className="bg-stone-50 border border-stone-200 rounded-xl p-6 mb-8">
            <h3 className="text-base font-semibold text-stone-800 mb-3">What does "selling" or "sharing" mean?</h3>
            <p className="text-[13px] text-stone-600 leading-relaxed mb-3">Pepperwahl does <strong>not sell</strong> your personal information in the traditional sense. However, under the CCPA's broad definition, our use of cookies for interest-based advertising (through Meta Platforms) may qualify as "sharing."</p>
            <p className="text-[13px] text-stone-600 leading-relaxed">When you opt out here, we will:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-[13px] text-stone-600">
              <li>Stop sharing your hashed email with advertising partners</li>
              <li>Disable marketing cookies on your account</li>
              <li>Stop using your data for cross-context behavioral advertising</li>
            </ul>
          </div>

          <div className="bg-white border-2 border-stone-200 rounded-xl p-6 mb-6">
            <h3 className="text-base font-semibold text-stone-800 mb-4">Your Current Status</h3>
            <div className={`p-4 rounded-lg mb-4 ${optedOut ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
              <p className={`text-sm font-medium ${optedOut ? 'text-green-800' : 'text-amber-800'}`}>
                {optedOut ? '✓ You have opted out of the sale/sharing of your personal information.' : 'You have NOT opted out. Your data may be shared for advertising purposes.'}
              </p>
            </div>

            {!optedOut ? (
              <button onClick={handleOptOut} className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors">
                Opt Out — Do Not Sell or Share My Info
              </button>
            ) : (
              <button onClick={handleOptIn} className="w-full py-3 rounded-xl text-sm font-medium text-stone-700 border border-stone-200 hover:bg-stone-50 transition-colors">
                Opt Back In (allow sharing)
              </button>
            )}

            {saved && (
              <div className="flex items-center gap-2 mt-3 text-green-700 text-sm">
                <Check size={16} /> Preference saved successfully.
              </div>
            )}
          </div>

          <div className="text-[13px] text-stone-500 space-y-2">
            <p><strong>Other ways to opt out:</strong></p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Enable Global Privacy Control (GPC) in your browser</li>
              <li>Go to Account Settings &rarr; Privacy &rarr; Ad Data Sharing</li>
              <li>Email us at privacy@pepperwahl.com</li>
            </ul>
            <p className="mt-4">We will not discriminate against you for exercising your privacy rights. For more details, see <a href="/privacy" className="text-red-600 hover:underline">Section 14 of our Privacy Policy</a>.</p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default DoNotSell;
