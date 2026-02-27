import React, { useState, useEffect } from 'react';
import {
  fetchSurveys,
  generateInsights
} from '../utils/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  TrendingUp,
  Users,
  MessageSquare,
  Lightbulb,
  Loader2
} from 'lucide-react';

interface Survey {
  id: string;
  prompt: string;
}

interface ResponseAnalyticsProps {
  isDarkMode?: boolean;
}

const ResponseAnalytics: React.FC<ResponseAnalyticsProps> = ({ isDarkMode = false }) => {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState('');
  const [insights, setInsights] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSurveys();
  }, []);

  const loadSurveys = async () => {
    try {
      const data = await fetchSurveys();
      setSurveys(data.surveys || []);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to load surveys');
      } else {
        setError('Failed to load surveys');
      }
    }
  };

  const handleGenerateInsights = async () => {
    if (!selectedSurvey) {
      setError('Please select a survey to generate insights');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await generateInsights(selectedSurvey);
      setInsights(result.insights);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to generate insights');
      } else {
        setError('Failed to generate insights');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatInsights = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^\* (.*)$/gm, '<li>$1</li>')
      .replace(/(\r\n|\n){2,}/g, '</p><p>')
      .replace(/(\r\n|\n)/g, '<br>');
  };

  const sampleResponseData = [
    { name: 'Very Satisfied', value: 45, color: '#d90429' },
    { name: 'Satisfied', value: 30, color: '#ff6b6b' },
    { name: 'Neutral', value: 18, color: '#ffd93d' },
    { name: 'Dissatisfied', value: 7, color: '#6bcf7f' }
  ];

  const sampleBarData = [
    { question: 'Q1', responses: 120 },
    { question: 'Q2', responses: 98 },
    { question: 'Q3', responses: 86 },
    { question: 'Q4', responses: 110 },
    { question: 'Q5', responses: 95 }
  ];

  const base = isDarkMode
    ? {
        text: 'text-gray-100',
        bg: 'bg-slate-800',
        border: 'border-slate-600',
        label: 'text-slate-300',
        card: 'bg-slate-900',
        sub: 'text-slate-400',
        select: 'bg-slate-700 text-white'
      }
    : {
        text: 'text-gray-900',
        bg: 'bg-white',
        border: 'border-red-100',
        label: 'text-gray-700',
        card: 'bg-white',
        sub: 'text-gray-600',
        select: 'bg-white text-gray-900'
      };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className={`text-xl sm:text-2xl font-bold flex items-center gap-2 ${base.text}`}>
          <TrendingUp size={20} className="text-red-600" />
          Response Analytics
        </h2>
      </div>

      {/* Survey Selection */}
      <div className={`${base.card} rounded-2xl p-4 sm:p-6 shadow-lg border ${base.border}`}>
        <div className="flex flex-col gap-3">
          <div className="flex-1">
            <label className={`block text-sm font-medium mb-2 ${base.label}`}>
              Select Survey
            </label>
            <select
              value={selectedSurvey}
              onChange={(e) => setSelectedSurvey(e.target.value)}
              className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 ${base.select} ${base.border}`}
            >
              <option value="">Choose a survey...</option>
              {surveys.map((survey) => (
                <option key={survey.id} value={survey.id}>
                  {survey.prompt}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleGenerateInsights}
            disabled={loading || !selectedSurvey}
            className="w-full sm:w-auto px-6 py-2.5 sm:py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Analyzing...
              </>
            ) : (
              <>
                <Lightbulb size={18} />
                Generate Insights
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {[
          {
            title: 'Total Responses',
            value: '1,247',
            icon: <Users size={24} className="text-red-600" />,
            iconBg: 'bg-red-100'
          },
          {
            title: 'Completion Rate',
            value: '78.5%',
            icon: <TrendingUp size={24} className="text-green-600" />,
            iconBg: 'bg-green-100'
          },
          {
            title: 'Avg. Time',
            value: '4.2m',
            icon: <MessageSquare size={24} className="text-blue-600" />,
            iconBg: 'bg-blue-100'
          }
        ].map((stat, i) => (
          <div
            key={i}
            className={`${base.card} rounded-2xl p-4 sm:p-6 shadow-lg border ${base.border}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs sm:text-sm font-medium ${base.sub}`}>{stat.title}</p>
                <p className={`text-2xl sm:text-3xl font-bold ${base.text}`}>{stat.value}</p>
              </div>
              <div className={`p-3 rounded-xl ${stat.iconBg}`}>{stat.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Pie Chart */}
        <div className={`${base.card} rounded-2xl p-4 sm:p-6 shadow-lg border ${base.border}`}>
          <h3 className={`text-base sm:text-lg font-semibold mb-4 ${base.text}`}>Response Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={sampleResponseData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={2}
                dataKey="value"
              >
                {sampleResponseData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart */}
        <div className={`${base.card} rounded-2xl p-4 sm:p-6 shadow-lg border ${base.border}`}>
          <h3 className={`text-base sm:text-lg font-semibold mb-4 ${base.text}`}>Responses by Question</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={sampleBarData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="question" stroke={isDarkMode ? '#ccc' : '#000'} />
              <YAxis stroke={isDarkMode ? '#ccc' : '#000'} />
              <Tooltip />
              <Bar dataKey="responses" fill="#d90429" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Insights */}
      {insights && (
        <div className={`bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl p-6 shadow-lg border ${base.border}`}>
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Lightbulb className="text-red-600" size={24} />
            AI-Generated Business Insights
          </h3>
          <div
            className={`prose max-w-none leading-relaxed ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}
            dangerouslySetInnerHTML={{ __html: formatInsights(insights) }}
          />
        </div>
      )}
    </div>
  );
};

export default ResponseAnalytics;
