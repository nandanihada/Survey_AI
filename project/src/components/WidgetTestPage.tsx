import React, { useState, useEffect } from 'react';
import { FloatingWidgetProvider, FloatingWidgetDebug } from './FloatingWidgetProvider';
import { useUserBehavior } from '../hooks/useUserBehavior';
import { Play, Settings, Zap, Sparkles, Eye, Activity, Timer, Palette } from 'lucide-react';
import { WidgetCustomizer, WidgetCustomizerSettings, Question } from './WidgetCustomizer';
import FloatingWidget from './FloatingWidget';
import TestLabCard, { TestLabCardData } from './TestLabCard';

const TestContent: React.FC<{ 
  isDarkMode: boolean; 
  cards: TestLabCardData[]; 
  onReplay: (card: TestLabCardData) => void;
  onDelete: (cardId: string) => void;
}> = ({ isDarkMode, cards, onReplay, onDelete }) => {
  const { behavior, engagementScore, userIntent, isLikelyToConvert } = useUserBehavior();

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Compact Stats */}
      <div className={`p-5 rounded-lg border ${
        isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-stone-200'
      }`}>
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
              {Math.round(behavior.timeOnPage / 1000)}s
            </div>
            <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`}>
              Time
            </div>
          </div>
          
          <div className="text-center">
            <div className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
              {behavior.clickCount}
            </div>
            <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`}>
              Clicks
            </div>
          </div>
          
          <div className="text-center">
            <div className={`text-xl font-bold ${
              engagementScore > 60 ? 'text-green-500' : 
              engagementScore > 30 ? 'text-yellow-500' : 'text-red-500'
            }`}>
              {engagementScore}%
            </div>
            <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`}>
              Engagement
            </div>
          </div>
          
          <div className="text-center">
            <div className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
              {cards.length}
            </div>
            <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`}>
              Questions
            </div>
          </div>
        </div>
      </div>

      {/* Test Lab Cards - Scrollable */}
      <div className={`flex-1 min-h-0 rounded-lg border overflow-hidden ${
        isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-stone-200'
      }`}>
        <div className="p-5 border-b border-opacity-50">
          <div className="flex items-center justify-between">
            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
              📊 Response History
            </h3>
            {cards.length > 0 && (
              <span className={`text-sm px-3 py-1 rounded-full ${
                isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-stone-100 text-stone-600'
              }`}>
                {cards.length} response{cards.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        
        <div className="h-full overflow-y-auto p-5">
          {cards.length > 0 ? (
            <div className="space-y-4">
              {cards.map((card, index) => (
                <TestLabCard
                  key={card.id}
                  card={card}
                  isDarkMode={isDarkMode}
                  onReplay={onReplay}
                  onDelete={onDelete}
                  index={index}
                />
              ))}
            </div>
          ) : (
            <div className={`text-center py-12 ${
              isDarkMode ? 'text-slate-400' : 'text-stone-500'
            }`}>
              <Sparkles size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No responses yet</p>
              <p className="text-sm">Test your widget to see results here!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const WidgetTestPage: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [testLabCards, setTestLabCards] = useState<TestLabCardData[]>([]);
  const [widgetSettings, setWidgetSettings] = useState<WidgetCustomizerSettings>({
    color: 'red',
    transparency: 95,
    glassEffect: true,
    animationSpeed: 50,
    questionDelay: 2000,
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
      },
      {
        id: 'q2',
        text: 'What\'s keeping you most engaged right now?',
        type: 'choice',
        options: [
          { id: 'opt1', label: 'Content quality', emoji: '📝' },
          { id: 'opt2', label: 'Design & interface', emoji: '🎨' },
          { id: 'opt3', label: 'Features', emoji: '⚡' },
          { id: 'opt4', label: 'Just exploring', emoji: '🔍' }
        ]
      },
      {
        id: 'q3',
        text: 'How likely are you to recommend this to a friend?',
        type: 'scale',
        options: [
          { id: 'opt1', label: 'Not at all' },
          { id: 'opt2', label: 'Unlikely' },
          { id: 'opt3', label: 'Maybe' },
          { id: 'opt4', label: 'Likely' },
          { id: 'opt5', label: 'Definitely!' }
        ]
      }
    ]
  });
  const [showWidget, setShowWidget] = useState(false);
  const { behavior } = useUserBehavior();
  
  const handleSettingsChange = (settings: WidgetCustomizerSettings) => {
    setWidgetSettings(settings);
  };
  
  const handleShowWidget = () => {
    setShowWidget(true);
  };
  
  const handleHideWidget = () => {
    setShowWidget(false);
  };
  
  const handleCreateCard = (questionData: {
    question: string;
    answer: string;
    questionAnimation: string;
    answerAnimation: string;
    color: string;
    questionType: 'emoji' | 'scale' | 'choice';
    selectedOption: {
      id: string;
      label: string;
      emoji?: string;
    };
  }) => {
    const newCard: TestLabCardData = {
      id: `card-${Date.now()}-${Math.random()}`,
      question: questionData.question,
      answer: questionData.answer,
      questionAnimation: questionData.questionAnimation,
      answerAnimation: questionData.answerAnimation,
      timestamp: Date.now(),
      color: questionData.color,
      questionType: questionData.questionType,
      selectedOption: questionData.selectedOption
    };
    
    setTestLabCards((prev) => [newCard, ...prev]);
  };

  const handleWidgetComplete = (responses: Record<string, string>) => {
    console.log('✅ Widget completed with responses:', responses);
    setShowWidget(false);
  };
  
  const handleWidgetDismiss = () => {
    console.log('❌ Widget dismissed');
    setShowWidget(false);
  };

  return (
    <div className={`h-screen overflow-hidden transition-all duration-300 ${
      isDarkMode ? 'bg-slate-900 text-white' : 'bg-stone-50 text-stone-800'
    }`}>
      {/* Compact Header */}
      <header className={`border-b ${
        isDarkMode ? 'bg-slate-800/90 border-slate-700' : 'bg-white/90 border-stone-200'
      } backdrop-blur-sm`}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${
              isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'
            }`}>
              <Sparkles size={16} />
            </div>
            <div>
              <h1 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-stone-800'}`}> 
                Widget Test Lab
              </h1>
            </div>
          </div>
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              isDarkMode 
                ? 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white' 
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-800'
            }`}
          >
            {isDarkMode ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>
      </header>

      {/* Content - Full screen grid */}
      <main className="h-[calc(100vh-64px)] px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full max-w-none">
          {/* Widget Customizer - Left half */}
          <div className="h-full">
            <WidgetCustomizer 
              isDarkMode={isDarkMode} 
              onSettingsChange={handleSettingsChange}
              onShowWidget={handleShowWidget}
              onHideWidget={handleHideWidget}
              isWidgetVisible={showWidget}
              initialSettings={widgetSettings}
            />
          </div>

          {/* Main Content - Right half */}
          <div className="h-full">
            <TestContent 
              isDarkMode={isDarkMode} 
              cards={testLabCards}
              onReplay={(card) => console.log('Replaying card:', card)}
              onDelete={(cardId) => setTestLabCards(prev => prev.filter(c => c.id !== cardId))}
            />
          </div>
        </div>
      </main>

      {/* Custom Widget */}
      {showWidget && (
        <FloatingWidget
          isDarkMode={isDarkMode}
          userBehavior={behavior}
          customColor={widgetSettings.color}
          glassEffect={widgetSettings.glassEffect}
          transparency={widgetSettings.transparency}
          animationSpeed={widgetSettings.animationSpeed}
          questionDelay={widgetSettings.questionDelay}
          customQuestions={widgetSettings.questions}
          questionAnimation={widgetSettings.questionAnimation}
          answerAnimation={widgetSettings.answerAnimation}
          smartDelay={widgetSettings.smartDelay}
          minDelay={widgetSettings.minDelay}
          maxDelay={widgetSettings.maxDelay}
          onComplete={handleWidgetComplete}
          onDismiss={handleWidgetDismiss}
          onCreateCard={handleCreateCard}
        />
      )}
    </div>
  );
};

export default WidgetTestPage;
