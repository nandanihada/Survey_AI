import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Settings, Activity, Clock, Trash2, Plus } from 'lucide-react';

interface TestLog {
  timestamp: string;
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
  details?: any;
  request_number: number;
}

interface TestStats {
  total_requests: number;
  successful: number;
  failed: number;
}

interface TestStatus {
  test_id: string;
  is_running: boolean;
  start_time: string | null;
  stats: TestStats;
  logs: TestLog[];
  config: any;
}

interface Parameter {
  key: string;
  value: string;
}

interface PostbackTestingProps {
  isDarkMode?: boolean;
}

const PostbackTesting: React.FC<PostbackTestingProps> = ({ isDarkMode = false }) => {
  const [testUrl, setTestUrl] = useState('https://example.com/postback');
  const [method, setMethod] = useState('GET');
  const [interval, setInterval] = useState(5);
  const [duration, setDuration] = useState('');
  const [maxRequests, setMaxRequests] = useState('');
  const [parameters, setParameters] = useState<Parameter[]>([{ key: '', value: '' }]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTestId, setCurrentTestId] = useState<string | null>(null);
  const [logs, setLogs] = useState<TestLog[]>([]);
  const [stats, setStats] = useState<TestStats>({ total_requests: 0, successful: 0, failed: 0 });
  const [testHistory, setTestHistory] = useState<any[]>([]);
  
  const logsEndRef = useRef<HTMLDivElement>(null);
  const statusInterval = useRef<number | null>(null);

  // API base URL
  const API_BASE = window.location.hostname.includes('localhost') || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:5000'
    : 'https://hostslice.onrender.com';

  useEffect(() => {
    fetchTestHistory();
    return () => {
      if (statusInterval.current) {
        window.clearInterval(statusInterval.current);
      }
    };
  }, []);

  // Remove auto-scroll to prevent UI interference
  // useEffect(() => {
  //   if (logsEndRef.current) {
  //     logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
  //   }
  // }, [logs]);

  const fetchTestHistory = async () => {
    try {
      const response = await fetch(`${API_BASE}/postback/test/history`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setTestHistory(data.tests || []);
      }
    } catch (error) {
      console.error('Error fetching test history:', error);
    }
  };

  const pollTestStatus = async (testId: string) => {
    try {
      const response = await fetch(`${API_BASE}/postback/test/status/${testId}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data: TestStatus = await response.json();
        setStats(data.stats);
        setLogs(data.logs);
        
        if (!data.is_running && isRunning) {
          setIsRunning(false);
          setCurrentTestId(null);
          if (statusInterval.current) {
            window.clearInterval(statusInterval.current);
            statusInterval.current = null;
          }
          fetchTestHistory();
        }
      }
    } catch (error) {
      console.error('Error polling test status:', error);
    }
  };

  const startTest = async () => {
    if (!testUrl.trim()) {
      alert('Please enter a postback URL');
      return;
    }

    if (interval < 1) {
      alert('Interval must be at least 1 second');
      return;
    }

    try {
      const validParameters: Record<string, string> = {};
      parameters.forEach(param => {
        if (param.key.trim() && param.value.trim()) {
          validParameters[param.key.trim()] = param.value.trim();
        }
      });

      const requestBody: any = {
        url: testUrl.trim(),
        method: method,
        interval: interval,
        parameters: validParameters
      };

      if (duration && parseFloat(duration) > 0) {
        requestBody.duration = parseFloat(duration);
      }

      if (maxRequests && parseInt(maxRequests) > 0) {
        requestBody.max_requests = parseInt(maxRequests);
      }

      const response = await fetch(`${API_BASE}/postback/test/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (response.ok) {
        setCurrentTestId(data.test_id);
        setIsRunning(true);
        setLogs([]);
        setStats({ total_requests: 0, successful: 0, failed: 0 });
        
        // Start polling for status updates
        statusInterval.current = window.setInterval(() => {
          pollTestStatus(data.test_id);
        }, 1000);
      } else {
        alert(data.error || 'Failed to start test');
      }
    } catch (error) {
      alert('Error starting test');
      console.error('Start test error:', error);
    }
  };

  const stopTest = async () => {
    if (!currentTestId) return;

    try {
      const response = await fetch(`${API_BASE}/postback/test/stop/${currentTestId}`, {
        method: 'POST',
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok) {
        setIsRunning(false);
        setCurrentTestId(null);
        if (statusInterval.current) {
          window.clearInterval(statusInterval.current);
          statusInterval.current = null;
        }
        fetchTestHistory();
      } else {
        alert(data.error || 'Failed to stop test');
      }
    } catch (error) {
      alert('Error stopping test');
      console.error('Stop test error:', error);
    }
  };

  const addParameter = () => {
    setParameters([...parameters, { key: '', value: '' }]);
  };

  const removeParameter = (index: number) => {
    setParameters(parameters.filter((_, i) => i !== index));
  };

  const updateParameter = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...parameters];
    updated[index][field] = value;
    setParameters(updated);
  };

  const getLogTypeColor = (type: string) => {
    switch (type) {
      case 'success': return isDarkMode ? '#10b981' : '#059669';
      case 'error': return isDarkMode ? '#ef4444' : '#dc2626';
      case 'warning': return isDarkMode ? '#f59e0b' : '#d97706';
      default: return isDarkMode ? '#6b7280' : '#4b5563';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  // Remove dark mode styling - use light theme only
  const baseClasses = 'bg-gray-50 text-gray-900';
  
  const cardClasses = 'bg-white border-gray-200 shadow-sm';
  
  const inputClasses = 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

  return (
    <div className={`p-6 max-w-7xl mx-auto ${baseClasses} min-h-screen`}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Configure Test */}
        <div className={`border rounded-lg p-6 ${cardClasses}`}>
          <div className="flex items-center mb-6">
            <Settings className="mr-3 h-6 w-6 text-blue-500" />
            <h2 className="text-xl font-semibold">Configure Test</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Postback URL
              </label>
              <input
                type="url"
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
                placeholder="https://example.com/postback"
                className={`w-full px-3 py-2 border rounded-md text-sm ${inputClasses}`}
                disabled={isRunning}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Method
                </label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md text-sm ${inputClasses}`}
                  disabled={isRunning}
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Interval
                </label>
                <div className="flex items-center">
                  <input
                    type="number"
                    value={interval}
                    onChange={(e) => setInterval(parseInt(e.target.value) || 1)}
                    min="1"
                    className={`w-20 px-3 py-2 border rounded-md text-sm mr-2 ${inputClasses}`}
                    disabled={isRunning}
                  />
                  <span className="text-sm text-gray-500">seconds</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Duration (optional)
                </label>
                <div className="flex items-center">
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="unlimited"
                    className={`w-24 px-3 py-2 border rounded-md text-sm mr-2 ${inputClasses}`}
                    disabled={isRunning}
                  />
                  <span className="text-sm text-gray-500">seconds</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Max Requests (optional)
                </label>
                <input
                  type="number"
                  value={maxRequests}
                  onChange={(e) => setMaxRequests(e.target.value)}
                  placeholder="1"
                  className={`w-full px-3 py-2 border rounded-md text-sm ${inputClasses}`}
                  disabled={isRunning}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-medium">Parameters</label>
                <button
                  onClick={addParameter}
                  disabled={isRunning}
                  className="flex items-center px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 disabled:opacity-50"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </button>
              </div>

              {parameters.map((param, index) => (
                <div key={index} className="flex gap-2 mb-2 items-center">
                  <input
                    type="text"
                    placeholder="key"
                    value={param.key}
                    onChange={(e) => updateParameter(index, 'key', e.target.value)}
                    className={`flex-1 px-2 py-1 border rounded text-xs ${inputClasses}`}
                    disabled={isRunning}
                  />
                  <input
                    type="text"
                    placeholder="value"
                    value={param.value}
                    onChange={(e) => updateParameter(index, 'value', e.target.value)}
                    className={`flex-1 px-2 py-1 border rounded text-xs ${inputClasses}`}
                    disabled={isRunning}
                  />
                  <button
                    onClick={() => removeParameter(index)}
                    disabled={isRunning || parameters.length === 1}
                    className="p-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 disabled:opacity-50"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={startTest}
                disabled={isRunning}
                className="flex-1 flex items-center justify-center px-4 py-2 bg-green-500 text-white rounded-md text-sm font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="h-4 w-4 mr-2" />
                Start Test
              </button>
              <button
                onClick={stopTest}
                disabled={!isRunning}
                className="flex-1 flex items-center justify-center px-4 py-2 bg-red-500 text-white rounded-md text-sm font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Square className="h-4 w-4 mr-2" />
                Stop
              </button>
            </div>

            {/* Test History */}
            {testHistory.length > 0 && (
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center mb-3">
                  <Clock className="mr-2 h-4 w-4 text-gray-500" />
                  <h3 className="text-sm font-medium">Test History</h3>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {testHistory.slice(0, 5).map((test) => (
                    <div key={test.test_id} className="p-2 rounded text-xs bg-gray-50">
                      <div className="font-medium truncate">{test.method} {test.url}</div>
                      <div className="text-gray-500 text-xs">
                        {test.stats.total_requests} requests • {test.stats.successful} success • {test.stats.failed} failed
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Live Logs */}
        <div className={`border rounded-lg p-6 flex flex-col ${cardClasses}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Activity className="mr-3 h-6 w-6 text-green-500" />
              <h2 className="text-xl font-semibold">Live Logs</h2>
            </div>
            {isRunning && (
              <div className="flex items-center px-2 py-1 bg-green-500 text-white rounded-full text-xs">
                <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
                Running
              </div>
            )}
          </div>

          {/* Stats */}
          {(stats.total_requests > 0 || isRunning) && (
            <div className="grid grid-cols-3 gap-4 mb-4 p-3 rounded-md bg-gray-50">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-700">{stats.total_requests}</div>
                <div className="text-xs text-gray-500">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.successful}</div>
                <div className="text-xs text-gray-500">Success</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
                <div className="text-xs text-gray-500">Failed</div>
              </div>
            </div>
          )}

          {/* Logs Container */}
          <div className="flex-1 bg-gray-900 rounded-md p-3 overflow-hidden border border-gray-700">
            <div className="h-full overflow-y-auto space-y-1" style={{ maxHeight: '400px' }}>
              {logs.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <Activity className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>No logs yet. Start a test to see live logs here.</p>
                </div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="flex items-start gap-2 text-xs font-mono">
                    <span className="text-gray-500 min-w-[60px]">
                      {formatTimestamp(log.timestamp)}
                    </span>
                    <span className="min-w-[12px] text-center font-bold text-gray-300">
                      #{log.request_number}
                    </span>
                    <span 
                      className="font-medium"
                      style={{ color: getLogTypeColor(log.type) }}
                    >
                      {log.type.toUpperCase()}
                    </span>
                    <span className="flex-1 text-gray-200">{log.message}</span>
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostbackTesting;
