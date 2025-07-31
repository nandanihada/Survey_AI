import React, { useState, useEffect } from 'react';
import { Palette, Eye, EyeOff, Sparkles, Sliders, Timer, Type, Edit3, Plus, Trash2, X, Zap, Play, Clipboard, FileText, Settings, ChevronDown } from 'lucide-react';
import { QuestionAnswerParser } from '../utils/questionAnswerParser';
import PasteExampleDialog from './PasteExampleDialog';

export interface QuestionOption {
  id: string;
  label: string;
  emoji?: string;
}

export interface Question {
  id: string;
  text: string;
  type: 'emoji' | 'scale' | 'choice' | 'short_answer';
  options: QuestionOption[];
}

export interface WidgetCustomizerSettings {
  color: string;
  transparency: number;
  glassEffect: boolean;
  animationSpeed: number;
  questionDelay: number;
  questions: Question[];
  questionAnimation: string;
  answerAnimation: string;
  smartDelay: boolean;
  minDelay: number;
  maxDelay: number;
}

interface WidgetCustomizerProps {
  isDarkMode?: boolean;
  onSettingsChange: (settings: WidgetCustomizerSettings) => void;
  onShowWidget: () => void;
  onHideWidget: () => void;
  isWidgetVisible: boolean;
  initialSettings?: WidgetCustomizerSettings;
}

export const WidgetCustomizer: React.FC<WidgetCustomizerProps> = ({ 
  isDarkMode = false, 
  onSettingsChange,
  onShowWidget,
  onHideWidget,
  isWidgetVisible,
  initialSettings
}) => {
  const [showPasteDialog, setShowPasteDialog] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [settings, setSettings] = useState<WidgetCustomizerSettings>(initialSettings ?? {
    color: 'red',
    transparency: 95,
    glassEffect: true,
    animationSpeed: 50,
    questionDelay: 2000,
    questionAnimation: 'simple',
    answerAnimation: 'simple',
    smartDelay: true,
    minDelay: 2000,
    maxDelay: 50000,
    questions: [
      {
        id: 'q1',
        text: 'How are you feeling about your experience so far?',
        type: 'emoji',
        options: [
          { id: 'opt1', label: 'Amazing', emoji: '🤩' },
          { id: 'opt2', label: 'Good', emoji: '😊' },
          { id: 'opt3', label: 'Okay', emoji: '😐' },
          { id: 'opt4', label: 'Frustrated', emoji: '😤' }
        ]
      }
    ]
  });

  const colors = [
    { name: 'red', value: 'red', class: 'bg-red-500' },
    { name: 'blue', value: 'blue', class: 'bg-blue-500' },
    { name: 'green', value: 'green', class: 'bg-green-500' },
    { name: 'purple', value: 'purple', class: 'bg-purple-500' },
    { name: 'indigo', value: 'indigo', class: 'bg-indigo-500' },
    { name: 'pink', value: 'pink', class: 'bg-pink-500' },
    { name: 'orange', value: 'orange', class: 'bg-orange-500' },
    { name: 'teal', value: 'teal', class: 'bg-teal-500' },
  ];

  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showAllColors, setShowAllColors] = useState(false);
  
  const allColors = [
    { name: 'red', value: 'red', class: 'bg-red-500' },
    { name: 'blue', value: 'blue', class: 'bg-blue-500' },
    { name: 'green', value: 'green', class: 'bg-green-500' },
    { name: 'purple', value: 'purple', class: 'bg-purple-500' },
    { name: 'indigo', value: 'indigo', class: 'bg-indigo-500' },
    { name: 'pink', value: 'pink', class: 'bg-pink-500' },
    { name: 'orange', value: 'orange', class: 'bg-orange-500' },
    { name: 'teal', value: 'teal', class: 'bg-teal-500' },
    { name: 'emerald', value: 'emerald', class: 'bg-emerald-500' },
    { name: 'cyan', value: 'cyan', class: 'bg-cyan-500' },
    { name: 'sky', value: 'sky', class: 'bg-sky-500' },
    { name: 'violet', value: 'violet', class: 'bg-violet-500' },
    { name: 'fuchsia', value: 'fuchsia', class: 'bg-fuchsia-500' },
    { name: 'rose', value: 'rose', class: 'bg-rose-500' },
    { name: 'amber', value: 'amber', class: 'bg-amber-500' },
    { name: 'lime', value: 'lime', class: 'bg-lime-500' },
    { name: 'yellow', value: 'yellow', class: 'bg-yellow-500' },
    { name: 'slate', value: 'slate', class: 'bg-slate-500' },
    { name: 'gray', value: 'gray', class: 'bg-gray-500' },
    { name: 'zinc', value: 'zinc', class: 'bg-zinc-500' },
    { name: 'neutral', value: 'neutral', class: 'bg-neutral-500' },
    { name: 'stone', value: 'stone', class: 'bg-stone-500' },
  ];

  const animationOptions = [
    { name: 'Simple', value: 'simple', icon: '→', description: 'Clean fade in/out' },
    { name: 'Sleek', value: 'sleek', icon: '✨', description: 'Smooth slide with blur' },
    { name: 'Fun', value: 'fun', icon: '🎉', description: 'Bounce and scale effects' },
    { name: 'Party', value: 'party', icon: '🎊', description: 'Colorful confetti burst' },
    { name: 'Letter by Letter', value: 'typewriter', icon: '✍️', description: 'Typewriter effect' },
    { name: 'Fade', value: 'fade', icon: '🌫️', description: 'Gentle fade animation' },
    { name: 'Slide', value: 'slide', icon: '📱', description: 'Smooth sliding motion' },
    { name: 'Glitch', value: 'glitch', icon: '⚡', description: 'Digital glitch effect' },
    { name: 'Neon', value: 'neon', icon: '💫', description: 'Glowing neon style' },
    { name: 'Minimal', value: 'minimal', icon: '—', description: 'Subtle and clean' }
  ];

  // Only set initial settings once on mount
  useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings);
    }
  }, []); // Empty dependency array - only run once

  const updateSetting = <K extends keyof WidgetCustomizerSettings>(key: K, value: WidgetCustomizerSettings[K]) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    // Save to localStorage
    localStorage.setItem('widgetCustomizerSettings', JSON.stringify(newSettings));
    
    // Dispatch custom event for same-page updates
    window.dispatchEvent(new CustomEvent('widgetSettingsUpdated', {
      detail: newSettings
    }));
    
    if (key === 'questions') {
      setHasUnsavedChanges(true);
    } else {
      onSettingsChange(newSettings);
    }
  };

  const saveQuestionChanges = () => {
    // Save to localStorage
    localStorage.setItem('widgetCustomizerSettings', JSON.stringify(settings));
    
    // Dispatch custom event for same-page updates
    window.dispatchEvent(new CustomEvent('widgetSettingsUpdated', {
      detail: settings
    }));
    
    onSettingsChange(settings);
    setHasUnsavedChanges(false);
  };

  const addQuestion = () => {
    const newQuestion: Question = {
      id: `q${settings.questions.length + 1}`,
      text: '',
      type: 'choice',
      options: [{ id: 'opt1', label: '' }]
    };
    updateSetting('questions', [...settings.questions, newQuestion]);
  };

  const updateQuestionText = (questionId: string, text: string) => {
    const updatedQuestions = settings.questions.map(q => 
      q.id === questionId ? { ...q, text } : q
    );
    updateSetting('questions', updatedQuestions);
  };

  const updateQuestionType = (questionId: string, type: 'emoji' | 'scale' | 'choice' | 'short_answer') => {
    const updatedQuestions = settings.questions.map(q => 
      q.id === questionId ? { ...q, type } : q
    );
    updateSetting('questions', updatedQuestions);
  };

  const addOption = (questionId: string) => {
    const updatedQuestions = settings.questions.map(q => {
      if (q.id === questionId) {
        const newOption = { id: `opt${q.options.length + 1}`, label: '' };
        return { ...q, options: [...q.options, newOption] };
      }
      return q;
    });
    updateSetting('questions', updatedQuestions);
  };

  const updateOption = (questionId: string, optionId: string, field: 'label' | 'emoji', value: string) => {
    const updatedQuestions = settings.questions.map(q => {
      if (q.id === questionId) {
        const updatedOptions = q.options.map(opt => 
          opt.id === optionId ? { ...opt, [field]: value } : opt
        );
        return { ...q, options: updatedOptions };
      }
      return q;
    });
    updateSetting('questions', updatedQuestions);
  };

  const removeQuestion = (questionId: string) => {
    const updatedQuestions = settings.questions.filter(q => q.id !== questionId);
    updateSetting('questions', updatedQuestions);
  };

  const removeOption = (questionId: string, optionId: string) => {
    const updatedQuestions = settings.questions.map(q => {
      if (q.id === questionId) {
        const updatedOptions = q.options.filter(opt => opt.id !== optionId);
        return { ...q, options: updatedOptions };
      }
      return q;
    });
    updateSetting('questions', updatedQuestions);
  };

  const handlePasteQuestions = () => {
    navigator.clipboard.readText().then((text) => {
      if (text.trim()) {
        const parsedQuestions = QuestionAnswerParser.parseContent(text);
        const widgetQuestions = QuestionAnswerParser.formatAsWidgetQuestions(parsedQuestions);
        
        if (widgetQuestions.length > 0) {
          updateSetting('questions', widgetQuestions);
          console.log('Parsed questions:', widgetQuestions);
        } else {
          alert('No valid questions found in the pasted content.');
        }
      }
    }).catch(() => {
      alert('Failed to read clipboard. Please make sure you have copied the text and try again.');
    });
  };

  const handlePasteFromDialog = (text: string) => {
    const parsedQuestions = QuestionAnswerParser.parseContent(text);
    const widgetQuestions = QuestionAnswerParser.formatAsWidgetQuestions(parsedQuestions);
    
    if (widgetQuestions.length > 0) {
      updateSetting('questions', widgetQuestions);
      console.log('Parsed questions:', widgetQuestions);
    }
  };

  return (
    <div className={`h-full rounded-xl border shadow-lg overflow-hidden ${
      isDarkMode
        ? 'bg-slate-800/50 border-slate-700 shadow-slate-900/20'
        : 'bg-white border-stone-200 shadow-stone-900/5'
    }`}>
      <div className="h-full overflow-y-auto p-6 space-y-6" style={{ maxHeight: '100vh' }}>
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'
            }`}>
              <Settings size={20} />
            </div>
            <div>
              <h3 className={`text-xl font-bold ${
                isDarkMode ? 'text-white' : 'text-stone-800'
              }`}>Widget Customizer</h3>
              <p className={`text-sm ${
                isDarkMode ? 'text-slate-400' : 'text-stone-500'
              }`}>Configure your widget appearance and behavior</p>
            </div>
          </div>
        </div>
        
        {/* Widget Controls */}
        <div className="flex gap-3">
          <button
            onClick={onShowWidget}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
              isWidgetVisible
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            <Play size={16} />
            {isWidgetVisible ? 'Widget Active' : 'Show Widget'}
          </button>
          <button
            onClick={onHideWidget}
            className={`py-3 px-4 rounded-lg font-medium transition-colors ${
              isDarkMode
                ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
            }`}
            title="Hide Widget"
          >
            <EyeOff size={16} />
          </button>
        </div>
      </div>
      
      <div className="space-y-6">
        {/* Compact Controls */}
        <div className={`p-4 rounded-lg border ${
          isDarkMode ? 'bg-slate-700/30 border-slate-600' : 'bg-stone-50 border-stone-200'
        }`}>
          <label className={`block text-base font-semibold mb-4 ${
            isDarkMode ? 'text-white' : 'text-stone-800'
          }`}>
            Widget Settings
          </label>
          <div className="flex items-center gap-4 flex-wrap">
            {/* Color Control */}
            <div className="relative group">
              <button
                className={`p-3 rounded-lg border-2 transition-all duration-200 flex items-center justify-center hover:scale-105 ${
                  isDarkMode
                    ? 'border-slate-600 hover:border-slate-500 hover:shadow-md bg-slate-700'
                    : 'border-stone-200 hover:border-stone-300 hover:shadow-md bg-white'
                }`}
                title="Widget Color"
              >
                <Palette size={18} className={isDarkMode ? 'text-slate-300' : 'text-stone-600'} />
              </button>
              
              {/* Color Picker Dropdown */}
              <div className={`absolute bottom-full left-0 mb-2 p-3 rounded-lg border shadow-lg z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto ${
                isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-stone-200'
              }`} style={{ width: '250px' }}>
                <h4 className={`text-sm font-medium mb-3 ${
                  isDarkMode ? 'text-white' : 'text-stone-800'
                }`}>Colors</h4>
                <div className="grid grid-cols-6 gap-2">
                  {allColors.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => updateSetting('color', color.value)}
                      className={`w-8 h-8 rounded-full border-2 transition-all duration-200 hover:scale-110 ${
                        settings.color === color.value
                          ? 'border-white ring-2 ring-blue-500 shadow-lg'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      style={{ backgroundColor: color.class.replace('bg-', '').replace('-500', '') }}
                      title={color.name}
                    >
                      <div className={`w-full h-full rounded-full ${color.class}`} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Transparency Control */}
            <div className="relative group">
              <button
                className={`p-3 rounded-lg border-2 transition-all duration-200 flex items-center justify-center hover:scale-105 ${
                  isDarkMode
                    ? 'border-slate-600 hover:border-slate-500 hover:shadow-md bg-slate-700'
                    : 'border-stone-200 hover:border-stone-300 hover:shadow-md bg-white'
                }`}
                title={`Transparency: ${settings.transparency}%`}
              >
                <Sliders size={18} className={isDarkMode ? 'text-slate-300' : 'text-stone-600'} />
              </button>
              
              {/* Transparency Slider */}
              <div className={`absolute bottom-full left-0 mb-2 p-3 rounded-lg border shadow-lg z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto ${
                isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-stone-200'
              }`} style={{ width: '200px' }}>
                <h4 className={`text-sm font-medium mb-3 ${
                  isDarkMode ? 'text-white' : 'text-stone-800'
                }`}>Transparency: {settings.transparency}%</h4>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={settings.transparency}
                  onChange={(e) => updateSetting('transparency', parseInt(e.target.value))}
                  className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${
                    isDarkMode ? 'bg-slate-600' : 'bg-stone-200'
                  }`}
                />
                <div className="flex justify-between text-xs mt-1">
                  <span className={isDarkMode ? 'text-slate-400' : 'text-stone-500'}>10%</span>
                  <span className={isDarkMode ? 'text-slate-400' : 'text-stone-500'}>100%</span>
                </div>
              </div>
            </div>

            {/* Animation Speed Control */}
            <div className="relative group">
              <button
                className={`p-3 rounded-lg border-2 transition-all duration-200 flex items-center justify-center hover:scale-105 ${
                  isDarkMode
                    ? 'border-slate-600 hover:border-slate-500 hover:shadow-md bg-slate-700'
                    : 'border-stone-200 hover:border-stone-300 hover:shadow-md bg-white'
                }`}
                title={`Animation Speed: ${settings.animationSpeed}ms`}
              >
                <Zap size={18} className={isDarkMode ? 'text-slate-300' : 'text-stone-600'} />
              </button>
              
              {/* Animation Speed Slider */}
              <div className={`absolute bottom-full left-0 mb-2 p-3 rounded-lg border shadow-lg z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto ${
                isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-stone-200'
              }`} style={{ width: '200px' }}>
                <h4 className={`text-sm font-medium mb-3 ${
                  isDarkMode ? 'text-white' : 'text-stone-800'
                }`}>Speed: {settings.animationSpeed}ms</h4>
                <input
                  type="range"
                  min="10"
                  max="200"
                  value={settings.animationSpeed}
                  onChange={(e) => updateSetting('animationSpeed', parseInt(e.target.value))}
                  className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${
                    isDarkMode ? 'bg-slate-600' : 'bg-stone-200'
                  }`}
                />
                <div className="flex justify-between text-xs mt-1">
                  <span className={isDarkMode ? 'text-slate-400' : 'text-stone-500'}>Fast</span>
                  <span className={isDarkMode ? 'text-slate-400' : 'text-stone-500'}>Slow</span>
                </div>
              </div>
            </div>

            {/* Glass Effect Toggle */}
            <div className="relative group">
              <button
                onClick={() => updateSetting('glassEffect', !settings.glassEffect)}
                className={`p-3 rounded-lg border-2 transition-all duration-200 flex items-center justify-center hover:scale-105 ${
                  settings.glassEffect
                    ? 'border-blue-500 bg-blue-500/10 text-blue-500'
                    : isDarkMode
                      ? 'border-slate-600 hover:border-slate-500 hover:shadow-md bg-slate-700 text-slate-300'
                      : 'border-stone-200 hover:border-stone-300 hover:shadow-md bg-white text-stone-600'
                }`}
                title={`Glass Effect: ${settings.glassEffect ? 'On' : 'Off'}`}
              >
                <Sparkles size={18} className={settings.glassEffect ? 'text-blue-500' : ''} />
              </button>
            </div>

            {/* Smart Delay Toggle */}
            <div className="relative group">
              <button
                onClick={() => updateSetting('smartDelay', !settings.smartDelay)}
                className={`p-3 rounded-lg border-2 transition-all duration-200 flex items-center justify-center hover:scale-105 ${
                  settings.smartDelay
                    ? 'border-green-500 bg-green-500/10 text-green-500'
                    : isDarkMode
                      ? 'border-slate-600 hover:border-slate-500 hover:shadow-md bg-slate-700 text-slate-300'
                      : 'border-stone-200 hover:border-stone-300 hover:shadow-md bg-white text-stone-600'
                }`}
                title={`Smart Delay: ${settings.smartDelay ? 'On' : 'Off'}`}
              >
                <Timer size={18} className={settings.smartDelay ? 'text-green-500' : ''} />
              </button>
            </div>
          </div>
        </div>


        {/* Question Delay */}
        <div>
          <label className={`block text-sm font-medium mb-3 ${
            isDarkMode ? 'text-slate-300' : 'text-stone-700'
          }`}>
            <Timer size={14} className="inline mr-2" />
            {settings.smartDelay ? 'Default Delay' : 'Time Between Questions'}: {settings.questionDelay / 1000}s
          </label>
          <input
            type="range"
            min="500"
            max={settings.smartDelay ? "50000" : "30000"}
            step="500"
            value={settings.questionDelay}
            onChange={(e) => updateSetting('questionDelay', parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0.5s</span>
            <span>{settings.smartDelay ? '50s' : '30s'}</span>
          </div>
        </div>

        {/* Smart Delay Range (only show if smart delay is enabled) */}
        {settings.smartDelay && (
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-3 ${
                isDarkMode ? 'text-slate-300' : 'text-stone-700'
              }`}>
                Minimum Delay (Good Responses): {settings.minDelay / 1000}s
              </label>
              <input
                type="range"
                min="1000"
                max="10000"
                step="500"
                value={settings.minDelay}
                onChange={(e) => updateSetting('minDelay', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1s</span>
                <span>10s</span>
              </div>
            </div>
            
            <div>
              <label className={`block text-sm font-medium mb-3 ${
                isDarkMode ? 'text-slate-300' : 'text-stone-700'
              }`}>
                Maximum Delay (Poor Responses): {settings.maxDelay / 1000}s
              </label>
              <input
                type="range"
                min="30000"
                max="300000"
                step="5000"
                value={settings.maxDelay}
                onChange={(e) => updateSetting('maxDelay', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>30s</span>
                <span>300s</span>
              </div>
            </div>
            
            <div className={`p-3 rounded-lg border ${
              isDarkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-stone-50 border-stone-200'
            }`}>
              <h4 className={`text-sm font-medium mb-2 ${
                isDarkMode ? 'text-slate-300' : 'text-stone-700'
              }`}>
                Smart Delay Categories:
              </h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-green-600">✓ Genuine & Clear:</span>
                  <span className={isDarkMode ? 'text-slate-400' : 'text-stone-600'}>2s - 5s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-yellow-600">⚠ Low Effort:</span>
                  <span className={isDarkMode ? 'text-slate-400' : 'text-stone-600'}>10s - 30s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-orange-600">⚡ Gibberish:</span>
                  <span className={isDarkMode ? 'text-slate-400' : 'text-stone-600'}>60s - 180s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-600">🚫 Spam:</span>
                  <span className={isDarkMode ? 'text-slate-400' : 'text-stone-600'}>120s - 300s</span>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* Animation Settings */}
        <div>
          <label className={`block text-sm font-medium mb-3 ${
            isDarkMode ? 'text-slate-300' : 'text-stone-700'
          }`}>
            <Zap size={14} className="inline mr-2" />
            Question Animation
          </label>
          <select
            value={settings.questionAnimation}
            onChange={(e) => updateSetting('questionAnimation', e.target.value)}
            className={`w-full p-2 text-sm rounded-lg border mb-2 ${
              isDarkMode
                ? 'bg-slate-600 border-slate-500 text-white'
                : 'bg-white border-stone-200 text-stone-800'
            }`}
          >
            {animationOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.icon} {option.name} - {option.description}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={`block text-sm font-medium mb-3 ${
            isDarkMode ? 'text-slate-300' : 'text-stone-700'
          }`}>
            <Play size={14} className="inline mr-2" />
            Answer Animation
          </label>
          <select
            value={settings.answerAnimation}
            onChange={(e) => updateSetting('answerAnimation', e.target.value)}
            className={`w-full p-2 text-sm rounded-lg border mb-2 ${
              isDarkMode
                ? 'bg-slate-600 border-slate-500 text-white'
                : 'bg-white border-stone-200 text-stone-800'
            }`}
          >
            {animationOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.icon} {option.name} - {option.description}
              </option>
            ))}
          </select>
        </div>

        {/* Question Management */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className={`text-sm font-medium ${
              isDarkMode ? 'text-slate-300' : 'text-stone-700'
            }`}>
              <Edit3 size={14} className="inline mr-2" />
              Questions ({settings.questions.length})
              {hasUnsavedChanges && (
                <span className="ml-2 text-xs text-yellow-500">• Unsaved changes</span>
              )}
            </label>
            <div className="flex items-center gap-1">
              {hasUnsavedChanges && (
                <button
                  onClick={saveQuestionChanges}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    isDarkMode
                      ? 'bg-green-700 hover:bg-green-600 text-green-300'
                      : 'bg-green-100 hover:bg-green-200 text-green-700'
                  }`}
                  title="Save question changes"
                >
                  Save Changes
                </button>
              )}
              <button
                onClick={() => setShowPasteDialog(true)}
                className={`p-1 rounded-lg transition-colors ${
                  isDarkMode
                    ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
                }`}
                title="Show paste format example"
              >
                <FileText size={14} />
              </button>
              <button
                onClick={handlePasteQuestions}
                className={`p-1 rounded-lg transition-colors ${
                  isDarkMode
                    ? 'bg-blue-700 hover:bg-blue-600 text-blue-300'
                    : 'bg-blue-100 hover:bg-blue-200 text-blue-600'
                }`}
                title="Paste questions from clipboard"
              >
                <Clipboard size={14} />
              </button>
              <button
                onClick={addQuestion}
                className={`p-1 rounded-lg transition-colors ${
                  isDarkMode
                    ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
                }`}
                title="Add Question"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
          
          <div className={`mb-4 p-3 rounded-lg border ${
            isDarkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-blue-50 border-blue-200'
          }`}>
            <p className={`text-xs mb-2 ${
              isDarkMode ? 'text-slate-300' : 'text-blue-700'
            }`}>
              <strong>💡 Pro Tip:</strong> You can paste full questions and answers! 
            </p>
            <p className={`text-xs ${
              isDarkMode ? 'text-slate-400' : 'text-blue-600'
            }`}>
              Click the <FileText size={12} className="inline mx-1" /> button to see format examples, then copy your questions and click <Clipboard size={12} className="inline mx-1" /> to paste them.
            </p>
          </div>
          
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {settings.questions.map((question, index) => (
              <div key={question.id} className={`p-3 rounded-lg border ${
                isDarkMode
                  ? 'bg-slate-700/50 border-slate-600'
                  : 'bg-stone-50 border-stone-200'
              }`}>
                {/* Question Header */}
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-medium ${
                    isDarkMode ? 'text-slate-400' : 'text-stone-600'
                  }`}>
                    Question {index + 1}
                  </span>
                  {settings.questions.length > 1 && (
                    <button
                      onClick={() => removeQuestion(question.id)}
                      className="p-1 rounded text-red-500 hover:bg-red-500/10"
                      title="Remove Question"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>

                {/* Question Type */}
                <select
                  value={question.type}
                  onChange={(e) => updateQuestionType(question.id, e.target.value as 'emoji' | 'scale' | 'choice' | 'short_answer')}
                  className={`w-full p-2 text-xs rounded-lg border mb-2 ${
                    isDarkMode
                      ? 'bg-slate-600 border-slate-500 text-white'
                      : 'bg-white border-stone-200 text-stone-800'
                  }`}
                >
                  <option value="emoji">Emoji Choice</option>
                  <option value="choice">Multiple Choice</option>
                  <option value="scale">Rating Scale</option>
                  <option value="short_answer">Short Answer</option>
                </select>

                {/* Question Text */}
                <textarea
                  value={question.text}
                  onChange={(e) => updateQuestionText(question.id, e.target.value)}
                  className={`w-full p-2 text-sm rounded-lg border resize-none mb-2 ${
                    isDarkMode
                      ? 'bg-slate-600 border-slate-500 text-white placeholder-slate-400'
                      : 'bg-white border-stone-200 text-stone-800 placeholder-stone-400'
                  }`}
                  rows={2}
                  placeholder="Enter question text..."
                />

                {/* Options - Only show for questions that need options */}
                {question.type !== 'short_answer' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-medium ${
                        isDarkMode ? 'text-slate-400' : 'text-stone-600'
                      }`}>
                        Options
                      </span>
                      <button
                        onClick={() => addOption(question.id)}
                        className={`p-1 rounded text-xs ${
                          isDarkMode
                            ? 'bg-slate-600 hover:bg-slate-500 text-slate-300'
                            : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
                        }`}
                        title="Add Option"
                      >
                        <Plus size={10} />
                      </button>
                    </div>
                    
                    {question.options.map((option) => (
                      <div key={option.id} className="flex gap-2 items-center">
                        <input
                          value={option.label}
                          onChange={(e) => updateOption(question.id, option.id, 'label', e.target.value)}
                          className={`flex-1 p-1 text-xs rounded border ${
                            isDarkMode
                              ? 'bg-slate-600 border-slate-500 text-white placeholder-slate-400'
                              : 'bg-white border-stone-200 text-stone-800 placeholder-stone-400'
                          }`}
                          placeholder="Option text"
                        />
                        {question.type === 'emoji' && (
                          <input
                            value={option.emoji || ''}
                            onChange={(e) => updateOption(question.id, option.id, 'emoji', e.target.value)}
                            className={`w-12 p-1 text-xs rounded border text-center ${
                              isDarkMode
                                ? 'bg-slate-600 border-slate-500 text-white placeholder-slate-400'
                                : 'bg-white border-stone-200 text-stone-800 placeholder-stone-400'
                            }`}
                            placeholder="🎉"
                          />
                        )}
                        {question.options.length > 1 && (
                          <button
                            onClick={() => removeOption(question.id, option.id)}
                            className="p-1 rounded text-red-500 hover:bg-red-500/10"
                            title="Remove Option"
                          >
                            <X size={10} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Paste Example Dialog */}
      <PasteExampleDialog
        isOpen={showPasteDialog}
        onClose={() => setShowPasteDialog(false)}
        onPaste={handlePasteFromDialog}
        isDarkMode={isDarkMode}
      />
      </div>
    </div>
  );
};
