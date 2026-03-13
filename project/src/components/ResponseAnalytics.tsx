import React, { useState, useEffect } from 'react';
import { fetchSurveys } from '../utils/api';
import { Loader2, MessageSquare } from 'lucide-react';

interface ResponseAnalyticsProps {
  isDarkMode?: boolean;
}

function ResponseAnalytics({ isDarkMode = false }: ResponseAnalyticsProps) {
  const [surveys, setSurveys] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSurveys();
  }, []);

  const loadSurveys = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await fetchSurveys();
      
      // Simple validation and setting
      const rawSurveys = data.surveys || [];
      const validSurveys = rawSurveys.filter(s => s && typeof s === 'object');
      setSurveys(validSurveys);
      
    } catch (err: unknown) {
      console.error('Failed to load surveys:', err);
      setError('Failed to load surveys');
      setSurveys([]);
    } finally {
      setLoading(false);
    }
  };

  const base = isDarkMode
    ? {
        text: 'text-gray-100',
        card: 'bg-slate-900',
        border: 'border-slate-600',
        sub: 'text-slate-400'
      }
    : {
        text: 'text-gray-900',
        card: 'bg-white',
        border: 'border-red-100',
        sub: 'text-gray-600'
      };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className={`text-xl sm:text-2xl font-bold ${base.text}`}>
          Response Analytics
        </h2>
      </div>

      {/* Loading State */}
      {loading && (
        <div className={`${base.card} rounded-2xl p-8 text-center shadow-lg border ${base.border}`}>
          <Loader2 className="animate-spin mx-auto mb-4" size={32} />
          <p className={`${base.text}`}>Loading surveys...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          <div className="flex items-center gap-2">
            <span className="font-medium">Error:</span>
            <span>{error}</span>
          </div>
          <button
            onClick={loadSurveys}
            className="mt-2 text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <div className={`${base.card} rounded-2xl p-6 shadow-lg border ${base.border}`}>
          {surveys.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare size={48} className="mx-auto text-gray-400 mb-2" />
              <p className={`${base.text}`}>No surveys available</p>
            </div>
          ) : (
            <div>
              <p className={`${base.text} mb-4`}>Found {surveys.length} surveys</p>
              <div className="space-y-2">
                {surveys.map((survey, index) => (
                  <div key={index} className={`p-3 border rounded ${base.border}`}>
                    <p className={`${base.text}`}>Survey {index + 1}</p>
                    <p className={`${base.sub} text-sm`}>Type: {typeof survey}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ResponseAnalytics;
