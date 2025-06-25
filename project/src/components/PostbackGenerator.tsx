import React, { useState } from 'react';
import { Link, Copy, CheckCircle, Send } from 'lucide-react';

const PostbackGenerator: React.FC = () => {
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
      : 'https://pepper-flask-app.onrender.com/postback-handler';

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
    switch (messageType) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-700';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-700';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200 text-blue-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Link size={24} className="text-red-600" />
          <span className="text-2xl">🌶️</span>
          Postback Generator
        </h2>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-lg border border-red-100">
        <div className="space-y-6">
          {/* Sub ID Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter Sub ID
            </label>
            <input
              type="text"
              value={subId}
              onChange={(e) => setSubId(e.target.value)}
              placeholder="e.g. abc123"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
            />
          </div>

          {/* Generate Button */}
          <button
            onClick={generatePostbackUrl}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <span className="text-xl">🌶️</span>
            Generate Postback URL
          </button>

          {/* Generated URL */}
          {postbackUrl && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Generated Postback URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={postbackUrl}
                  readOnly
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-sm font-mono"
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

          {/* Test Button */}
          {postbackUrl && (
            <button
              onClick={testPostback}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Send size={18} />
              Test Postback (Simulate Hit)
            </button>
          )}

          {/* Message */}
          {message && (
            <div className={`px-4 py-3 rounded-xl border ${getMessageStyles()}`}>
              {message}
            </div>
          )}
        </div>
      </div>

      {/* Information Panel */}
      <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl p-6 shadow-lg border border-red-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span className="text-xl">🌶️</span>
          How Postbacks Work
        </h3>
        <div className="space-y-3 text-gray-700">
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