/**
 * Contact Page - Contact form that saves to admin panel
 */
import React, { useState } from 'react';
import { Mail, Send, Check } from 'lucide-react';
import { getApiBaseUrl } from '../utils/deploymentFix';

const baseUrl = getApiBaseUrl();

const ContactPage: React.FC = () => {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) { setError('All fields are required'); return; }
    setLoading(true);
    setError('');

    try {
      await fetch(`${baseUrl}/api/tracking/button-click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'contact_visitor',
          user_email: form.email,
          user_name: form.name,
          session_id: sessionStorage.getItem('tracking_session_id') || '',
          button_id: 'contact_form_submit',
          button_text: `Contact Form Submitted | ${JSON.stringify(form)}`,
          page: '/contact',
          section: 'landing:contact_form'
        })
      });
      setSent(true);
    } catch {
      setError('Failed to send. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-3xl mx-auto px-6 py-5">
          <span className="text-[11px] font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full uppercase tracking-wider">Support</span>
          <h1 className="text-3xl font-bold text-stone-900 mt-2" style={{ fontFamily: "'Outfit','Inter',sans-serif" }}>Contact Us</h1>
          <p className="text-sm text-stone-500 mt-1">Have a question or need help? Send us a message.</p>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-6 py-10">
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-8">
          {sent ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                <Check size={32} className="text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-stone-900 mb-2">Message Sent!</h2>
              <p className="text-sm text-stone-600">We'll get back to you as soon as possible.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                  <Mail size={20} className="text-red-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-stone-900">Send us a message</h2>
                  <p className="text-xs text-stone-500">We typically respond within 24 hours</p>
                </div>
              </div>

              {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Message *</label>
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm(f => ({ ...f, message: e.target.value }))}
                    rows={4}
                    className="w-full px-4 py-2.5 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 resize-none"
                    placeholder="How can we help?"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? 'Sending...' : <><Send size={16} /> Send Message</>}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-stone-100 text-[12px] text-stone-500 text-center">
                Or email us directly: <a href="mailto:support@pepperwahl.com" className="text-red-600 hover:underline">support@pepperwahl.com</a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
