import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
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

interface ResponseSourcePieChartProps {
  responses: Response[];
}

const ResponseSourcePieChart: React.FC<ResponseSourcePieChartProps> = ({ responses }) => {
  const chartData = useMemo(() => {
    const sourceCounts = responses.reduce((acc, response) => {
      const sourceLabels = {
        direct: 'Direct Link',
        email: 'Email Campaign',
        social: 'Social Media',
        embed: 'Website Embed'
      };
      
      const label = sourceLabels[response.source];
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(sourceCounts).map(([name, value]) => ({
      name,
      value,
      percentage: Math.round((value / responses.length) * 100)
    }));
  }, [responses]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-white p-2 border border-gray-200 rounded shadow-sm">
          <p className="text-sm font-medium">{data.name}</p>
          <p className="text-sm text-gray-600">
            {data.value} responses ({data.payload.percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomizedLabel = (entry: any) => {
    return `${entry.percentage}%`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Response Sources</h2>
      
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
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="middle" 
                align="right" 
                layout="vertical"
                formatter={(value: string, entry: any) => (
                  <span style={{ color: entry.color }}>
                    {value} ({entry.payload.percentage}%)
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default ResponseSourcePieChart;
