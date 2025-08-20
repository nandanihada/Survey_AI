import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { 
  LogOutIcon, 
  SettingsIcon, 
  BarChart3Icon, 
  ListIcon,
  PlusIcon,
  CheckCircleIcon,
  XCircleIcon,
  AlertCircleIcon
} from 'lucide-react';

interface SurveyWithConfig {
  survey_id: string;
  survey_name: string;
  created_at: string;
  config: {
    pass_fail_enabled?: boolean;
    pepperads_redirect_enabled?: boolean;
    criteria_set_id?: string;
    updated_at?: string;
  };
  criteria_set?: {
    _id: string;
    name: string;
    description: string;
  };
}

interface CriteriaPerformance {
  overall_stats: {
    total_surveys_with_criteria: number;
    total_evaluated_responses: number;
    pass_rate: number;
    fail_rate: number;
  };
  survey_stats: Record<string, {
    total: number;
    pass: number;
    fail: number;
    pass_rate: number;
    fail_rate: number;
    avg_score: number;
  }>;
}

const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [surveys, setSurveys] = useState<SurveyWithConfig[]>([]);
  const [performance, setPerformance] = useState<CriteriaPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch surveys with configuration
      const surveysResponse = await fetch('/api/admin/surveys-with-config');
      const surveysData = await surveysResponse.json();
      
      if (surveysResponse.ok) {
        setSurveys(surveysData.surveys || []);
      }
      
      // Fetch performance analytics
      const performanceResponse = await fetch('/api/admin/analytics/criteria-performance');
      const performanceData = await performanceResponse.json();
      
      if (performanceResponse.ok) {
        setPerformance(performanceData);
      }
      
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
      setError('Failed to load admin dashboard data');
      toast.error('Failed to load admin dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getConfigStatus = (survey: SurveyWithConfig) => {
    if (!survey.config?.pass_fail_enabled) {
      return { status: 'disabled', label: 'Disabled', icon: XCircleIcon, color: 'text-gray-500' };
    }
    if (!survey.criteria_set) {
      return { status: 'warning', label: 'No Criteria', icon: AlertCircleIcon, color: 'text-yellow-600' };
    }
    return { status: 'active', label: 'Active', icon: CheckCircleIcon, color: 'text-green-600' };
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading admin dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="error-message">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={fetchData} className="btn btn-primary">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="dashboard-header">
        <div className="dashboard-nav">
          <h1 className="dashboard-title">Survey Admin Dashboard</h1>
          <div className="admin-nav-links">
            <Link to="/admin/criteria" className="btn btn-secondary">
              <ListIcon />
              Manage Criteria
            </Link>
            <Link to="/admin/settings" className="btn btn-secondary">
              <SettingsIcon />
              Global Settings
            </Link>
          </div>
          <div className="user-menu">
            <span className="user-info">{user?.email} (Admin)</span>
            <button className="btn btn-outline" onClick={logout}>
              <LogOutIcon />
            </button>
          </div>
        </div>
      </header>

      {/* Performance Overview */}
      {performance && (
        <div className="admin-stats-grid">
          <div className="stat-card">
            <h3>Surveys with Criteria</h3>
            <div className="stat-value">{performance.overall_stats.total_surveys_with_criteria}</div>
            <p className="stat-label">Active configurations</p>
          </div>
          <div className="stat-card">
            <h3>Total Evaluations</h3>
            <div className="stat-value">{performance.overall_stats.total_evaluated_responses}</div>
            <p className="stat-label">Responses evaluated</p>
          </div>
          <div className="stat-card">
            <h3>Pass Rate</h3>
            <div className="stat-value text-green-600">{performance.overall_stats.pass_rate}%</div>
            <p className="stat-label">Overall qualification rate</p>
          </div>
          <div className="stat-card">
            <h3>Fail Rate</h3>
            <div className="stat-value text-red-600">{performance.overall_stats.fail_rate}%</div>
            <p className="stat-label">Overall disqualification rate</p>
          </div>
        </div>
      )}

      {/* Survey Management */}
      <div className="admin-section">
        <div className="section-header">
          <h2>Survey Configurations</h2>
          <div className="section-actions">
            <Link to="/admin/bulk-assign" className="btn btn-secondary">
              Bulk Assign Criteria
            </Link>
          </div>
        </div>
        
        <div className="surveys-table-container">
          <table className="surveys-table">
            <thead>
              <tr>
                <th>Survey Name</th>
                <th>Created</th>
                <th>Status</th>
                <th>Criteria Set</th>
                <th>Performance</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {surveys.map((survey) => {
                const status = getConfigStatus(survey);
                const StatusIcon = status.icon;
                const surveyPerf = performance?.survey_stats[survey.survey_id];
                
                return (
                  <tr key={survey.survey_id}>
                    <td>
                      <div className="survey-name">
                        {survey.survey_name}
                        <span className="survey-id">ID: {survey.survey_id.slice(-8)}</span>
                      </div>
                    </td>
                    <td>
                      {new Date(survey.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <div className={`status-badge ${status.status}`}>
                        <StatusIcon className={status.color} size={16} />
                        {status.label}
                      </div>
                    </td>
                    <td>
                      {survey.criteria_set ? (
                        <div className="criteria-info">
                          <div className="criteria-name">{survey.criteria_set.name}</div>
                          <div className="criteria-description">{survey.criteria_set.description}</div>
                        </div>
                      ) : (
                        <span className="text-gray-500">No criteria assigned</span>
                      )}
                    </td>
                    <td>
                      {surveyPerf ? (
                        <div className="performance-info">
                          <div className="performance-stats">
                            <span className="stat-item">
                              {surveyPerf.total} responses
                            </span>
                            <span className="stat-item text-green-600">
                              {surveyPerf.pass_rate}% pass
                            </span>
                          </div>
                          <div className="performance-score">
                            Avg Score: {surveyPerf.avg_score}%
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-500">No data</span>
                      )}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <Link 
                          to={`/admin/survey/${survey.survey_id}/config`}
                          className="btn btn-sm btn-secondary"
                        >
                          Configure
                        </Link>
                        <Link 
                          to={`/admin/survey/${survey.survey_id}/test`}
                          className="btn btn-sm btn-outline"
                        >
                          Test
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
