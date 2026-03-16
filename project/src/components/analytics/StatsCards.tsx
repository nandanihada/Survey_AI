import React from 'react';
import { FileText, Users, TrendingUp, Clock, BarChart3, UserCheck, AlertCircle, Calendar } from 'lucide-react';

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

interface StatsCardsProps {
  surveys: Survey[];
  responses: Response[];
}

const StatsCards: React.FC<StatsCardsProps> = ({ surveys, responses }) => {
  // Calculate metrics
  const totalSurveys = surveys.length;
  const totalResponses = responses.length;
  const completedResponses = responses.filter(r => r.completed).length;
  const activeSurveys = surveys.filter(s => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return s.createdAt > thirtyDaysAgo;
  }).length;
  
  const completionRate = totalResponses > 0 
    ? Math.round((completedResponses / totalResponses) * 100) 
    : 0;

  const averageCompletionTime = responses.length > 0
    ? Math.round(responses.reduce((sum, r) => sum + r.completionTime, 0) / responses.length)
    : 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const responsesToday = responses.filter(r => r.createdAt >= today).length;

  const uniqueRespondents = new Set(responses.map(r => r.surveyId)).size;

  const dropOffRate = 100 - completionRate;

  const stats = [
    {
      title: 'Total Surveys',
      value: totalSurveys,
      icon: FileText,
      trend: '+12%',
      trendColor: 'text-green-600',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600'
    },
    {
      title: 'Total Responses',
      value: totalResponses,
      icon: Users,
      trend: '+8%',
      trendColor: 'text-green-600',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600'
    },
    {
      title: 'Active Surveys',
      value: activeSurveys,
      icon: TrendingUp,
      trend: '+5%',
      trendColor: 'text-green-600',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600'
    },
    {
      title: 'Completion Rate',
      value: `${completionRate}%`,
      icon: BarChart3,
      trend: '+3%',
      trendColor: 'text-green-600',
      bgColor: 'bg-yellow-50',
      iconColor: 'text-yellow-600'
    },
    {
      title: 'Avg Completion Time',
      value: `${Math.floor(averageCompletionTime / 60)}m ${averageCompletionTime % 60}s`,
      icon: Clock,
      trend: '-15%',
      trendColor: 'text-green-600',
      bgColor: 'bg-indigo-50',
      iconColor: 'text-indigo-600'
    },
    {
      title: 'Responses Today',
      value: responsesToday,
      icon: Calendar,
      trend: '+25%',
      trendColor: 'text-green-600',
      bgColor: 'bg-pink-50',
      iconColor: 'text-pink-600'
    },
    {
      title: 'Unique Respondents',
      value: uniqueRespondents,
      icon: UserCheck,
      trend: '+18%',
      trendColor: 'text-green-600',
      bgColor: 'bg-teal-50',
      iconColor: 'text-teal-600'
    },
    {
      title: 'Drop-off Rate',
      value: `${dropOffRate}%`,
      icon: AlertCircle,
      trend: '-7%',
      trendColor: 'text-green-600',
      bgColor: 'bg-red-50',
      iconColor: 'text-red-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={index}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div className={`${stat.bgColor} p-3 rounded-lg`}>
                <Icon className={`h-6 w-6 ${stat.iconColor}`} />
              </div>
              <div className={`text-sm font-medium ${stat.trendColor}`}>
                {stat.trend}
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-bold text-gray-900">
                {stat.value}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {stat.title}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatsCards;
