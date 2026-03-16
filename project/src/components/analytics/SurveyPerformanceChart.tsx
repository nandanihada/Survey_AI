import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BarChart3 } from 'lucide-react';

interface Survey {
  id: string;
  title: string;
  createdAt: Date;
  totalResponses: number;
  completionRate: number;
  averageCompletionTime: number;
}

interface SurveyPerformanceChartProps {
  surveys: Survey[];
}

const SurveyPerformanceChart: React.FC<SurveyPerformanceChartProps> = ({ surveys }) => {
  const chartData = surveys.map(survey => ({
    name: survey.title.length > 20 ? survey.title.substring(0, 20) + '...' : survey.title,
    responses: survey.totalResponses,
    fullName: survey.title
  }));

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Survey Performance</h2>
      
      {chartData.length === 0 ? (
        <div className="h-80 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>No survey data available</p>
            <p className="text-sm text-gray-400">Create surveys to see performance data</p>
          </div>
        </div>
      ) : (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={100}
                tick={{ fontSize: 11 }}
                stroke="#6b7280"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px'
                }}
                formatter={(value: any, name: any, props: any) => [
                  `${value} responses`,
                  props.payload.fullName
                ]}
              />
              <Bar dataKey="responses" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default SurveyPerformanceChart;
