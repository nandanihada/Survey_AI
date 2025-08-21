import React, { useState, useEffect } from 'react';
import { getStoredResponses, getResponsesAnalytics } from '../utils/widgetApi';
import { Calendar, User, BarChart3, Trash2 } from 'lucide-react';

interface WidgetResponsesViewProps {
  isDarkMode?: boolean;
}

export const WidgetResponsesView: React.FC<WidgetResponsesViewProps> = ({ isDarkMode = false }) => {
  const [responses, setResponses] = useState(getStoredResponses());
  const [analytics, setAnalytics] = useState(getResponsesAnalytics());

  useEffect(() => {
    const updateData = () => {
      setResponses(getStoredResponses());
      setAnalytics(getResponsesAnalytics());
    };

    updateData();
    
    // Refresh data every 5 seconds
    const interval = setInterval(updateData, 5000);
    return () => clearInterval(interval);
  }, []);

  const clearAllResponses = () => {
    if (confirm('Are you sure you want to clear all widget responses?')) {
      localStorage.removeItem('widgetResponses');
      setResponses([]);
      setAnalytics(getResponsesAnalytics());
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  };

  return (
    <div className={`space-y-6 ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
      {/* Analytics Overview */}
      <div className={`p-6 rounded-lg border ${
        isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-stone-200'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
            Widget Responses Analytics
          </h3>
          <button
            onClick={clearAllResponses}
            className="flex items-center gap-2 px-3 py-1 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            <Trash2 size={14} />
            Clear All
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-4 rounded-lg ${
            isDarkMode ? 'bg-slate-700/50' : 'bg-stone-50'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 size={16} className="text-blue-500" />
              <span className="text-sm font-medium">Total Responses</span>
            </div>
            <div className="text-2xl font-bold">{analytics.totalResponses}</div>
          </div>
          
          <div className={`p-4 rounded-lg ${
            isDarkMode ? 'bg-slate-700/50' : 'bg-stone-50'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <User size={16} className="text-green-500" />
              <span className="text-sm font-medium">Unique Sessions</span>
            </div>
            <div className="text-2xl font-bold">
              {new Set(responses.map(r => r.sessionId)).size}
            </div>
          </div>
          
          <div className={`p-4 rounded-lg ${
            isDarkMode ? 'bg-slate-700/50' : 'bg-stone-50'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={16} className="text-purple-500" />
              <span className="text-sm font-medium">Latest Response</span>
            </div>
            <div className="text-sm">
              {analytics.latestResponse 
                ? formatTimestamp(analytics.latestResponse.timestamp)
                : 'No responses yet'
              }
            </div>
          </div>
        </div>
      </div>

      {/* Question Analytics */}
      {Object.keys(analytics.responsesByQuestion).length > 0 && (
        <div className={`p-6 rounded-lg border ${
          isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-stone-200'
        }`}>
          <h4 className={`text-md font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
            Response Breakdown by Question
          </h4>
          
          <div className="space-y-4">
            {Object.entries(analytics.responsesByQuestion).map(([questionId, answers]) => (
              <div key={questionId} className={`p-4 rounded-lg ${
                isDarkMode ? 'bg-slate-700/50' : 'bg-stone-50'
              }`}>
                <h5 className="font-medium mb-2">{questionId}</h5>
                <div className="space-y-1">
                  {Object.entries(answers).map(([answer, count]) => (
                    <div key={answer} className="flex items-center justify-between">
                      <span className="text-sm">{answer}</span>
                      <div className="flex items-center gap-2">
                        <div className={`h-2 rounded-full ${
                          isDarkMode ? 'bg-slate-600' : 'bg-stone-200'
                        }`} style={{ width: '100px' }}>
                          <div 
                            className="h-2 bg-blue-500 rounded-full"
                            style={{ 
                              width: `${(count / analytics.totalResponses) * 100}%` 
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium min-w-[30px]">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Individual Responses */}
      <div className={`p-6 rounded-lg border ${
        isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-stone-200'
      }`}>
        <h4 className={`text-md font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
          Individual Responses ({responses.length})
        </h4>
        
        {responses.length === 0 ? (
          <div className={`text-center py-8 ${
            isDarkMode ? 'text-slate-400' : 'text-stone-500'
          }`}>
            <BarChart3 size={48} className="mx-auto mb-4 opacity-50" />
            <p>No widget responses yet.</p>
            <p className="text-sm">Responses will appear here when users complete the widget.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {responses.slice().reverse().map((response) => (
              <div key={response.id} className={`p-3 rounded-lg border ${
                isDarkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-stone-50 border-stone-200'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-blue-500">
                    ID: {response.id}
                  </span>
                  <span className={`text-xs ${
                    isDarkMode ? 'text-slate-400' : 'text-stone-500'
                  }`}>
                    {formatTimestamp(response.timestamp)}
                  </span>
                </div>
                
                <div className="space-y-1">
                  {Object.entries(response.responses).map(([questionId, answer]) => (
                    <div key={questionId} className="text-sm">
                      <span className={`font-medium ${
                        isDarkMode ? 'text-slate-300' : 'text-stone-600'
                      }`}>
                        {questionId}:
                      </span>
                      <span className="ml-2">{answer}</span>
                    </div>
                  ))}
                </div>
                
                <div className={`text-xs mt-2 pt-2 border-t ${
                  isDarkMode ? 'border-slate-600 text-slate-400' : 'border-stone-200 text-stone-500'
                }`}>
                  Session: {response.sessionId}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
