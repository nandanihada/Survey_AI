import React, { useState, useEffect } from 'react';
import { Trash2, Edit2, Plus, Mail, Settings } from 'lucide-react';

interface Question {
  id: string;
  question: string;
  type: string;
  options?: string[];
}

interface EmailTemplate {
  _id: string;
  name: string;
  subject: string;
}

interface EmailTrigger {
  _id: string;
  survey_id: string;
  question_id: string;
  custom_question?: string;
  condition: string;
  answer_value: string;
  email_template_id: string;
  send_to: string;
  delay_minutes: number;
  template_name: string;
  template_subject: string;
  created_at: string;
  is_active: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  triggers?: T[];
  templates?: T[];
  error?: string;
  message?: string;
}

interface EmailTriggerManagerProps {
  surveyId?: string;
  questions?: Question[];
}

const EmailTriggerManager: React.FC<EmailTriggerManagerProps> = ({ surveyId, questions = [] }) => {
  const [triggers, setTriggers] = useState<EmailTrigger[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>(surveyId || '');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // API URL configuration
  const apiBaseUrl = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000' 
    : 'https://hostslice.onrender.com';
  const [editingTrigger, setEditingTrigger] = useState<EmailTrigger | null>(null);
  
  const [formData, setFormData] = useState({
    question_id: '',
    custom_question: '',
    condition: 'equals',
    answer_value: '',
    email_template_id: '',
    send_to: 'respondent',
    delay_minutes: 0
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [surveyQuestions, setSurveyQuestions] = useState<Question[]>(questions || []);

  useEffect(() => {
    // Fetch surveys first
    fetchSurveys();
    
    // If surveyId is provided, fetch triggers and questions for that survey
    if (selectedSurveyId) {
      fetchTriggers();
      fetchTemplates();
      fetchSurveyQuestions(selectedSurveyId);
    }
  }, [selectedSurveyId]);

  const fetchSurveys = async () => {
    try {
      // Get authentication token (JWT preferred)
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      // Add Authorization header
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        // Fallback to user ID if no JWT token
        const userData = localStorage.getItem('user_data');
        if (userData) {
          try {
            const user = JSON.parse(userData);
            if (user.id) {
              headers['Authorization'] = `Bearer ${user.id}`;
            }
          } catch (e) {
            console.error('Error parsing user data:', e);
          }
        }
      }
      
      // Add X-User-ID header
      const userId = localStorage.getItem('userId') || localStorage.getItem('user_id') || '';
      if (userId) {
        headers['X-User-ID'] = userId;
      }
      
      const response = await fetch(`${apiBaseUrl}/api/surveys`, {
        headers
      });
      
      if (response.ok) {
        const data = await response.json();
        setSurveys(data.surveys || []);
        console.log('Fetched surveys:', data.surveys);
      }
    } catch (error) {
      console.error('Error fetching surveys:', error);
    }
  };

  const fetchSurveyQuestions = async (surveyId: string) => {
    try {
      // Get authentication token (JWT preferred)
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      // Add Authorization header
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        // Fallback to user ID if no JWT token
        const userData = localStorage.getItem('user_data');
        if (userData) {
          try {
            const user = JSON.parse(userData);
            if (user.id) {
              headers['Authorization'] = `Bearer ${user.id}`;
            }
          } catch (e) {
            console.error('Error parsing user data:', e);
          }
        }
      }
      
      // Add X-User-ID header
      const userId = localStorage.getItem('userId') || localStorage.getItem('user_id') || '';
      if (userId) {
        headers['X-User-ID'] = userId;
      }
      
      const response = await fetch(`${apiBaseUrl}/api/surveys/${surveyId}`, {
        headers
      });
      
      if (response.ok) {
        const survey = await response.json();
        const fetchedQuestions = survey.questions || [];
        setSurveyQuestions(fetchedQuestions);
        console.log('Fetched survey questions:', fetchedQuestions);
      }
    } catch (error) {
      console.error('Error fetching survey questions:', error);
    }
  };

  const fetchTriggers = async () => {
    try {
      setLoading(true);
      // Get authentication token (JWT preferred)
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      // Add Authorization header
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        // Fallback to user ID if no JWT token
        const userData = localStorage.getItem('user_data');
        if (userData) {
          try {
            const user = JSON.parse(userData);
            if (user.id) {
              headers['Authorization'] = `Bearer ${user.id}`;
            }
          } catch (e) {
            console.error('Error parsing user data:', e);
          }
        }
      }
      
      // Add X-User-ID header
      const userId = localStorage.getItem('userId') || localStorage.getItem('user_id') || '';
      if (userId) {
        headers['X-User-ID'] = userId;
      }
      
      const response = await fetch(`${apiBaseUrl}/api/email-triggers?survey_id=${selectedSurveyId}`, {
        headers
      });
      
      const result: ApiResponse<EmailTrigger> = await response.json();
      
      if (result.success && result.triggers) {
        setTriggers(result.triggers);
      } else {
        console.error('Failed to fetch triggers:', result.error);
      }
    } catch (error) {
      console.error('Error fetching triggers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      // Get authentication token (JWT preferred)
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      // Add Authorization header
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        // Fallback to user ID if no JWT token
        const userData = localStorage.getItem('user_data');
        if (userData) {
          try {
            const user = JSON.parse(userData);
            if (user.id) {
              headers['Authorization'] = `Bearer ${user.id}`;
            }
          } catch (e) {
            console.error('Error parsing user data:', e);
          }
        }
      }
      
      // Add X-User-ID header
      const userId = localStorage.getItem('userId') || localStorage.getItem('user_id') || '';
      if (userId) {
        headers['X-User-ID'] = userId;
      }
      
      const response = await fetch(`${apiBaseUrl}/api/email-templates`, {
        headers
      });
      
      const result: ApiResponse<EmailTemplate> = await response.json();
      
      if (result.success && result.templates) {
        setTemplates(result.templates);
      } else {
        console.error('Failed to fetch templates:', result.error);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const getQuestionOptions = () => {
    const options = [];
    
    // Add survey questions
    if (surveyQuestions && surveyQuestions.length > 0) {
      surveyQuestions.forEach(q => {
        options.push({
          value: q.id,
          label: `${q.question} (${q.type})`
        });
      });
    }
    
    // Add manual option
    options.push({
      value: 'manual',
      label: '➕ Add Custom Question (Manual Entry)'
    });
    
    return options;
  };

  const getAnswerOptions = (questionId: string) => {
    // Handle manual question
    if (questionId === 'manual') {
      return ['Yes', 'No', 'Maybe', 'Custom Value'];
    }
    
    const question = surveyQuestions.find(q => q.id === questionId);
    if (!question) return [];
    
    if (question.type === 'multiple_choice' || question.type === 'yes_no') {
      return question.options || [];
    }
    
    // For other question types, return common options
    return ['Yes', 'No', 'True', 'False'];
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.question_id) {
      newErrors.question_id = 'Question is required';
    }
    
    if (!formData.answer_value.trim()) {
      newErrors.answer_value = 'Answer value is required';
    }
    
    if (!formData.email_template_id) {
      newErrors.email_template_id = 'Email template is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      // Get authentication token (JWT preferred)
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      // Add Authorization header
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        // Fallback to user ID if no JWT token
        const userData = localStorage.getItem('user_data');
        if (userData) {
          try {
            const user = JSON.parse(userData);
            if (user.id) {
              headers['Authorization'] = `Bearer ${user.id}`;
            }
          } catch (e) {
            console.error('Error parsing user data:', e);
          }
        }
      }
      
      // Add X-User-ID header
      const userId = localStorage.getItem('userId') || localStorage.getItem('user_id') || '';
      if (userId) {
        headers['X-User-ID'] = userId;
      }
      
      const url = editingTrigger 
        ? `${apiBaseUrl}/api/email-triggers/${editingTrigger._id}`
        : `${apiBaseUrl}/api/email-triggers`;
      
      const method = editingTrigger ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify({
          ...formData,
          survey_id: selectedSurveyId
        })
      });

      const result: ApiResponse<EmailTrigger> = await response.json();
      
      if (result.success) {
        await fetchTriggers();
        resetForm();
        setShowModal(false);
        alert(editingTrigger ? 'Trigger updated successfully!' : 'Trigger created successfully!');
      } else {
        alert(result.error || 'Failed to save trigger');
      }
    } catch (error) {
      console.error('Error saving trigger:', error);
      alert('Failed to save trigger');
    }
  };

  const handleDelete = async (triggerId: string) => {
    if (!confirm('Are you sure you want to delete this trigger?')) {
      return;
    }

    try {
      // Get authentication token (JWT preferred)
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      // Add Authorization header
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        // Fallback to user ID if no JWT token
        const userData = localStorage.getItem('user_data');
        if (userData) {
          try {
            const user = JSON.parse(userData);
            if (user.id) {
              headers['Authorization'] = `Bearer ${user.id}`;
            }
          } catch (e) {
            console.error('Error parsing user data:', e);
          }
        }
      }
      
      // Add X-User-ID header
      const userId = localStorage.getItem('userId') || localStorage.getItem('user_id') || '';
      if (userId) {
        headers['X-User-ID'] = userId;
      }
      
      const response = await fetch(`${apiBaseUrl}/api/email-triggers/${triggerId}`, {
        method: 'DELETE',
        headers
      });

      const result: ApiResponse<EmailTrigger> = await response.json();
      
      if (result.success) {
        await fetchTriggers();
        alert('Trigger deleted successfully!');
      } else {
        alert(result.error || 'Failed to delete trigger');
      }
    } catch (error) {
      console.error('Error deleting trigger:', error);
      alert('Failed to delete trigger');
    }
  };

  const handleEdit = (trigger: EmailTrigger) => {
    setEditingTrigger(trigger);
    setFormData({
      question_id: trigger.question_id,
      custom_question: trigger.custom_question || '',
      condition: trigger.condition,
      answer_value: trigger.answer_value,
      email_template_id: trigger.email_template_id,
      send_to: trigger.send_to,
      delay_minutes: trigger.delay_minutes
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      question_id: '',
      custom_question: '',
      condition: 'equals',
      answer_value: '',
      email_template_id: '',
      send_to: 'respondent',
      delay_minutes: 0
    });
    setEditingTrigger(null);
    setErrors({});
  };

  const answerOptions = getAnswerOptions(formData.question_id);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Mail className="w-6 h-6" />
          Email Triggers
        </h2>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          disabled={!selectedSurveyId}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Create New Trigger
        </button>
      </div>

      {/* Survey Selection */}
      <div className="bg-white rounded-lg border p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Survey
        </label>
        <select
          value={selectedSurveyId}
          onChange={(e) => setSelectedSurveyId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Choose a survey...</option>
          {surveys.map(survey => (
            <option key={survey.id} value={survey.id}>
              {survey.prompt || survey.title || `Survey ${survey.id}`}
            </option>
          ))}
        </select>
        {selectedSurveyId && (
          <p className="mt-2 text-sm text-gray-600">
            Creating triggers for survey: {surveys.find(s => s.id === selectedSurveyId)?.prompt || surveys.find(s => s.id === selectedSurveyId)?.title || selectedSurveyId}
          </p>
        )}
      </div>

      {!selectedSurveyId ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border">
          <Mail className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Survey</h3>
          <p className="text-gray-500">Please select a survey above to view and create email triggers.</p>
        </div>
      ) : loading ? (
        <div className="text-center py-8">
          <div className="text-gray-500">Loading email triggers...</div>
        </div>
      ) : triggers.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-lg border">
          <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <div className="text-gray-500 mb-4">No email triggers configured</div>
          <div className="text-sm text-gray-400 mb-4">
            Create trigger rules to automatically send emails based on survey responses
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Create your first trigger
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {triggers.map((trigger) => {
            const question = surveyQuestions.find(q => q.id === trigger.question_id);
            const questionText = trigger.question_id === 'manual' 
              ? trigger.custom_question || 'Custom Question'
              : question?.question || 'Unknown Question';
            return (
              <div key={trigger._id} className="bg-white rounded-lg border p-6 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {questionText}
                      </h3>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                        {trigger.condition}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">If answer equals:</span>
                        <span className="font-medium text-gray-900 bg-gray-100 px-2 py-1 rounded">
                          {trigger.answer_value}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Then send:</span>
                        <span className="font-medium text-gray-900">{trigger.template_name}</span>
                        <span className="text-gray-500">({trigger.template_subject})</span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-gray-500">
                        <span>To: {trigger.send_to}</span>
                        {trigger.delay_minutes > 0 && (
                          <span>Delay: {trigger.delay_minutes} minutes</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(trigger)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(trigger._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="text-xs text-gray-400">
                  Created: {new Date(trigger.created_at).toLocaleDateString()}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              {editingTrigger ? 'Edit Email Trigger' : 'Add Email Trigger Rule'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Question *
                </label>
                <select
                  value={formData.question_id}
                  onChange={(e) => setFormData({ ...formData, question_id: e.target.value, answer_value: '' })}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.question_id ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select a question</option>
                  {getQuestionOptions().map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.question_id && <p className="text-red-500 text-sm mt-1">{errors.question_id}</p>}
                
                {/* Custom question field for manual option */}
                {formData.question_id === 'manual' && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Custom Question Name *
                    </label>
                    <input
                      type="text"
                      value={formData.custom_question || ''}
                      onChange={(e) => setFormData({ ...formData, custom_question: e.target.value })}
                      placeholder="Enter custom question name (e.g., 'Are you interested?')"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Condition
                </label>
                <select
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="equals">Equals</option>
                  <option value="contains">Contains</option>
                  <option value="not_equals">Not Equals</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Answer Value *
                </label>
                {answerOptions.length > 0 ? (
                  <select
                    value={formData.answer_value}
                    onChange={(e) => setFormData({ ...formData, answer_value: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.answer_value ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select an answer</option>
                    {answerOptions.map(option => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData.answer_value}
                    onChange={(e) => setFormData({ ...formData, answer_value: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.answer_value ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter answer value"
                  />
                )}
                {errors.answer_value && <p className="text-red-500 text-sm mt-1">{errors.answer_value}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Template *
                </label>
                <select
                  value={formData.email_template_id}
                  onChange={(e) => setFormData({ ...formData, email_template_id: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.email_template_id ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select an email template</option>
                  {templates.map(template => (
                    <option key={template._id} value={template._id}>
                      {template.name} - {template.subject}
                    </option>
                  ))}
                </select>
                {errors.email_template_id && <p className="text-red-500 text-sm mt-1">{errors.email_template_id}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Send To
                </label>
                <select
                  value={formData.send_to}
                  onChange={(e) => setFormData({ ...formData, send_to: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="respondent">Respondent</option>
                  <option value="admin">Survey Admin</option>
                  <option value="both">Both</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delay (minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.delay_minutes}
                  onChange={(e) => setFormData({ ...formData, delay_minutes: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0 for immediate"
                />
                <p className="text-xs text-gray-500 mt-1">Set to 0 for immediate sending, or specify delay in minutes</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingTrigger ? 'Update Trigger' : 'Create Trigger'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailTriggerManager;
