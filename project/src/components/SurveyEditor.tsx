import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import OptimizedLoader from './OptimizedLoader';
import TemplateSelector from './TemplateSelector';
import type { Survey, Question } from '../types/Survey';
import { Plus, Trash2, Save, ArrowLeft, Grid3X3 } from 'lucide-react';
import './SurveyEditor.css';

interface SimpleQuestionProps {
  question: Question;
  index: number;
  onUpdate: (index: number, field: keyof Question, value: any) => void;
  onDelete: (index: number) => void;
}

const SimpleQuestion: React.FC<SimpleQuestionProps> = React.memo(({ 
  question, 
  index, 
  onUpdate, 
  onDelete
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <span className="text-sm font-medium text-gray-600">Question {index + 1}</span>
        <button
          onClick={() => onDelete(index)}
          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
          title="Delete Question"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Question Text
          </label>
          <textarea
            value={question.question || ''}
            onChange={(e) => onUpdate(index, 'question', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            placeholder="Enter your question here..."
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Question Description (Optional)
          </label>
          <textarea
            value={question.questionDescription || ''}
            onChange={(e) => onUpdate(index, 'questionDescription', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            placeholder="Add additional context or instructions for this question..."
            rows={2}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Answer Instructions (Optional)
          </label>
          <textarea
            value={question.answerDescription || ''}
            onChange={(e) => onUpdate(index, 'answerDescription', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            placeholder="Provide guidance on how to answer this question..."
            rows={2}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Answer Type
            </label>
            <select
              value={question.type}
              onChange={(e) => {
                const newType = e.target.value;
                onUpdate(index, 'type', newType);
                if (['multiple_choice', 'radio', 'checkbox', 'dropdown'].includes(newType) && (!question.options || question.options.length === 0)) {
                  onUpdate(index, 'options', ['Option 1', 'Option 2', 'Option 3']);
                }
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="short_answer">Short Answer</option>
              <option value="text">Long Text</option>
              <option value="multiple_choice">Multiple Choice</option>
              <option value="radio">Radio Buttons</option>
              <option value="checkbox">Checkboxes</option>
              <option value="dropdown">Dropdown</option>
              <option value="yes_no">Yes/No</option>
              <option value="rating">Rating Scale (1-5)</option>
              <option value="range">Range Slider</option>
            </select>
          </div>

          <div className="flex items-center">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={question.required || false}
                onChange={(e) => onUpdate(index, 'required', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Required
            </label>
          </div>
        </div>

        {['multiple_choice', 'radio', 'checkbox', 'dropdown'].includes(question.type) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Options
            </label>
            <div className="space-y-2">
              {(question.options || []).map((option, optIndex) => (
                <div key={optIndex} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-8">{optIndex + 1}.</span>
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...(question.options || [])];
                      newOptions[optIndex] = e.target.value;
                      onUpdate(index, 'options', newOptions);
                    }}
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={`Option ${optIndex + 1}`}
                  />
                  <button
                    onClick={() => {
                      const newOptions = (question.options || []).filter((_, i) => i !== optIndex);
                      onUpdate(index, 'options', newOptions);
                    }}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    disabled={(question.options || []).length <= 1}
                    title="Delete Option"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const newOptions = [...(question.options || []), ''];
                    onUpdate(index, 'options', newOptions);
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                >
                  <Plus size={14} />
                  Add Option
                </button>
                <button
                  onClick={() => {
                    const newOptions = [...(question.options || []), 'Other'];
                    onUpdate(index, 'options', newOptions);
                  }}
                  className="text-sm text-gray-600 hover:text-gray-700 font-medium flex items-center gap-1"
                >
                  Add "Other"
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

const SurveyEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState('');

  const isLocalhost = window.location.hostname === 'localhost';
  const apiBaseUrl = isLocalhost ? 'http://localhost:5000' : 'https://api.theinterwebsite.space/';

  useEffect(() => {
    if (!id) return;

    const fetchSurvey = async () => {
      setIsLoading(true);
      setError('');

      try {
        const res = await fetch(`${apiBaseUrl}/survey/${id}/view`);
        if (!res.ok) throw new Error(`Failed to fetch survey: ${res.status}`);

        const data = await res.json();
        const surveyData = data.survey || data;

        if (!surveyData || !surveyData.questions) {
          throw new Error('Invalid survey data received');
        }

        setSurvey(surveyData);
      } catch (err: any) {
        console.error('Error fetching survey:', err);
        setError(err.message || 'Failed to load survey');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSurvey();
  }, [id, apiBaseUrl]);

  const handleSave = useCallback(async () => {
    if (!survey) return;
    setIsSaving(true);
    setSaveStatus('saving');

    try {
      const res = await fetch(`${apiBaseUrl}/survey/${survey.id}/edit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(survey),
      });

      if (!res.ok) throw new Error(`Failed to save survey: ${res.status}`);

      setSaveStatus('saved');
      setSaveMessage('Survey saved successfully!');

      setTimeout(() => {
        setSaveStatus('idle');
        setSaveMessage('');
      }, 3000);
    } catch (err: any) {
      setSaveStatus('error');
      setSaveMessage(err.message || 'Save failed');

      setTimeout(() => {
        setSaveStatus('idle');
        setSaveMessage('');
      }, 5000);
    } finally {
      setIsSaving(false);
    }
  }, [survey, apiBaseUrl]);

  const handleQuestionUpdate = useCallback((index: number, field: keyof Question, value: any) => {
    if (!survey) return;

    const updatedQuestions = [...survey.questions];
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };

    setSurvey({ ...survey, questions: updatedQuestions });
  }, [survey]);

  const handleQuestionDelete = useCallback((index: number) => {
    if (!survey) return;

    const updatedQuestions = survey.questions.filter((_, i) => i !== index);
    setSurvey({ ...survey, questions: updatedQuestions });
  }, [survey]);

  const addNewQuestion = useCallback(() => {
    if (!survey) return;

    const newQuestion: Question = {
      id: `question_${Date.now()}`,
      question: 'New Question',
      type: 'short_answer',
      required: false,
    };

    setSurvey({ ...survey, questions: [...survey.questions, newQuestion] });
  }, [survey]);

  if (isLoading) {
    return <OptimizedLoader type="page" message="Loading survey editor..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 text-lg mb-4">Survey not found</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft size={16} />
                Back
              </button>
              <h1 className="text-xl font-semibold text-gray-900">
                Edit: {survey.title || 'Untitled Survey'}
              </h1>
            </div>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              <Save size={16} />
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Survey Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Survey Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Survey Title</label>
              <input
                type="text"
                value={survey.title || ''}
                onChange={(e) => setSurvey({ ...survey, title: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter survey title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Survey Description</label>
              <textarea
                value={survey.subtitle || ''}
                onChange={(e) => setSurvey({ ...survey, subtitle: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter survey description"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Grid3X3 size={16} />
                Survey Template
              </label>
              <div className="border border-gray-300 rounded-md p-4">
                <TemplateSelector
                  selectedTemplate={survey.template_type || 'custom'}
                  onSelectTemplate={(newTemplate) => setSurvey({ ...survey, template_type: newTemplate })}
                  isDarkMode={false}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Changing the template will affect how your survey is displayed to respondents.
              </p>
            </div>
          </div>
        </div>

        {/* Questions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-gray-900">Questions ({(survey.questions || []).length})</h2>
            <button
              onClick={addNewQuestion}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} />
              Add Question
            </button>
          </div>

          <div className="space-y-4">
            {(survey.questions || []).map((question, index) => (
              <SimpleQuestion
                key={question.id}
                question={question}
                index={index}
                onUpdate={handleQuestionUpdate}
                onDelete={handleQuestionDelete}
              />
            ))}
          </div>

          {(!survey.questions || survey.questions.length === 0) && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg mb-4">No questions yet</p>
              <button
                onClick={addNewQuestion}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
              >
                <Plus size={16} />
                Add Your First Question
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Save Status Toast */}
      {saveStatus !== 'idle' && (
        <div className={`fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2 ${
          saveStatus === 'saved'
            ? 'bg-green-500 text-white'
            : saveStatus === 'error'
            ? 'bg-red-500 text-white'
            : 'bg-blue-500 text-white'
         }`}
        >
          {saveStatus === 'saving' && (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
          )}
          <span className="text-sm font-medium">{saveMessage}</span>
        </div>
      )}
    </div>
  );
};

export default SurveyEditor;
