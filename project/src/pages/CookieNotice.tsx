/**
 * Cookie Notice Page - Legal document with sidebar navigation
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const sections = [
  { id: 'what-are', title: '1. What Are Cookies?', group: 'GENERAL' },
  { id: 'who-places', title: '2. Who Places Cookies?', group: 'GENERAL' },
  { id: 'cookies-we-use', title: '3. Cookies We Use', group: 'COOKIES' },
  { id: 'survey-pages', title: '4. Cookies on Survey Pages', group: 'COOKIES' },
  { id: 'third-party', title: '5. Third-Party Cookies', group: 'COOKIES' },
  { id: 'manage', title: '6. How to Manage Cookies', group: 'CONTROL' },
  { id: 'email-tracking', title: '7. Email Tracking', group: 'CONTROL' },
  { id: 'do-not-sell', title: '8. Do Not Sell or Share', group: 'CONTROL' },
  { id: 'updates', title: '9. Updates to This Notice', group: 'OTHER' },
  { id: 'contact', title: '10. Contact Us', group: 'OTHER' },
];

const CookieNotice: React.FC = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('what-are');

  useEffect(() => {
    const handleScroll = () => {
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i].id);
        if (el && el.getBoundingClientRect().top <= 140) {
          setActiveSection(sections[i].id);
          break;
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const groups = [...new Set(sections.map(s => s.group))];

  return (
    <div className="min-h-screen bg-stone-50">
      <style>{`
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.25); }
      `}</style>

      <div className="bg-white border-b border-stone-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <span className="text-[11px] font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full uppercase tracking-wider">Legal</span>
          <h1 className="text-3xl font-bold text-stone-900 mt-2" style={{ fontFamily: "'Outfit', 'Inter', sans-serif" }}>Cookie Notice</h1>
          <p className="text-sm text-stone-500 mt-1">Effective date: July 19, 2026 &nbsp;|&nbsp; Last updated: July 19, 2026 &nbsp;|&nbsp; Version: 1.0</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex gap-0">
        <aside className="hidden lg:block w-56 shrink-0 sticky top-[130px] h-[calc(100vh-130px)] overflow-y-auto py-8 pl-6 pr-4">
          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-4">On This Page</p>
          {groups.map(group => (
            <div key={group} className="mb-5">
              <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-2">{group}</p>
              {sections.filter(s => s.group === group).map(s => (
                <button
                  key={s.id}
                  onClick={() => scrollTo(s.id)}
                  className={`block w-full text-left text-[12px] py-1.5 px-2 rounded-md transition-all mb-0.5 ${
                    activeSection === s.id ? 'bg-red-50 text-red-700 font-semibold border-l-2 border-red-500' : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100'
                  }`}
                >{s.title}</button>
              ))}
            </div>
          ))}
        </aside>

        <main className="flex-1 py-8 px-6 lg:px-12">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-12 lg:p-16">

            <section id="what-are" className="mb-12">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">1. What Are Cookies?</h2>
              <p className="text-[14px] text-stone-600 leading-relaxed mb-3">Cookies are small text files placed on your device when you visit a website. They help the website remember your preferences, keep you logged in, and understand how you use the site. Some cookies are essential for the website to function; others help us improve your experience or deliver relevant advertising.</p>
              <p className="text-[14px] text-stone-600 leading-relaxed">This Cookie Notice explains what cookies Pepperwahl uses, why we use them, and how you can control them. It supplements our <a href="/privacy" className="text-red-600 hover:underline">Privacy Policy</a>.</p>
            </section>

            <section id="who-places" className="mb-12">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">2. Who Places Cookies?</h2>
              <p className="text-[14px] text-stone-600 leading-relaxed mb-3"><strong>First-party cookies</strong> are set by Pepperwahl (Survtit Market Research Survey LLP) directly.</p>
              <p className="text-[14px] text-stone-600 leading-relaxed"><strong>Third-party cookies</strong> are set by our partners (such as advertising platforms) when you interact with our website. We currently use Meta Platforms, Inc. as an advertising partner.</p>
            </section>

            <section id="cookies-we-use" className="mb-12">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">3. Cookies We Use</h2>

              <h3 className="text-base font-semibold text-stone-800 mb-3 mt-6">3.1 Essential Cookies</h3>
              <p className="text-[14px] text-stone-600 leading-relaxed mb-3">These cookies are strictly necessary for the website to function. They <strong>cannot be turned off</strong>.</p>
              <div className="overflow-x-auto rounded-lg border border-stone-200 mb-6">
                <table className="w-full text-[13px]">
                  <thead><tr className="bg-red-50 text-red-800"><th className="p-3 text-left font-semibold">Cookie</th><th className="p-3 text-left font-semibold">Purpose</th><th className="p-3 text-left font-semibold">Duration</th></tr></thead>
                  <tbody className="text-stone-600">
                    <tr className="border-t border-stone-100"><td className="p-3 font-mono text-xs">_pw_session</td><td className="p-3">Maintains your login session and authentication state</td><td className="p-3">Session</td></tr>
                    <tr className="border-t border-stone-100"><td className="p-3 font-mono text-xs">_pw_csrf</td><td className="p-3">Prevents cross-site request forgery attacks on forms</td><td className="p-3">Session</td></tr>
                    <tr className="border-t border-stone-100"><td className="p-3 font-mono text-xs">_pw_ballot</td><td className="p-3">Prevents duplicate survey responses (ballot stuffing)</td><td className="p-3">30 days</td></tr>
                  </tbody>
                </table>
              </div>

              <h3 className="text-base font-semibold text-stone-800 mb-3">3.2 Functional Cookies</h3>
              <p className="text-[14px] text-stone-600 leading-relaxed mb-3">These cookies remember your preferences. They require your consent.</p>
              <div className="overflow-x-auto rounded-lg border border-stone-200 mb-6">
                <table className="w-full text-[13px]">
                  <thead><tr className="bg-red-50 text-red-800"><th className="p-3 text-left font-semibold">Cookie</th><th className="p-3 text-left font-semibold">Purpose</th><th className="p-3 text-left font-semibold">Duration</th></tr></thead>
                  <tbody className="text-stone-600">
                    <tr className="border-t border-stone-100"><td className="p-3 font-mono text-xs">_pw_prefs</td><td className="p-3">Stores your language, timezone, and display preferences</td><td className="p-3">1 year</td></tr>
                  </tbody>
                </table>
              </div>

              <h3 className="text-base font-semibold text-stone-800 mb-3">3.3 Analytics Cookies</h3>
              <p className="text-[14px] text-stone-600 leading-relaxed mb-3">These cookies help us understand how visitors use our website. Data is aggregated and anonymous. They require your consent.</p>
              <div className="overflow-x-auto rounded-lg border border-stone-200 mb-6">
                <table className="w-full text-[13px]">
                  <thead><tr className="bg-red-50 text-red-800"><th className="p-3 text-left font-semibold">Cookie</th><th className="p-3 text-left font-semibold">Purpose</th><th className="p-3 text-left font-semibold">Duration</th></tr></thead>
                  <tbody className="text-stone-600">
                    <tr className="border-t border-stone-100"><td className="p-3 font-mono text-xs">_pw_analytics</td><td className="p-3">Tracks page views, feature usage, and session behavior</td><td className="p-3">2 years</td></tr>
                  </tbody>
                </table>
              </div>

              <h3 className="text-base font-semibold text-stone-800 mb-3">3.4 Marketing Cookies</h3>
              <p className="text-[14px] text-stone-600 leading-relaxed mb-3">These cookies deliver relevant advertisements and measure campaign performance. They require your consent.</p>
              <div className="overflow-x-auto rounded-lg border border-stone-200">
                <table className="w-full text-[13px]">
                  <thead><tr className="bg-red-50 text-red-800"><th className="p-3 text-left font-semibold">Cookie</th><th className="p-3 text-left font-semibold">Purpose</th><th className="p-3 text-left font-semibold">Duration</th></tr></thead>
                  <tbody className="text-stone-600">
                    <tr className="border-t border-stone-100"><td className="p-3 font-mono text-xs">_pw_mkt</td><td className="p-3">Delivers relevant ads and measures campaign performance</td><td className="p-3">90 days</td></tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section id="survey-pages" className="mb-12">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">4. Cookies on Survey Pages</h2>
              <p className="text-[14px] text-stone-600 leading-relaxed">When Respondents take a survey, we use only essential cookies required for the survey to function properly (session management, ballot stuffing prevention, completion tracking). No analytics, marketing, or third-party tracking cookies are placed on survey pages unless the Creator has independently integrated third-party tools.</p>
            </section>

            <section id="third-party" className="mb-12">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">5. Third-Party Cookies</h2>
              <div className="overflow-x-auto rounded-lg border border-stone-200 mb-4">
                <table className="w-full text-[13px]">
                  <thead><tr className="bg-red-50 text-red-800"><th className="p-3 text-left font-semibold">Partner</th><th className="p-3 text-left font-semibold">Purpose</th><th className="p-3 text-left font-semibold">Data Shared</th></tr></thead>
                  <tbody className="text-stone-600">
                    <tr className="border-t border-stone-100"><td className="p-3 font-medium">Meta Platforms, Inc.</td><td className="p-3">Interest-based advertising and campaign measurement</td><td className="p-3">Hashed (SHA-256) Creator email addresses, cookie identifiers</td></tr>
                  </tbody>
                </table>
              </div>
              <p className="text-[14px] text-stone-600 leading-relaxed">We do not share Respondent email addresses or phone numbers with advertising partners, in hashed form or otherwise.</p>
            </section>

            <section id="manage" className="mb-12">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">6. How to Manage Cookies</h2>
              <h3 className="text-base font-semibold text-stone-800 mb-3">6.1 Cookie consent banner</h3>
              <p className="text-[14px] text-stone-600 leading-relaxed mb-3">When you first visit our website, we show a cookie consent banner with three options:</p>
              <ul className="list-disc pl-6 space-y-2 text-[14px] text-stone-600 mb-4">
                <li><strong>Accept All</strong> — enables all cookie categories</li>
                <li><strong>Reject Non-Essential</strong> — allows only essential cookies</li>
                <li><strong>Customize</strong> — lets you toggle functional, analytics, and marketing cookies individually</li>
              </ul>
              <p className="text-[14px] text-stone-600 leading-relaxed mb-6">You can change your preferences at any time by clicking the "Cookie Preferences" link in the footer.</p>

              <h3 className="text-base font-semibold text-stone-800 mb-3">6.2 Browser settings</h3>
              <ul className="list-disc pl-6 space-y-1 text-[14px] text-stone-600 mb-6">
                <li><strong>Chrome:</strong> Settings &rarr; Privacy and security &rarr; Cookies</li>
                <li><strong>Firefox:</strong> Settings &rarr; Privacy & Security &rarr; Cookies</li>
                <li><strong>Safari:</strong> Preferences &rarr; Privacy &rarr; Manage Website Data</li>
                <li><strong>Edge:</strong> Settings &rarr; Cookies and site permissions</li>
              </ul>

              <h3 className="text-base font-semibold text-stone-800 mb-3">6.3 Global Privacy Control (GPC)</h3>
              <p className="text-[14px] text-stone-600 leading-relaxed">If your browser sends a GPC signal, we treat it as a request to opt out of marketing cookies and hashed email sharing for advertising purposes.</p>
            </section>

            <section id="email-tracking" className="mb-12">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">7. Email Tracking</h2>
              <p className="text-[14px] text-stone-600 leading-relaxed">Emails sent through our platform may contain small transparent images (web beacons / pixel tags) that allow the sender (the Creator) to measure email open rates and click-through rates. These are not cookies, but we disclose them here for transparency.</p>
            </section>

            <section id="do-not-sell" className="mb-12">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">8. Do Not Sell or Share</h2>
              <p className="text-[14px] text-stone-600 leading-relaxed mb-3">Under the CCPA, our use of marketing cookies may qualify as "sharing." California residents can opt out:</p>
              <ul className="list-disc pl-6 space-y-2 text-[14px] text-stone-600">
                <li>Via the "Do Not Sell or Share My Personal Information" link in our footer</li>
                <li>Via Account Settings &rarr; Privacy &rarr; Ad Data Sharing</li>
                <li>Via Global Privacy Control (GPC) browser signal</li>
              </ul>
            </section>

            <section id="updates" className="mb-12">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">9. Updates to This Notice</h2>
              <p className="text-[14px] text-stone-600 leading-relaxed">We may update this Cookie Notice from time to time. For material changes, we will re-display the cookie consent banner so you can review and update your preferences.</p>
            </section>

            <section id="contact" className="mb-8">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">10. Contact Us</h2>
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-6">
                <p className="text-[14px] text-stone-700 font-semibold mb-1">Survtit Market Research Survey LLP</p>
                <p className="text-[13px] text-stone-600">Product: Pepperwahl &nbsp;|&nbsp; LLPIN: ACB-8160</p>
                <p className="text-[13px] text-stone-600 mt-2">Email: privacy@pepperwahl.com</p>
                <p className="text-[13px] text-stone-600">Address: C/O Mohd. Inam Mehndi Sarai, Near Dhobi Wali Maszid, Jankipuram Police Station, Saharanpur - 247001, Uttar Pradesh, India</p>
              </div>
              <p className="text-xs text-stone-400 mt-6 text-center">&copy; 2026 Survtit Market Research Survey LLP (Pepperwahl). All rights reserved.</p>
            </section>

          </div>
        </main>
      </div>
    </div>
  );
};

export default CookieNotice;
