import React from 'react';
import { Users, CheckCircle, Clock, TrendingUp, Target, BarChart3 } from 'lucide-react';

interface SummaryAnalyticsProps {
  totalSubmissions: number;
  totalQuestions: number;
  averageQuestionsAnswered: number;
  averageQuestionsSkipped: number;
  questionWiseAnalytics: Array<{
    question: string;
    answered: number;
    skipped: number;
    total: number;
    completionRate: number;
  }>;
}

const SummaryAnalytics: React.FC<SummaryAnalyticsProps> = ({ 
  totalSubmissions, 
  totalQuestions, 
  averageQuestionsAnswered, 
  averageQuestionsSkipped,
  questionWiseAnalytics 
}) => {
  const overallCompletionRate = totalQuestions > 0 
    ? Math.round((averageQuestionsAnswered / totalQuestions) * 100) 
    : 0;

  const mostAnsweredQuestion = questionWiseAnalytics.length > 0 
    ? questionWiseAnalytics.reduce((max, q) => q.answered > max.answered ? q : max)
    : null;

  const leastAnsweredQuestion = questionWiseAnalytics.length > 0 
    ? questionWiseAnalytics.reduce((min, q) => q.answered < min.answered ? q : min)
    : null;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Submissions</p>
              <p className="text-2xl font-bold text-gray-900">{totalSubmissions}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-3 bg-green-50 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Questions Answered</p>
              <p className="text-2xl font-bold text-gray-900">{averageQuestionsAnswered}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-50 rounded-lg">
              <Target className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Questions Skipped</p>
              <p className="text-2xl font-bold text-gray-900">{averageQuestionsSkipped}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-3 bg-purple-50 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Overall Completion Rate</p>
              <p className="text-2xl font-bold text-gray-900">{overallCompletionRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Question Insights */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <BarChart3 className="h-5 w-5 mr-2 text-gray-600" />
          Question Performance Analysis
        </h3>
        
        {questionWiseAnalytics.length > 0 ? (
          <div className="space-y-4">
            {/* Top Performing Questions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {mostAnsweredQuestion && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Most Answered Question</h4>
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="font-medium text-green-800">{mostAnsweredQuestion.question}</p>
                    <p className="text-sm text-green-600">
                      {mostAnsweredQuestion.answered} out of {mostAnsweredQuestion.total} responses 
                      ({mostAnsweredQuestion.completionRate}%)
                    </p>
                  </div>
                </div>
              )}

              {leastAnsweredQuestion && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Least Answered Question</h4>
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="font-medium text-red-800">{leastAnsweredQuestion.question}</p>
                    <p className="text-sm text-red-600">
                      {leastAnsweredQuestion.answered} out of {leastAnsweredQuestion.total} responses 
                      ({leastAnsweredQuestion.completionRate}%)
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Question Completion Table */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">All Questions Performance</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Question
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Answered
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Skipped
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Completion Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {questionWiseAnalytics.map((question, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {question.question}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {question.answered}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {question.skipped}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {question.total}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            question.completionRate >= 80 ? 'bg-green-100 text-green-800' :
                            question.completionRate >= 60 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {question.completionRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <BarChart3 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>No question data available</p>
            <p className="text-sm text-gray-400">Submit some survey responses to see question analytics</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SummaryAnalytics;
