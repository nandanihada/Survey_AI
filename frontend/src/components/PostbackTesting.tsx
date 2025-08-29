import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';

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

const PostbackTesting: React.FC = () => {
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

  useEffect(() => {
    fetchTestHistory();
    return () => {
      if (statusInterval.current) {
        window.clearInterval(statusInterval.current);
      }
    };
  }, []);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const fetchTestHistory = async () => {
    try {
      const apiUrl = (import.meta as any).env?.VITE_API_URL || 'https://api.theinterwebsite.space';
      const response = await fetch(`${apiUrl}/postback/test/history`, {
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
      const apiUrl = (import.meta as any).env?.VITE_API_URL || 'https://api.theinterwebsite.space';
      const response = await fetch(`${apiUrl}/postback/test/status/${testId}`, {
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
          toast.success('Test completed');
          fetchTestHistory();
        }
      }
    } catch (error) {
      console.error('Error polling test status:', error);
    }
  };

  const startTest = async () => {
    if (!testUrl.trim()) {
      toast.error('Please enter a postback URL');
      return;
    }

    if (interval < 1) {
      toast.error('Interval must be at least 1 second');
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

      const apiUrl = (import.meta as any).env?.VITE_API_URL || 'https://api.theinterwebsite.space';
      const response = await fetch(`${apiUrl}/postback/test/start`, {
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
        toast.success('Test started successfully');
        
        // Start polling for status updates
        statusInterval.current = window.setInterval(() => {
          pollTestStatus(data.test_id);
        }, 1000);
      } else {
        toast.error(data.error || 'Failed to start test');
      }
    } catch (error) {
      toast.error('Error starting test');
      console.error('Start test error:', error);
    }
  };

  const stopTest = async () => {
    if (!currentTestId) return;

    try {
      const apiUrl = (import.meta as any).env?.VITE_API_URL || 'https://api.theinterwebsite.space';
      const response = await fetch(`${apiUrl}/postback/test/stop/${currentTestId}`, {
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
        toast.success('Test stopped successfully');
        fetchTestHistory();
      } else {
        toast.error(data.error || 'Failed to stop test');
      }
    } catch (error) {
      toast.error('Error stopping test');
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
      case 'success': return '#10b981';
      case 'error': return '#ef4444';
      case 'warning': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', height: '80vh' }}>
        {/* Left Panel - Configure Test */}
        <div style={{ 
          border: '1px solid #e5e7eb', 
          borderRadius: '8px', 
          padding: '20px',
          backgroundColor: '#fff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ marginRight: '10px', fontSize: '20px' }}>⚙️</div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Configure Test</h2>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
              Postback URL
            </label>
            <input
              type="url"
              value={testUrl}
              onChange={(e) => setTestUrl(e.target.value)}
              placeholder="https://example.com/postback"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
              disabled={isRunning}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                Method
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
                disabled={isRunning}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                Interval
              </label>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="number"
                  value={interval}
                  onChange={(e) => setInterval(parseInt(e.target.value) || 1)}
                  min="1"
                  style={{
                    width: '70px',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    marginRight: '8px'
                  }}
                  disabled={isRunning}
                />
                <span style={{ fontSize: '14px', color: '#6b7280' }}>seconds</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                Duration (optional)
              </label>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="unlimited"
                  style={{
                    width: '80px',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    marginRight: '8px'
                  }}
                  disabled={isRunning}
                />
                <span style={{ fontSize: '14px', color: '#6b7280' }}>seconds</span>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                Max Requests (optional)
              </label>
              <input
                type="number"
                value={maxRequests}
                onChange={(e) => setMaxRequests(e.target.value)}
                placeholder="1"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
                disabled={isRunning}
              />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <label style={{ fontWeight: '500', fontSize: '14px' }}>Parameters</label>
              <button
                onClick={addParameter}
                disabled={isRunning}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: isRunning ? 'not-allowed' : 'pointer',
                  opacity: isRunning ? 0.5 : 1
                }}
              >
                Add
              </button>
            </div>

            {parameters.map((param, index) => (
              <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="key"
                  value={param.key}
                  onChange={(e) => updateParameter(index, 'key', e.target.value)}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}
                  disabled={isRunning}
                />
                <input
                  type="text"
                  placeholder="value"
                  value={param.value}
                  onChange={(e) => updateParameter(index, 'value', e.target.value)}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}
                  disabled={isRunning}
                />
                <button
                  onClick={() => removeParameter(index)}
                  disabled={isRunning || parameters.length === 1}
                  style={{
                    padding: '4px 6px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: (isRunning || parameters.length === 1) ? 'not-allowed' : 'pointer',
                    opacity: (isRunning || parameters.length === 1) ? 0.5 : 1
                  }}
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={startTest}
              disabled={isRunning}
              style={{
                flex: 1,
                padding: '10px 16px',
                backgroundColor: isRunning ? '#9ca3af' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: isRunning ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              ▶️ Start Test
            </button>
            <button
              onClick={stopTest}
              disabled={!isRunning}
              style={{
                flex: 1,
                padding: '10px 16px',
                backgroundColor: !isRunning ? '#9ca3af' : '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: !isRunning ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              ⏹️ Stop
            </button>
          </div>

          {/* Test History */}
          {testHistory.length > 0 && (
            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ marginRight: '8px', fontSize: '16px' }}>📊</div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Test History</h3>
              </div>
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {testHistory.slice(0, 5).map((test, index) => (
                  <div key={test.test_id} style={{ 
                    padding: '8px', 
                    backgroundColor: '#f9fafb', 
                    borderRadius: '4px', 
                    marginBottom: '4px',
                    fontSize: '12px'
                  }}>
                    <div style={{ fontWeight: '500' }}>{test.method} {test.url}</div>
                    <div style={{ color: '#6b7280' }}>
                      {test.stats.total_requests} requests • {test.stats.successful} success • {test.stats.failed} failed
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Live Logs */}
        <div style={{ 
          border: '1px solid #e5e7eb', 
          borderRadius: '8px', 
          padding: '20px',
          backgroundColor: '#fff',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ marginRight: '10px', fontSize: '20px' }}>📋</div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Live Logs</h2>
            {isRunning && (
              <div style={{ 
                marginLeft: 'auto', 
                padding: '4px 8px', 
                backgroundColor: '#10b981', 
                color: 'white', 
                borderRadius: '12px', 
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <div style={{ width: '6px', height: '6px', backgroundColor: 'white', borderRadius: '50%', animation: 'pulse 1s infinite' }}></div>
                Running
              </div>
            )}
          </div>

          {/* Stats */}
          {(stats.total_requests > 0 || isRunning) && (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)', 
              gap: '12px', 
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: '#f9fafb',
              borderRadius: '6px'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: '600', color: '#374151' }}>{stats.total_requests}</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Total</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: '600', color: '#10b981' }}>{stats.successful}</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Success</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: '600', color: '#ef4444' }}>{stats.failed}</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Failed</div>
              </div>
            </div>
          )}

          {/* Logs Container */}
          <div style={{ 
            flex: 1, 
            backgroundColor: '#1f2937', 
            borderRadius: '6px', 
            padding: '12px', 
            overflowY: 'auto',
            fontFamily: 'monospace',
            fontSize: '12px'
          }}>
            {logs.length === 0 ? (
              <div style={{ color: '#9ca3af', textAlign: 'center', padding: '20px' }}>
                No logs yet. Start a test to see streaming logs here.
              </div>
            ) : (
              <>
                {logs.map((log, index) => (
                  <div key={index} style={{ 
                    marginBottom: '4px', 
                    display: 'flex', 
                    alignItems: 'flex-start',
                    gap: '8px'
                  }}>
                    <span style={{ color: '#9ca3af', minWidth: '60px' }}>
                      {formatTimestamp(log.timestamp)}
                    </span>
                    <span style={{ 
                      color: getLogTypeColor(log.type), 
                      minWidth: '12px',
                      fontWeight: '600'
                    }}>
                      {log.type === 'success' ? '✓' : log.type === 'error' ? '✗' : log.type === 'warning' ? '⚠' : 'ℹ'}
                    </span>
                    <span style={{ color: '#e5e7eb', flex: 1 }}>
                      {log.message}
                      {log.details && Object.keys(log.details).length > 0 && (
                        <div style={{ color: '#9ca3af', marginTop: '2px', paddingLeft: '12px' }}>
                          {JSON.stringify(log.details, null, 2)}
                        </div>
                      )}
                    </span>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default PostbackTesting;
