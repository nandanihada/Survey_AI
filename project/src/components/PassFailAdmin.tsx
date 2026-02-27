import React, { useState, useEffect } from 'react';
import { Settings, Plus, Edit, Trash2, Save, X, CheckCircle, AlertCircle } from 'lucide-react';

interface Question {
  id: string;
  question_text: string;
  type: string;
  options: string[];
  question_number: number;
}

interface Criteria {
  id: string;
  question_id: string;
  condition: string;
  expected_value: string | number;
  required: boolean;
  weight: number;
  description: string;
}

interface CriteriaSet {
  _id: string;
  name: string;
  description: string;
  criteria: Criteria[];
  logic_type: string;
  passing_threshold: number;
  is_active: boolean;
}

interface SurveyConfig {
  survey_id: string;
  survey_name: string;
  created_at: string;
  config: {
    pass_fail_enabled: boolean;
    pepperads_redirect_enabled: boolean;
    criteria_set_id?: string;
    pepperads_offer_id?: string;
    fail_page_config: {
      fail_page_url: string;
      custom_message: string;
      show_retry_option: boolean;
    };
    dynamic_redirect_enabled?: boolean;
    dynamic_redirect_config?: {
      pass_redirect_url: string;
      fail_redirect_url: string;
      parameter_mappings?: Record<string, string>;
    };
  };
  criteria_set?: CriteriaSet;
}

interface OfferSummary {
  _id: string;
  offer_name: string;
  base_url: string;
  is_active: boolean;
}

interface PassFailAdminProps {
  isDarkMode: boolean;
}

const PassFailAdmin: React.FC<PassFailAdminProps> = ({ isDarkMode }) => {
  const [surveys, setSurveys] = useState<SurveyConfig[]>([]);
  const [criteriaSets, setCriteriaSets] = useState<CriteriaSet[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<SurveyConfig | null>(null);
  const [surveyQuestions, setSurveyQuestions] = useState<Question[]>([]);
  const [offers, setOffers] = useState<OfferSummary[]>([]);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [savingOffer, setSavingOffer] = useState(false);
  const [offerForm, setOfferForm] = useState<{ _id?: string; offer_name: string; base_url: string; is_active: boolean }>({
    offer_name: '',
    base_url: '',
    is_active: true
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Individual loading states for optimistic updates
  const [updatingStates, setUpdatingStates] = useState<{
    [surveyId: string]: {
      pass_fail_enabled?: boolean;
      pepperads_redirect_enabled?: boolean;
      criteria_set_id?: boolean;
      pepperads_offer_id?: boolean;
      dynamic_redirect_enabled?: boolean;
      dynamic_redirect_config?: boolean;
    } | undefined;
  }>({});
  
  // Form states
  const [showCriteriaForm, setShowCriteriaForm] = useState(false);
  const [editingCriteriaSet, setEditingCriteriaSet] = useState<CriteriaSet | null>(null);
  const [criteriaForm, setCriteriaForm] = useState({
    name: '',
    description: '',
    logic_type: 'all_required',
    passing_threshold: 50.0,
    criteria: [] as Criteria[]
  });

  const API_BASE = window.location.hostname.includes('localhost') || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:5000'
    : 'https://hostslice.onrender.com';

  useEffect(() => {
    loadSurveysWithConfig();
    loadCriteriaSets();
    loadOffers();
  }, []);

  const loadSurveysWithConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/admin/surveys-with-config`);
      const data = await response.json();
      if (response.ok) {
        setSurveys(data.surveys);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to load surveys' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load surveys' });
    } finally {
      setLoading(false);
    }
  };

  const loadCriteriaSets = async () => {
    try {
      const response = await fetch(`${API_BASE}/admin/criteria`);
      const data = await response.json();
      if (response.ok) {
        setCriteriaSets(data.criteria_sets);
      }
    } catch (error) {
      console.error('Failed to load criteria sets:', error);
    }
  };

  const loadSurveyQuestions = async (surveyId: string) => {
    try {
      const response = await fetch(`${API_BASE}/admin/survey/${surveyId}/questions`);
      const data = await response.json();
      if (response.ok) {
        setSurveyQuestions(data.questions);
      }
    } catch (error) {
      console.error('Failed to load survey questions:', error);
    }
  };

  const loadOffers = async () => {
    try {
      const response = await fetch(`${API_BASE}/admin/pepperads/offers`);
      const data = await response.json();
      if (response.ok) {
        setOffers(data.offers || []);
      }
    } catch (e) {
      console.error('Failed to load offers', e);
    }
  };

  const saveOffer = async () => {
    if (!offerForm.base_url || !/^https?:\/\//i.test(offerForm.base_url)) {
      setMessage({ type: 'error', text: 'Please enter a valid URL starting with http:// or https://' });
      return;
    }
    try {
      setSavingOffer(true);
      const isEditing = !!offerForm._id;
      const url = isEditing 
        ? `${API_BASE}/admin/pepperads/offers/${offerForm._id}`
        : `${API_BASE}/admin/pepperads/offers`;
      
      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(offerForm)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Failed to ${isEditing ? 'update' : 'save'} offer`);
      }
      setMessage({ type: 'success', text: `Offer ${isEditing ? 'updated' : 'saved'}. You can now select it for this survey.` });
      setShowOfferForm(false);
      setOfferForm({ offer_name: '', base_url: '', is_active: true });
      await loadOffers();
      // Auto-assign to the currently selected survey if available and not editing
      if (selectedSurvey && !isEditing) {
        await updateSurveyConfig(selectedSurvey.survey_id, {
          ...selectedSurvey.config,
          pepperads_offer_id: data._id,
          pepperads_redirect_enabled: true
        });
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Failed to save offer' });
    } finally {
      setSavingOffer(false);
    }
  };

  const handleSurveySelect = async (survey: SurveyConfig) => {
    setSelectedSurvey(survey);
    await loadSurveyQuestions(survey.survey_id);
  };

  const updateSurveyConfig = async (surveyId: string, config: any, fieldName?: string) => {
    try {
      // Optimistic update - immediately update UI
      setSurveys(prev => prev.map(survey => 
        survey.survey_id === surveyId 
          ? { ...survey, config: { ...survey.config, ...config } }
          : survey
      ));
      
      // Set loading state for specific field
      if (fieldName) {
        setUpdatingStates(prev => ({ 
          ...prev, 
          [surveyId]: { 
            ...(prev[surveyId] || {}), 
            [fieldName]: true 
          } 
        }));
      }
      
      const response = await fetch(`${API_BASE}/admin/survey/${surveyId}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      
      const data = await response.json();
      if (response.ok) {
        setMessage({ type: 'success', text: 'Configuration updated successfully' });
        // Refresh to get latest data from server
        loadSurveysWithConfig();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update configuration' });
        // Revert optimistic update on error
        loadSurveysWithConfig();
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update configuration' });
      // Revert optimistic update on error
      loadSurveysWithConfig();
    } finally {
      // Clear loading state for specific field
      if (fieldName) {
        setUpdatingStates(prev => ({ 
          ...prev, 
          [surveyId]: { 
            ...(prev[surveyId] || {}), 
            [fieldName]: false 
          } 
        }));
      }
    }
  };

  const saveCriteriaSet = async () => {
    try {
      setLoading(true);
      const url = editingCriteriaSet 
        ? `${API_BASE}/admin/criteria/${editingCriteriaSet._id}`
        : `${API_BASE}/admin/criteria`;
      
      const response = await fetch(url, {
        method: editingCriteriaSet ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(criteriaForm)
      });
      
      const data = await response.json();
      if (response.ok) {
        setMessage({ type: 'success', text: `Criteria set ${editingCriteriaSet ? 'updated' : 'created'} successfully` });
        setShowCriteriaForm(false);
        setEditingCriteriaSet(null);
        resetCriteriaForm();
        loadCriteriaSets();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save criteria set' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save criteria set' });
    } finally {
      setLoading(false);
    }
  };

  const deleteCriteriaSet = async (criteriaId: string) => {
    if (!confirm('Are you sure you want to delete this criteria set?')) return;
    
    try {
      const response = await fetch(`${API_BASE}/admin/criteria/${criteriaId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Criteria set deleted successfully' });
        loadCriteriaSets();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || 'Failed to delete criteria set' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete criteria set' });
    }
  };

  const resetCriteriaForm = () => {
    setCriteriaForm({
      name: '',
      description: '',
      logic_type: 'all_required',
      passing_threshold: 50.0,
      criteria: []
    });
  };

  const addCriteria = () => {
    const newCriteria: Criteria = {
      id: `criteria_${Date.now()}`,
      question_id: '',
      condition: 'equals',
      expected_value: '',
      required: true,
      weight: 1.0,
      description: ''
    };
    setCriteriaForm(prev => ({
      ...prev,
      criteria: [...prev.criteria, newCriteria]
    }));
  };

  const updateCriteria = (index: number, field: keyof Criteria, value: any) => {
    setCriteriaForm(prev => ({
      ...prev,
      criteria: prev.criteria.map((criteria, i) => 
        i === index ? { ...criteria, [field]: value } : criteria
      )
    }));
  };

  const removeCriteria = (index: number) => {
    setCriteriaForm(prev => ({
      ...prev,
      criteria: prev.criteria.filter((_, i) => i !== index)
    }));
  };

  const editCriteriaSet = (criteriaSet: CriteriaSet) => {
    setEditingCriteriaSet(criteriaSet);
    setCriteriaForm({
      name: criteriaSet.name,
      description: criteriaSet.description,
      logic_type: criteriaSet.logic_type,
      passing_threshold: criteriaSet.passing_threshold,
      criteria: criteriaSet.criteria
    });
    setShowCriteriaForm(true);
  };

  const conditionOptions = [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
    { value: 'greater_than_or_equal', label: 'Greater Than or Equal' },
    { value: 'less_than_or_equal', label: 'Less Than or Equal' },
    { value: 'in_list', label: 'In List' },
    { value: 'starts_with', label: 'Starts With' },
    { value: 'ends_with', label: 'Ends With' }
  ];

  const logicTypeOptions = [
    { value: 'all_required', label: 'All Required' },
    { value: 'threshold_based', label: 'Threshold Based' },
    { value: 'weighted_score', label: 'Weighted Score' },
    { value: 'any_required', label: 'Any Required' }
  ];

  return (
    <div className={`p-4 sm:p-6 rounded-lg border ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-stone-200'}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <h2 className={`text-lg sm:text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
          <Settings className="inline mr-2" size={18} />
          Pass/Fail Configuration
        </h2>
        <button
          onClick={() => {
            setShowCriteriaForm(true);
            setEditingCriteriaSet(null);
            resetCriteriaForm();
          }}
          className={`px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm ${
            isDarkMode 
              ? 'bg-red-500 hover:bg-red-600 text-white' 
              : 'bg-red-500 hover:bg-red-600 text-white'
          }`}
        >
          <Plus size={16} />
          New Criteria Set
        </button>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
          message.type === 'success' 
            ? 'bg-green-100 text-green-800 border border-green-200' 
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {message.text}
          <button
            onClick={() => setMessage(null)}
            className="ml-auto"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Surveys List */}
        <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
          <h3 className={`text-lg font-medium mb-4 ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
            Surveys ({surveys.length})
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="text-center py-4">Loading surveys...</div>
            ) : surveys.length === 0 ? (
              <div className="text-center py-4 text-gray-500">No surveys found</div>
            ) : (
              surveys.map((survey) => (
                <div
                  key={survey.survey_id}
                  onClick={() => handleSurveySelect(survey)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedSurvey?.survey_id === survey.survey_id
                      ? isDarkMode 
                        ? 'bg-red-500/20 border-red-500/50' 
                        : 'bg-red-50 border-red-200'
                      : isDarkMode 
                        ? 'bg-slate-600/50 hover:bg-slate-600' 
                        : 'bg-white hover:bg-gray-50'
                  } border`}
                >
                  <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
                    {survey.survey_name}
                  </div>
                  <div className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                    {survey.config?.pass_fail_enabled ? '✅ Pass/Fail Enabled' : '❌ Pass/Fail Disabled'}
                  </div>
                  {survey.criteria_set && (
                    <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                      Criteria: {survey.criteria_set.name}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Survey Configuration */}
        {selectedSurvey && (
          <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
            <h3 className={`text-lg font-medium mb-4 ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
              Configure: {selectedSurvey.survey_name}
            </h3>
            
            <div className="space-y-4">
              {/* Enable/Disable Pass/Fail */}
              <div className="flex items-center justify-between">
                <label className={`${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
                  Enable Pass/Fail Evaluation
                </label>
                <div className="flex items-center gap-2">
                  {updatingStates[selectedSurvey.survey_id]?.pass_fail_enabled && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  )}
                  <input
                    type="checkbox"
                    checked={selectedSurvey.config?.pass_fail_enabled || false}
                    disabled={updatingStates[selectedSurvey.survey_id]?.pass_fail_enabled}
                    onChange={(e) => {
                      const updatedConfig = {
                        ...selectedSurvey.config,
                        pass_fail_enabled: e.target.checked,
                        fail_page_config: selectedSurvey.config?.fail_page_config || {
                          fail_page_url: '/survey-thankyou',
                          custom_message: 'Thank you for your time!',
                          show_retry_option: false
                        }
                      };
                      updateSurveyConfig(selectedSurvey.survey_id, updatedConfig, 'pass_fail_enabled');
                    }}
                    className="rounded"
                  />
                </div>
              </div>

              {/* Criteria Set Selection */}
              {selectedSurvey.config?.pass_fail_enabled && (
                <div>
                  <label className={`block mb-2 ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
                    Criteria Set
                  </label>
                  <div className="flex items-center gap-2">
                    {updatingStates[selectedSurvey.survey_id]?.criteria_set_id && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    )}
                    <select
                      value={selectedSurvey.config?.criteria_set_id || ''}
                      disabled={updatingStates[selectedSurvey.survey_id]?.criteria_set_id}
                      onChange={(e) => {
                        const updatedConfig = {
                          ...selectedSurvey.config,
                          criteria_set_id: e.target.value || undefined
                        };
                        updateSurveyConfig(selectedSurvey.survey_id, updatedConfig, 'criteria_set_id');
                      }}
                      className={`w-full p-2 rounded border ${
                        isDarkMode 
                          ? 'bg-slate-600 border-slate-500 text-white' 
                          : 'bg-white border-gray-300 text-stone-800'
                      }`}
                    >
                    <option value="">Select Criteria Set</option>
                    {criteriaSets.map((criteriaSet) => (
                      <option key={criteriaSet._id} value={criteriaSet._id}>
                        {criteriaSet.name}
                      </option>
                    ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Dynamic Redirect Configuration */}
              {selectedSurvey.config?.pass_fail_enabled && (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className={`${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
                      Enable Dynamic Redirect
                    </label>
                    <div className="flex items-center gap-2">
                      {updatingStates[selectedSurvey.survey_id]?.dynamic_redirect_enabled && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      )}
                      <input
                        type="checkbox"
                        checked={selectedSurvey.config?.dynamic_redirect_enabled || false}
                        disabled={updatingStates[selectedSurvey.survey_id]?.dynamic_redirect_enabled}
                        onChange={(e) => {
                          const updatedConfig = {
                            ...selectedSurvey.config,
                            dynamic_redirect_enabled: e.target.checked,
                            dynamic_redirect_config: selectedSurvey.config?.dynamic_redirect_config || {
                              pass_redirect_url: '',
                              fail_redirect_url: '',
                              parameter_mappings: {}
                            }
                          };
                          updateSurveyConfig(selectedSurvey.survey_id, updatedConfig, 'dynamic_redirect_enabled');
                        }}
                        className="rounded"
                      />
                    </div>
                  </div>

                  {selectedSurvey.config?.dynamic_redirect_enabled && (
                    <div className="space-y-4 p-4 border rounded-lg bg-gray-50 dark:bg-slate-700/30">
                      <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
                        Dynamic Redirect Settings
                      </h4>
                      
                      {/* Pass Redirect URL */}
                      <div>
                        <label className={`block mb-2 text-sm ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
                          Pass Redirect URL Template
                        </label>
                        <input
                          type="text"
                          value={selectedSurvey.config?.dynamic_redirect_config?.pass_redirect_url || ''}
                          onChange={(e) => {
                            const updatedConfig = {
                              ...selectedSurvey.config,
                              dynamic_redirect_config: {
                                ...selectedSurvey.config?.dynamic_redirect_config,
                                pass_redirect_url: e.target.value
                              }
                            };
                            updateSurveyConfig(selectedSurvey.survey_id, updatedConfig, 'dynamic_redirect_config');
                          }}
                          placeholder="https://example.com/?aff_sub={session_id}&sub1={timestamp}&click_id={user_id}"
                          className={`w-full p-2 rounded border text-sm ${
                            isDarkMode 
                              ? 'bg-slate-600 border-slate-500 text-white' 
                              : 'bg-white border-gray-300 text-stone-800'
                          }`}
                        />
                        <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                          Use placeholders: {'{session_id}'}, {'{timestamp}'}, {'{user_id}'}, {'{survey_id}'}, {'{query_param_X}'}
                        </p>
                      </div>

                      {/* Fail Redirect URL */}
                      <div>
                        <label className={`block mb-2 text-sm ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
                          Fail Redirect URL Template
                        </label>
                        <input
                          type="text"
                          value={selectedSurvey.config?.dynamic_redirect_config?.fail_redirect_url || ''}
                          onChange={(e) => {
                            const updatedConfig = {
                              ...selectedSurvey.config,
                              dynamic_redirect_config: {
                                ...selectedSurvey.config?.dynamic_redirect_config,
                                fail_redirect_url: e.target.value
                              }
                            };
                            updateSurveyConfig(selectedSurvey.survey_id, updatedConfig, 'dynamic_redirect_config');
                          }}
                          placeholder="https://failpage.com/?reason={fail_reason}&session={session_id}"
                          className={`w-full p-2 rounded border text-sm ${
                            isDarkMode 
                              ? 'bg-slate-600 border-slate-500 text-white' 
                              : 'bg-white border-gray-300 text-stone-800'
                          }`}
                        />
                      </div>

                      {/* URL Preview */}
                      <div className="mt-3">
                        <label className={`block mb-2 text-sm ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
                          Preview (with sample data)
                        </label>
                        <div className={`p-3 rounded border text-xs font-mono ${
                          isDarkMode 
                            ? 'bg-slate-800 border-slate-600 text-slate-300' 
                            : 'bg-gray-100 border-gray-200 text-gray-700'
                        }`}>
                          <div className="mb-2">
                            <strong>Pass URL:</strong><br />
                            {selectedSurvey.config?.dynamic_redirect_config?.pass_redirect_url
                              ?.replace('{session_id}', 'sess_12345')
                              ?.replace('{timestamp}', '1642684800')
                              ?.replace('{user_id}', 'user_67890')
                              ?.replace('{survey_id}', selectedSurvey.survey_id)
                              || 'No URL configured'}
                          </div>
                          <div>
                            <strong>Fail URL:</strong><br />
                            {selectedSurvey.config?.dynamic_redirect_config?.fail_redirect_url
                              ?.replace('{session_id}', 'sess_12345')
                              ?.replace('{fail_reason}', 'criteria_not_met')
                              ?.replace('{survey_id}', selectedSurvey.survey_id)
                              || 'No URL configured'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Pass Redirect (PepperAds) */}
              {selectedSurvey && (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className={`${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
                      Enable Pass Redirect (PepperAds)
                    </label>
                    <div className="flex items-center gap-2">
                      {updatingStates[selectedSurvey.survey_id]?.pepperads_redirect_enabled && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      )}
                      <input
                        type="checkbox"
                        checked={selectedSurvey.config?.pepperads_redirect_enabled || false}
                        disabled={updatingStates[selectedSurvey.survey_id]?.pepperads_redirect_enabled}
                        onChange={(e) => {
                          const updatedConfig = {
                            ...selectedSurvey.config,
                            pepperads_redirect_enabled: e.target.checked
                          };
                          updateSurveyConfig(selectedSurvey.survey_id, updatedConfig, 'pepperads_redirect_enabled');
                        }}
                        className="rounded"
                      />
                    </div>
                  </div>

                  {selectedSurvey.config?.pepperads_redirect_enabled && (
                    <div>
                      <label className={`block mb-2 ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
                        Offer (Redirect URL)
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="flex-1 flex gap-2">
                          <select
                            value={selectedSurvey.config?.pepperads_offer_id || ''}
                            disabled={updatingStates[selectedSurvey.survey_id]?.pepperads_offer_id}
                            onChange={(e) => {
                              const updatedConfig = {
                                ...selectedSurvey.config,
                                pepperads_offer_id: e.target.value || undefined
                              };
                              updateSurveyConfig(selectedSurvey.survey_id, updatedConfig, 'pepperads_offer_id');
                            }}
                            className={`flex-1 p-2 rounded border ${
                              isDarkMode 
                                ? 'bg-slate-600 border-slate-500 text-white' 
                                : 'bg-white border-gray-300 text-stone-800'
                            }`}
                          >
                            <option value="">Select an Offer</option>
                            {offers.map((o) => (
                              <option key={o._id} value={o._id}>
                                {o.offer_name} — {o.base_url.length > 40 ? o.base_url.substring(0, 40) + '...' : o.base_url}
                              </option>
                            ))}
                          </select>
                          {selectedSurvey.config?.pepperads_offer_id && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  const selectedOffer = offers.find(o => o._id === selectedSurvey.config?.pepperads_offer_id);
                                  if (selectedOffer) {
                                    setOfferForm({
                                      _id: selectedOffer._id,
                                      offer_name: selectedOffer.offer_name,
                                      base_url: selectedOffer.base_url,
                                      is_active: selectedOffer.is_active
                                    });
                                    setShowOfferForm(true);
                                  }
                                }}
                                className={`px-2 py-1 rounded text-sm flex items-center gap-1 ${
                                  isDarkMode 
                                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                                }`}
                                title="Edit selected offer"
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const updatedConfig = {
                                    ...selectedSurvey.config,
                                    pepperads_offer_id: undefined
                                  };
                                  updateSurveyConfig(selectedSurvey.survey_id, updatedConfig);
                                }}
                                className={`px-2 py-1 rounded text-sm ${isDarkMode ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`}
                                title="Remove selected offer"
                              >
                                ✕
                              </button>
                            </>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowOfferForm(true)}
                          className={`${isDarkMode ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'} px-3 py-2 rounded whitespace-nowrap`}
                        >
                          Add Offer
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Fail Page Configuration */}
              <div>
                <label className={`block mb-2 ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
                  Fail Page URL
                </label>
                <input
                  type="text"
                  value={selectedSurvey.config.fail_page_config?.fail_page_url || ''}
                  onChange={(e) => {
                    const updatedConfig = {
                      ...selectedSurvey.config,
                      fail_page_config: {
                        ...selectedSurvey.config.fail_page_config,
                        fail_page_url: e.target.value,
                        custom_message: selectedSurvey.config.fail_page_config?.custom_message || 'Thank you for your time!',
                        show_retry_option: selectedSurvey.config.fail_page_config?.show_retry_option || false
                      }
                    };
                    updateSurveyConfig(selectedSurvey.survey_id, updatedConfig);
                  }}
                  placeholder="/survey-thankyou"
                  className={`w-full p-2 rounded border ${
                    isDarkMode 
                      ? 'bg-slate-600 border-slate-500 text-white' 
                      : 'bg-white border-gray-300 text-stone-800'
                  }`}
                />
              </div>

              <div>
                <label className={`block mb-2 ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
                  Fail Message
                </label>
                <textarea
                  value={selectedSurvey.config.fail_page_config?.custom_message || ''}
                  onChange={(e) => {
                    const updatedConfig = {
                      ...selectedSurvey.config,
                      fail_page_config: {
                        ...selectedSurvey.config.fail_page_config,
                        custom_message: e.target.value,
                        fail_page_url: selectedSurvey.config.fail_page_config?.fail_page_url || '/survey-thankyou',
                        show_retry_option: selectedSurvey.config.fail_page_config?.show_retry_option || false
                      }
                    };
                    updateSurveyConfig(selectedSurvey.survey_id, updatedConfig);
                  }}
                  placeholder="Thank you for your time!"
                  rows={3}
                  className={`w-full p-2 rounded border ${
                    isDarkMode 
                      ? 'bg-slate-600 border-slate-500 text-white' 
                      : 'bg-white border-gray-300 text-stone-800'
                  }`}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Criteria Sets Management */}
      <div className="mt-6">
        <h3 className={`text-lg font-medium mb-4 ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
          Criteria Sets ({criteriaSets.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {criteriaSets.map((criteriaSet) => (
            <div
              key={criteriaSet._id}
              className={`p-4 rounded-lg border ${
                isDarkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
                  {criteriaSet.name}
                </h4>
                <div className="flex gap-1">
                  <button
                    onClick={() => editCriteriaSet(criteriaSet)}
                    className={`p-1 rounded hover:bg-gray-100 ${isDarkMode ? 'hover:bg-slate-600' : ''}`}
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    onClick={() => deleteCriteriaSet(criteriaSet._id)}
                    className={`p-1 rounded hover:bg-red-100 text-red-600 ${isDarkMode ? 'hover:bg-red-900/20' : ''}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p className={`text-sm mb-2 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                {criteriaSet.description}
              </p>
              <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                {criteriaSet.criteria.length} criteria • {criteriaSet.logic_type}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Criteria Form Modal */}
      {showCriteriaForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto rounded-lg ${
            isDarkMode ? 'bg-slate-800' : 'bg-white'
          }`}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
                  {editingCriteriaSet ? 'Edit' : 'Create'} Criteria Set
                </h3>
                <button
                  onClick={() => setShowCriteriaForm(false)}
                  className={`p-2 rounded hover:bg-gray-100 ${isDarkMode ? 'hover:bg-slate-700' : ''}`}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={`block mb-2 ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
                    Name
                  </label>
                  <input
                    type="text"
                    value={criteriaForm.name}
                    onChange={(e) => setCriteriaForm(prev => ({ ...prev, name: e.target.value }))}
                    className={`w-full p-2 rounded border ${
                      isDarkMode 
                        ? 'bg-slate-600 border-slate-500 text-white' 
                        : 'bg-white border-gray-300 text-stone-800'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block mb-2 ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
                    Description
                  </label>
                  <textarea
                    value={criteriaForm.description}
                    onChange={(e) => setCriteriaForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                    className={`w-full p-2 rounded border ${
                      isDarkMode 
                        ? 'bg-slate-600 border-slate-500 text-white' 
                        : 'bg-white border-gray-300 text-stone-800'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block mb-2 ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
                      Logic Type
                    </label>
                    <select
                      value={criteriaForm.logic_type}
                      onChange={(e) => setCriteriaForm(prev => ({ ...prev, logic_type: e.target.value }))}
                      className={`w-full p-2 rounded border ${
                        isDarkMode 
                          ? 'bg-slate-600 border-slate-500 text-white' 
                          : 'bg-white border-gray-300 text-stone-800'
                      }`}
                    >
                      {logicTypeOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={`block mb-2 ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
                      Passing Threshold
                    </label>
                    <input
                      type="number"
                      value={criteriaForm.passing_threshold}
                      onChange={(e) => setCriteriaForm(prev => ({ ...prev, passing_threshold: parseFloat(e.target.value) }))}
                      min="0"
                      max="100"
                      step="0.1"
                      className={`w-full p-2 rounded border ${
                        isDarkMode 
                          ? 'bg-slate-600 border-slate-500 text-white' 
                          : 'bg-white border-gray-300 text-stone-800'
                      }`}
                    />
                  </div>
                </div>

                {/* Criteria List */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={`${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
                      Criteria ({criteriaForm.criteria.length})
                    </label>
                    <button
                      onClick={addCriteria}
                      className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${
                        isDarkMode 
                          ? 'bg-red-500 hover:bg-red-600 text-white' 
                          : 'bg-red-500 hover:bg-red-600 text-white'
                      }`}
                    >
                      <Plus size={14} />
                      Add Criteria
                    </button>
                  </div>

                  <div className="space-y-3">
                    {criteriaForm.criteria.map((criteria, index) => (
                      <div
                        key={criteria.id}
                        className={`p-3 rounded border ${
                          isDarkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className={`block text-sm mb-1 ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
                              Question
                            </label>
                            <select
                              value={criteria.question_id}
                              onChange={(e) => updateCriteria(index, 'question_id', e.target.value)}
                              className={`w-full p-2 rounded border text-sm ${
                                isDarkMode 
                                  ? 'bg-slate-600 border-slate-500 text-white' 
                                  : 'bg-white border-gray-300 text-stone-800'
                              }`}
                            >
                              <option value="">Select Question</option>
                              {surveyQuestions.map((question) => (
                                <option key={question.id} value={question.question_text}>
                                  {question.question_text.substring(0, 60)}...
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className={`block text-sm mb-1 ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
                              Condition
                            </label>
                            <select
                              value={criteria.condition}
                              onChange={(e) => updateCriteria(index, 'condition', e.target.value)}
                              className={`w-full p-2 rounded border text-sm ${
                                isDarkMode 
                                  ? 'bg-slate-600 border-slate-500 text-white' 
                                  : 'bg-white border-gray-300 text-stone-800'
                              }`}
                            >
                              {conditionOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className={`block text-sm mb-1 ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
                              Expected Value
                            </label>
                            <input
                              type="text"
                              value={criteria.expected_value}
                              onChange={(e) => updateCriteria(index, 'expected_value', e.target.value)}
                              className={`w-full p-2 rounded border text-sm ${
                                isDarkMode 
                                  ? 'bg-slate-600 border-slate-500 text-white' 
                                  : 'bg-white border-gray-300 text-stone-800'
                              }`}
                            />
                          </div>

                          <div>
                            <label className={`block text-sm mb-1 ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
                              Weight
                            </label>
                            <input
                              type="number"
                              value={criteria.weight}
                              onChange={(e) => updateCriteria(index, 'weight', parseFloat(e.target.value))}
                              min="0"
                              step="0.1"
                              className={`w-full p-2 rounded border text-sm ${
                                isDarkMode 
                                  ? 'bg-slate-600 border-slate-500 text-white' 
                                  : 'bg-white border-gray-300 text-stone-800'
                              }`}
                            />
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={criteria.required}
                                onChange={(e) => updateCriteria(index, 'required', e.target.checked)}
                                className="rounded"
                              />
                              <span className={isDarkMode ? 'text-white' : 'text-stone-800'}>Required</span>
                            </label>
                          </div>
                          <button
                            onClick={() => removeCriteria(index)}
                            className={`p-1 rounded text-red-600 hover:bg-red-100 ${isDarkMode ? 'hover:bg-red-900/20' : ''}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={saveCriteriaSet}
                    disabled={loading || !criteriaForm.name}
                    className={`px-4 py-2 rounded flex items-center gap-2 ${
                      loading || !criteriaForm.name
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : isDarkMode 
                          ? 'bg-red-500 hover:bg-red-600 text-white' 
                          : 'bg-red-500 hover:bg-red-600 text-white'
                    }`}
                  >
                    <Save size={16} />
                    {loading ? 'Saving...' : 'Save Criteria Set'}
                  </button>
                  <button
                    onClick={() => setShowCriteriaForm(false)}
                    className={`px-4 py-2 rounded border ${
                      isDarkMode 
                        ? 'border-slate-600 text-white hover:bg-slate-700' 
                        : 'border-gray-300 text-stone-800 hover:bg-gray-50'
                    }`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Offer Form Modal */}
      {showOfferForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} max-w-lg w-full mx-4 rounded-lg p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`${isDarkMode ? 'text-white' : 'text-stone-800'} text-lg font-medium`}>
                {offerForm._id ? 'Edit' : 'Add'} Redirect (Offer)
              </h3>
              <button onClick={() => setShowOfferForm(false)} className={`p-2 rounded ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={`block mb-1 ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>Name</label>
                <input
                  type="text"
                  value={offerForm.offer_name}
                  onChange={(e) => setOfferForm((p) => ({ ...p, offer_name: e.target.value }))}
                  placeholder="e.g., Success Page"
                  className={`w-full p-2 rounded border ${isDarkMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-300 text-stone-800'}`}
                />
              </div>
              <div>
                <label className={`block mb-1 ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>Redirect URL</label>
                <input
                  type="url"
                  value={offerForm.base_url}
                  onChange={(e) => setOfferForm((p) => ({ ...p, base_url: e.target.value }))}
                  placeholder="https://yourdomain.com/success"
                  className={`w-full p-2 rounded border ${isDarkMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-300 text-stone-800'}`}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={offerForm.is_active}
                  onChange={(e) => setOfferForm((p) => ({ ...p, is_active: e.target.checked }))}
                  className="rounded"
                />
                <span className={isDarkMode ? 'text-white' : 'text-stone-800'}>Active</span>
              </label>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <button
                onClick={() => setShowOfferForm(false)}
                className={`px-4 py-2 rounded border ${isDarkMode ? 'border-slate-600 text-white hover:bg-slate-700' : 'border-gray-300 text-stone-800 hover:bg-gray-50'}`}
              >
                Cancel
              </button>
              <button
                onClick={saveOffer}
                disabled={savingOffer}
                className={`${savingOffer ? 'opacity-60 cursor-not-allowed' : ''} ${isDarkMode ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'} px-4 py-2 rounded`}
              >
                {savingOffer ? 'Saving...' : (offerForm._id ? 'Update Offer' : 'Save Offer')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PassFailAdmin;
