import React, { useState, useEffect } from 'react';
import { Calendar, Filter, Download, BarChart3, Globe, Monitor } from 'lucide-react';
import StatsCards from '../components/analytics/StatsCards';
import ResponseTrendChart from '../components/analytics/ResponseTrendChart';
import SurveyPerformanceChart from '../components/analytics/SurveyPerformanceChart';
import ResponseSourcePieChart from '../components/analytics/ResponseSourcePieChart';
import DeviceDistributionChart from '../components/analytics/DeviceDistributionChart';
import GeographicResponses from '../components/analytics/GeographicResponses';
import SurveyList from '../components/analytics/SurveyList';

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
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [responses, setResponses] = useState<Response[]>([]);
  const [filteredResponses, setFilteredResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    dateRange: '30',
    surveyId: 'all',
    deviceType: 'all',
    country: 'all',
    responseSource: 'all'
  });

  // Mock data - replace with actual API calls
  useEffect(() => {
    const mockSurveys: Survey[] = [
      {
        id: '1',
        title: 'Customer Feedback Survey',
        createdAt: new Date('2024-01-15'),
        totalResponses: 1200,
        completionRate: 85,
        averageCompletionTime: 180
      },
      {
        id: '2',
        title: 'Product Research Survey',
        createdAt: new Date('2024-01-20'),
        totalResponses: 850,
        completionRate: 78,
        averageCompletionTime: 240
      },
      {
        id: '3',
        title: 'User Satisfaction Survey',
        createdAt: new Date('2024-02-01'),
        totalResponses: 620,
        completionRate: 92,
        averageCompletionTime: 150
      },
      {
        id: '4',
        title: 'Market Research Survey',
        createdAt: new Date('2024-02-10'),
        totalResponses: 400,
        completionRate: 70,
        averageCompletionTime: 300
      }
    ];

    const mockResponses: Response[] = Array.from({ length: 3070 }, (_, i) => ({
      id: `response-${i}`,
      surveyId: String(Math.floor(Math.random() * 4) + 1),
      completed: Math.random() > 0.2,
      device: (['mobile', 'desktop', 'tablet'] as const)[Math.floor(Math.random() * 3)],
      source: (['direct', 'email', 'social', 'embed'] as const)[Math.floor(Math.random() * 4)],
      country: (['India', 'USA', 'UK', 'Canada', 'Australia', 'Germany'] as const)[Math.floor(Math.random() * 6)],
      completionTime: Math.floor(Math.random() * 600) + 60,
      answers: {},
      createdAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000)
    }));

    setSurveys(mockSurveys);
    setResponses(mockResponses);
    setFilteredResponses(mockResponses);
    setLoading(false);
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
