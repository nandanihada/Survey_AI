import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  ArrowLeftIcon,
  SaveIcon,
  TestTubeIcon,
  WandIcon,
  CheckCircleIcon,
  XCircleIcon,
  RefreshCwIcon
} from 'lucide-react';

interface SurveyQuestion {
  id: string;
  question_text: string;
  type: string;
  options: string[];
  question_number: number;
}

interface CriteriaSet {
  _id: string;
  name: string;
  description: string;
  criteria: any[];
  logic_type: string;
  passing_threshold: number;
  is_dynamic?: boolean;
}

interface SurveyConfig {
  _id?: string;
  survey_id: string;
  pass_fail_enabled: boolean;
  pepperads_redirect_enabled: boolean;
  criteria_set_id?: string;
  pepperads_offer_id?: string;
  fail_page_config: {
    fail_page_url: string;
    custom_message: string;
    show_retry_option: boolean;
  };
  pass_page_config?: {
    redirect_delay_seconds: number;
    show_countdown: boolean;
    custom_message: string;
  };
}

const SurveyConfig: React.FC = () => {
  const { survey_id } = useParams<{ survey_id: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [generatingCriteria, setGeneratingCriteria] = useState(false);
  
  const [survey, setSurvey] = useState<any>(null);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [criteriaSets, setCriteriaSets] = useState<CriteriaSet[]>([]);
  const [config, setConfig] = useState<SurveyConfig>({
    survey_id: survey_id || '',
    pass_fail_enabled: false,
    pepperads_redirect_enabled: false,
    fail_page_config: {
      fail_page_url: '/survey-thankyou',
      custom_message: 'Thank you for your time!',
      show_retry_option: false
    },
    pass_page_config: {
      redirect_delay_seconds: 3,
      show_countdown: true,
      custom_message: 'Congratulations! You qualify. Redirecting...'
    }
  });
  
  const [testResults, setTestResults] = useState<any>(null);
  const [dynamicCriteria, setDynamicCriteria] = useState<any>(null);

  useEffect(() => {
    if (survey_id) {
      fetchData();
    }
  }, [survey_id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch survey questions
      const questionsResponse = await fetch(`https://api.theinterwebsite.space/admin/survey/${survey_id}/questions`);
      if (questionsResponse.ok) {
        const questionsData = await questionsResponse.json();
        setQuestions(questionsData.questions || []);
        setSurvey({ name: questionsData.survey_name, id: survey_id });
      }
      
      // Fetch current configuration
      const configResponse = await fetch(`https://api.theinterwebsite.space/admin/survey/${survey_id}/config`);
      if (configResponse.ok) {
        const configData = await configResponse.json();
        if (configData.survey_id) {
          setConfig(configData);
        }
      }
      
      // Fetch available criteria sets
      const criteriaResponse = await fetch('https://api.theinterwebsite.space/admin/criteria');
      if (criteriaResponse.ok) {
        const criteriaData = await criteriaResponse.json();
        setCriteriaSets(criteriaData.criteria_sets || []);
      }
      
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load survey configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    try {
      setSaving(true);
      
      const response = await fetch(`https://api.theinterwebsite.space/admin/survey/${survey_id}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (response.ok) {
        toast.success('Configuration saved successfully');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to save configuration');
      }
    } catch (error) {
      console.error('Failed to save config:', error);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateDynamicCriteria = async () => {
    try {
      setGeneratingCriteria(true);
      
      const response = await fetch(`https://api.theinterwebsite.space/admin/survey/${survey_id}/generate-criteria`, {
        method: 'POST'
      });

      const result = await response.json();
      
      if (response.ok) {
        setDynamicCriteria(result.criteria);
        toast.success('Dynamic criteria generated successfully');
      } else {
        toast.error(result.error || 'Failed to generate criteria');
      }
    } catch (error) {
      console.error('Failed to generate criteria:', error);
      toast.error('Failed to generate criteria');
    } finally {
      setGeneratingCriteria(false);
    }
  };

  const handleTestEvaluation = async () => {
    try {
      setTesting(true);
      
      // Sample responses based on survey questions
      const sampleResponses: Record<string, string> = {};
      questions.forEach((question, index) => {
        if (question.type === 'yes_no' || question.options.includes('Yes')) {
          sampleResponses[question.id] = 'Yes';
        } else if (question.type === 'rating') {
          sampleResponses[question.id] = '8';
        } else if (question.type === 'short_answer') {
          if (question.question_text.toLowerCase().includes('age')) {
            sampleResponses[question.id] = '25';
          } else {
            sampleResponses[question.id] = 'Sample response';
          }
        } else if (question.options.length > 0) {
          sampleResponses[question.id] = question.options[0];
        }
      });

      const response = await fetch(`https://api.theinterwebsite.space/admin/survey/${survey_id}/preview-evaluation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          responses: sampleResponses,
          criteria_set_id: config.criteria_set_id 
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        setTestResults(result);
        toast.success(`Test completed: ${result.evaluation.status.toUpperCase()}`);
      } else {
        toast.error(result.error || 'Failed to test evaluation');
      }
    } catch (error) {
      console.error('Failed to test evaluation:', error);
      toast.error('Failed to test evaluation');
    } finally {
      setTesting(false);
    }
  };

  const handleUseDynamicCriteria = async () => {
    if (!dynamicCriteria) return;

    try {
      // First create the criteria set
      const createResponse = await fetch('https://api.theinterwebsite.space/admin/criteria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dynamicCriteria)
      });

      if (createResponse.ok) {
        const created = await createResponse.json();
        
        // Then update the survey config to use this criteria set
        setConfig(prev => ({
          ...prev,
          criteria_set_id: created.criteria_id,
          pass_fail_enabled: true
        }));

        // Refresh criteria sets
        const criteriaResponse = await fetch('https://api.theinterwebsite.space/admin/criteria');
        if (criteriaResponse.ok) {
          const criteriaData = await criteriaResponse.json();
          setCriteriaSets(criteriaData.criteria_sets || []);
        }

        setDynamicCriteria(null);
        toast.success('Dynamic criteria created and assigned to survey');
      } else {
        const error = await createResponse.json();
        toast.error(error.error || 'Failed to create criteria set');
      }
    } catch (error) {
      console.error('Failed to use dynamic criteria:', error);
      toast.error('Failed to use dynamic criteria');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading survey configuration...</p>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="page-header">
        <div className="header-nav">
          <Link to="/admin" className="btn btn-outline">
            <ArrowLeftIcon />
            Back to Admin Dashboard
          </Link>
          <div>
            <h1>Survey Configuration</h1>
            <p className="survey-info">{survey?.name}</p>
          </div>
          <div className="header-actions">
            <button 
              onClick={handleTestEvaluation}
              disabled={testing || !config.pass_fail_enabled}
              className="btn btn-outline"
            >
              <TestTubeIcon />
              {testing ? 'Testing...' : 'Test Evaluation'}
            </button>
            <button 
              onClick={handleSaveConfig}
              disabled={saving}
              className="btn btn-primary"
            >
              <SaveIcon />
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </header>

      <div className="config-sections">
        {/* General Settings */}
        <div className="config-section">
          <h2>General Settings</h2>
          
          <div className="setting-group">
            <label className="setting-toggle">
              <input
                type="checkbox"
                checked={config.pass_fail_enabled}
                onChange={(e) => setConfig(prev => ({ ...prev, pass_fail_enabled: e.target.checked }))}
              />
              <span className="toggle-slider"></span>
              Enable Pass/Fail Evaluation
            </label>
            <p className="setting-description">
              When enabled, survey responses will be evaluated against criteria to determine pass/fail status
            </p>
          </div>

          {config.pass_fail_enabled && (
            <div className="setting-group">
              <label className="setting-toggle">
                <input
                  type="checkbox"
                  checked={config.pepperads_redirect_enabled}
                  onChange={(e) => setConfig(prev => ({ ...prev, pepperads_redirect_enabled: e.target.checked }))}
                />
                <span className="toggle-slider"></span>
                Enable PepperAds Redirect
              </label>
              <p className="setting-description">
                Redirect qualified users to PepperAds offers
              </p>
            </div>
          )}
        </div>

        {/* Criteria Configuration */}
        {config.pass_fail_enabled && (
          <div className="config-section">
            <div className="section-header">
              <h2>Evaluation Criteria</h2>
              <button 
                onClick={handleGenerateDynamicCriteria}
                disabled={generatingCriteria}
                className="btn btn-secondary"
              >
                <WandIcon />
                {generatingCriteria ? 'Generating...' : 'Generate Smart Criteria'}
              </button>
            </div>

            <div className="form-group">
              <label>Criteria Set</label>
              <select
                value={config.criteria_set_id || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, criteria_set_id: e.target.value }))}
              >
                <option value="">Select criteria set...</option>
                {criteriaSets.map(criteriaSet => (
                  <option key={criteriaSet._id} value={criteriaSet._id}>
                    {criteriaSet.name} {criteriaSet.is_dynamic ? '(Dynamic)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {config.criteria_set_id && (
              <div className="criteria-preview">
                {(() => {
                  const selectedCriteria = criteriaSets.find(c => c._id === config.criteria_set_id);
                  return selectedCriteria ? (
                    <div className="criteria-info">
                      <h4>{selectedCriteria.name}</h4>
                      <p>{selectedCriteria.description}</p>
                      <div className="criteria-details">
                        <span>Logic: {selectedCriteria.logic_type}</span>
                        <span>Threshold: {selectedCriteria.passing_threshold}%</span>
                        <span>Rules: {selectedCriteria.criteria.length}</span>
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            )}
          </div>
        )}

        {/* Dynamic Criteria Preview */}
        {dynamicCriteria && (
          <div className="config-section">
            <div className="section-header">
              <h2>Generated Smart Criteria</h2>
              <div className="section-actions">
                <button 
                  onClick={handleUseDynamicCriteria}
                  className="btn btn-primary"
                >
                  Use This Criteria
                </button>
                <button 
                  onClick={() => setDynamicCriteria(null)}
                  className="btn btn-outline"
                >
                  Discard
                </button>
              </div>
            </div>

            <div className="dynamic-criteria-preview">
              <h4>{dynamicCriteria.name}</h4>
              <p>{dynamicCriteria.description}</p>
              
              <div className="criteria-rules">
                <h5>Generated Rules:</h5>
                {dynamicCriteria.criteria.map((criterion: any, index: number) => (
                  <div key={index} className="criterion-rule">
                    <div className="rule-header">
                      <span className="rule-name">{criterion.id}</span>
                      <span className={`rule-required ${criterion.required ? 'required' : 'optional'}`}>
                        {criterion.required ? 'Required' : 'Optional'}
                      </span>
                    </div>
                    <div className="rule-details">
                      <span>Question: {criterion.question_id}</span>
                      <span>Condition: {criterion.condition} {criterion.expected_value}</span>
                      <span>Weight: {criterion.weight}</span>
                    </div>
                    <p className="rule-description">{criterion.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Survey Questions Preview */}
        <div className="config-section">
          <h2>Survey Questions ({questions.length})</h2>
          <div className="questions-list">
            {questions.map((question, index) => (
              <div key={question.id} className="question-card">
                <div className="question-header">
                  <span className="question-id">{question.id}</span>
                  <span className="question-type">{question.type}</span>
                </div>
                <div className="question-text">{question.question_text}</div>
                {question.options.length > 0 && (
                  <div className="question-options">
                    Options: {question.options.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Fail Page Configuration */}
        {config.pass_fail_enabled && (
          <div className="config-section">
            <h2>Fail Page Configuration</h2>
            
            <div className="form-group">
              <label>Fail Page URL</label>
              <input
                type="text"
                value={config.fail_page_config.fail_page_url}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  fail_page_config: {
                    ...prev.fail_page_config,
                    fail_page_url: e.target.value
                  }
                }))}
                placeholder="/survey-thankyou"
              />
            </div>

            <div className="form-group">
              <label>Custom Message</label>
              <textarea
                value={config.fail_page_config.custom_message}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  fail_page_config: {
                    ...prev.fail_page_config,
                    custom_message: e.target.value
                  }
                }))}
                rows={3}
                placeholder="Thank you for your time!"
              />
            </div>

            <div className="setting-group">
              <label className="setting-toggle">
                <input
                  type="checkbox"
                  checked={config.fail_page_config.show_retry_option}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    fail_page_config: {
                      ...prev.fail_page_config,
                      show_retry_option: e.target.checked
                    }
                  }))}
                />
                <span className="toggle-slider"></span>
                Show Retry Option
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Test Results Modal */}
      {testResults && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Evaluation Test Results</h2>
              <button 
                onClick={() => setTestResults(null)}
                className="btn btn-outline"
              >
                Close
              </button>
            </div>

            <div className="test-results">
              <div className={`test-status ${testResults.evaluation.status}`}>
                <div className="status-icon">
                  {testResults.evaluation.status === 'pass' ? (
                    <CheckCircleIcon className="text-green-600" />
                  ) : (
                    <XCircleIcon className="text-red-600" />
                  )}
                </div>
                <div>
                  <h3>{testResults.evaluation.status.toUpperCase()}</h3>
                  <p>Score: {testResults.evaluation.score}%</p>
                  <p>{testResults.evaluation.message}</p>
                </div>
              </div>

              <div className="test-details">
                <h4>Sample Responses Used:</h4>
                <pre>{JSON.stringify(testResults.sample_responses, null, 2)}</pre>

                <h4>Detailed Results:</h4>
                <div className="criteria-results">
                  <p>Criteria Met: {testResults.evaluation.criteria_met.length}</p>
                  <p>Criteria Failed: {testResults.evaluation.criteria_failed.length}</p>
                  <p>Logic Type: {testResults.evaluation.details.logic_type}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SurveyConfig;
