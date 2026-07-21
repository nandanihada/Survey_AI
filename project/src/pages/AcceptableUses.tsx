/**
 * Acceptable Uses Policy Page
 */
import React, { useState, useEffect } from 'react';

const sections = [
  { id: 'about', title: '1. About This Policy', group: 'GENERAL' },
  { id: 'prohibited', title: '2. Prohibited Content', group: 'GENERAL' },
  { id: 'data-rules', title: '3. Data Collection Rules', group: 'RULES' },
  { id: 'platform', title: '4. Platform Integrity', group: 'RULES' },
  { id: 'ai-usage', title: '5. AI Feature Usage', group: 'RULES' },
  { id: 'enforcement', title: '6. Enforcement', group: 'OTHER' },
  { id: 'changes', title: '7. Changes to This Policy', group: 'OTHER' },
  { id: 'contact', title: '8. Contact Us', group: 'OTHER' },
];

const AcceptableUses: React.FC = () => {
  const [activeSection, setActiveSection] = useState('about');

  useEffect(() => {
    const handleScroll = () => {
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i].id);
        if (el && el.getBoundingClientRect().top <= 140) { setActiveSection(sections[i].id); break; }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const groups = [...new Set(sections.map(s => s.group))];

  return (
    <div className="min-h-screen bg-stone-50">
      <style>{`::-webkit-scrollbar{width:8px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.15);border-radius:4px}`}</style>
      <div className="bg-white border-b border-stone-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <span className="text-[11px] font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full uppercase tracking-wider">Legal</span>
          <h1 className="text-3xl font-bold text-stone-900 mt-2" style={{ fontFamily: "'Outfit','Inter',sans-serif" }}>Acceptable Uses Policy</h1>
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
                <button key={s.id} onClick={() => scrollTo(s.id)} className={`block w-full text-left text-[12px] py-1.5 px-2 rounded-md transition-all mb-0.5 ${activeSection === s.id ? 'bg-red-50 text-red-700 font-semibold border-l-2 border-red-500' : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100'}`}>{s.title}</button>
              ))}
            </div>
          ))}
        </aside>
        <main className="flex-1 py-8 px-6 lg:px-12">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-12 lg:p-16">

            <section id="about" className="mb-12">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">1. About This Policy</h2>
              <p className="text-[14px] text-stone-600 leading-relaxed mb-3">This Acceptable Uses Policy ("AUP") governs how you may use the Pepperwahl platform and services. It is incorporated into and forms part of our <a href="/terms" className="text-red-600 hover:underline">Terms of Use</a>.</p>
              <p className="text-[14px] text-stone-600 leading-relaxed">By using the Services, you agree to comply with this policy. If you violate it, we may restrict, suspend, or terminate your account.</p>
            </section>

            <section id="prohibited" className="mb-12">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">2. Prohibited Content</h2>
              <p className="text-[14px] text-stone-600 leading-relaxed mb-4">You may not use Pepperwahl to create, distribute, or collect surveys that contain or facilitate:</p>
              <ul className="space-y-3 text-[14px] text-stone-600">
                <li><strong className="text-stone-800">Spam or phishing</strong> — unsolicited bulk communications, deceptive messages, or content designed to trick recipients into revealing personal information</li>
                <li><strong className="text-stone-800">Fraud or scams</strong> — surveys that impersonate another person, organization, or government body</li>
                <li><strong className="text-stone-800">Harassment or threats</strong> — content that harasses, bullies, intimidates, or threatens any individual or group</li>
                <li><strong className="text-stone-800">Discrimination</strong> — surveys designed to discriminate based on race, ethnicity, religion, gender, sexual orientation, disability, caste, age, or any protected characteristic</li>
                <li><strong className="text-stone-800">Hate speech</strong> — content that promotes hatred, violence, or intolerance</li>
                <li><strong className="text-stone-800">Illegal activity</strong> — content that promotes or instructs on illegal activities</li>
                <li><strong className="text-stone-800">Malware</strong> — surveys that contain or distribute viruses or harmful software</li>
                <li><strong className="text-stone-800">Sexually explicit content</strong> — pornographic material, unless conducting legitimate consented adult research</li>
                <li><strong className="text-stone-800">IP violations</strong> — content that infringes on copyrights, trademarks, or other IP rights</li>
              </ul>
            </section>

            <section id="data-rules" className="mb-12">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">3. Data Collection Rules</h2>
              <h3 className="text-base font-semibold text-stone-800 mb-2 mt-4">3.1 Have a lawful basis</h3>
              <p className="text-[14px] text-stone-600 leading-relaxed mb-4">Ensure you have a valid legal basis for collecting each piece of personal data. This is your responsibility as the Data Controller / Data Fiduciary.</p>
              <h3 className="text-base font-semibold text-stone-800 mb-2">3.2 Provide privacy disclosures</h3>
              <p className="text-[14px] text-stone-600 leading-relaxed mb-4">Before collecting data, inform Respondents about who you are, what you're collecting, why, how it will be used, retention period, and how they can exercise their rights.</p>
              <h3 className="text-base font-semibold text-stone-800 mb-2">3.3 Obtain consent for sensitive data</h3>
              <p className="text-[14px] text-stone-600 leading-relaxed mb-4">If your survey collects sensitive personal data (health, biometric, genetic, religious, political, sexual orientation, caste, or trade union membership), you must obtain explicit, informed consent.</p>
              <h3 className="text-base font-semibold text-stone-800 mb-2">3.4 Protect children's data</h3>
              <p className="text-[14px] text-stone-600 leading-relaxed mb-4">If your survey targets minors, you must obtain verifiable parental or guardian consent. You are solely responsible for compliance with DPDP Act, GDPR, COPPA, and LGPD.</p>
              <h3 className="text-base font-semibold text-stone-800 mb-2">3.5 Honour data subject rights</h3>
              <p className="text-[14px] text-stone-600 leading-relaxed mb-4">You must respond to requests from Respondents to access, correct, delete, or export their data. You are the first point of contact.</p>
              <h3 className="text-base font-semibold text-stone-800 mb-2">3.6 Manage your communications</h3>
              <ul className="list-disc pl-6 space-y-2 text-[14px] text-stone-600">
                <li>Send only to recipients who have a reasonable expectation of hearing from you</li>
                <li>Include a clear unsubscribe/opt-out mechanism in every communication</li>
                <li>Maintain and honour your own suppression and unsubscribe lists</li>
                <li>Do not purchase or use third-party contact lists without proper consent</li>
                <li>Do not send invitations that disguise commercial marketing as research</li>
              </ul>
            </section>

            <section id="platform" className="mb-12">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">4. Platform Integrity</h2>
              <p className="text-[14px] text-stone-600 leading-relaxed mb-3">You may not:</p>
              <ul className="list-disc pl-6 space-y-2 text-[14px] text-stone-600">
                <li>Attempt unauthorized access to the Services or other users' accounts</li>
                <li>Reverse-engineer, decompile, or extract source code</li>
                <li>Scrape or bulk-extract data using automated means</li>
                <li>Interfere with performance or availability (DoS, spam, excessive API calls)</li>
                <li>Circumvent security measures, rate limits, or anti-abuse protections</li>
                <li>Create multiple free accounts to circumvent plan limits or evade suspension</li>
                <li>Resell or sublicense the Services without written consent</li>
              </ul>
            </section>

            <section id="ai-usage" className="mb-12">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">5. AI Feature Usage</h2>
              <ul className="list-disc pl-6 space-y-2 text-[14px] text-stone-600">
                <li>Review all AI-generated content before using or distributing it</li>
                <li>Do not use AI features to generate content that violates this policy</li>
                <li>Do not attempt to extract, reverse-engineer, or probe the underlying AI models</li>
              </ul>
            </section>

            <section id="enforcement" className="mb-12">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">6. Enforcement</h2>
              <h3 className="text-base font-semibold text-stone-800 mb-2">6.1 How we enforce</h3>
              <p className="text-[14px] text-stone-600 leading-relaxed mb-3">Actions may include: issuing warnings, removing content, restricting features, temporary suspension, or permanent termination.</p>
              <h3 className="text-base font-semibold text-stone-800 mb-2">6.2 Reporting violations</h3>
              <p className="text-[14px] text-stone-600 leading-relaxed">Report violations to <strong>abuse@pepperwahl.com</strong>. Include the survey URL, description, and supporting evidence. We respond within 5 business days.</p>
            </section>

            <section id="changes" className="mb-12">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">7. Changes to This Policy</h2>
              <p className="text-[14px] text-stone-600 leading-relaxed">We will notify account holders by email at least 30 days before material changes take effect. Continued use constitutes acceptance.</p>
            </section>

            <section id="contact" className="mb-8">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 pb-3 border-b border-stone-100">8. Contact Us</h2>
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-6">
                <p className="text-[14px] text-stone-700 font-semibold mb-1">Survtit Market Research Survey LLP</p>
                <p className="text-[13px] text-stone-600">Product: Pepperwahl &nbsp;|&nbsp; LLPIN: ACB-8160</p>
                <p className="text-[13px] text-stone-600 mt-2">Email: abuse@pepperwahl.com (violations) &nbsp;|&nbsp; privacy@pepperwahl.com (privacy)</p>
                <p className="text-[13px] text-stone-600">Address: C/O Mohd. Inam Mehndi Sarai, Near Dhobi Wali Maszid, Jankipuram Police Station, Saharanpur - 247001, UP, India</p>
              </div>
            </section>

          </div>
        </main>
      </div>
    </div>
  );
};

export default AcceptableUses;
