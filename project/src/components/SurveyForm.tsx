import React, { useState } from 'react';
import TemplateSelector from './TemplateSelector';
import ThemeSelector from './ThemeSelector';
import SurveyPreview from './SurveyPreview';
import { generateSurvey } from '../utils/api';
import { Sparkles, Loader2 } from 'lucide-react';

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

const SurveyForm = () => {
  const [surveyTopic, setSurveyTopic] = useState('');
  const [questionCount, setQuestionCount] = useState(10);
  const [responseType, setResponseType] = useState('multiple_choice');
  const [selectedTemplate, setSelectedTemplate] = useState('customer_feedback');
  const [theme, setTheme] = useState({
    font: 'Poppins, sans-serif',
    intent: 'professional',
     animationSpeed: 0.08,
    colors: {
      primary: '#d90429',
      background: '#ffffff',
      text: '#1a1a1a'
    }
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
        response_type: responseType,
        template_type: selectedTemplate,
        question_count: questionCount,
        theme
      };

      const result = await generateSurvey(requestData);
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
    <div className="space-y-8">
      {/* Survey Configuration */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-red-100">
        <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <span className="text-2xl">🌶️</span>
          Generate AI Survey
        </h3>

        <div className="space-y-6">
          {/* Topic and Settings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Survey Topic
              </label>
              <input
                type="text"
                value={surveyTopic}
                onChange={(e) => setSurveyTopic(e.target.value)}
                placeholder="Enter survey topic (e.g., Customer Satisfaction)"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Response Type
              </label>
              <select
                value={responseType}
                onChange={(e) => setResponseType(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
              >
                <option value="multiple_choice">Multiple Choice</option>
                <option value="likert_scale">Likert Scale</option>
                <option value="yes_no">Yes/No</option>
              </select>
            </div>
          </div>

          {/* Question Count */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of Questions
            </label>
            <input
              type="number"
              value={questionCount}
              onChange={(e) => setQuestionCount(parseInt(e.target.value) || 10)}
              min="1"
              max="30"
              className="w-32 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
            />
          </div>

          {/* Template Selector */}
          <TemplateSelector
            selectedTemplate={selectedTemplate}
            onSelectTemplate={setSelectedTemplate}
          />

          {/* Theme Selector */}
          <ThemeSelector
            theme={theme}
            onThemeChange={setTheme}
          />

          {/* Generate Button */}
          <button
            onClick={handleGenerateSurvey}
            disabled={isLoading || !surveyTopic.trim()}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-4 px-8 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Generating Survey...
              </>
            ) : (
              <>
                <Sparkles size={20} />
                Generate Survey
              </>
            )}
          </button>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Survey Preview */}
      {generatedSurvey && (
        <SurveyPreview
          survey={{
            ...generatedSurvey,
            questions: generatedSurvey.questions.map((q) => ({
              question: q.text,
              type:
                q.type === 'likert_scale'
                  ? 'rating'
                  : q.type === 'multiple_choice'
                  ? 'multiple_choice'
                  : q.type === 'yes_no'
                  ? 'yes_no'
                  : 'short_answer',
              options: q.options,
            })),
          }}
        />
      )}
    </div>
  );
};

export default SurveyForm;