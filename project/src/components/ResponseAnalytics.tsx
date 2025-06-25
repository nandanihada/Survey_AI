import React, { useState, useEffect } from 'react';
import { fetchSurveys, generateInsights } from '../utils/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, MessageSquare, Lightbulb, Loader2 } from 'lucide-react';

interface Survey {
  id: string;
  prompt: string;
}

const ResponseAnalytics: React.FC = () => {
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

  // Mock data for demonstration
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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <TrendingUp size={24} className="text-red-600" />
          <span className="text-2xl"></span>
          Response Analytics
        </h2>
      </div>

      {/* Survey Selection */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-red-100">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Survey
            </label>
            <select
              value={selectedSurvey}
              onChange={(e) => setSelectedSurvey(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
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
            className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold rounded-xl transition-colors flex items-center gap-2"
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

      {/* Analytics Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stats Cards */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-red-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Responses</p>
              <p className="text-3xl font-bold text-gray-900">1,247</p>
            </div>
            <div className="p-3 bg-red-100 rounded-xl">
              <Users className="text-red-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg border border-red-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completion Rate</p>
              <p className="text-3xl font-bold text-gray-900">78.5%</p>
            </div>
            <div className="p-3 bg-green-100 rounded-xl">
              <TrendingUp className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg border border-red-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg. Time</p>
              <p className="text-3xl font-bold text-gray-900">4.2m</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <MessageSquare className="text-blue-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-red-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-xl"></span>
            Response Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
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

        <div className="bg-white rounded-2xl p-6 shadow-lg border border-red-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-xl"></span>
            Responses by Question
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sampleBarData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="question" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="responses" fill="#d90429" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* AI Insights */}
      {insights && (
        <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl p-6 shadow-lg border border-red-100">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Lightbulb className="text-red-600" size={24} />
            <span className="text-2xl"></span>
            AI-Generated Business Insights
          </h3>
          <div 
            className="prose prose-red max-w-none text-gray-700 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: formatInsights(insights) }}
          />
        </div>
      )}
    </div>
  );
};

export default ResponseAnalytics;