import React, { useMemo } from 'react';
import { Globe, BarChart3 } from 'lucide-react';

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

interface GeographicResponsesProps {
  responses: Response[];
}

const GeographicResponses: React.FC<GeographicResponsesProps> = ({ responses }) => {
  const countryData = useMemo(() => {
    const counts = responses.reduce((acc, response) => {
      acc[response.country] = (acc[response.country] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([country, count]) => ({
        country,
        count,
        percentage: Math.round((count / responses.length) * 100)
      }));
  }, [responses]);

  const getFlagEmoji = (country: string) => {
    const flags: Record<string, string> = {
      'India': '🇮🇳',
      'USA': '🇺🇸',
      'UK': '🇬🇧',
      'Canada': '🇨🇦',
      'Australia': '🇦🇺',
      'Germany': '🇩🇪'
    };
    return flags[country] || '🌍';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Globe className="h-5 w-5 text-gray-600" />
        <h2 className="text-lg font-semibold text-gray-900">Responses by Country</h2>
      </div>
      
      <div className="space-y-3">
        {countryData.map((item, index) => (
          <div key={item.country} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 bg-white rounded-full border border-gray-200 text-lg">
                {getFlagEmoji(item.country)}
              </div>
              <div>
                <div className="font-medium text-gray-900">{item.country}</div>
                <div className="text-sm text-gray-600">{item.count} responses</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-gray-900">{item.percentage}%</div>
              <div className="w-16 bg-gray-200 rounded-full h-2 mt-1">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          </div>
        ))}
        
        {countryData.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <BarChart3 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>No geographic data available</p>
            <p className="text-sm text-gray-400">Try adjusting your filters or date range</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GeographicResponses;
