import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import type { Survey, Question, SurveyPage } from '../types/Survey';
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  Save, 
  Undo, 
  Redo, 
  Eye, 
  Type, 
  List, 
  CheckSquare, 
  ChevronDown, 
  Star, 
  Sliders, 
  ToggleLeft,
  Copy,
  FileText as PageIcon
} from 'lucide-react';
import './SurveyEditor.css';

interface HistoryState {
  survey: Survey;
  timestamp: number;
}

interface SortableQuestionProps {
  question: Question;
  index: number;
  onUpdate: (index: number, field: keyof Question, value: any) => void;
  onDelete: (index: number) => void;
  onDuplicate: (index: number) => void;
}

const SortableQuestion: React.FC<SortableQuestionProps> = React.memo(({ 
  question, 
  index, 
  onUpdate, 
  onDelete, 
  onDuplicate 
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getQuestionTypeIcon = (type: string) => {
    switch (type) {
      case 'text': case 'short_answer': return <Type size={16} />;
      case 'radio': return <List size={16} />;
      case 'checkbox': return <CheckSquare size={16} />;
      case 'dropdown': return <ChevronDown size={16} />;
      case 'rating': return <Star size={16} />;
      case 'range': return <Sliders size={16} />;
      case 'yes_no': return <ToggleLeft size={16} />;
      default: return <Type size={16} />;
    }
  };

  const quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'size': ['small', false, 'large'] }],
      [{ 'align': [] }],
      ['clean']
    ],
  };

  const quillFormats = [
    'bold', 'italic', 'underline', 'color', 'background', 'size', 'align'
  ];

  // Function to strip HTML tags except allowed formatting
  const stripUnnecessaryHTML = (htmlString: string): string => {
    if (!htmlString) return '';
    
    // Remove <p> tags but keep content
    let cleaned = htmlString.replace(/<p>/g, '').replace(/<\/p>/g, '');
    
    // Remove empty <br> tags at the end
    cleaned = cleaned.replace(/<br\s*\/?\s*>$/g, '');
    
    // If the result is empty or just whitespace, return plain text
    if (cleaned.trim() === '' || cleaned.trim() === '<br>') {
      return htmlString.replace(/<[^>]*>/g, '').trim();
    }
    
    return cleaned.trim();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow group"
    >
      <div className="flex items-start gap-3">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600 mt-1"
        >
          <GripVertical size={16} />
        </div>
        
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            {getQuestionTypeIcon(question.type)}
            <span className="text-sm font-medium text-gray-600">
              Question {index + 1}
            </span>
            <div className="flex gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onDuplicate(index)}
                className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                title="Duplicate Question"
              >
                <Copy size={14} />
              </button>
              <button
                onClick={() => onDelete(index)}
                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                title="Delete Question"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Question Text
              </label>
              <ReactQuill
                value={question.question}
                onChange={(value) => {
                  const cleanedValue = stripUnnecessaryHTML(value);
                  onUpdate(index, 'question', cleanedValue);
                }}
                modules={quillModules}
                formats={quillFormats}
                theme="snow"
                className="question-editor"
                placeholder="Enter your question here..."
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
                    
                    // Auto-add default options for choice-based questions
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

              <div>
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
                      <div className="flex items-center gap-2 flex-1">
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
                      </div>
                      <button
                        onClick={() => {
                          const newOptions = (question.options || []).filter((_, i) => i !== optIndex);
                          onUpdate(index, 'options', newOptions);
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        disabled={(question.options || []).length <= 1}
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
      </div>
    </div>
  );
});

const SurveyEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState<string>('');
  const [showQuestionDropdown, setShowQuestionDropdown] = useState<boolean>(false);
  
  // Undo/Redo functionality
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const previewRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const isLocalhost = window.location.hostname === 'localhost';
  const apiBaseUrl = isLocalhost
    ? 'http://localhost:5000'
    : 'https://pepper-flask-app.onrender.com';

  // History management
  const saveToHistory = (surveyState: Survey) => {
    const newHistoryState: HistoryState = {
      survey: JSON.parse(JSON.stringify(surveyState)),
      timestamp: Date.now()
    };
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newHistoryState);
    
    if (newHistory.length > 50) {
      newHistory.shift();
    }
    
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setSurvey(history[historyIndex - 1].survey);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setSurvey(history[historyIndex + 1].survey);
    }
  };

  useEffect(() => {
    if (!id) return;

    const fetchSurvey = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${apiBaseUrl}/survey/${id}/view`);
        if (!res.ok) throw new Error(`Failed to fetch survey: ${res.status}`);
        const data = await res.json();
        console.log('Fetched survey:', data.survey || data);
        const surveyData = data.survey || data;
        setSurvey(surveyData);
        saveToHistory(surveyData);
      } catch (err) {
        console.error('Error fetching survey:', err);
        setError('Failed to load survey');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSurvey();
  }, [id, apiBaseUrl]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'z':
            if (e.shiftKey) {
              e.preventDefault();
              redo();
            } else {
              e.preventDefault();
              undo();
            }
            break;
          case 'y':
            e.preventDefault();
            redo();
            break;
          case 's':
            e.preventDefault();
            handleSave();
            break;
          case '?':
            e.preventDefault();
            setShowKeyboardShortcuts(!showKeyboardShortcuts);
            break;
        }
      } else if (e.key === '?') {
        e.preventDefault();
        setShowKeyboardShortcuts(!showKeyboardShortcuts);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history.length, showKeyboardShortcuts]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowQuestionDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSave = async () => {
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
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveStatus('idle');
        setSaveMessage('');
      }, 3000);
    } catch (err: unknown) {
      console.error(err);
      setSaveStatus('error');
      if (err instanceof Error) {
        setSaveMessage(err.message || 'Save failed');
      } else {
        setSaveMessage('Save failed');
      }
      
      // Clear error message after 5 seconds
      setTimeout(() => {
        setSaveStatus('idle');
        setSaveMessage('');
      }, 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuestionUpdate = useCallback((index: number, field: keyof Question, value: any) => {
    if (!survey) return;
    
    const updatedQuestions = [...survey.questions];
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
    
    const updatedSurvey = { ...survey, questions: updatedQuestions };
    setSurvey(updatedSurvey);
    saveToHistory(updatedSurvey);
  }, [survey, saveToHistory]);

  const handleQuestionDelete = useCallback((index: number) => {
    if (!survey) return;
    
    const updatedQuestions = survey.questions.filter((_, i) => i !== index);
    const updatedSurvey = { ...survey, questions: updatedQuestions };
    setSurvey(updatedSurvey);
    saveToHistory(updatedSurvey);
  }, [survey, saveToHistory]);

  const handleQuestionDuplicate = useCallback((index: number) => {
    if (!survey) return;
    
    const questionToDuplicate = survey.questions[index];
    const duplicatedQuestion = {
      ...questionToDuplicate,
      id: `${questionToDuplicate.id}_copy_${Date.now()}`,
    };
    
    const updatedQuestions = [...survey.questions];
    updatedQuestions.splice(index + 1, 0, duplicatedQuestion);
    
    const updatedSurvey = { ...survey, questions: updatedQuestions };
    setSurvey(updatedSurvey);
    saveToHistory(updatedSurvey);
  }, [survey, saveToHistory]);

  const addNewQuestion = (template?: string) => {
    if (!survey) return;
    
    let newQuestion: Question;
    
    switch (template) {
      case 'rating':
        newQuestion = {
          id: `question_${Date.now()}`,
          question: 'How would you rate your experience?',
          type: 'rating',
          required: false,
        };
        break;
      case 'multiple_choice':
        newQuestion = {
          id: `question_${Date.now()}`,
          question: 'Please select one option:',
          type: 'multiple_choice',
          options: ['Option 1', 'Option 2', 'Option 3'],
          required: false,
        };
        break;
      case 'yes_no':
        newQuestion = {
          id: `question_${Date.now()}`,
          question: 'Do you agree with the following statement?',
          type: 'yes_no',
          required: false,
        };
        break;
      default:
        newQuestion = {
          id: `question_${Date.now()}`,
          question: 'New Question',
          type: 'short_answer',
          required: false,
        };
    }
    
    const updatedQuestions = [...survey.questions, newQuestion];
    const updatedSurvey = { ...survey, questions: updatedQuestions };
    setSurvey(updatedSurvey);
    saveToHistory(updatedSurvey);
  };

  const addNewPage = () => {
    if (!survey) return;
    
    const newPage: SurveyPage = {
      id: `page_${Date.now()}`,
      title: 'New Page',
      description: '',
      questions: [],
      order: (survey.pages?.length || 0) + 1,
    };
    
    const updatedPages = [...(survey.pages || []), newPage];
    const updatedSurvey = { ...survey, pages: updatedPages };
    setSurvey(updatedSurvey);
    saveToHistory(updatedSurvey);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!survey || !over || active.id === over.id) return;
    
    const oldIndex = survey.questions.findIndex(q => q.id === active.id);
    const newIndex = survey.questions.findIndex(q => q.id === over.id);
    
    const updatedQuestions = arrayMove(survey.questions, oldIndex, newIndex);
    const updatedSurvey = { ...survey, questions: updatedQuestions };
    setSurvey(updatedSurvey);
    saveToHistory(updatedSurvey);
  };

  const handlePreview = () => {
    if (!survey) return;
    window.open(`/survey/${survey.id}`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading survey...</p>
        </div>
      </div>
    );
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                ← Back
              </button>
              <h1 className="text-xl font-semibold text-gray-900">
                Edit Survey: {survey.title || 'Untitled Survey'}
              </h1>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={undo}
                disabled={historyIndex <= 0}
                className="p-2 text-gray-600 hover:text-gray-900 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                title="Undo"
              >
                <Undo size={16} />
              </button>
              <button
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                className="p-2 text-gray-600 hover:text-gray-900 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                title="Redo"
              >
                <Redo size={16} />
              </button>
              
              <div className="w-px h-6 bg-gray-300 mx-2" />
              
              <button
                onClick={handlePreview}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <Eye size={16} />
                Preview
              </button>
              
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
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Editor */}
          <div className="lg:col-span-2 space-y-6">
            {/* Survey Meta */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Survey Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Survey Title
                  </label>
                  <input
                    type="text"
                    value={survey.title || ''}
                    onChange={(e) => {
                      const updatedSurvey = { ...survey, title: e.target.value };
                      setSurvey(updatedSurvey);
                      saveToHistory(updatedSurvey);
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter survey title"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Survey Description
                  </label>
                  <textarea
                    value={survey.subtitle || ''}
                    onChange={(e) => {
                      const updatedSurvey = { ...survey, subtitle: e.target.value };
                      setSurvey(updatedSurvey);
                      saveToHistory(updatedSurvey);
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter survey description"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Page Management */}
            {(survey.pages && survey.pages.length > 0) && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-medium text-gray-900">Pages</h2>
                  <button
                    onClick={addNewPage}
                    className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <PageIcon size={16} />
                    Add Page
                  </button>
                </div>
                <div className="flex gap-2 mb-4">
                  {survey.pages.map((page, pageIndex) => (
                    <button
                      key={page.id}
                      onClick={() => setCurrentPage(pageIndex)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === pageIndex
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Page {pageIndex + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Questions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-medium text-gray-900">
                  Questions {(survey.pages && survey.pages.length > 0) ? `(Page ${currentPage + 1})` : ''}
                </h2>
                <div className="flex gap-2">
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setShowQuestionDropdown(!showQuestionDropdown)}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus size={16} />
                      Add Question
                      <ChevronDown size={14} className={`transition-transform ${showQuestionDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    {showQuestionDropdown && (
                      <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-48">
                        <div className="p-2 space-y-1">
                          <button
                            onClick={() => {
                              addNewQuestion('multiple_choice');
                              setShowQuestionDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md flex items-center gap-2"
                          >
                            <List size={14} />
                            Multiple Choice
                          </button>
                          <button
                            onClick={() => {
                              addNewQuestion('rating');
                              setShowQuestionDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md flex items-center gap-2"
                          >
                            <Star size={14} />
                            Rating Scale
                          </button>
                          <button
                            onClick={() => {
                              addNewQuestion('yes_no');
                              setShowQuestionDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md flex items-center gap-2"
                          >
                            <ToggleLeft size={14} />
                            Yes/No
                          </button>
                          <button
                            onClick={() => {
                              addNewQuestion();
                              setShowQuestionDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md flex items-center gap-2"
                          >
                            <Type size={14} />
                            Text Input
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={addNewPage}
                    className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <PageIcon size={16} />
                    Add Page
                  </button>
                </div>
              </div>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={survey.questions.map(q => q.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-4">
                    {survey.questions.map((question, index) => (
                      <SortableQuestion
                        key={question.id}
                        question={question}
                        index={index}
                        onUpdate={handleQuestionUpdate}
                        onDelete={handleQuestionDelete}
                        onDuplicate={handleQuestionDuplicate}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              {survey.questions.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <Type size={48} className="mx-auto" />
                  </div>
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

          {/* Live Preview */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-24">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Live Preview</h3>
              <div 
                ref={previewRef}
                className="border rounded-lg overflow-hidden bg-gray-50 min-h-[400px]"
              >
                <iframe
                  src={`/survey/${survey.id}`}
                  title="Survey Preview"
                  className="w-full h-[400px] border-0"
                  style={{
                    transform: 'scale(0.8)',
                    transformOrigin: 'top left',
                    width: '125%',
                    height: '500px',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Status Toast */}
      {saveStatus !== 'idle' && (
        <div className={`fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2 ${
          saveStatus === 'saved' ? 'bg-green-500 text-white' :
          saveStatus === 'error' ? 'bg-red-500 text-white' :
          'bg-blue-500 text-white'
        }`}>
          {saveStatus === 'saving' && (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
          )}
          {saveStatus === 'saved' && (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {saveStatus === 'error' && (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          <span className="text-sm font-medium">{saveMessage}</span>
        </div>
      )}

      {/* Keyboard Shortcuts Overlay */}
      <div className={`keyboard-shortcuts ${showKeyboardShortcuts ? 'visible' : ''}`}>
        <div className="text-sm font-medium mb-2">Keyboard Shortcuts</div>
        <div className="space-y-1 text-xs">
          <div><kbd>Ctrl+Z</kbd> - Undo</div>
          <div><kbd>Ctrl+Shift+Z</kbd> - Redo</div>
          <div><kbd>Ctrl+Y</kbd> - Redo</div>
          <div><kbd>Ctrl+S</kbd> - Save</div>
          <div><kbd>?</kbd> - Toggle shortcuts</div>
        </div>
      </div>
    </div>
  );
};

export default SurveyEditor;
