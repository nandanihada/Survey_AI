import React, { useState } from 'react';
import { Eye, Download, TrendingUp, Clock, Users, BarChart3 } from 'lucide-react';

interface Survey {
  id: string;
  title: string;
  createdAt: Date;
  totalResponses: number;
  completionRate: number;
  averageCompletionTime: number;
}

interface SurveyListProps {
  surveys: Survey[];
}

const SurveyList: React.FC<SurveyListProps> = ({ surveys }) => {
  const [expandedSurvey, setExpandedSurvey] = useState<string | null>(null);

  const toggleExpanded = (surveyId: string) => {
    setExpandedSurvey(expandedSurvey === surveyId ? null : surveyId);
  };

  const getCompletionRateColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600 bg-green-50';
    if (rate >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  // If no surveys, show empty state
  if (surveys.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Survey Performance Overview</h2>
        <div className="text-center py-8 text-gray-500">
          <BarChart3 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
          <p>No surveys found</p>
          <p className="text-sm text-gray-400 mt-1">Create your first survey to see analytics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Survey Performance Overview</h2>
      
      <div className="space-y-4">
        {surveys.map((survey) => (
          <div key={survey.id} className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Main Survey Row */}
            <div className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 mb-2">{survey.title}</h3>
                  <div className="text-sm text-gray-600">
                    Created: {survey.createdAt.toLocaleDateString()}
                  </div>
                </div>
                
                <button
                  onClick={() => toggleExpanded(survey.id)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Eye className="h-4 w-4 text-gray-600" />
                </button>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <div>
                    <div className="text-lg font-semibold text-gray-900">
                      {survey.totalResponses}
                    </div>
                    <div className="text-xs text-gray-600">Total Responses</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-green-600" />
                  <div>
                    <div className={`text-lg font-semibold ${getCompletionRateColor(survey.completionRate).split(' ')[0]}`}>
                      {survey.completionRate}%
                    </div>
                    <div className="text-xs text-gray-600">Completion Rate</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-purple-600" />
                  <div>
                    <div className="text-lg font-semibold text-gray-900">
                      {Math.floor(survey.averageCompletionTime / 60)}m {survey.averageCompletionTime % 60}s
                    </div>
                    <div className="text-xs text-gray-600">Avg Time</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-orange-600" />
                  <div>
                    <div className="text-lg font-semibold text-gray-900">
                      {Math.round(survey.totalResponses * survey.completionRate / 100)}
                    </div>
                    <div className="text-xs text-gray-600">Completed</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Expanded Details */}
            {expandedSurvey === survey.id && (
              <div className="border-t border-gray-200 bg-gray-50 p-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-gray-900">Detailed Analytics</h4>
                  <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-3 py-1 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50">
                      <Eye className="h-3 w-3" />
                      View Insights
                    </button>
                    <button className="flex items-center gap-2 px-3 py-1 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50">
                      <Download className="h-3 w-3" />
                      Export Data
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-3 rounded-lg border border-gray-200">
                    <div className="text-sm font-medium text-gray-700 mb-1">Completion Rate</div>
                    <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getCompletionRateColor(survey.completionRate)}`}>
                      {survey.completionRate}% Complete
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-gray-200">
                    <div className="text-sm font-medium text-gray-700 mb-1">Average Time</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {Math.floor(survey.averageCompletionTime / 60)}m {survey.averageCompletionTime % 60}s
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-gray-200">
                    <div className="text-sm font-medium text-gray-700 mb-1">Drop-off Rate</div>
                    <div className="text-lg font-semibold text-red-600">
                      {100 - survey.completionRate}%
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {surveys.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <BarChart3 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>No surveys found</p>
            <p className="text-sm text-gray-400 mt-1">Create your first survey to see analytics</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SurveyList;
