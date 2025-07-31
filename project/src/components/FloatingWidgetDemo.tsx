import React from 'react';
import { useFloatingWidget } from './FloatingWidgetProvider';
import { MessageSquare, Eye, EyeOff, Settings } from 'lucide-react';

interface FloatingWidgetDemoProps {
  isDarkMode?: boolean;
}

export const FloatingWidgetDemo: React.FC<FloatingWidgetDemoProps> = ({ isDarkMode = false }) => {
  const { showWidget, hideWidget, isWidgetEnabled, setWidgetEnabled, responses } = useFloatingWidget();

  return (
    <div className={`rounded-xl border p-6 ${
      isDarkMode
        ? 'bg-slate-800/50 border-slate-700'
        : 'bg-white border-stone-200 shadow-sm'
    }`}>
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs ${
          isDarkMode ? 'bg-red-500/20 text-red-400' : 'bg-red-50 text-red-600'
        }`}>
          <MessageSquare size={14} />
        </div>
        <h3 className={`text-lg font-medium ${
          isDarkMode ? 'text-white' : 'text-stone-800'
        }`}>
          Floating Widget Demo
        </h3>
      </div>

      <div className="space-y-4">
        <p className={`text-sm ${
          isDarkMode ? 'text-slate-300' : 'text-stone-600'
        }`}>
          The floating widget will appear automatically based on user behavior, but you can also control it manually:
        </p>

        <div className="flex flex-wrap gap-2">
          <a
            href="/widget-test"
            className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 transition-all duration-200 no-underline"
          >
            🧪 Open Test Lab
          </a>
          
          <button
            onClick={showWidget}
            disabled={!isWidgetEnabled}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              isWidgetEnabled
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Show Widget
          </button>

          <button
            onClick={hideWidget}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              isDarkMode
                ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Hide Widget
          </button>

          <button
            onClick={() => setWidgetEnabled(!isWidgetEnabled)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
              isWidgetEnabled
                ? (isDarkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-stone-100 text-stone-600 hover:bg-stone-200')
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
          >
            {isWidgetEnabled ? (
              <>
                <EyeOff size={14} />
                Disable Widget
              </>
            ) : (
              <>
                <Eye size={14} />
                Enable Widget
              </>
            )}
          </button>
        </div>

        <div className={`text-xs ${
          isDarkMode ? 'text-slate-400' : 'text-stone-500'
        }`}>
          Status: {isWidgetEnabled ? 'Enabled' : 'Disabled'}
        </div>

        {responses && (
          <div className={`mt-4 p-3 rounded-lg border ${
            isDarkMode
              ? 'bg-slate-700/50 border-slate-600'
              : 'bg-stone-50 border-stone-200'
          }`}>
            <h4 className={`text-sm font-medium mb-2 ${
              isDarkMode ? 'text-white' : 'text-stone-800'
            }`}>
              Last Widget Responses:
            </h4>
            <div className="space-y-1">
              {Object.entries(responses).map(([key, value]) => (
                <div key={key} className={`text-xs ${
                  isDarkMode ? 'text-slate-300' : 'text-stone-600'
                }`}>
                  <span className="font-medium capitalize">{key}:</span> {value}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={`mt-4 p-3 rounded-lg border ${
          isDarkMode
            ? 'bg-blue-500/10 border-blue-500/20'
            : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <Settings size={14} className="text-blue-500" />
            <h4 className={`text-sm font-medium ${
              isDarkMode ? 'text-blue-300' : 'text-blue-700'
            }`}>
              How it works:
            </h4>
          </div>
          <ul className={`text-xs space-y-1 ${
            isDarkMode ? 'text-blue-200' : 'text-blue-600'
          }`}>
            <li>• Widget appears centered with glass effect styling</li>
            <li>• Shows 3 emotionally warm, personalized questions</li>
            <li>• Letter-by-letter typewriter animation for questions</li>
            <li>• 2-3 second gaps between questions (customizable)</li>
            <li>• Large, Google Translate-style font sizes</li>
            <li>• Customizable colors and transparency effects</li>
            <li>• Auto-dismisses after 45 seconds if unanswered</li>
            <li>• Provides personalized content/ads based on responses</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
