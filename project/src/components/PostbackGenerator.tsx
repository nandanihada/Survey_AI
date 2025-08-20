import React, { useState } from 'react';
import { Link, Copy, CheckCircle, Send } from 'lucide-react';

interface PostbackGeneratorProps {
  isDarkMode?: boolean;
}

const PostbackGenerator: React.FC<PostbackGeneratorProps> = ({ isDarkMode = false }) => {
  const [subId, setSubId] = useState('');
  const [postbackUrl, setPostbackUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  const generatePostbackUrl = () => {
    if (!subId.trim()) {
      showMessage('Please enter a Sub ID', 'error');
      return;
    }

    const baseUrl = window.location.hostname.includes('localhost') || window.location.hostname === '127.0.0.1'
      ? 'http://127.0.0.1:5000/postback-handler'
      : 'https://hostslice.onrender.com//postback-handler';

    const url = `${baseUrl}?transaction_id=${encodeURIComponent(subId)}&status=1&reward=0.1&currency=USD&sid1=${encodeURIComponent(subId)}`;
    setPostbackUrl(url);
    showMessage('Postback URL generated successfully!', 'success');
  };

  const copyToClipboard = async () => {
    if (!postbackUrl) return;

    try {
      await navigator.clipboard.writeText(postbackUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showMessage('URL copied to clipboard!', 'success');
    } catch {
      showMessage('Failed to copy URL', 'error');
    }
  };

  const testPostback = async () => {
    if (!postbackUrl) {
      showMessage('Please generate a postback URL first', 'error');
      return;
    }

    try {
      const response = await fetch(postbackUrl, { method: 'GET' });
      if (response.ok) {
        showMessage('Postback test successful!', 'success');
      } else {
        showMessage('Postback test failed', 'error');
      }
    } catch {
      showMessage('Network error during test', 'error');
    }
  };

  const showMessage = (text: string, type: 'success' | 'error' | 'info') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const getMessageStyles = () => {
    const base = 'rounded-xl px-4 py-3 border';
    if (isDarkMode) {
      switch (messageType) {
        case 'success':
          return `${base} bg-green-800/20 border-green-500 text-green-200`;
        case 'error':
          return `${base} bg-red-800/20 border-red-500 text-red-200`;
        default:
          return `${base} bg-blue-800/20 border-blue-500 text-blue-200`;
      }
    } else {
      switch (messageType) {
        case 'success':
          return `${base} bg-green-50 border-green-200 text-green-700`;
        case 'error':
          return `${base} bg-red-50 border-red-200 text-red-700`;
        default:
          return `${base} bg-blue-50 border-blue-200 text-blue-700`;
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className={`text-2xl font-bold flex items-center gap-2 ${
          isDarkMode ? 'text-white' : 'text-gray-900'
        }`}>
          <Link size={24} className="text-red-600" />
          <span className="text-2xl">🌶️</span>
          Postback Generator
        </h2>
      </div>

      <div className={`rounded-2xl p-6 shadow-lg border ${
        isDarkMode 
          ? 'bg-slate-800 border-slate-700' 
          : 'bg-white border-red-100'
      }`}>
        <div className="space-y-6">
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              isDarkMode ? 'text-slate-300' : 'text-gray-700'
            }`}>
              Enter Sub ID
            </label>
            <input
              type="text"
              value={subId}
              onChange={(e) => setSubId(e.target.value)}
              placeholder="e.g. abc123"
              className={`w-full px-4 py-3 border rounded-xl transition-colors ${
                isDarkMode
                  ? 'bg-slate-700 text-white border-slate-600 placeholder-slate-400'
                  : 'bg-white text-gray-900 border-gray-300'
              }`}
            />
          </div>

          <button
            onClick={generatePostbackUrl}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <span className="text-xl">🌶️</span>
            Generate Postback URL
          </button>

          {postbackUrl && (
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-slate-300' : 'text-gray-700'
              }`}>
                Generated Postback URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={postbackUrl}
                  readOnly
                  className={`flex-1 px-4 py-3 border rounded-xl font-mono text-sm ${
                    isDarkMode
                      ? 'bg-slate-700 text-slate-200 border-slate-600'
                      : 'bg-gray-50 text-gray-800 border-gray-300'
                  }`}
                />
                <button
                  onClick={copyToClipboard}
                  className="px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
                >
                  {copied ? (
                    <>
                      <CheckCircle size={18} />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={18} />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {postbackUrl && (
            <button
              onClick={testPostback}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Send size={18} />
              Test Postback (Simulate Hit)
            </button>
          )}

          {message && (
            <div className={getMessageStyles()}>
              {message}
            </div>
          )}
        </div>
      </div>

      <div className={`rounded-2xl p-6 shadow-lg border ${
        isDarkMode 
          ? 'bg-slate-700 border-slate-600 text-slate-200' 
          : 'bg-gradient-to-br from-red-50 to-pink-50 border-red-100 text-gray-700'
      }`}>
        <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${
          isDarkMode ? 'text-white' : 'text-gray-900'
        }`}>
          <span className="text-xl">🌶️</span>
          How Postbacks Work
        </h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-red-600 font-bold">1.</span>
            <p>Enter your unique Sub ID to track specific campaigns or users</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-red-600 font-bold">2.</span>
            <p>The generated URL includes transaction parameters for reward tracking</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-red-600 font-bold">3.</span>
            <p>Use this URL with your affiliate network or tracking platform</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-red-600 font-bold">4.</span>
            <p>Test the postback to ensure it's working correctly before deployment</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostbackGenerator;
