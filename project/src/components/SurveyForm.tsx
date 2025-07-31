import React, { useState } from 'react';
import TemplateSelector from './TemplateSelector';
import ThemeSelector from './ThemeSelector';
import SurveyPreview from './SurveyPreview';
import { generateSurvey } from '../utils/api';
import { Sparkles, Loader2, MessageSquare, Hash } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
interface Question {
  id: string;
  text: string;
  type: string;
  options?: string[];
}

interface SurveyData {
  survey_id: string;
  questions: Question[];
  template_type: string;
  theme: {
    font: string;
    intent: string;
    colors: {
      primary: string;
      background: string;
      text: string;
    };
  };
  prompt: string;
  animationSpeed: number;
}

interface SurveyFormProps {
  isDarkMode?: boolean;
}

const SurveyForm: React.FC<SurveyFormProps> = ({ isDarkMode = false }) => {
  const navigate = useNavigate();
  const [surveyTopic, setSurveyTopic] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('custom');
  const [questionCount, setQuestionCount] = useState(10);
  const [theme, setTheme] = useState({
    font: 'Poppins, sans-serif',
    intent: 'professional',
    animationSpeed: 0.08,
    colors: {
      primary: '#d90429',
      background: '#ffffff',
      text: '#1a1a1a',
    },
  });
  const [isLoading, setIsLoading] = useState(false);
  const [generatedSurvey, setGeneratedSurvey] = useState<SurveyData | null>(null);
  const [error, setError] = useState('');

  const handleGenerateSurvey = async () => {
    if (!surveyTopic.trim()) {
      setError('Please enter a survey topic');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const requestData = {
        prompt: surveyTopic,
        template_type: selectedTemplate,
        theme,
        question_count: questionCount,
      };

      const result = await generateSurvey(requestData);
      console.log('Generated survey result:', result);
      console.log('Questions in result:', result.questions);
      setGeneratedSurvey(result);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to generate survey');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-12 px-0 gap-4 py-6">
      {/* Left Sidebar - Theme */}
      <div className="col-span-3">
        <div
          className={`rounded-xl border transition-all duration-300 ${
            isDarkMode
              ? 'bg-slate-800/50 border-slate-700'
              : 'bg-white border-stone-200 shadow-sm'
          }`}
        >
          <ThemeSelector
            theme={theme}
            onThemeChange={setTheme}
            isDarkMode={isDarkMode}
          />
        </div>
      </div>

      {/* Center Content */}
      <div className="col-span-6 space-y-6">
        {/* Form Card */}
        <div
          className={`rounded-xl border p-6 transition-all duration-300 ${
            isDarkMode
              ? 'bg-slate-800/50 border-slate-700'
              : 'bg-white border-stone-200 shadow-sm'
          }`}
        >
          <div className="flex items-center gap-2 mb-6">
            <div
              className={`w-6 h-6 rounded-md flex items-center justify-center text-xs ${
                isDarkMode ? 'bg-red-500/20 text-red-400' : 'bg-red-50 text-red-600'
              }`}
            >
              <Sparkles size={14} />
            </div>
            <h2
              className={`text-lg font-medium ${
                isDarkMode ? 'text-white' : 'text-stone-800'
              }`}
            >
              Generate Survey
            </h2>
          </div>

          <div className="space-y-5">
            {/* Topic */}
            <div>
              <label
                className={`block text-sm font-medium mb-2 flex items-center gap-1.5 ${
                  isDarkMode ? 'text-slate-300' : 'text-stone-700'
                }`}
              >
                <MessageSquare size={14} />
                Survey Topic
              </label>
              <textarea
                value={surveyTopic}
                onChange={(e) => setSurveyTopic(e.target.value)}
                placeholder="Describe your survey topic (e.g., Customer feedback on food delivery app)"
                className={`w-full px-3 py-3 border rounded-lg text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors resize-none ${
                  isDarkMode
                    ? 'bg-slate-700/50 border-slate-600 text-white placeholder-slate-400'
                    : 'bg-stone-50 border-stone-300 placeholder-stone-500'
                }`}
                rows={3}
              />
            </div>

            {/* Question Count */}
            <div>
              <label
                className={`block text-sm font-medium mb-2 flex items-center gap-1.5 ${
                  isDarkMode ? 'text-slate-300' : 'text-stone-700'
                }`}
              >
                <Hash size={14} />
                Number of Questions
              </label>
              <select
                value={questionCount}
                onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors ${
                  isDarkMode
                    ? 'bg-slate-700/50 border-slate-600 text-white'
                    : 'bg-stone-50 border-stone-300'
                }`}
              >
                <option value={5}>5 Questions</option>
                <option value={10}>10 Questions</option>
                <option value={12}>12 Questions</option>
                <option value={15}>15 Questions</option>
                <option value={20}>20 Questions</option>
                <option value={25}>25 Questions</option>
                <option value={30}>30 Questions</option>
                <option value={50}>50 Questions</option>
                <option value={75}>75 Questions</option>
                <option value={100}>100 Questions</option>
              </select>
              <p className={`text-xs mt-1 ${
                isDarkMode ? 'text-slate-400' : 'text-stone-500'
              }`}>
                Choose how many questions you want in your survey (5-100)
              </p>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerateSurvey}
              disabled={isLoading || !surveyTopic.trim()}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-stone-400 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Generate Survey
                </>
              )}
            </button>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Template Selector */}
        <div
          className={`rounded-xl border transition-all duration-300 ${
            isDarkMode
              ? 'bg-slate-800/50 border-slate-700'
              : 'bg-white border-stone-200 shadow-sm'
          }`}
        >
          <TemplateSelector
            selectedTemplate={selectedTemplate}
            onSelectTemplate={setSelectedTemplate}
            isDarkMode={isDarkMode}
          />
        </div>
      </div>

       {/* Right Sidebar - Preview */}
      <div className="col-span-3">
        {generatedSurvey ? (
          <>
            <SurveyPreview
              survey={{
                survey_id: generatedSurvey.survey_id,
                template_type: generatedSurvey.template_type,
                theme: generatedSurvey.theme,
                prompt: generatedSurvey.prompt,
              }}
            />

            <div className="mt-4 space-y-2">
              <button
                onClick={() => navigate(`/preview/${generatedSurvey.survey_id}`)}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-all"
              >
                Preview Survey
              </button>
              <button
                onClick={() => navigate(`/edit/${generatedSurvey.survey_id}`)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-all"
              >
                Edit Survey
              </button>
            </div>
          </>
        ) : (
          <div
            className={`rounded-xl border h-96 flex items-center justify-center transition-all duration-300 ${
              isDarkMode
                ? 'bg-slate-800/50 border-slate-700'
                : 'bg-white border-stone-200 shadow-sm'
            }`}
          >
            <div className="text-center">
              <div
                className={`w-12 h-12 rounded-lg mx-auto mb-3 flex items-center justify-center ${
                  isDarkMode
                    ? 'bg-slate-700 text-slate-400'
                    : 'bg-stone-100 text-stone-400'
                }`}
              >
                <MessageSquare size={20} />
              </div>
              <p
                className={`text-sm font-medium ${
                  isDarkMode ? 'text-slate-300' : 'text-stone-600'
                }`}
              >
                Survey Preview
              </p>
              <p
                className={`text-xs mt-1 ${
                  isDarkMode ? 'text-slate-400' : 'text-stone-500'
                }`}
              >
                Generate a survey to see preview
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SurveyForm;
