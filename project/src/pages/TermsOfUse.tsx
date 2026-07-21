/**
 * Terms of Use Page - Clean legal document with sidebar navigation
 * Red Pepperwahl branding, spacious layout
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const sections = [
  { id: 'acceptance', title: '1. Acceptance of These Terms', group: 'GENERAL' },
  { id: 'description', title: '2. Description of the Services', group: 'GENERAL' },
  { id: 'eligibility', title: '3. Eligibility & Age Requirements', group: 'GENERAL' },
  { id: 'account', title: '4. Account Registration & Security', group: 'GENERAL' },
  { id: 'roles', title: '5. Roles Under These Terms', group: 'GENERAL' },
  { id: 'subscription', title: '6. Subscription Plans & Payment', group: 'PLANS & PAYMENT' },
  { id: 'creator', title: '7. Creator Responsibilities', group: 'RESPONSIBILITIES' },
  { id: 'acceptable', title: '8. Acceptable Use', group: 'RESPONSIBILITIES' },
  { id: 'dpa', title: '9. Data Processing Agreement', group: 'DATA' },
  { id: 'ai', title: '10. AI-Powered Features', group: 'DATA' },
  { id: 'ip', title: '11. Intellectual Property', group: 'DATA' },
  { id: 'thirdparty', title: '12. Third-Party Integrations', group: 'OTHER' },
  { id: 'disclaimers', title: '13. Disclaimers', group: 'OTHER' },
  { id: 'liability', title: '14. Limitation of Liability', group: 'OTHER' },
  { id: 'termination', title: '15. Suspension & Termination', group: 'OTHER' },
  { id: 'governing', title: '16. Governing Law & Disputes', group: 'OTHER' },
  { id: 'changes', title: '17. Changes to These Terms', group: 'OTHER' },
  { id: 'general', title: '18. General', group: 'OTHER' },
  { id: 'contact', title: '19. Contact Us', group: 'OTHER' },
];

const TermsOfUse: React.FC = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('acceptance');

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
          <h1 className="text-3xl font-bold text-stone-900 mt-2" style={{ fontFamily: "'Outfit', 'Inter', sans-serif" }}>Terms of Use</h1>
          <p className="text-sm text-stone-500 mt-1">
            Effective date: July 18, 2026 &nbsp;|&nbsp; Last updated: July 19, 2026 &nbsp;|&nbsp; Version: 1.2
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

            {/* Intro banner */}
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-6 mb-10">
              <p className="text-[14px] text-stone-700 font-medium mb-2">Survtit Market Research Survey LLP</p>
              <p className="text-[12px] text-stone-500 leading-relaxed uppercase">Please read these Terms of Use carefully. They govern your access to and use of the Pepperwahl platform and include a limitation of liability, an indemnification obligation, and a dispute resolution clause.</p>
            </div>

            <section id="acceptance" className="mb-12">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">1. Acceptance of These Terms</h2>
              <p className="text-[14px] text-stone-600 leading-relaxed mb-3">1.1 These Terms of Use ("Terms") form a binding agreement between you ("You," "Creator," or "User") and Survtit Market Research Survey LLP, an India limited liability partnership operating under the product name Pepperwahl ("Pepperwahl," "we," "us," or "our").</p>
              <p className="text-[14px] text-stone-600 leading-relaxed mb-3">1.2 By creating an account, checking the "I agree to the Privacy Policy and Terms of Use" box, or otherwise accessing or using the Services, you accept and agree to be bound by these Terms and by our Privacy Policy, which is incorporated into these Terms by reference.</p>
              <p className="text-[14px] text-stone-600 leading-relaxed">1.3 If you are accepting these Terms on behalf of an organization, you represent that you have authority to bind that organization.</p>
            </section>

            <section id="description" className="mb-12">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">2. Description of the Services</h2>
              <p className="text-[14px] text-stone-600 leading-relaxed mb-3">2.1 Pepperwahl provides a survey creation, distribution, and analysis platform, including AI-powered survey prompt generation, response collection, analytics dashboards, and related features (collectively, the "Services").</p>
              <p className="text-[14px] text-stone-600 leading-relaxed">2.2 The Services are offered on Free, Premium, and Enterprise plans. We may introduce, modify, or discontinue features or plans at our discretion, with notice where required by applicable law.</p>
            </section>

            <section id="eligibility" className="mb-12">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">3. Eligibility & Age Requirements</h2>
              <p className="text-[14px] text-stone-600 leading-relaxed mb-3">3.1 You must be at least the age of majority in your jurisdiction to create a Pepperwahl account: <strong>18 in India</strong>, <strong>16 in the EU/UK</strong>, <strong>13 in the United States</strong>, and <strong>18 in Brazil</strong>.</p>
              <p className="text-[14px] text-stone-600 leading-relaxed mb-3">3.2 The Services are not directed at individuals under these thresholds. If you are a parent or guardian and believe a minor has created an account, contact privacy@pepperwahl.com.</p>
              <p className="text-[14px] text-stone-600 leading-relaxed">3.3 If you use the Services to collect data from minors as Respondents, you are solely responsible for obtaining verifiable parental or guardian consent.</p>
            </section>

            <section id="account" className="mb-12">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">4. Account Registration & Security</h2>
              <p className="text-[14px] text-stone-600 leading-relaxed mb-3">4.1 To use most features, you must register for an account and provide accurate, current, and complete information.</p>
              <p className="text-[14px] text-stone-600 leading-relaxed mb-3">4.2 You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account. Notify us immediately at support@pepperwahl.com of any unauthorized use.</p>
              <p className="text-[14px] text-stone-600 leading-relaxed">4.3 We may suspend or terminate accounts that provide false information, are inactive for an extended period, or are used in violation of these Terms.</p>
            </section>

            <section id="roles" className="mb-12">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">5. Roles Under These Terms</h2>
              <div className="overflow-x-auto rounded-lg border border-stone-200">
                <table className="w-full text-[13px]">
                  <thead><tr className="bg-red-50 text-red-800"><th className="p-3 text-left font-semibold">Term</th><th className="p-3 text-left font-semibold">Meaning</th></tr></thead>
                  <tbody className="text-stone-600">
                    <tr className="border-t border-stone-100"><td className="p-3 font-medium text-stone-800">Creator</td><td className="p-3">An individual or organization holding a Pepperwahl account who creates, distributes, or analyzes surveys.</td></tr>
                    <tr className="border-t border-stone-100"><td className="p-3 font-medium text-stone-800">Respondent</td><td className="p-3">An individual who receives and responds to a survey created by a Creator using Pepperwahl.</td></tr>
                    <tr className="border-t border-stone-100"><td className="p-3 font-medium text-stone-800">Visitor</td><td className="p-3">An individual who visits the Pepperwahl website without creating an account or responding to a survey.</td></tr>
                  </tbody>
                </table>
              </div>
              <p className="text-[14px] text-stone-600 leading-relaxed mt-4">5.1 The Creator is the Data Fiduciary/Controller for Respondent data collected through their surveys, and Pepperwahl acts as the Data Processor on the Creator's behalf.</p>
            </section>

            <section id="subscription" className="mb-12">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">6. Subscription Plans, Fees & Payment</h2>
              <p className="text-[14px] text-stone-600 leading-relaxed mb-3">6.1 <strong>Free Plan:</strong> available at no cost, subject to feature and usage limits.</p>
              <p className="text-[14px] text-stone-600 leading-relaxed mb-3">6.2 <strong>Premium and Enterprise Plans:</strong> paid plans unlock additional features. Upgrading requires acceptance of a Data Processing Agreement before payment.</p>
              <p className="text-[14px] text-stone-600 leading-relaxed mb-3">6.3 Fees are billed in advance on a recurring basis (monthly or annual) and are non-refundable except as required by law.</p>
              <p className="text-[14px] text-stone-600 leading-relaxed mb-6">6.4 We may change fees on notice; changes take effect at your next billing cycle.</p>
              <h3 className="text-base font-semibold text-stone-800 mb-3">6.6 Data Deletion & Retention by Plan</h3>
              <div className="overflow-x-auto rounded-lg border border-stone-200">
                <table className="w-full text-[13px]">
                  <thead><tr className="bg-red-50 text-red-800"><th className="p-3 text-left font-semibold">Plan</th><th className="p-3 text-left font-semibold">Deletion Timeline</th><th className="p-3 text-left font-semibold">Backup Purge</th></tr></thead>
                  <tbody className="text-stone-600">
                    <tr className="border-t border-stone-100"><td className="p-3 font-medium">Free</td><td className="p-3">Notice email, then delete after 48 hours</td><td className="p-3">Within 90 days</td></tr>
                    <tr className="border-t border-stone-100"><td className="p-3 font-medium">Premium</td><td className="p-3">Within 30 days, no waiting period</td><td className="p-3">Within 60 days</td></tr>
                    <tr className="border-t border-stone-100"><td className="p-3 font-medium">Enterprise</td><td className="p-3">Within 48 hours, no waiting period</td><td className="p-3">Within 48-72 hours</td></tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section id="creator" className="mb-12">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">7. Creator Responsibilities</h2>
              <p className="text-[14px] text-stone-600 leading-relaxed mb-3">7.1 As a Creator, you are solely responsible for the surveys you create and the data you collect:</p>
              <ul className="list-disc pl-6 space-y-2 text-[14px] text-stone-600 leading-relaxed">
                <li>Ensuring a lawful basis exists for collecting Respondent personal data</li>
                <li>Providing Respondents with clear and accurate privacy disclosures</li>
                <li>Obtaining verifiable parental consent before collecting data from minors</li>
                <li>Obtaining additional consent before collecting sensitive personal data</li>
                <li>Responding to data subject rights requests from your Respondents</li>
                <li>Complying with all applicable data protection and consumer protection laws</li>
                <li>Managing your own suppression and unsubscribe lists</li>
              </ul>
            </section>

            <section id="acceptable" className="mb-12">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">8. Acceptable Use</h2>
              <p className="text-[14px] text-stone-600 leading-relaxed mb-3">You agree not to use the Services to:</p>
              <ul className="list-disc pl-6 space-y-2 text-[14px] text-stone-600 leading-relaxed">
                <li>Send spam, phishing content, or unsolicited bulk communications</li>
                <li>Collect data for unlawful purposes, or to harass, defraud, or discriminate</li>
                <li>Collect sensitive personal data without adequate lawful basis and consent</li>
                <li>Attempt unauthorized access to the Services or other accounts</li>
                <li>Reverse-engineer, decompile, or extract the source code</li>
                <li>Use automated means to scrape or bulk-extract data</li>
                <li>Interfere with or disrupt the integrity or performance of the Services</li>
              </ul>
            </section>

            <section id="dpa" className="mb-12">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">9. Data Processing Agreement</h2>
              <p className="text-[14px] text-stone-600 leading-relaxed mb-3">9.1 By using the Services, you agree that Survtit Market Research Survey LLP processes Respondent data on your behalf as described in our Privacy Policy.</p>
              <p className="text-[14px] text-stone-600 leading-relaxed mb-3">9.2 For Premium and Enterprise plans, a separate DPA must be reviewed and accepted before upgrade payment is processed.</p>
              <p className="text-[14px] text-stone-600 leading-relaxed">9.4 Pepperwahl is committed to full compliance with the Digital Personal Data Protection Act, 2023 (India) by May 13, 2027, with early adoption already in effect.</p>
            </section>

            <section id="ai" className="mb-12">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">10. AI-Powered Features</h2>
              <p className="text-[14px] text-stone-600 leading-relaxed mb-3">10.1 AI features are provided "as is" and may produce inaccurate or unexpected output. You are responsible for reviewing AI-generated content before relying on or distributing it.</p>
              <p className="text-[14px] text-stone-600 leading-relaxed">10.2 We do not use identifiable survey or Respondent data to train ML models; where such data is used to improve the Services, it is de-identified or aggregated first.</p>
            </section>

            <section id="ip" className="mb-12">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">11. Intellectual Property</h2>
              <p className="text-[14px] text-stone-600 leading-relaxed mb-3">11.1 Pepperwahl and its licensors own all right, title, and interest in the Services.</p>
              <p className="text-[14px] text-stone-600 leading-relaxed mb-3">11.2 You retain all ownership rights in Your Content and Response Data.</p>
              <p className="text-[14px] text-stone-600 leading-relaxed">11.3 You grant Pepperwahl a limited, non-exclusive license to host, store, process, and display Your Content solely as necessary to provide the Services.</p>
            </section>

            <section id="thirdparty" className="mb-12">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">12. Third-Party Integrations</h2>
              <p className="text-[14px] text-stone-600 leading-relaxed">Your use of any connected third-party service is governed by that provider's own terms and privacy practices. We are not responsible for third-party services.</p>
            </section>

            <section id="disclaimers" className="mb-12">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">13. Disclaimers</h2>
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-5">
                <p className="text-[12px] text-stone-600 uppercase leading-relaxed">THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE," WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, OR THAT THE SERVICES WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE, TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW.</p>
              </div>
            </section>

            <section id="liability" className="mb-12">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">14. Limitation of Liability & Indemnification</h2>
              <p className="text-[14px] text-stone-600 leading-relaxed mb-3">14.1 Total aggregate liability shall not exceed the total fees paid by you in the twelve (12) months preceding the claim.</p>
              <p className="text-[14px] text-stone-600 leading-relaxed mb-3">14.2 Pepperwahl is not liable for indirect, incidental, special, consequential, or punitive damages.</p>
              <p className="text-[14px] text-stone-600 leading-relaxed">14.5 You agree to indemnify, defend, and hold harmless Survtit Market Research Survey LLP from claims arising from your collection or use of Respondent data, your violation of these Terms, or Your Content.</p>
            </section>

            <section id="termination" className="mb-12">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">15. Suspension & Termination</h2>
              <p className="text-[14px] text-stone-600 leading-relaxed mb-3">15.1 You may close your account at any time through Account Settings.</p>
              <p className="text-[14px] text-stone-600 leading-relaxed">15.2 We may suspend or terminate your access if you materially breach these Terms, fail to pay applicable fees, or if required by law.</p>
            </section>

            <section id="governing" className="mb-12">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">16. Governing Law & Dispute Resolution</h2>
              <p className="text-[14px] text-stone-600 leading-relaxed mb-3">16.1 These Terms are governed by the laws of India, without regard to conflict-of-laws principles.</p>
              <p className="text-[14px] text-stone-600 leading-relaxed mb-3">16.2 Disputes shall first be addressed through good-faith negotiation.</p>
              <p className="text-[14px] text-stone-600 leading-relaxed">16.3 Unresolved disputes shall be referred to arbitration under the Arbitration and Conciliation Act, 1996 of India, with the seat in New Delhi, India.</p>
            </section>

            <section id="changes" className="mb-12">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">17. Changes to These Terms</h2>
              <p className="text-[14px] text-stone-600 leading-relaxed">We will notify account holders by email at least 30 days before material changes take effect. Continued use after changes constitutes acceptance. If you disagree, close your account before the change takes effect.</p>
            </section>

            <section id="general" className="mb-12">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">18. General</h2>
              <p className="text-[14px] text-stone-600 leading-relaxed mb-3"><strong>Entire Agreement:</strong> These Terms, our Privacy Policy, Acceptable Uses Policy, Cookie Notice, and any DPA constitute the entire agreement.</p>
              <p className="text-[14px] text-stone-600 leading-relaxed mb-3"><strong>Severability:</strong> If any provision is found unenforceable, the remaining provisions remain in full effect.</p>
              <p className="text-[14px] text-stone-600 leading-relaxed mb-3"><strong>No Waiver:</strong> Our failure to enforce any provision is not a waiver of our right to do so later.</p>
              <p className="text-[14px] text-stone-600 leading-relaxed"><strong>Assignment:</strong> You may not assign these Terms without our written consent.</p>
            </section>

            <section id="contact" className="mb-8">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">19. Contact Us</h2>
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-6">
                <p className="text-[14px] text-stone-700 font-semibold mb-1">Survtit Market Research Survey LLP</p>
                <p className="text-[13px] text-stone-600">Product: Pepperwahl &nbsp;|&nbsp; LLPIN: ACB-8160</p>
                <p className="text-[13px] text-stone-600 mt-2">Email: privacy@pepperwahl.com (legal & privacy) &nbsp;|&nbsp; support@pepperwahl.com (general)</p>
                <p className="text-[13px] text-stone-600">Address: C/O Mohd. Inam Mehndi Sarai, Near Dhobi Wali Maszid, Jankipuram Police Station, Saharanpur - 247001, Uttar Pradesh, India</p>
                <p className="text-[13px] text-stone-700 mt-3"><strong>Grievance Officer (India, DPDP Act):</strong> Shivam Julka - privacy@pepperwahl.com</p>
                <p className="text-[12px] text-stone-500">We will acknowledge your grievance within 48 hours and resolve it within 30 days.</p>
              </div>
              <p className="text-xs text-stone-400 mt-6 text-center">&copy; 2026 Survtit Market Research Survey LLP (Pepperwahl). All rights reserved.</p>
            </section>

          </div>
        </main>
      </div>
    </div>
  );
};

export default TermsOfUse;
