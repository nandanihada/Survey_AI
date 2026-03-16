import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BarChart3 } from 'lucide-react';

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

interface ResponseTrendChartProps {
  responses: Response[];
}

const ResponseTrendChart: React.FC<ResponseTrendChartProps> = ({ responses }) => {
  const chartData = useMemo(() => {
    if (!responses || responses.length === 0) {
      return [];
    }

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

      const dayResponses = responses.filter(r => 
        r.createdAt >= dayStart && r.createdAt < dayEnd
      );

      const totalResponses = dayResponses.length;
      const completedResponses = dayResponses.filter(r => r.completed).length;
      const partialResponses = totalResponses - completedResponses;

      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        total: totalResponses,
        completed: completedResponses,
        partial: partialResponses
      };
    });
  }, [responses]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Response Trend</h2>
      
      {chartData.length === 0 ? (
        <div className="h-80 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>No response data available</p>
            <p className="text-sm text-gray-400">Try adjusting your filters or date range</p>
          </div>
        </div>
      ) : (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
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
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 3 }}
                activeDot={{ r: 5 }}
                name="Total Responses"
              />
              <Line
                type="monotone"
                dataKey="completed"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', r: 3 }}
                activeDot={{ r: 5 }}
                name="Completed Responses"
              />
              <Line
                type="monotone"
                dataKey="partial"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ fill: '#f59e0b', r: 3 }}
                activeDot={{ r: 5 }}
                name="Partial Responses"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default ResponseTrendChart;
