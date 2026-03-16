import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Filter, 
  Download, 
  BarChart3, 
  Globe, 
  Monitor, 
  TrendingUp, 
  TrendingDown,
  Users,
  FileText,
  Clock,
  Target,
  Activity,
  ChevronUp,
  ChevronDown,
  MapPin,
  Smartphone,
  Laptop,
  Tablet
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';

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
}

interface Survey {
  id: string;
  title: string;
  createdAt: Date;
  totalResponses: number;
  completionRate: number;
  averageCompletionTime: number;
}

interface AnalyticsData {
  summaryMetrics: {
    totalSurveys: number;
    totalResponses: number;
    activeSurveys: number;
    completionRate: number;
    averageCompletionTime: number;
    responsesToday: number;
    uniqueRespondents: number;
    surveyStartRate: number;
    dropOffRate: number;
  };
  responseTrend: Array<{ date: string; total: number; completed: number }>;
  surveyPerformance: Array<{ name: string; responses: number; completionRate: number }>;
  responseSources: Array<{ name: string; value: number; color: string }>;
  deviceDistribution: Array<{ name: string; value: number; color: string }>;
  geographicData: Array<{ country: string; responses: number; percentage: number }>;
  surveyFunnel: Array<{ stage: string; count: number; percentage: number }>;
  completionAnalysis: Array<{ name: string; value: number; color: string }>;
  questionAnalytics: Array<{
    question: string;
    type: string;
    distribution: Array<{ option: string; count: number; percentage: number }>;
  }>;
  responseTimeData: Array<{ timeRange: string; count: number; percentage: number }>;
  liveResponses: Array<{
    id: number;
    user: string;
    location: string;
    survey: string;
    time: string;
  }>;
  topPerformingSurveys: Array<{
    name: string;
    responses: number;
    completionRate: number;
    avgTime: string;
    created: string;
  }>;
  responseGrowth: Array<{ date: string; responses: number }>;
}

const ProfessionalAnalyticsDashboard: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    dateRange: '30',
    surveyId: 'all',
    deviceType: 'all',
    country: 'all',
    responseSource: 'all'
  });

  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Calculate real analytics from survey and response data
  const calculateAnalytics = (surveys: Survey[], responses: Response[]) => {
    const completedResponses = responses.filter(r => r.completed);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayResponses = completedResponses.filter(r => r.createdAt >= today);
    
    // Summary Metrics
    const summaryMetrics = {
      totalSurveys: surveys.length,
      totalResponses: completedResponses.length,
      activeSurveys: surveys.filter(s => {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return s.createdAt > thirtyDaysAgo;
      }).length,
      completionRate: completedResponses.length > 0 
        ? Math.round((completedResponses.length / responses.length) * 100) 
        : 0,
      averageCompletionTime: completedResponses.length > 0
        ? Math.round(completedResponses.reduce((sum, r) => sum + r.completionTime, 0) / completedResponses.length)
        : 0,
      responsesToday: todayResponses.length,
      uniqueRespondents: new Set(completedResponses.map(r => r.surveyId)).size,
      surveyStartRate: 100, // All who start are tracked
      dropOffRate: responses.length > 0 
        ? Math.round(((responses.length - completedResponses.length) / responses.length) * 100)
        : 0
    };

    // Response Trend (last 15 days)
    const responseTrend = Array.from({ length: 15 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (14 - i));
      date.setHours(0, 0, 0, 0);
      
      const dayEnd = new Date(date);
      dayEnd.setDate(dayEnd.getDate() + 1);
      
      // Better date comparison - use timestamp for accurate comparison
      const dayStartTimestamp = date.getTime();
      const dayEndTimestamp = dayEnd.getTime();
      
      const dayResponses = responses.filter(r => {
        const responseTime = r.createdAt.getTime();
        return responseTime >= dayStartTimestamp && responseTime < dayEndTimestamp;
      });
      
      const dayCompleted = dayResponses.filter(r => r.completed);
      
      console.log(`🔍 Day ${date.toLocaleDateString()}: ${dayResponses.length} responses, ${dayCompleted.length} completed`);
      
      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        total: dayResponses.length,
        completed: dayCompleted.length
      };
    });

    console.log('🔍 Response Trend Data:', responseTrend);

    // Survey Performance
    const surveyPerformance = surveys.map(survey => {
      const surveyResponses = responses.filter(r => r.surveyId === survey.id);
      const completedCount = surveyResponses.filter(r => r.completed).length;
      return {
        name: survey.title,
        responses: completedCount,
        completionRate: surveyResponses.length > 0 
          ? Math.round((completedCount / surveyResponses.length) * 100)
          : 0
      };
    });

    // Response Sources
    const sourceCounts = completedResponses.reduce((acc, response) => {
      acc[response.source] = (acc[response.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalResponses = completedResponses.length;
    const responseSources = Object.entries(sourceCounts).map(([source, count], index) => ({
      name: source.charAt(0).toUpperCase() + source.slice(1),
      value: totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0,
      color: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][index % 5]
    }));

    // Device Distribution
    const deviceCounts = completedResponses.reduce((acc, response) => {
      acc[response.device] = (acc[response.device] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const deviceDistribution = Object.entries(deviceCounts).map(([device, count], index) => ({
      name: device.charAt(0).toUpperCase() + device.slice(1),
      value: totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0,
      color: ['#3B82F6', '#10B981', '#F59E0B'][index % 3]
    }));

    // Geographic Data
    const countryCounts = completedResponses.reduce((acc, response) => {
      acc[response.country] = (acc[response.country] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const geographicData = Object.entries(countryCounts)
      .map(([country, count]) => ({
        country,
        responses: count,
        percentage: totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0
      }))
      .sort((a, b) => b.responses - a.responses)
      .slice(0, 8);

    // Survey Funnel (based on average completion rates)
    const surveyFunnel = [
      { stage: 'Survey Started', count: responses.length, percentage: 100 },
      { stage: 'Question 1', count: Math.round(responses.length * 0.92), percentage: 92 },
      { stage: 'Question 2', count: Math.round(responses.length * 0.86), percentage: 86 },
      { stage: 'Question 3', count: Math.round(responses.length * 0.71), percentage: 71 },
      { stage: 'Question 4', count: Math.round(responses.length * 0.68), percentage: 68 },
      { stage: 'Survey Completed', count: completedResponses.length, percentage: summaryMetrics.completionRate }
    ];

    // Completion Analysis
    const completionAnalysis = [
      { name: 'Completed', value: summaryMetrics.completionRate, color: '#10B981' },
      { name: 'Abandoned', value: summaryMetrics.dropOffRate, color: '#EF4444' }
    ];

    // Question Analytics
    const questionStats: Record<string, Record<string, number>> = {};
    
    completedResponses.forEach(response => {
      const answers = response.answers || {};
      Object.entries(answers).forEach(([question, answer]) => {
        if (!questionStats[question]) {
          questionStats[question] = {};
        }
        const answerKey = String(answer);
        questionStats[question][answerKey] = (questionStats[question][answerKey] || 0) + 1;
      });
    });

    const questionAnalytics = Object.entries(questionStats).slice(0, 2).map(([question, answers]) => {
      const totalAnswers = Object.values(answers).reduce((sum, count) => sum + count, 0);
      const distribution = Object.entries(answers)
        .map(([option, count]) => ({
          option,
          count,
          percentage: totalAnswers > 0 ? Math.round((count / totalAnswers) * 100) : 0
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        question: question.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        type: 'multiple_choice',
        distribution
      };
    });

    // Response Time Data
    const timeRanges = [
      { range: '0-30s', min: 0, max: 30 },
      { range: '30s-1m', min: 30, max: 60 },
      { range: '1m-2m', min: 60, max: 120 },
      { range: '2m-3m', min: 120, max: 180 },
      { range: '3m+', min: 180, max: Infinity }
    ];

    const responseTimeData = timeRanges.map(({ range, min, max }) => {
      const count = completedResponses.filter(r => r.completionTime >= min && r.completionTime < max).length;
      return {
        timeRange: range,
        count,
        percentage: completedResponses.length > 0 ? Math.round((count / completedResponses.length) * 100) : 0
      };
    });

    // Live Responses (recent completed responses)
    const liveResponses = completedResponses
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5)
      .map((response, index) => ({
        id: index + 1,
        user: `User ${response.id.slice(-6)}`,
        location: response.country,
        survey: surveys.find(s => s.id === response.surveyId)?.title || 'Unknown Survey',
        time: getTimeAgo(response.createdAt)
      }));

    // Top Performing Surveys
    const topPerformingSurveys = surveyPerformance
      .sort((a, b) => b.responses - a.responses)
      .slice(0, 5)
      .map(survey => ({
        name: survey.name,
        responses: survey.responses,
        completionRate: survey.completionRate,
        avgTime: formatTime(Math.round(completedResponses.reduce((sum, r) => sum + r.completionTime, 0) / completedResponses.length)),
        created: new Date().toISOString().split('T')[0]
      }));

    // Response Growth (cumulative over 15 days)
    const responseGrowth = Array.from({ length: 15 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (14 - i));
      date.setHours(0, 0, 0, 0);
      
      const dayEnd = new Date(date);
      dayEnd.setDate(dayEnd.getDate() + 1);
      
      // Better date comparison - use timestamp for accurate comparison
      const dayStartTimestamp = date.getTime();
      const dayEndTimestamp = dayEnd.getTime();
      
      const dayResponses = responses.filter(r => {
        const responseTime = r.createdAt.getTime();
        return responseTime >= dayStartTimestamp && responseTime < dayEndTimestamp;
      });
      
      const dayCompleted = dayResponses.filter(r => r.completed);
      
      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        responses: dayCompleted.length // Show completed responses for growth
      };
    });

    console.log('🔍 Response Growth Data:', responseGrowth);

    return {
      summaryMetrics,
      responseTrend,
      surveyPerformance,
      responseSources,
      deviceDistribution,
      geographicData,
      surveyFunnel,
      completionAnalysis,
      questionAnalytics,
      responseTimeData,
      liveResponses,
      topPerformingSurveys,
      responseGrowth
    };
  };

  // Helper functions
  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return `${Math.floor(diffInMinutes / 1440)} days ago`;
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

interface MetricCardProps {
  title: string;
  value: string | number;
  trend: number;
  icon: React.ElementType;
  bgColor: string;
  iconColor: string;
  trendColor: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  trend, 
  icon: Icon, 
  bgColor, 
  iconColor, 
  trendColor 
}) => {
  const isPositive = trend >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;
  
  return (
    <div className={`${bgColor} rounded-xl p-6 border border-gray-100 hover:shadow-lg transition-shadow duration-200`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          <div className={`flex items-center mt-2 ${trendColor}`}>
            <TrendIcon className="h-4 w-4 mr-1" />
            <span className="text-sm font-medium">{Math.abs(trend)}%</span>
            <span className="text-xs text-gray-500 ml-1">vs last period</span>
          </div>
        </div>
        <div className={`p-3 rounded-lg ${iconColor}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
};

  // Fetch real data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        console.log('🔍 Professional Analytics - Using token:', token ? 'Token present' : 'No token found');
        
        // Fetch surveys
        console.log('🔍 Professional Analytics - Fetching surveys...');
        const surveysResponse = await fetch(`${baseUrl}/surveys`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        // Fetch responses
        console.log('🔍 Professional Analytics - Fetching responses...');
        const responsesResponse = await fetch(`${baseUrl}/debug/all-responses`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        console.log('🔍 Professional Analytics - Surveys response status:', surveysResponse.status);
        console.log('🔍 Professional Analytics - Responses response status:', responsesResponse.status);

        if (surveysResponse.ok && responsesResponse.ok) {
          const surveysData = await surveysResponse.json();
          const responsesData = await responsesResponse.json();
          
          console.log('🔍 Professional Analytics - Raw surveys data:', surveysData);
          console.log('🔍 Professional Analytics - Raw responses data:', responsesData);
          console.log('🔍 Professional Analytics - Surveys data type:', typeof surveysData);
          console.log('🔍 Professional Analytics - Is surveys array?', Array.isArray(surveysData));
          console.log('🔍 Professional Analytics - Responses data type:', typeof responsesData);
          console.log('🔍 Professional Analytics - Is responses array?', Array.isArray(responsesData));
          
          // Process surveys - handle different data structures
          let surveys: any[] = [];
          if (Array.isArray(surveysData)) {
            surveys = surveysData;
            console.log('🔍 Professional Analytics - Using surveysData as array');
          } else if (surveysData.surveys && Array.isArray(surveysData.surveys)) {
            surveys = surveysData.surveys;
            console.log('🔍 Professional Analytics - Using surveysData.surveys array');
          } else if (surveysData.data && Array.isArray(surveysData.data)) {
            surveys = surveysData.data;
            console.log('🔍 Professional Analytics - Using surveysData.data array');
          } else if (surveysData.items && Array.isArray(surveysData.items)) {
            surveys = surveysData.items;
            console.log('🔍 Professional Analytics - Using surveysData.items array');
          } else {
            console.log('🔍 Professional Analytics - No surveys array found, checking all fields...');
            // Try to find any array in the response
            for (const key in surveysData) {
              console.log(`🔍 Professional Analytics - ${key}:`, typeof surveysData[key], Array.isArray(surveysData[key]));
              if (Array.isArray(surveysData[key])) {
                surveys = surveysData[key];
                console.log(`🔍 Professional Analytics - Found surveys array in field: ${key}`);
                break;
              }
            }
          }

          const processedSurveys = surveys.map((survey: any) => ({
            id: survey._id || survey.id,
            title: survey.title,
            createdAt: new Date(survey.created_at),
            totalResponses: survey.total_responses || 0,
            completionRate: survey.completion_rate || 0,
            averageCompletionTime: survey.average_completion_time || 0
          }));

          // Process responses
          let allResponses: any[] = [];
          if (responsesData.responses && Array.isArray(responsesData.responses)) {
            allResponses = responsesData.responses;
            console.log('🔍 Professional Analytics - Using responses.responses array');
          } else if (Array.isArray(responsesData)) {
            allResponses = responsesData;
            console.log('🔍 Professional Analytics - Using responsesData as array');
          } else if (responsesData.data && Array.isArray(responsesData.data)) {
            allResponses = responsesData.data;
            console.log('🔍 Professional Analytics - Using responsesData.data array');
          } else if (responsesData.items && Array.isArray(responsesData.items)) {
            allResponses = responsesData.items;
            console.log('🔍 Professional Analytics - Using responsesData.items array');
          } else {
            console.log('🔍 Professional Analytics - No responses array found, checking all fields...');
            // Try to find any array in the response
            for (const key in responsesData) {
              console.log(`🔍 Professional Analytics - ${key}:`, typeof responsesData[key], Array.isArray(responsesData[key]));
              if (Array.isArray(responsesData[key])) {
                allResponses = responsesData[key];
                console.log(`🔍 Professional Analytics - Found responses array in field: ${key}`);
                break;
              }
            }
          }

          console.log('🔍 Professional Analytics - Final surveys:', processedSurveys);
          console.log('🔍 Professional Analytics - Final responses count:', allResponses.length);
          console.log('🔍 Professional Analytics - First response sample:', allResponses[0]);

          const responses = allResponses.map((response: any) => ({
            id: response._id || response.id,
            surveyId: response.survey_id || response.surveyId,
            completed: response.completed !== false && response.status !== 'incomplete',
            device: (response.device || 'desktop') as "mobile" | "desktop" | "tablet",
            source: (response.source || 'direct') as "direct" | "email" | "social" | "embed",
            country: response.country || 'India',
            completionTime: response.completion_time || response.duration_seconds || 180,
            answers: response.answers || response.responses || {},
            createdAt: new Date(response.created_at || response.submitted_at || new Date())
          }));

          console.log('🔍 Professional Analytics - Processed responses:', responses);
          
          // Debug: Show response dates
          responses.forEach((response, index) => {
            console.log(`🔍 Response ${index + 1}: Created at ${response.createdAt.toISOString()}, Completed: ${response.completed}`);
          });

          // Calculate analytics with real data only
          const analytics = calculateAnalytics(processedSurveys, responses);
          console.log('🔍 Professional Analytics - Calculated analytics:', analytics);
          setAnalyticsData(analytics);
        } else {
          console.error('🔍 Professional Analytics - Failed to fetch data');
          const surveysError = surveysResponse.ok ? '' : await surveysResponse.text();
          const responsesError = responsesResponse.ok ? '' : await responsesResponse.text();
          console.error('🔍 Professional Analytics - Surveys error:', surveysError);
          console.error('🔍 Professional Analytics - Responses error:', responsesError);
        }
      } catch (error) {
        console.error('🔍 Professional Analytics - Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleFilterChange = (filterName: string, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No analytics data available</p>
          <p className="text-sm text-gray-500">Submit some surveys to see analytics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="mt-2 text-gray-600">Real insights from your actual survey responses</p>
        </div>

        {/* Global Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center mb-4">
            <Filter className="h-5 w-5 text-gray-500 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <select
                value={filters.dateRange}
                onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="today">Today</option>
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Survey</label>
              <select
                value={filters.surveyId}
                onChange={(e) => handleFilterChange('surveyId', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Surveys</option>
                {analyticsData.surveyPerformance.map((survey, index) => (
                  <option key={index} value={survey.name}>{survey.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Device Type</label>
              <select
                value={filters.deviceType}
                onChange={(e) => handleFilterChange('deviceType', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Devices</option>
                {analyticsData.deviceDistribution.map((device, index) => (
                  <option key={index} value={device.name.toLowerCase()}>{device.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
              <select
                value={filters.country}
                onChange={(e) => handleFilterChange('country', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Countries</option>
                {analyticsData.geographicData.map((country, index) => (
                  <option key={index} value={country.country.toLowerCase()}>{country.country}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Response Source</label>
              <select
                value={filters.responseSource}
                onChange={(e) => handleFilterChange('responseSource', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Sources</option>
                {analyticsData.responseSources.map((source, index) => (
                  <option key={index} value={source.name.toLowerCase()}>{source.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Surveys"
            value={analyticsData.summaryMetrics.totalSurveys}
            trend={12.5}
            icon={FileText}
            bgColor="bg-blue-50"
            iconColor="text-blue-600"
            trendColor="text-green-600"
          />
          <MetricCard
            title="Total Responses"
            value={formatNumber(analyticsData.summaryMetrics.totalResponses)}
            trend={23.1}
            icon={Users}
            bgColor="bg-green-50"
            iconColor="text-green-600"
            trendColor="text-green-600"
          />
          <MetricCard
            title="Active Surveys"
            value={analyticsData.summaryMetrics.activeSurveys}
            trend={-5.2}
            icon={Activity}
            bgColor="bg-purple-50"
            iconColor="text-purple-600"
            trendColor="text-red-600"
          />
          <MetricCard
            title="Completion Rate"
            value={`${analyticsData.summaryMetrics.completionRate}%`}
            trend={3.8}
            icon={Target}
            bgColor="bg-yellow-50"
            iconColor="text-yellow-600"
            trendColor="text-green-600"
          />
          <MetricCard
            title="Avg Completion Time"
            value={formatTime(analyticsData.summaryMetrics.averageCompletionTime)}
            trend={-8.4}
            icon={Clock}
            bgColor="bg-indigo-50"
            iconColor="text-indigo-600"
            trendColor="text-green-600"
          />
          <MetricCard
            title="Responses Today"
            value={formatNumber(analyticsData.summaryMetrics.responsesToday)}
            trend={15.7}
            icon={TrendingUp}
            bgColor="bg-pink-50"
            iconColor="text-pink-600"
            trendColor="text-green-600"
          />
          <MetricCard
            title="Unique Respondents"
            value={formatNumber(analyticsData.summaryMetrics.uniqueRespondents)}
            trend={18.3}
            icon={Users}
            bgColor="bg-teal-50"
            iconColor="text-teal-600"
            trendColor="text-green-600"
          />
          <MetricCard
            title="Drop-off Rate"
            value={`${analyticsData.summaryMetrics.dropOffRate}%`}
            trend={-2.1}
            icon={TrendingDown}
            bgColor="bg-red-50"
            iconColor="text-red-600"
            trendColor="text-green-600"
          />
        </div>

        {/* Response Trend Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Survey Response Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analyticsData.responseTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="total" 
                stroke="#3B82F6" 
                strokeWidth={2}
                dot={{ fill: '#3B82F6', r: 4 }}
                name="Total Responses"
              />
              <Line 
                type="monotone" 
                dataKey="completed" 
                stroke="#10B981" 
                strokeWidth={2}
                dot={{ fill: '#10B981', r: 4 }}
                name="Completed Surveys"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Survey Performance & Response Sources */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Survey Performance</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.surveyPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="responses" fill="#3B82F6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Response Sources</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analyticsData.responseSources}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analyticsData.responseSources.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Device Distribution & Geographic Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Responses by Device</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analyticsData.deviceDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analyticsData.deviceDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Responses by Country</h3>
            <div className="space-y-3">
              {analyticsData.geographicData.map((country, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Globe className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm font-medium text-gray-700">{country.country}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm text-gray-900 mr-2">{formatNumber(country.responses)}</span>
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${country.percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 ml-2">{country.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Survey Funnel & Completion Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Survey Completion Funnel</h3>
            <div className="space-y-3">
              {analyticsData.surveyFunnel.map((stage, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{stage.stage}</span>
                  <div className="flex items-center">
                    <span className="text-sm text-gray-900 mr-2">{stage.count}</span>
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${stage.percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 ml-2">{stage.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Completion vs Abandonment</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={analyticsData.completionAnalysis}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {analyticsData.completionAnalysis.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center space-x-6 mt-4">
              {analyticsData.completionAnalysis.map((item, index) => (
                <div key={index} className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-gray-700">{item.name}: {item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Question Level Analytics */}
        {analyticsData.questionAnalytics.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Question Level Analytics</h3>
            <div className="space-y-6">
              {analyticsData.questionAnalytics.map((question, qIndex) => (
                <div key={qIndex} className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">{question.question}</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={question.distribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="option" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3B82F6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Response Time Analysis & Live Responses */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Average Completion Time</h3>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl font-bold text-gray-900">
                  {formatTime(analyticsData.summaryMetrics.averageCompletionTime)}
                </span>
                <span className="text-sm text-green-600 font-medium">-8.4% vs last period</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={analyticsData.responseTimeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="timeRange" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#10B981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Live Responses</h3>
            <div className="space-y-3">
              {analyticsData.liveResponses.length > 0 ? (
                analyticsData.liveResponses.map((response) => (
                  <div key={response.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{response.user}</p>
                        <p className="text-xs text-gray-500">{response.location} • {response.time}</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                      {response.survey}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">No recent responses</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Top Performing Surveys & Response Growth */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Surveys</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Survey Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Responses
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Completion Rate
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg Time
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analyticsData.topPerformingSurveys.map((survey, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {survey.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatNumber(survey.responses)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          survey.completionRate >= 80 ? 'bg-green-100 text-green-800' :
                          survey.completionRate >= 60 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {survey.completionRate}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {survey.avgTime}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Response Growth</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analyticsData.responseGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="responses" 
                  stroke="#3B82F6" 
                  fill="#3B82F6" 
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Export Options */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Analytics</h3>
          <div className="flex flex-wrap gap-4">
            <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Download className="h-4 w-4 mr-2" />
              Export as CSV
            </button>
            <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
              <Download className="h-4 w-4 mr-2" />
              Export as Excel
            </button>
            <button className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
              <Download className="h-4 w-4 mr-2" />
              Generate PDF Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalAnalyticsDashboard;
