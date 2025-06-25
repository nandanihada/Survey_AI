import React, { useState, useRef } from 'react';
import { Share2, Copy, ExternalLink, CheckCircle } from 'lucide-react';

interface Question {
  question: string;
  type: 'multiple_choice' | 'rating' | 'yes_no' | 'short_answer';
  options?: string[];
}

interface SurveyPreviewProps {
  survey: {
    survey_id: string;
    questions: Question[];
    template_type: string;
    theme: {
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

  React.useEffect(() => {
    // Updated to use the public folder path
    const baseUrl = window.location.hostname.includes('localhost') || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:5173'
      : window.location.origin;
    
    const link = `${baseUrl}/public_survey.html?id=${survey.survey_id}`;
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

  const renderQuestion = (question: Question, index: number) => {
    const questionNumber = index + 1;
    
    return (
      <div 
        key={index} 
        className="bg-white rounded-2xl p-6 shadow-lg border border-red-100 transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
        style={{
          fontFamily: survey.theme?.font || 'Poppins, sans-serif',
          borderLeftColor: survey.theme?.colors?.primary || '#d90429',
          borderLeftWidth: '4px'
        }}
      >
        <h5 
          className="font-semibold mb-4 text-lg flex items-center gap-2"
          style={{ color: survey.theme?.colors?.text || '#1a1a1a' }}
        >
          <span className="text-xl">🌶️</span>
          {questionNumber}. {question.question}
        </h5>

        {question.type === 'multiple_choice' && Array.isArray(question.options) && question.options.length > 0 && (
          <div className="space-y-3">
            {question.options.map((option: string, optIndex: number) => (
              <div 
                key={optIndex} 
                className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-red-50 transition-colors cursor-pointer border border-gray-200 hover:border-red-200"
              >
                <div 
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                  style={{ borderColor: survey.theme?.colors?.primary || '#d90429' }}
                >
                  <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                </div>
                <label className="cursor-pointer font-medium">
                  {String.fromCharCode(65 + optIndex)}) {option}
                </label>
              </div>
            ))}
          </div>
        )}

        {question.type === 'rating' && (
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <div 
                key={rating}
                className="w-12 h-12 rounded-full border-2 flex items-center justify-center cursor-pointer hover:bg-red-50 transition-colors"
                style={{ borderColor: survey.theme?.colors?.primary || '#d90429' }}
              >
                <span className="font-semibold">{rating}</span>
              </div>
            ))}
          </div>
        )}

        {question.type === 'yes_no' && (
          <div className="flex gap-4">
            {['Yes', 'No'].map((option) => (
              <div 
                key={option}
                className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-red-50 transition-colors cursor-pointer border border-gray-200 hover:border-red-200"
              >
                <div 
                  className="w-5 h-5 rounded-full border-2"
                  style={{ borderColor: survey.theme?.colors?.primary || '#d90429' }}
                ></div>
                <label className="cursor-pointer font-medium">{option}</label>
              </div>
            ))}
          </div>
        )}

        {question.type === 'short_answer' && (
          <textarea
            placeholder="Your answer here..."
            rows={3}
            className="w-full p-4 border border-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
            style={{ fontFamily: survey.theme?.font || 'Poppins, sans-serif' }}
          />
        )}
      </div>
    );
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
          <span className="text-4xl">🌶️</span>
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
          <span className="text-xl">🌶️</span>
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

      {/* Template Preview Info */}
      <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl p-6 shadow-lg border border-red-100">
        <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span className="text-2xl">🌶️</span>
          Template: {survey.template_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </h3>
        <p className="text-gray-700 mb-4">
          This survey will be displayed with a beautiful {survey.template_type.replace('_', ' ')} template featuring:
        </p>
        <ul className="list-disc list-inside text-gray-700 space-y-2">
          <li>Custom background image and gradient</li>
          <li>Smooth animations and transitions</li>
          <li>Responsive design for all devices</li>
          <li>Chili pepper branding elements</li>
          <li>Template-specific visual styling</li>
        </ul>
      </div>

      {/* Questions Preview */}
      <div className="space-y-6">
        <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <span className="text-2xl">🌶️</span>
          Survey Preview
        </h3>
        {survey.questions.map((question, index) => renderQuestion(question, index))}
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
          <span className="mr-2">🌶️</span>
          Submit Survey (Preview Mode)
        </button>
      </div>
    </div>
  );
};

export default SurveyPreview;