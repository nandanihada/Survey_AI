import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Smartphone, Monitor, Tablet } from 'lucide-react';

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

interface DeviceDistributionChartProps {
  responses: Response[];
}

const DeviceDistributionChart: React.FC<DeviceDistributionChartProps> = ({ responses }) => {
  const chartData = useMemo(() => {
    const deviceCounts = responses.reduce((acc, response) => {
      const deviceLabels = {
        mobile: 'Mobile',
        desktop: 'Desktop',
        tablet: 'Tablet'
      };
      
      const label = deviceLabels[response.device];
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(deviceCounts).map(([name, value]) => ({
      name,
      value,
      percentage: Math.round((value / responses.length) * 100),
      icon: name === 'Mobile' ? Smartphone : name === 'Desktop' ? Monitor : Tablet
    }));
  }, [responses]);

  const COLORS = {
    'Mobile': '#3b82f6',
    'Desktop': '#10b981',
    'Tablet': '#f59e0b'
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const Icon = data.payload.icon;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Icon className="h-4 w-4" />
            <p className="text-sm font-medium">{data.name}</p>
          </div>
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
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Responses by Device</h2>
      
      {chartData.length === 0 ? (
        <div className="h-80 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>No device data available</p>
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
                  <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="middle" 
                align="right" 
                layout="vertical"
                formatter={(value: string, entry: any) => (
                  <div className="flex items-center gap-2">
                    <entry.payload.icon className="h-4 w-4" />
                    <span style={{ color: entry.color }}>
                      {value} ({entry.payload.percentage}%)
                    </span>
                  </div>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default DeviceDistributionChart;
