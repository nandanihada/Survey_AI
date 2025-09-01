import React, { useEffect, useState, useRef } from 'react';
import { Share2, Copy, ExternalLink, CheckCircle, Settings } from 'lucide-react';
import { generateSurveyLink, parseParamString, stringifyParams, type SurveyLinkParams } from '../utils/surveyLinkUtils';

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
  const [showParamEditor, setShowParamEditor] = useState(false);
  const [paramString, setParamString] = useState('');
  const [urlParams, setUrlParams] = useState<SurveyLinkParams>({});
  const shareInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const link = generateSurveyLink(survey.survey_id, undefined, urlParams);
    setShareLink(link);
  }, [survey.survey_id, urlParams]);

  const handleParamStringChange = (value: string) => {
    setParamString(value);
    const parsed = parseParamString(value);
    setUrlParams(parsed);
  };

  const handleAddParam = () => {
    const newParams = { ...urlParams, uid: '123' };
    setUrlParams(newParams);
    setParamString(stringifyParams(newParams));
  };

  const handleAddUsername = () => {
    const newParams = { ...urlParams, username: 'user123' };
    setUrlParams(newParams);
    setParamString(stringifyParams(newParams));
  };

  const handleRemoveParam = (key: string) => {
    const newParams = { ...urlParams };
    delete newParams[key];
    setUrlParams(newParams);
    setParamString(stringifyParams(newParams));
  };

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
          <button
            onClick={() => setShowParamEditor(!showParamEditor)}
            className="flex items-center gap-1 px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Settings size={12} />
            {showParamEditor ? 'Hide' : 'Add'} Parameters
          </button>
        </div>
        {showParamEditor && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
            <label className="block text-xs font-medium text-gray-700 mb-2">
              URL Parameters (e.g., uid=123&source=email)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={paramString}
                onChange={(e) => handleParamStringChange(e.target.value)}
                placeholder="uid=123&source=email&campaign=winter"
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
              <button
                onClick={handleAddParam}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg"
              >
                Add UID
              </button>
              <button
                onClick={handleAddUsername}
                className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg"
              >
                Add Username
              </button>
            </div>
            {Object.keys(urlParams).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {Object.entries(urlParams).map(([key, value]) => (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                  >
                    {key}={value}
                    <button
                      onClick={() => handleRemoveParam(key)}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
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
