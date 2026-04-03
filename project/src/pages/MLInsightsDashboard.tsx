import React, { useState, useEffect } from 'react';
import { Brain, TrendingUp, Activity, Code, Calendar, Users, Target } from 'lucide-react';
import { getApiBaseUrl, makeApiRequest } from '../utils/deploymentFix';

interface MLLog {
  _id: string;
  topic: string;
  wizard_type: string;
  wizard_collection: string;
  wizard_audience: string;
  created_at: string;
}

interface TopTopic {
  _id: string; // The topic name
  count: number;
}

const MLInsightsDashboard = () => {
  const [logs, setLogs] = useState<MLLog[]>([]);
  const [topTopics, setTopTopics] = useState<TopTopic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMLData = async () => {
      try {
        const response = await makeApiRequest('/api/ml-insights', { method: 'GET' }, true);
        if (response.ok) {
          const data = await response.json();
          setLogs(data.logs || []);
          setTopTopics(data.top_topics || []);
        }
      } catch (err) {
        console.error('Failed to fetch ML insights:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMLData();
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F9FC] py-8 px-4 sm:px-6 lg:px-8 font-['Outfit',sans-serif]">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex items-center gap-4 border-b border-gray-200 pb-6">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-2xl shadow-lg shadow-indigo-200">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-700">Machine Learning Core</h1>
            <p className="text-gray-500 mt-1">Real-time visualization of how the AI is adapting to user behavior</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Stats & Top Trends */}
            <div className="space-y-8">
              {/* Stats Card */}
              <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-6">
                  <Activity className="w-5 h-5 text-indigo-500" />
                  Learning Activity
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-indigo-50 p-4 rounded-2xl">
                    <div className="text-3xl font-bold text-indigo-600">{logs.length}</div>
                    <div className="text-sm text-indigo-800 mt-1 font-medium">Dataset Records</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-2xl">
                    <div className="text-3xl font-bold text-purple-600">{topTopics.length}</div>
                    <div className="text-sm text-purple-800 mt-1 font-medium">Unique Topics</div>
                  </div>
                </div>
              </div>

              {/* Trends Card */}
              <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-6">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  Top Trending Topics
                </h3>
                <div className="space-y-4">
                  {topTopics.map((topic, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-sm font-bold text-gray-500">
                          #{idx + 1}
                        </div>
                        <span className="font-medium text-gray-700 capitalize">{topic._id}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-xs font-bold">
                        {topic.count}
                      </div>
                    </div>
                  ))}
                  {topTopics.length === 0 && (
                    <p className="text-gray-500 text-sm italic py-4 text-center">Not enough data to form trends yet.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Training Dataset Timeline */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <Code className="w-5 h-5 text-blue-500" />
                    Live Training Dataset
                  </h3>
                  <span className="text-sm font-medium text-gray-500">Most recent</span>
                </div>
                
                <div className="divide-y divide-gray-100">
                  {logs.map((log) => (
                    <div key={log._id} className="p-6 hover:bg-blue-50/30 transition-colors group">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-sm font-semibold text-indigo-600 mb-1 flex items-center gap-1.5">
                            <Target className="w-4 h-4" /> User Prompt
                          </p>
                          <h4 className="text-xl font-bold text-gray-900 group-hover:text-indigo-700 transition-colors">"{log.topic}"</h4>
                        </div>
                        <div className="flex items-center text-xs text-gray-400 gap-1 font-medium bg-gray-100 px-2.5 py-1 rounded-full">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(log.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 group-hover:border-indigo-100 group-hover:bg-indigo-50/50 transition-all">
                          <p className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wider">Survey Type</p>
                          <p className="text-gray-800 font-medium">{log.wizard_type || 'N/A'}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 group-hover:border-purple-100 group-hover:bg-purple-50/50 transition-all">
                          <p className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wider">Data Collection</p>
                          <p className="text-gray-800 font-medium">{log.wizard_collection || 'N/A'}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 group-hover:border-blue-100 group-hover:bg-blue-50/50 transition-all">
                          <p className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wider">Audience & Goal</p>
                          <p className="text-gray-800 font-medium truncate" title={log.wizard_audience}>{log.wizard_audience || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {logs.length === 0 && (
                    <div className="p-12 text-center text-gray-500">
                      <Brain className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-lg font-medium text-gray-900">No training data yet</p>
                      <p className="text-sm mt-1">Start creating surveys to feed the machine learning model.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default MLInsightsDashboard;
