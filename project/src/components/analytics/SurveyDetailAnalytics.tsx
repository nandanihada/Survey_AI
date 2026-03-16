import React, { useState, useMemo } from 'react';
import { ArrowLeft, Download, TrendingUp, Users, Clock, BarChart3, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';

interface Question {
  id: string;
  text: string;
  type: 'multiple-choice' | 'rating' | 'open-text';
  options?: string[];
  answers: any[];
}

interface Response {
  id: string;
  surveyId: string;
  completed: boolean;
  device: "mobile" | "desktop" | "tablet";
  source: "direct" | "email" | "social" | "embed";
  country: string;
  completionTime: number;
  answers: Record<string, any>;
  createdAt: Date;
}

interface SurveyDetailAnalyticsProps {
  survey: {
    id: string;
    title: string;
    createdAt: Date;
    totalResponses: number;
    completionRate: number;
    averageCompletionTime: number;
    questions: Question[];
  };
  responses: Response[];
  onBack: () => void;
}

const SurveyDetailAnalytics: React.FC<SurveyDetailAnalyticsProps> = ({ survey, responses, onBack }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'questions' | 'funnel'>('overview');

  // Filter responses for this survey
  const surveyResponses = useMemo(() => 
    responses.filter(r => r.surveyId === survey.id),
    [responses, survey.id]
  );

  // Calculate drop-off funnel data
  const funnelData = useMemo(() => {
    if (survey.questions.length === 0) return [];
    
    const questionAnswerCounts = survey.questions.map((question, index) => {
      const answeredCount = surveyResponses.filter(response => 
        response.answers[question.id] !== undefined && response.answers[question.id] !== null
      ).length;
      
      return {
        step: index === 0 ? 'Started Survey' : `Question ${index}`,
        count: index === 0 ? surveyResponses.length : answeredCount,
        percentage: Math.round((answeredCount / surveyResponses.length) * 100)
      };
    });

    const completedCount = surveyResponses.filter(r => r.completed).length;
    questionAnswerCounts.push({
      step: 'Completed',
      count: completedCount,
      percentage: Math.round((completedCount / surveyResponses.length) * 100)
    });

    return questionAnswerCounts;
  }, [survey.questions, surveyResponses]);

  // Device distribution
  const deviceData = useMemo(() => {
    const counts = surveyResponses.reduce((acc, response) => {
      const deviceLabels = {
        mobile: 'Mobile',
        desktop: 'Desktop',
        tablet: 'Tablet'
      };
      const label = deviceLabels[response.device];
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      percentage: Math.round((value / surveyResponses.length) * 100)
    }));
  }, [surveyResponses]);

  // Response trend over time
  const trendData = useMemo(() => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      date.setHours(0, 0, 0, 0);
      return date;
    });

    return last30Days.map(date => {
      const dayStart = new Date(date);
      const dayEnd = new Date(date);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const dayResponses = surveyResponses.filter(r => 
        r.createdAt >= dayStart && r.createdAt < dayEnd
      );

      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        responses: dayResponses.length
      };
    });
  }, [surveyResponses]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  const renderQuestionAnalytics = (question: Question) => {
    const questionResponses = surveyResponses.filter(r => 
      r.answers[question.id] !== undefined && r.answers[question.id] !== null
    );

    switch (question.type) {
      case 'multiple-choice':
        const choiceCounts = questionResponses.reduce((acc, response) => {
          const answer = response.answers[question.id];
          acc[answer] = (acc[answer] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const choiceData = Object.entries(choiceCounts).map(([choice, count]) => ({
          choice,
          count,
          percentage: Math.round((count / questionResponses.length) * 100)
        }));

        return (
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h4 className="font-medium text-gray-900 mb-3">{question.text}</h4>
            <div className="space-y-2">
              {choiceData.map((item) => (
                <div key={item.choice} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{item.choice}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'rating':
        const ratings = questionResponses.map(r => r.answers[question.id]).filter(r => r != null);
        const averageRating = ratings.length > 0 
          ? (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1)
          : '0';

        const ratingDistribution = [1, 2, 3, 4, 5].map(rating => ({
          rating,
          count: ratings.filter(r => r === rating).length,
          percentage: Math.round((ratings.filter(r => r === rating).length / ratings.length) * 100)
        }));

        return (
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h4 className="font-medium text-gray-900 mb-3">{question.text}</h4>
            <div className="mb-4">
              <div className="text-2xl font-bold text-blue-600">{averageRating}</div>
              <div className="text-sm text-gray-600">Average Rating</div>
            </div>
            <div className="space-y-2">
              {ratingDistribution.map((item) => (
                <div key={item.rating} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{item.rating} star{item.rating > 1 ? 's' : ''}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-yellow-500 h-2 rounded-full"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'open-text':
        const textAnswers = questionResponses.map(r => r.answers[question.id]).filter(a => a && a.trim());
        
        return (
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h4 className="font-medium text-gray-900 mb-3">{question.text}</h4>
            <div className="text-sm text-gray-600 mb-3">
              {textAnswers.length} responses
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {textAnswers.slice(0, 10).map((answer, index) => (
                <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                  {answer}
                </div>
              ))}
              {textAnswers.length > 10 && (
                <div className="text-center text-sm text-gray-500">
                  ... and {textAnswers.length - 10} more responses
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Analytics
          </button>
          
          <h1 className="text-2xl font-bold text-gray-900">{survey.title}</h1>
          <p className="text-gray-600 mt-1">Detailed analytics and insights</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Total Responses</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{survey.totalResponses}</div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-gray-700">Completion Rate</span>
            </div>
            <div className="text-2xl font-bold text-green-600">{survey.completionRate}%</div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-medium text-gray-700">Avg Time</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {Math.floor(survey.averageCompletionTime / 60)}m {survey.averageCompletionTime % 60}s
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="text-sm font-medium text-gray-700">Drop-off Rate</span>
            </div>
            <div className="text-2xl font-bold text-red-600">{100 - survey.completionRate}%</div>
          </div>
        </div>

        {/* Export Button */}
        <div className="flex justify-end mb-6">
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Download className="h-4 w-4" />
            Export Report
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('questions')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'questions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Question Analytics
            </button>
            <button
              onClick={() => setActiveTab('funnel')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'funnel'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Drop-off Analysis
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Response Trend */}
            <div className="lg:col-span-2 bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Response Trend</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="responses"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Device Distribution */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Device Distribution</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deviceData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ percentage }) => `${percentage}%`}
                    >
                      {deviceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'questions' && (
          <div className="space-y-4">
            {survey.questions.map((question) => (
              <div key={question.id}>
                {renderQuestionAnalytics(question)}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'funnel' && (
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Drop-off Funnel</h3>
            <div className="space-y-4">
              {funnelData.map((step, index) => (
                <div key={step.step} className="flex items-center">
                  <div className="w-32 text-sm font-medium text-gray-700">
                    {step.step}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold text-gray-900 w-16">
                        {step.count}
                      </div>
                      <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                        <div 
                          className="bg-blue-600 h-6 rounded-full transition-all duration-300"
                          style={{ width: `${step.percentage}%` }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                          {step.percentage}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SurveyDetailAnalytics;
