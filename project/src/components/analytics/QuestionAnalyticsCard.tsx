import React from 'react';
import { Users, CheckCircle, XCircle, Clock, TrendingUp, BarChart3 } from 'lucide-react';

interface QuestionAnalyticsProps {
  question: string;
  answered: number;
  skipped: number;
  total: number;
  completionRate: number;
}

const QuestionAnalyticsCard: React.FC<{ analytics: QuestionAnalyticsProps }> = ({ analytics }) => {
  const completionColor = analytics.completionRate >= 80 ? 'text-green-600' : 
                         analytics.completionRate >= 60 ? 'text-yellow-600' : 'text-red-600';
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900 flex-1 mr-2">{analytics.question}</h3>
        <span className={`text-sm font-medium ${completionColor}`}>
          {analytics.completionRate}%
        </span>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <CheckCircle className="h-5 w-5 text-green-500 mr-1" />
            <span className="text-2xl font-bold text-gray-900">{analytics.answered}</span>
          </div>
          <p className="text-xs text-gray-600">Answered</p>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <XCircle className="h-5 w-5 text-red-500 mr-1" />
            <span className="text-2xl font-bold text-gray-900">{analytics.skipped}</span>
          </div>
          <p className="text-xs text-gray-600">Skipped</p>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <Users className="h-5 w-5 text-blue-500 mr-1" />
            <span className="text-2xl font-bold text-gray-900">{analytics.total}</span>
          </div>
          <p className="text-xs text-gray-600">Total</p>
        </div>
      </div>
      
      <div className="mt-3">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Completion Rate</span>
          <span className={completionColor}>{analytics.completionRate}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              analytics.completionRate >= 80 ? 'bg-green-500' : 
              analytics.completionRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${analytics.completionRate}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default QuestionAnalyticsCard;
