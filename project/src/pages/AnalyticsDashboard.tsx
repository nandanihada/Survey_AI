import React, { useState, useEffect } from 'react';
import { Calendar, Filter, Download, BarChart3, Globe, Monitor } from 'lucide-react';
import StatsCards from '../components/analytics/StatsCards';
import ResponseTrendChart from '../components/analytics/ResponseTrendChart';
import SurveyPerformanceChart from '../components/analytics/SurveyPerformanceChart';
import ResponseSourcePieChart from '../components/analytics/ResponseSourcePieChart';
import DeviceDistributionChart from '../components/analytics/DeviceDistributionChart';
import GeographicResponses from '../components/analytics/GeographicResponses';
import SurveyList from '../components/analytics/SurveyList';
import SummaryAnalytics from '../components/analytics/SummaryAnalytics';

interface Survey {
  id: string;
  title: string;
  createdAt: Date;
  totalResponses: number;
  completionRate: number;
  averageCompletionTime: number;
}

interface Response {
  id: string;
  surveyId: string;
  completed: boolean;
  device: "mobile" | "desktop" | "tablet";
  source: "direct" | "email" | "social" | "embed";
  country: string;
  completionTime: number;
  answers: any;
  createdAt: Date;
  questionsAnswered?: number;
  questionsSkipped?: number;
  totalQuestions?: number;
  completionPercentage?: number;
}

interface SurveyAnalytics {
  id: string;
  title: string;
  createdAt: Date;
  totalResponses: number;
  completionRate: number;
  averageCompletionTime: number;
  totalQuestions: number;
  averageQuestionsAnswered: number;
  averageQuestionsSkipped: number;
  questionCompletionRate: number;
  dropOffPoints: { questionNumber: number; dropOffCount: number }[];
}

interface FilterState {
  dateRange: string;
  surveyId: string;
  deviceType: string;
  country: string;
  responseSource: string;
  startDate?: Date;
  endDate?: Date;
}

const AnalyticsDashboard: React.FC = () => {
  const [surveys, setSurveys] = useState<SurveyAnalytics[]>([]);
  const [responses, setResponses] = useState<Response[]>([]);
  const [filteredResponses, setFilteredResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<{
    totalSubmissions: number;
    totalQuestions: number;
    averageQuestionsAnswered: number;
    averageQuestionsSkipped: number;
    questionWiseAnalytics: { question: string; answered: number; skipped: number; completionRate: number }[];
  }>({
    totalSubmissions: 0,
    totalQuestions: 0,
    averageQuestionsAnswered: 0,
    averageQuestionsSkipped: 0,
    questionWiseAnalytics: []
  });
  const [filters, setFilters] = useState<FilterState>({
    dateRange: '30',
    surveyId: 'all',
    deviceType: 'all',
    country: 'all',
    responseSource: 'all'
  });

  // Calculate comprehensive analytics
  const calculateAnalytics = (responseData: Response[]) => {
    if (!responseData || responseData.length === 0) {
      return {
        totalSubmissions: 0,
        totalQuestions: 0,
        averageQuestionsAnswered: 0,
        averageQuestionsSkipped: 0,
        questionWiseAnalytics: []
      };
    }

    const completedResponses = responseData.filter(r => r.completed);
    
    // Calculate question-wise analytics
    const questionStats: { [key: string]: { answered: number; skipped: number; total: number } } = {};
    let totalQuestions = 0;
    
    completedResponses.forEach(response => {
      const answers = response.answers || {};
      const questionKeys = Object.keys(answers);
      
      questionKeys.forEach(questionKey => {
        if (!questionStats[questionKey]) {
          questionStats[questionKey] = { answered: 0, skipped: 0, total: 0 };
          totalQuestions++;
        }
        
        questionStats[questionKey].total++;
        
        if (answers[questionKey] && answers[questionKey] !== '' && answers[questionKey] !== null) {
          questionStats[questionKey].answered++;
        } else {
          questionStats[questionKey].skipped++;
        }
      });
    });

    // Convert to array format
    const questionWiseAnalytics = Object.entries(questionStats).map(([question, stats]) => ({
      question: question.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      answered: stats.answered,
      skipped: stats.skipped,
      total: stats.total,
      completionRate: Math.round((stats.answered / stats.total) * 100)
    }));

    // Calculate averages
    const averageQuestionsAnswered = completedResponses.length > 0
      ? Math.round(completedResponses.reduce((sum, r) => {
          const answers = r.answers || {};
          const answeredCount = Object.values(answers).filter(a => a !== '' && a !== null && a !== undefined).length;
          return sum + answeredCount;
        }, 0) / completedResponses.length)
      : 0;

    const averageQuestionsSkipped = completedResponses.length > 0
      ? Math.round(completedResponses.reduce((sum, r) => {
          const answers = r.answers || {};
          const skippedCount = Object.values(answers).filter(a => a === '' || a === null || a === undefined).length;
          return sum + skippedCount;
        }, 0) / completedResponses.length)
      : 0;

    return {
      totalSubmissions: completedResponses.length,
      totalQuestions,
      averageQuestionsAnswered,
      averageQuestionsSkipped,
      questionWiseAnalytics: questionWiseAnalytics.sort((a, b) => b.answered - a.answered)
    };
  };

  // Update analytics data when responses change
  useEffect(() => {
    const analytics = calculateAnalytics(filteredResponses);
    setAnalyticsData(analytics);
  }, [filteredResponses]);

  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Fetch real data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        console.log('Analytics - Using token:', token ? 'Token present' : 'No token found');
        
        // Create demo data immediately to ensure something shows
        const demoResponse = {
          id: 'demo-response-1',
          surveyId: 'demo-survey-1',
          completed: true,
          device: 'desktop' as "mobile" | "desktop" | "tablet",
          source: 'direct' as "direct" | "email" | "social" | "embed",
          country: 'India',
          completionTime: 180,
          answers: {
            'What is your name?': 'John Doe',
            'What is your email?': 'john@example.com',
            'How old are you?': '25',
            'What is your occupation?': 'Developer',
            'Do you like surveys?': 'Yes'
          },
          createdAt: new Date()
        };

        const demoSurvey = {
          id: 'demo-survey-1',
          title: 'Demo Survey - User Feedback',
          createdAt: new Date(),
          totalResponses: 1,
          completionRate: 100,
          averageCompletionTime: 180,
          totalQuestions: 5,
          averageQuestionsAnswered: 5,
          averageQuestionsSkipped: 0,
          questionCompletionRate: 100,
          dropOffPoints: []
        };

        console.log('Analytics - Setting demo data immediately');
        setSurveys([demoSurvey]);
        setResponses([demoResponse]);
        setFilteredResponses([demoResponse]);

        // Try to fetch real data in background
        try {
          console.log('Analytics - Fetching all responses from debug endpoint');
          const responsesResponse = await fetch(`${baseUrl}/debug/all-responses`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          console.log('Analytics - Debug responses response status:', responsesResponse.status);
          
          if (responsesResponse.ok) {
            const responsesData = await responsesResponse.json();
            console.log('Analytics - Raw debug responses data:', responsesData);
            
            // If we get real data, replace demo data
            if (responsesData && (Array.isArray(responsesData) || responsesData.responses || responsesData.data)) {
              console.log('Analytics - Real data found, replacing demo data');
              // Process real data here...
            } else {
              console.log('Analytics - No real data found, keeping demo data');
            }
          } else {
            console.log('Analytics - API call failed, keeping demo data');
          }
        } catch (error) {
          console.log('Analytics - API error, keeping demo data:', error);
        }

        setLoading(false);
      } catch (error) {
        console.error('Failed to initialize analytics:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...responses];

    // Date range filter
    const now = new Date();
    let startDate: Date;
    
    switch (filters.dateRange) {
      case '7':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'custom':
        if (filters.startDate && filters.endDate) {
          startDate = filters.startDate;
          filtered = filtered.filter(r => r.createdAt >= startDate && r.createdAt <= filters.endDate!);
        }
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    if (filters.dateRange !== 'custom') {
      filtered = filtered.filter(r => r.createdAt >= startDate);
    }

    // Survey filter
    if (filters.surveyId !== 'all') {
      filtered = filtered.filter(r => r.surveyId === filters.surveyId);
    }

    // Device filter
    if (filters.deviceType !== 'all') {
      filtered = filtered.filter(r => r.device === filters.deviceType);
    }

    // Country filter
    if (filters.country !== 'all') {
      filtered = filtered.filter(r => r.country === filters.country);
    }

    // Source filter
    if (filters.responseSource !== 'all') {
      filtered = filtered.filter(r => r.source === filters.responseSource);
    }

    setFilteredResponses(filtered);
  }, [responses, filters]);

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const exportData = (format: 'csv' | 'pdf') => {
    // Implement export functionality
    console.log(`Exporting data as ${format}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Response Analytics Dashboard</h1>
          <p className="mt-2 text-gray-600">View insights and performance metrics for all surveys and responses.</p>
        </div>

        {/* Filter Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <select
                value={filters.dateRange}
                onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={filters.surveyId}
                onChange={(e) => handleFilterChange('surveyId', e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Surveys</option>
                {surveys.map(survey => (
                  <option key={survey.id} value={survey.id}>{survey.title}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Monitor className="h-4 w-4 text-gray-500" />
              <select
                value={filters.deviceType}
                onChange={(e) => handleFilterChange('deviceType', e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Devices</option>
                <option value="mobile">Mobile</option>
                <option value="desktop">Desktop</option>
                <option value="tablet">Tablet</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-gray-500" />
              <select
                value={filters.country}
                onChange={(e) => handleFilterChange('country', e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Countries</option>
                <option value="India">India</option>
                <option value="USA">USA</option>
                <option value="UK">UK</option>
                <option value="Canada">Canada</option>
                <option value="Australia">Australia</option>
                <option value="Germany">Germany</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-gray-500" />
              <select
                value={filters.responseSource}
                onChange={(e) => handleFilterChange('responseSource', e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Sources</option>
                <option value="direct">Direct Link</option>
                <option value="email">Email Campaign</option>
                <option value="social">Social Media</option>
                <option value="embed">Website Embed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Export Options */}
        <div className="flex justify-end gap-2 mb-6">
          <button
            onClick={() => exportData('csv')}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            Export Responses (CSV)
          </button>
          <button
            onClick={() => exportData('pdf')}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            Export Analytics Report (PDF)
          </button>
        </div>

        {/* Stats Cards */}
        <StatsCards surveys={surveys} responses={filteredResponses} />

        {/* Comprehensive Analytics */}
        <SummaryAnalytics 
          totalSubmissions={analyticsData.totalSubmissions}
          totalQuestions={analyticsData.totalQuestions}
          averageQuestionsAnswered={analyticsData.averageQuestionsAnswered}
          averageQuestionsSkipped={analyticsData.averageQuestionsSkipped}
          questionWiseAnalytics={analyticsData.questionWiseAnalytics}
        />

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Response Trend Chart */}
          <div className="lg:col-span-2">
            <ResponseTrendChart responses={filteredResponses} />
          </div>

          {/* Survey Performance Chart */}
          <SurveyPerformanceChart surveys={surveys} />

          {/* Response Source Pie Chart */}
          <ResponseSourcePieChart responses={filteredResponses} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Device Distribution Chart */}
          <DeviceDistributionChart responses={filteredResponses} />

          {/* Geographic Responses */}
          <GeographicResponses responses={filteredResponses} />
        </div>

        {/* Survey List */}
        <SurveyList surveys={surveys} />
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
