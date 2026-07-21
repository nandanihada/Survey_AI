/**
 * Privacy Policy Page - Clean legal document with sidebar navigation
 * Red Pepperwahl branding, spacious layout
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const sections = [
  { id: 'scope', title: '1. Scope & Applicability', group: 'GENERAL' },
  { id: 'definitions', title: '2. Definitions', group: 'GENERAL' },
  { id: 'data-collect', title: '3. Data We Collect', group: 'GENERAL' },
  { id: 'how-use', title: '4. How We Use Data', group: 'GENERAL' },
  { id: 'legal-basis', title: '5. Legal Basis', group: 'GENERAL' },
  { id: 'cookies', title: '6. Cookies & Tracking', group: 'SHARING & STORAGE' },
  { id: 'data-sharing', title: '7. Data Sharing', group: 'SHARING & STORAGE' },
  { id: 'subprocessors', title: '8. Subprocessors', group: 'SHARING & STORAGE' },
  { id: 'retention', title: '9. Data Retention', group: 'SHARING & STORAGE' },
  { id: 'transfers', title: '10. International Transfers', group: 'SHARING & STORAGE' },
  { id: 'rights-global', title: '11. Your Rights (Global)', group: 'YOUR RIGHTS' },
  { id: 'india-dpdp', title: '12. India - DPDP Act', group: 'YOUR RIGHTS' },
  { id: 'eu-gdpr', title: '13. EU/UK - GDPR', group: 'YOUR RIGHTS' },
  { id: 'us-ccpa', title: '14. US - CCPA/CPRA', group: 'YOUR RIGHTS' },
  { id: 'brazil-lgpd', title: '15. Brazil - LGPD', group: 'YOUR RIGHTS' },
  { id: 'other-regions', title: '16. Other Regions', group: 'YOUR RIGHTS' },
  { id: 'children', title: '17. Children\'s Data', group: 'OTHER' },
  { id: 'security', title: '18. Security', group: 'OTHER' },
  { id: 'research', title: '19. Research Privacy', group: 'OTHER' },
  { id: 'acceptable-use', title: '20. Acceptable Use', group: 'OTHER' },
  { id: 'changes', title: '21. Changes to Policy', group: 'OTHER' },
  { id: 'contact', title: '22. Contact & Privacy Team', group: 'OTHER' },
];

const PrivacyPolicy: React.FC = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('scope');

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
      {/* Custom scrollbar style */}
      <style>{`
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.25); }
      `}</style>
      {/* Top Header */}
      <div className="bg-white border-b border-stone-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <span className="text-[11px] font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full uppercase tracking-wider">Legal</span>
          <h1 className="text-3xl font-bold text-stone-900 mt-2" style={{ fontFamily: "'Outfit', 'Inter', sans-serif" }}>Privacy Policy</h1>
          <p className="text-sm text-stone-500 mt-1">
            Effective date: July 18, 2026 &nbsp;|&nbsp; Last updated: July 19, 2026 &nbsp;|&nbsp; Version: 1.5
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex gap-0">
        {/* Sidebar */}
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
                    activeSection === s.id
                      ? 'bg-red-50 text-red-700 font-semibold border-l-2 border-red-500'
                      : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100'
                  }`}
                >
                  {s.title}
                </button>
              ))}
            </div>
          ))}
        </aside>

        {/* Main Content */}
        <main className="flex-1 py-8 px-6 lg:px-12">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-12 lg:p-16">

            <section id="scope" className="mb-12">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">1. Scope & Applicability</h2>
              <p className="text-[15px] text-stone-600 leading-relaxed mb-4">This Privacy Policy applies to all products, services, websites, and applications offered by Pepperwahl (collectively "Services"), including our survey platform, AI-powered survey prompt tools, analytics dashboards, and related features.</p>
              <h3 className="text-base font-semibold text-stone-800 mt-6 mb-2">1.1 Who does this apply to?</h3>
              <ul className="list-disc pl-6 space-y-2 text-[14px] text-stone-600 leading-relaxed">
                <li>Any individual or organization that uses Pepperwahl to create, send, or manage surveys</li>
                <li>Any individual who receives or responds to a survey powered by Pepperwahl</li>
                <li>Any visitor to our websites</li>
                <li>Any individual whose data is processed through our Services</li>
              </ul>
              <h3 className="text-base font-semibold text-stone-800 mt-6 mb-2">1.2 Territorial scope</h3>
              <p className="text-[14px] text-stone-600 leading-relaxed">Survtit Market Research Survey LLP is headquartered in India. This policy covers data processing activities conducted worldwide. Your data is processed by Pepperwahl (based in India) and stored via our infrastructure providers in the United States, subject to the safeguards described in Section 10.</p>
            </section>

            <section id="definitions" className="mb-12">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">2. Definitions</h2>
              <div className="overflow-x-auto rounded-lg border border-stone-200">
                <table className="w-full text-[13px]">
                  <thead><tr className="bg-red-50 text-red-800"><th className="p-3 text-left font-semibold">Term</th><th className="p-3 text-left font-semibold">Meaning</th></tr></thead>
                  <tbody className="text-stone-600">
                    <tr className="border-t border-stone-100"><td className="p-3 font-medium text-stone-800">Creator</td><td className="p-3">An individual or organization that holds a Pepperwahl account and creates surveys.</td></tr>
                    <tr className="border-t border-stone-100"><td className="p-3 font-medium text-stone-800">Respondent</td><td className="p-3">An individual who responds to a survey created by a Creator.</td></tr>
                    <tr className="border-t border-stone-100"><td className="p-3 font-medium text-stone-800">Visitor</td><td className="p-3">An individual who visits Pepperwahl's website without creating an account.</td></tr>
                    <tr className="border-t border-stone-100"><td className="p-3 font-medium text-stone-800">Data Fiduciary / Controller</td><td className="p-3">The entity that determines the purposes and means of processing personal data.</td></tr>
                    <tr className="border-t border-stone-100"><td className="p-3 font-medium text-stone-800">Data Processor</td><td className="p-3">The entity that processes personal data on behalf of the Controller.</td></tr>
                    <tr className="border-t border-stone-100"><td className="p-3 font-medium text-stone-800">Data Principal / Data Subject</td><td className="p-3">The individual whose personal data is being processed.</td></tr>
                    <tr className="border-t border-stone-100"><td className="p-3 font-medium text-stone-800">Personal Data</td><td className="p-3">Any information relating to an identified or identifiable individual.</td></tr>
                    <tr className="border-t border-stone-100"><td className="p-3 font-medium text-stone-800">Services</td><td className="p-3">All Pepperwahl products, websites, apps, and features collectively.</td></tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section id="data-collect" className="mb-12">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">3. Data We Collect</h2>
              <h3 className="text-base font-semibold text-stone-800 mb-3">3.1 Data you provide directly</h3>
              <div className="overflow-x-auto rounded-lg border border-stone-200 mb-6">
                <table className="w-full text-[13px]">
                  <thead><tr className="bg-red-50 text-red-800"><th className="p-3 text-left font-semibold">Data Type</th><th className="p-3 text-left font-semibold">Details</th><th className="p-3 text-left font-semibold">When Collected</th></tr></thead>
                  <tbody className="text-stone-600">
                    <tr className="border-t border-stone-100"><td className="p-3 font-medium text-stone-800">Account Information</td><td className="p-3">Name, email, password, organization name, job title, profile photo</td><td className="p-3">At sign-up and account settings</td></tr>
                    <tr className="border-t border-stone-100"><td className="p-3 font-medium text-stone-800">Billing Information</td><td className="p-3">Payment method, billing name & address, transaction history</td><td className="p-3">At purchase</td></tr>
                    <tr className="border-t border-stone-100"><td className="p-3 font-medium text-stone-800">Survey Data</td><td className="p-3">Survey questions, configurations, and responses</td><td className="p-3">When creating/responding to surveys</td></tr>
                    <tr className="border-t border-stone-100"><td className="p-3 font-medium text-stone-800">Contact/Address Book</td><td className="p-3">Email addresses or contact info you import</td><td className="p-3">When using email collectors</td></tr>
                    <tr className="border-t border-stone-100"><td className="p-3 font-medium text-stone-800">Customer Support Data</td><td className="p-3">Name, email, message content</td><td className="p-3">When you contact support</td></tr>
                  </tbody>
                </table>
              </div>
              <h3 className="text-base font-semibold text-stone-800 mb-3">3.2 Data collected automatically</h3>
              <div className="overflow-x-auto rounded-lg border border-stone-200 mb-6">
                <table className="w-full text-[13px]">
                  <thead><tr className="bg-red-50 text-red-800"><th className="p-3 text-left font-semibold">Data Type</th><th className="p-3 text-left font-semibold">Details</th></tr></thead>
                  <tbody className="text-stone-600">
                    <tr className="border-t border-stone-100"><td className="p-3 font-medium text-stone-800">Usage Data</td><td className="p-3">Pages visited, features used, clicks, session duration, survey completion rates</td></tr>
                    <tr className="border-t border-stone-100"><td className="p-3 font-medium text-stone-800">Device & Browser Data</td><td className="p-3">IP address, browser type & version, operating system, device type, screen resolution</td></tr>
                    <tr className="border-t border-stone-100"><td className="p-3 font-medium text-stone-800">Inferred Location</td><td className="p-3">Approximate geographic location derived from IP address only</td></tr>
                    <tr className="border-t border-stone-100"><td className="p-3 font-medium text-stone-800">Cookie Data</td><td className="p-3">Session identifiers, preference cookies, analytics cookies</td></tr>
                    <tr className="border-t border-stone-100"><td className="p-3 font-medium text-stone-800">Referral Data</td><td className="p-3">The source/URL that referred you to our website</td></tr>
                  </tbody>
                </table>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-[13px] text-amber-900">
                <strong>What we do NOT collect:</strong> Precise GPS location, biometric data, genetic data, caste, religious beliefs, sexual orientation, political opinions, health data, or any special category/sensitive personal data.
              </div>
            </section>

            <section id="how-use" className="mb-12">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">4. How We Use Your Data</h2>
              <h3 className="text-base font-semibold text-stone-800 mb-3">4.1 For Creators</h3>
              <ul className="list-disc pl-6 space-y-2 text-[14px] text-stone-600 leading-relaxed mb-6">
                <li>Operate, maintain, and improve your account and our Services</li>
                <li>Process payments, billing, and resolve disputes</li>
                <li>Provide customer support and respond to inquiries</li>
                <li>Send transactional communications (account alerts, billing, service changes)</li>
                <li>Send marketing communications (with consent or opt-out)</li>
                <li>Provide AI-powered insights, sentiment analysis, and trend identification</li>
                <li>Detect, prevent, and address fraud, abuse, spam, and security issues</li>
              </ul>
              <h3 className="text-base font-semibold text-stone-800 mb-3">4.2 For Respondents</h3>
              <ul className="list-disc pl-6 space-y-2 text-[14px] text-stone-600 leading-relaxed mb-6">
                <li>Deliver surveys on behalf of Creators</li>
                <li>Store and process your survey responses for the Creator</li>
                <li>Prevent duplicate responses (ballot stuffing)</li>
                <li>Improve survey delivery, user experience, and question optimization</li>
              </ul>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-[13px] text-red-800">
                <strong>What we NEVER do:</strong> We never sell personal data. We never use respondent survey data to market Pepperwahl to respondents. We never share individually identifiable survey responses with anyone other than the owning Creator.
              </div>
            </section>

            <section id="legal-basis" className="mb-12">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">5. Legal Basis for Processing</h2>
              <div className="overflow-x-auto rounded-lg border border-stone-200">
                <table className="w-full text-[13px]">
                  <thead><tr className="bg-red-50 text-red-800"><th className="p-3 text-left font-semibold">Legal Basis</th><th className="p-3 text-left font-semibold">Processing Activities</th><th className="p-3 text-left font-semibold">Your Control</th></tr></thead>
                  <tbody className="text-stone-600">
                    <tr className="border-t border-stone-100"><td className="p-3 font-medium text-stone-800">Consent</td><td className="p-3">Marketing emails, non-essential cookies, optional AI features, ad partner sharing</td><td className="p-3">Withdraw anytime</td></tr>
                    <tr className="border-t border-stone-100"><td className="p-3 font-medium text-stone-800">Contract</td><td className="p-3">Account management, billing, service delivery, customer support</td><td className="p-3">Necessary for service</td></tr>
                    <tr className="border-t border-stone-100"><td className="p-3 font-medium text-stone-800">Legitimate Interest</td><td className="p-3">Product improvement, fraud prevention, personalization, analytics</td><td className="p-3">Object via email</td></tr>
                    <tr className="border-t border-stone-100"><td className="p-3 font-medium text-stone-800">Legal Obligation</td><td className="p-3">Subpoenas, tax records, regulatory compliance, abuse prevention</td><td className="p-3">Required by law</td></tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section id="cookies" className="mb-12">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">6. Cookies & Tracking Technologies</h2>
              <div className="overflow-x-auto rounded-lg border border-stone-200">
                <table className="w-full text-[13px]">
                  <thead><tr className="bg-red-50 text-red-800"><th className="p-3 text-left font-semibold">Cookie</th><th className="p-3 text-left font-semibold">Purpose</th><th className="p-3 text-left font-semibold">Duration</th><th className="p-3 text-left font-semibold">Consent</th></tr></thead>
                  <tbody className="text-stone-600">
                    <tr className="border-t border-stone-100"><td className="p-3 font-mono text-xs">_pw_session</td><td className="p-3">Login session & authentication</td><td className="p-3">Session</td><td className="p-3"><span className="text-green-700 bg-green-50 px-1.5 py-0.5 rounded text-[11px]">Essential</span></td></tr>
                    <tr className="border-t border-stone-100"><td className="p-3 font-mono text-xs">_pw_csrf</td><td className="p-3">CSRF protection</td><td className="p-3">Session</td><td className="p-3"><span className="text-green-700 bg-green-50 px-1.5 py-0.5 rounded text-[11px]">Essential</span></td></tr>
                    <tr className="border-t border-stone-100"><td className="p-3 font-mono text-xs">_pw_ballot</td><td className="p-3">Prevent duplicate responses</td><td className="p-3">30 days</td><td className="p-3"><span className="text-green-700 bg-green-50 px-1.5 py-0.5 rounded text-[11px]">Essential</span></td></tr>
                    <tr className="border-t border-stone-100"><td className="p-3 font-mono text-xs">_pw_prefs</td><td className="p-3">Language, timezone preferences</td><td className="p-3">1 year</td><td className="p-3"><span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[11px]">Required</span></td></tr>
                    <tr className="border-t border-stone-100"><td className="p-3 font-mono text-xs">_pw_analytics</td><td className="p-3">Page views, feature usage, sessions</td><td className="p-3">2 years</td><td className="p-3"><span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[11px]">Required</span></td></tr>
                    <tr className="border-t border-stone-100"><td className="p-3 font-mono text-xs">_pw_mkt</td><td className="p-3">Ads, campaign performance</td><td className="p-3">90 days</td><td className="p-3"><span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[11px]">Required</span></td></tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section id="data-sharing" className="mb-12">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">7. Data Sharing & Disclosure</h2>
              <p className="text-[15px] text-stone-600 leading-relaxed mb-4"><strong className="text-stone-800">We do not sell your personal data.</strong> We share data only in the following circumstances:</p>
              <ul className="list-disc pl-6 space-y-2 text-[14px] text-stone-600 leading-relaxed">
                <li><strong>With your organization</strong> — team/enterprise plan admins can view account data</li>
                <li><strong>With service providers</strong> — under contractual data protection obligations</li>
                <li><strong>With integration partners</strong> — on your instruction only</li>
                <li><strong>For legal reasons</strong> — law enforcement, court orders, fraud prevention</li>
                <li><strong>Business transfers</strong> — merger/acquisition, with prior notice</li>
              </ul>
            </section>

            <section id="subprocessors" className="mb-12">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">8. Subprocessors</h2>
              <div className="overflow-x-auto rounded-lg border border-stone-200">
                <table className="w-full text-[13px]">
                  <thead><tr className="bg-red-50 text-red-800"><th className="p-3 text-left font-semibold">Service</th><th className="p-3 text-left font-semibold">Provider</th><th className="p-3 text-left font-semibold">Location</th></tr></thead>
                  <tbody className="text-stone-600">
                    <tr className="border-t border-stone-100"><td className="p-3">Cloud Hosting</td><td className="p-3 font-medium">Render</td><td className="p-3">US (Oregon)</td></tr>
                    <tr className="border-t border-stone-100"><td className="p-3">Database/Storage</td><td className="p-3 font-medium">MongoDB Atlas</td><td className="p-3">US (West)</td></tr>
                    <tr className="border-t border-stone-100"><td className="p-3">Payment Processing</td><td className="p-3 font-medium">Razorpay</td><td className="p-3">India</td></tr>
                    <tr className="border-t border-stone-100"><td className="p-3">Email Delivery</td><td className="p-3 font-medium">Hostinger</td><td className="p-3">-</td></tr>
                    <tr className="border-t border-stone-100"><td className="p-3">AI/ML</td><td className="p-3 font-medium">Google (Gemini), Anthropic, xAI</td><td className="p-3">US</td></tr>
                    <tr className="border-t border-stone-100"><td className="p-3">Advertising</td><td className="p-3 font-medium">Meta Platforms, Inc.</td><td className="p-3">US</td></tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section id="retention" className="mb-12">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">9. Data Retention</h2>
              <div className="overflow-x-auto rounded-lg border border-stone-200">
                <table className="w-full text-[13px]">
                  <thead><tr className="bg-red-50 text-red-800"><th className="p-3 text-left font-semibold">Data Category</th><th className="p-3 text-left font-semibold">Retention Period</th></tr></thead>
                  <tbody className="text-stone-600">
                    <tr className="border-t border-stone-100"><td className="p-3">Active account data</td><td className="p-3">Duration of account activity</td></tr>
                    <tr className="border-t border-stone-100"><td className="p-3">Inactive free accounts</td><td className="p-3">Up to 24 months of inactivity</td></tr>
                    <tr className="border-t border-stone-100"><td className="p-3">Billing & financial records</td><td className="p-3">7 years (tax law)</td></tr>
                    <tr className="border-t border-stone-100"><td className="p-3">Usage & analytics data</td><td className="p-3">24 months (anonymized)</td></tr>
                    <tr className="border-t border-stone-100"><td className="p-3">Customer support records</td><td className="p-3">12 months after resolution</td></tr>
                    <tr className="border-t border-stone-100"><td className="p-3">Server/event logs</td><td className="p-3">90 days</td></tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section id="transfers" className="mb-12">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">10. International Data Transfers</h2>
              <p className="text-[14px] text-stone-600 leading-relaxed mb-4">Your data may be transferred from India (or your country) to the United States. We ensure appropriate safeguards:</p>
              <ul className="list-disc pl-6 space-y-2 text-[14px] text-stone-600 leading-relaxed">
                <li><strong>India to US:</strong> Contractual data protection obligations</li>
                <li><strong>EU/UK to US:</strong> Standard Contractual Clauses (SCCs)</li>
                <li><strong>Brazil to US:</strong> Standard contractual clauses under LGPD</li>
              </ul>
              <p className="text-[14px] text-stone-600 mt-4">Primary storage: United States (Render: Oregon, MongoDB Atlas: US West).</p>
            </section>

            <section id="rights-global" className="mb-12">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">11. Your Rights - Global Overview</h2>
              <div className="overflow-x-auto rounded-lg border border-stone-200">
                <table className="w-full text-[13px]">
                  <thead><tr className="bg-red-50 text-red-800"><th className="p-3 text-left font-semibold">Right</th><th className="p-3 text-left font-semibold">Description</th><th className="p-3 text-left font-semibold">How to Exercise</th></tr></thead>
                  <tbody className="text-stone-600">
                    <tr className="border-t border-stone-100"><td className="p-3 font-medium text-stone-800">Access</td><td className="p-3">Request a copy of personal data we hold</td><td className="p-3">Account settings or email</td></tr>
                    <tr className="border-t border-stone-100"><td className="p-3 font-medium text-stone-800">Correction</td><td className="p-3">Request correction of inaccurate data</td><td className="p-3">Account settings or email</td></tr>
                    <tr className="border-t border-stone-100"><td className="p-3 font-medium text-stone-800">Deletion</td><td className="p-3">Request erasure of personal data</td><td className="p-3">Account settings (delete account)</td></tr>
                    <tr className="border-t border-stone-100"><td className="p-3 font-medium text-stone-800">Data Portability</td><td className="p-3">Export data in machine-readable format</td><td className="p-3">Built-in export tools</td></tr>
                    <tr className="border-t border-stone-100"><td className="p-3 font-medium text-stone-800">Withdraw Consent</td><td className="p-3">Revoke previously given consent</td><td className="p-3">Account settings, unsubscribe</td></tr>
                    <tr className="border-t border-stone-100"><td className="p-3 font-medium text-stone-800">Opt-out Marketing</td><td className="p-3">Stop marketing communications</td><td className="p-3">Unsubscribe link in emails</td></tr>
                  </tbody>
                </table>
              </div>
              <p className="text-[14px] text-stone-600 mt-4">We respond to all rights requests within 30 days.</p>
            </section>

            <section id="india-dpdp" className="mb-12">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">12. India - DPDP Act, 2023</h2>
              <p className="text-[14px] text-stone-600 leading-relaxed mb-3">Pepperwahl is the Data Fiduciary for Creator account data, Visitor data, and Research Respondent data. We obtain free, specific, informed, and unambiguous consent before processing your personal data.</p>
              <p className="text-[14px] text-stone-600 leading-relaxed mb-3">Your rights: access, correction, erasure, grievance redressal, and nomination.</p>
              <div className="bg-stone-50 rounded-lg p-4 mt-4 border border-stone-200">
                <p className="text-[13px] text-stone-700"><strong>Grievance Officer:</strong> Shivam Julka - privacy@pepperwahl.com</p>
                <p className="text-[13px] text-stone-500">Acknowledged within 48 hours, resolved within 30 days.</p>
              </div>
            </section>

            <section id="eu-gdpr" className="mb-12">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">13. EU/UK - GDPR</h2>
              <p className="text-[14px] text-stone-600 leading-relaxed mb-3">Additional rights for EU/UK individuals: restrict processing, object to processing, right not to be subject to automated decision-making, lodge a complaint with your supervisory authority.</p>
              <p className="text-[14px] text-stone-600 leading-relaxed">International transfers use Standard Contractual Clauses (SCCs) approved by the European Commission.</p>
            </section>

            <section id="us-ccpa" className="mb-12">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">14. US - CCPA/CPRA</h2>
              <p className="text-[14px] text-stone-600 leading-relaxed mb-3">We do not sell personal information as defined by the CCPA. California residents can opt out of "sharing" via our "Do Not Sell or Share" link.</p>
              <p className="text-[14px] text-stone-600 leading-relaxed">Rights include: right to know, delete, correct, opt-out, limit use of sensitive data, and non-discrimination.</p>
            </section>

            <section id="brazil-lgpd" className="mb-12">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">15. Brazil - LGPD</h2>
              <p className="text-[14px] text-stone-600 leading-relaxed">Rights include: access, correction, anonymization, blocking, deletion, portability, information about sharing, possibility of not consenting, and revocation of consent. DPO / Encarregado: privacy@pepperwahl.com</p>
            </section>

            <section id="other-regions" className="mb-12">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">16. Other Regions</h2>
              <p className="text-[14px] text-stone-600 leading-relaxed mb-2"><strong>Canada (PIPEDA):</strong> Access and correction rights. Meaningful consent obtained.</p>
              <p className="text-[14px] text-stone-600 leading-relaxed mb-2"><strong>Australia (Privacy Act 1988):</strong> Access, correction, and complaint rights via OAIC.</p>
              <p className="text-[14px] text-stone-600 leading-relaxed">For other jurisdictions, contact privacy@pepperwahl.com.</p>
            </section>

            <section id="children" className="mb-12">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">17. Children's Data</h2>
              <p className="text-[14px] text-stone-600 leading-relaxed">Our Services are not intended for minors. We do not knowingly collect personal data from minors without verifiable parental or guardian consent. If we learn such data has been collected, we will promptly delete it.</p>
            </section>

            <section id="security" className="mb-12">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">18. Security</h2>
              <div className="overflow-x-auto rounded-lg border border-stone-200">
                <table className="w-full text-[13px]">
                  <thead><tr className="bg-red-50 text-red-800"><th className="p-3 text-left font-semibold">Measure</th><th className="p-3 text-left font-semibold">Details</th></tr></thead>
                  <tbody className="text-stone-600">
                    <tr className="border-t border-stone-100"><td className="p-3 font-medium">Encryption in transit</td><td className="p-3">TLS 1.2+</td></tr>
                    <tr className="border-t border-stone-100"><td className="p-3 font-medium">Encryption at rest</td><td className="p-3">AES-256 or equivalent</td></tr>
                    <tr className="border-t border-stone-100"><td className="p-3 font-medium">Access controls</td><td className="p-3">Role-based with least-privilege principles</td></tr>
                    <tr className="border-t border-stone-100"><td className="p-3 font-medium">Authentication</td><td className="p-3">Secure password hashing (bcrypt); optional 2FA</td></tr>
                    <tr className="border-t border-stone-100"><td className="p-3 font-medium">Monitoring</td><td className="p-3">24/7 monitoring for unauthorized access</td></tr>
                    <tr className="border-t border-stone-100"><td className="p-3 font-medium">Incident response</td><td className="p-3">Documented plan with defined escalation</td></tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section id="research" className="mb-12">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">19. Research Privacy Notice</h2>
              <p className="text-[14px] text-stone-600 leading-relaxed">Pepperwahl may conduct its own surveys for product research. Participation is entirely voluntary. Research data may be shared with third parties in aggregated, de-identified form only.</p>
            </section>

            <section id="acceptable-use" className="mb-12">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">20. Acceptable Use & Creator Responsibilities</h2>
              <p className="text-[14px] text-stone-600 leading-relaxed">Creators must comply with all applicable data protection laws, provide clear disclosures to respondents, obtain appropriate consent, and not use the Services for spam, fraud, harassment, or discrimination. Pepperwahl is not responsible for how Creators use respondent data outside of our platform.</p>
            </section>

            <section id="changes" className="mb-12">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">21. Changes to This Policy</h2>
              <p className="text-[14px] text-stone-600 leading-relaxed">We notify all account holders by email at least 30 days before material changes take effect. Continued use after changes constitutes acceptance. If you disagree, you may close your account.</p>
            </section>

            <section id="contact" className="mb-8">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">22. Contact Us</h2>
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

export default PrivacyPolicy;
