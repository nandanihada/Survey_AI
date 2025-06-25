import React, { useState, useRef } from 'react';
import { Share2, Copy, ExternalLink, CheckCircle } from 'lucide-react';
import CustomerFeedbackTemplate from '../templates/CustomerFeedbackTemplate';

interface SurveyQuestion {
  question: string;
  type: 'multiple_choice' | 'rating' | 'yes_no' | 'short_answer';
  options?: string[];
}

interface SurveyPreviewProps {
  survey: {
    survey_id: string;
    questions: SurveyQuestion[];
    template_type: string;
    theme: {
      font?: string;
      animationSpeed?: number;
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

  React.useEffect(() => {
    const baseUrl = window.location.hostname.includes('localhost') || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:5173'
      : 'https://pepperadsresponses.web.app';

    const link = `${baseUrl}/survey/${survey.survey_id}`;
    setShareLink(link);
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
    <div className="space-y-8">
      {/* Header */}
      <div
        className="text-center p-8 rounded-2xl shadow-lg"
        style={{
          backgroundColor: survey.theme?.colors?.background || '#ffffff',
          color: survey.theme?.colors?.text || '#1a1a1a',
          fontFamily: survey.theme?.font || 'Poppins, sans-serif'
        }}
      >
        <h1
          className="text-3xl font-bold mb-4 flex items-center justify-center gap-3"
          style={{ color: survey.theme?.colors?.primary || '#d90429' }}
        >
          <span className="text-4xl"></span>
          {survey.prompt}
        </h1>
        <p className="text-lg opacity-80">
          Share your thoughts with us - your feedback helps us improve!
        </p>
      </div>

      {/* Share Link */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-red-100">
        <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Share2 size={20} className="text-red-600" />
          <span className="text-xl"></span>
          Share This Survey
        </h3>
        <div className="flex gap-2">
          <input
            ref={shareInputRef}
            type="text"
            value={shareLink}
            readOnly
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl bg-gray-50"
          />
          <button
            onClick={copyToClipboard}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
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
          <a
            href={shareLink}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 bg-gray-900 hover:bg-black text-white rounded-xl font-medium transition-colors flex items-center gap-2"
          >
            <ExternalLink size={18} />
            Open
          </a>
        </div>
      </div>

      {/* Embedded Real Template Preview */}
      <div className="space-y-6">
        <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <span className="text-2xl"></span>
          Survey Template Preview
        </h3>
        <div className="border rounded-xl overflow-hidden shadow-lg max-h-[500px] overflow-y-auto bg-white">
          
<div className="preview-wrapper">
          <CustomerFeedbackTemplate
  survey={{
    ...survey,
    id: survey.survey_id,
    questions: survey.questions.map((q, idx) => ({
      id: q.question + '-' + idx,
      question: q.question,
      type:
        q.type === 'multiple_choice'
          ? 'radio'
          : q.type === 'rating'
          ? 'range'
          : q.type === 'yes_no'
          ? 'radio'
          : 'text',
      options: q.options,
    })),
  }}
  previewMode={true}
/>
</div>
        </div>
      </div>

      {/* Submit Button Preview */}
      <div className="text-center">
        <button
          className="px-8 py-4 text-white font-semibold rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl cursor-not-allowed opacity-75"
          style={{
            backgroundColor: survey.theme?.colors?.primary || '#d90429',
            fontFamily: survey.theme?.font || 'Poppins, sans-serif'
          }}
          disabled
        >
          <span className="mr-2">
            <img
              src="https://i.postimg.cc/9Mhc6NJ6/chilllllllli.png"
              alt="Chilli Icon"
              className="w-6 h-6 inline-block "
            />
          </span>
          Submit Survey (Preview Mode)
        </button>
      </div>
    </div>
  );
};

export default SurveyPreview;
