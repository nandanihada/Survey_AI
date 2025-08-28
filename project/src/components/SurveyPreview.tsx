import React, { useEffect, useState, useRef } from 'react';
import { Share2, Copy, ExternalLink, CheckCircle } from 'lucide-react';

interface SurveyPreviewProps {
  survey: {
    survey_id: string;
    template_type: string;
    theme?: {
      font?: string;
      colors?: {
        primary?: string;
        background?: string;
        text?: string;
      };
    };
    prompt: string;
  };
}

const SurveyPreview: React.FC<SurveyPreviewProps> = ({ survey }) => {
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  const shareInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const baseUrl =
      window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:5173'
        : 'https://theinterwebsite.space';

    setShareLink(`${baseUrl}/survey/${survey.survey_id}`);
  }, [survey.survey_id]);

  const copyToClipboard = async () => {
    if (shareInputRef.current) {
      shareInputRef.current.select();
      try {
        await navigator.clipboard.writeText(shareLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Share Link Section - Now on Top */}
      <div className="bg-white rounded-xl p-5 shadow border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Share2 size={16} className="text-red-500" />
            Share this survey
          </h4>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <input
            ref={shareInputRef}
            type="text"
            value={shareLink}
            readOnly
            className="flex-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50 focus:outline-none"
          />
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={copyToClipboard}
              className="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg flex items-center justify-center gap-1"
            >
              {copied ? (
                <>
                  <CheckCircle size={14} />
                  Copied
                </>
              ) : (
                <>
                  <Copy size={14} />
                  Copy
                </>
              )}
            </button>
            <a
              href={shareLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-4 py-2 bg-gray-800 hover:bg-black text-white text-sm rounded-lg flex items-center justify-center gap-1"
            >
              <ExternalLink size={14} />
              Open
            </a>
          </div>
        </div>
      </div>

      {/* Survey Preview Section */}
      <div className="rounded-xl border shadow bg-white overflow-hidden">
        <iframe
          src={shareLink}
          title="Survey Preview"
          className="w-full"
          style={{
            height: '500px',
            transform: 'scale(0.9)',
            transformOrigin: 'top left',
            width: '111%',
            border: 'none',
            pointerEvents: 'auto',
            overflow: 'auto',
          }}
        />
      </div>
    </div>
  );
};

export default SurveyPreview;
