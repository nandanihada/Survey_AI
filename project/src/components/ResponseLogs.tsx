import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  User, 
  Mail, 
  Globe, 
  MousePointer, 
  Calendar, 
  Activity, 
  Download, 
  RefreshCw,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  Monitor,
  Smartphone,
  Tablet
} from 'lucide-react';

interface ResponseLog {
  _id: string;
  survey_id: string;
  session_id: string | null;
  username: string;
  enhanced_username: string;
  email: string;
  ip_address: string;
  click_id: string;
  submitted_at: string | null;
  status: string;
  duration_seconds: number;
  duration_formatted: string;
  timestamp: string;
  evaluation_result?: {
    status: string;
    score: number;
  };
  responses_count: number;
  postback_status: string;
  record_type: 'submitted' | 'clicked_only';
  click_tracking?: {
    click_count: number;
    first_click_time: string;
    last_click_time: string;
    total_clicks: number;
    device_type: string;
    browser: string;
  };
}

interface ResponseLogsSummary {
  total_clicks: number;
  total_unique_clicks: number;
  total_submissions: number;
  clicked_not_submitted: number;
  conversion_rate: number;
  average_duration: number;
  average_duration_formatted: string;
  completion_rate: number;
}

interface ResponseLogsProps {
  surveyId: string;
}

const ResponseLogs: React.FC<ResponseLogsProps> = ({ surveyId }) => {
  const [logs, setLogs] = useState<ResponseLog[]>([]);
  const [summary, setSummary] = useState<ResponseLogsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState<ResponseLog | null>(null);

  const fetchResponseLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch(`${baseUrl}/api/enhanced-response-logs/${surveyId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch response logs');
      }

      const data = await response.json();
      setLogs(data.logs || []);
      setSummary(data.summary || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load response logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (surveyId) {
      fetchResponseLogs();
    }
  }, [surveyId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'submitted':
      case 'completed':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'failed':
      case 'error':
        return <XCircle size={16} className="text-red-500" />;
      case 'clicked_not_submitted':
        return <MousePointer size={16} className="text-orange-500" />;
      default:
        return <AlertCircle size={16} className="text-yellow-500" />;
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType.toLowerCase()) {
      case 'mobile':
        return <Smartphone size={14} className="text-gray-400" />;
      case 'tablet':
        return <Tablet size={14} className="text-gray-400" />;
      case 'desktop':
        return <Monitor size={14} className="text-gray-400" />;
      default:
        return <Globe size={14} className="text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    switch (status.toLowerCase()) {
      case 'submitted':
      case 'completed':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'failed':
      case 'error':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'clicked_not_submitted':
        return `${baseClasses} bg-orange-100 text-orange-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const exportToCSV = async () => {
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch(`${baseUrl}/api/enhanced-response-logs/${surveyId}/export`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to export response logs');
      }

      const data = await response.json();
      
      const csvContent = [
        data.csv_headers.join(','),
        ...data.csv_rows.map((row: string[]) => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = searchTerm === '' || 
      (log.enhanced_username || log.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.ip_address || '').includes(searchTerm) ||
      (log.click_id || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading response logs...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <XCircle className="text-red-600 mr-2" size={20} />
          <div className="text-red-600">
            <h3 className="text-sm font-medium">Error loading response logs</h3>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
        <button
          onClick={fetchResponseLogs}
          className="mt-3 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white">
            <div className="flex items-center">
              <MousePointer className="h-8 w-8 mb-2" />
              <div className="ml-3">
                <p className="text-blue-100 text-sm">Total Clicks</p>
                <p className="text-2xl font-bold">{summary.total_clicks}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-4 text-white">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 mb-2" />
              <div className="ml-3">
                <p className="text-green-100 text-sm">Submissions</p>
                <p className="text-2xl font-bold">{summary.total_submissions}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-4 text-white">
            <div className="flex items-center">
              <XCircle className="h-8 w-8 mb-2" />
              <div className="ml-3">
                <p className="text-orange-100 text-sm">Click Only</p>
                <p className="text-2xl font-bold">{summary.clicked_not_submitted}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-4 text-white">
            <div className="flex items-center">
              <Globe className="h-8 w-8 mb-2" />
              <div className="ml-3">
                <p className="text-purple-100 text-sm">Conversion Rate</p>
                <p className="text-2xl font-bold">{summary.conversion_rate.toFixed(1)}%</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg p-4 text-white">
            <div className="flex items-center">
              <Clock className="h-8 w-8 mb-2" />
              <div className="ml-3">
                <p className="text-indigo-100 text-sm">Avg Duration</p>
                <p className="text-2xl font-bold">{summary.average_duration_formatted}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Response Logs</h3>
          <p className="text-sm text-gray-600">
            Detailed logs for {filteredLogs.length} response{filteredLogs.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="submitted">Submitted</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
            <option value="clicked_not_submitted">Clicked Only</option>
          </select>
          
          <button
            onClick={fetchResponseLogs}
            className="flex items-center gap-1 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          
          {logs.length > 0 && (
            <button
              onClick={exportToCSV}
              className="flex items-center gap-1 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Download size={14} />
              Export
            </button>
          )}
        </div>
      </div>

      {/* Response Logs Table */}
      {filteredLogs.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Activity className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No response logs found</h3>
          <p className="text-gray-600">
            {searchTerm || statusFilter !== 'all' 
              ? 'Try adjusting your search or filter criteria.' 
              : 'Response logs will appear here once users submit surveys.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Click Tracking
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Session Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timing
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="flex items-center text-sm text-gray-900">
                          <User size={14} className="mr-2 text-gray-400" />
                          <span className="font-medium">{log.enhanced_username || log.username || 'Anonymous'}</span>
                        </div>
                        {log.email && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Mail size={14} className="mr-2 text-gray-400" />
                            {log.email}
                          </div>
                        )}
                        <div className="flex items-center text-xs text-gray-500">
                          <Globe size={12} className="mr-1" />
                          {log.ip_address || 'N/A'}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="flex items-center text-sm text-gray-900">
                          <MousePointer size={14} className="mr-2 text-gray-400" />
                          <span className="font-medium">{log.click_tracking?.total_clicks || 1} clicks</span>
                        </div>
                        {log.click_tracking && (
                          <div className="flex items-center text-xs text-gray-500">
                            {getDeviceIcon(log.click_tracking.device_type)}
                            <span className="ml-1">{log.click_tracking.device_type} • {log.click_tracking.browser}</span>
                          </div>
                        )}
                        {log.click_id && (
                          <div className="text-xs text-gray-500 font-mono">
                            ID: {log.click_id}
                          </div>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        {log.session_id ? (
                          <div className="text-xs text-gray-500 font-mono">
                            Session: {log.session_id.substring(0, 8)}...
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400 italic">
                            No session (click only)
                          </div>
                        )}
                        <div className="text-xs text-gray-500">
                          Type: {log.record_type === 'submitted' ? 'Submitted' : 'Click Only'}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        {log.submitted_at ? (
                          <>
                            <div className="flex items-center text-sm text-gray-900">
                              <Calendar size={14} className="mr-2 text-gray-400" />
                              {formatDate(log.submitted_at)}
                            </div>
                            <div className="flex items-center text-xs text-gray-500">
                              <Clock size={12} className="mr-1" />
                              Duration: {log.duration_formatted}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center text-sm text-gray-900">
                              <Calendar size={14} className="mr-2 text-gray-400" />
                              {log.click_tracking?.first_click_time ? formatDate(log.click_tracking.first_click_time) : 'N/A'}
                            </div>
                            <div className="text-xs text-gray-500">
                              First click time
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="flex items-center">
                          {getStatusIcon(log.status)}
                          <span className={`ml-2 ${getStatusBadge(log.status)}`}>
                            {log.status === 'clicked_not_submitted' ? 'Clicked Only' : log.status}
                          </span>
                        </div>
                        {log.evaluation_result && log.evaluation_result.status !== 'not_submitted' && (
                          <div className="text-xs text-gray-500">
                            Score: {log.evaluation_result.score}%
                          </div>
                        )}
                        {log.record_type === 'clicked_only' && (
                          <div className="text-xs text-orange-600">
                            No submission
                          </div>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-900 transition-colors"
                      >
                        <Eye size={14} />
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
              <h3 className="text-lg font-semibold text-gray-900">Response Log Details</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 border-b pb-2">User Information</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Username:</span> {selectedLog.username || 'N/A'}</div>
                    <div><span className="font-medium">Email:</span> {selectedLog.email || 'N/A'}</div>
                    <div><span className="font-medium">IP Address:</span> {selectedLog.ip_address || 'N/A'}</div>
                    <div><span className="font-medium">Click ID:</span> {selectedLog.click_id || 'N/A'}</div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 border-b pb-2">Session Information</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Survey ID:</span> <code className="bg-gray-100 px-1 rounded">{selectedLog.survey_id}</code></div>
                    <div><span className="font-medium">Session ID:</span> <code className="bg-gray-100 px-1 rounded">{selectedLog.session_id || 'No session (click only)'}</code></div>
                    <div><span className="font-medium">Response ID:</span> <code className="bg-gray-100 px-1 rounded">{selectedLog._id}</code></div>
                    <div><span className="font-medium">Responses Count:</span> {selectedLog.responses_count}</div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 border-b pb-2">Timing Details</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Submitted At:</span> {selectedLog.submitted_at ? formatDate(selectedLog.submitted_at) : 'Not submitted'}</div>
                    <div><span className="font-medium">Duration:</span> {selectedLog.duration_formatted}</div>
                    <div><span className="font-medium">Timestamp:</span> {selectedLog.timestamp ? formatDate(selectedLog.timestamp) : 'N/A'}</div>
                    {selectedLog.click_tracking && (
                      <>
                        <div><span className="font-medium">First Click:</span> {selectedLog.click_tracking.first_click_time ? formatDate(selectedLog.click_tracking.first_click_time) : 'N/A'}</div>
                        <div><span className="font-medium">Total Clicks:</span> {selectedLog.click_tracking.total_clicks}</div>
                        <div><span className="font-medium">Device:</span> {selectedLog.click_tracking.device_type} • {selectedLog.click_tracking.browser}</div>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 border-b pb-2">Status & Results</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Status:</span> 
                      <span className={`ml-2 ${getStatusBadge(selectedLog.status)}`}>
                        {selectedLog.status}
                      </span>
                    </div>
                    {selectedLog.evaluation_result && (
                      <>
                        <div><span className="font-medium">Evaluation:</span> {selectedLog.evaluation_result.status}</div>
                        <div><span className="font-medium">Score:</span> {selectedLog.evaluation_result.score}%</div>
                      </>
                    )}
                    <div><span className="font-medium">Postback Status:</span> {selectedLog.postback_status || 'None'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResponseLogs;
