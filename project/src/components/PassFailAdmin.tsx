import React, { useState, useEffect } from 'react';
import { Settings, Plus, Edit, Trash2, Save, X, CheckCircle, AlertCircle, Copy, ExternalLink, Info } from 'lucide-react';

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
    moustacheleads_payout?: number;
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
  const defaultConfig = {
    pass_fail_enabled: false,
    pepperads_redirect_enabled: false,
    criteria_set_id: undefined,
    pepperads_offer_id: undefined,
    fail_page_config: {
      fail_page_url: "/survey-thankyou",
      custom_message: "Thank you for your time!",
      show_retry_option: false
    },
    dynamic_redirect_enabled: false,
    dynamic_redirect_config: undefined
  };

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
        setSurveys(data.surveys || []);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to load surveys' });
        setSurveys([]); // Set empty array on error
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load surveys' });
      setSurveys([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const loadCriteriaSets = async () => {
    try {
      const response = await fetch(`${API_BASE}/admin/criteria`);
      const data = await response.json();
      if (response.ok) {
        setCriteriaSets(data.criteria_sets || []);
      } else {
        console.error('Failed to load criteria sets:', data.error);
        setCriteriaSets([]); // Set empty array on error
      }
    } catch (error) {
      console.error('Failed to load criteria sets:', error);
      setCriteriaSets([]); // Set empty array on error
    }
  };

  const loadSurveyQuestions = async (surveyId: string) => {
    try {
      const response = await fetch(`${API_BASE}/admin/survey/${surveyId}/questions`);
      const data = await response.json();
      if (response.ok) {
        setSurveyQuestions(data.questions || []);
      } else {
        console.error('Failed to load survey questions:', data.error);
        setSurveyQuestions([]); // Set empty array on error
      }
    } catch (error) {
      console.error('Failed to load survey questions:', error);
      setSurveyQuestions([]); // Set empty array on error
    }
  };

  const loadOffers = async () => {
    try {
      const response = await fetch(`${API_BASE}/admin/pepperads/offers`);
      const data = await response.json();
      if (response.ok) {
        setOffers(data.offers || []);
      } else {
        console.error('Failed to load offers:', data.error);
        setOffers([]); // Set empty array on error
      }
    } catch (e) {
      console.error('Failed to load offers', e);
      setOffers([]); // Set empty array on error
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
          ...(selectedSurvey.config || {}),
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
    if (survey.survey_id) {
      await loadSurveyQuestions(survey.survey_id);
    }
  };

  const updateSurveyConfig = async (surveyId: string, config: any, fieldName?: string) => {
    // Don't make API call if surveyId is undefined
    if (!surveyId || surveyId === 'undefined') {
      console.error('Invalid surveyId:', surveyId);
      return;
    }
    
    try {
      // Optimistic update - immediately update UI
      setSurveys(prev => prev.map(survey => 
        survey.survey_id === surveyId 
          ? { ...survey, config: { ...survey.config, ...config } }
          : survey
      ));
      
      // Update selectedSurvey if it's the current one
      if (selectedSurvey?.survey_id === surveyId) {
        setSelectedSurvey(prev => prev ? { ...prev, config: { ...prev.config, ...config } } : null);
      }
      
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
        // Don't refresh - optimistic update already handled the UI
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
                  key={survey.survey_id || `survey-${Math.random()}`}
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
          <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-gray-50 border-gray-200'} max-h-[80vh] overflow-y-auto`}>
            <h3 className={`text-lg font-medium mb-4 ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
              Configure: {selectedSurvey.survey_name}
            </h3>
            
            <div className="space-y-4">

              {/* ═══ MOUSTACHELEADS INTEGRATION INFO ═══ */}
              <div className={`p-4 rounded-lg border-2 ${isDarkMode ? 'bg-indigo-900/20 border-indigo-500/40' : 'bg-indigo-50 border-indigo-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🧔</span>
                  <h4 className={`font-semibold text-sm ${isDarkMode ? 'text-indigo-300' : 'text-indigo-800'}`}>
                    Moustacheleads Survey Router
                  </h4>
                </div>
                <p className={`text-xs mb-3 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                  Enable Pass/Fail below → set criteria → copy URL → paste in ML. Done.
                </p>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.hostname === 'localhost' ? 'http://localhost:5173' : 'https://survey.pepperwahl.com'}/survey/${selectedSurvey.survey_id}`}
                    className={`flex-1 p-1.5 rounded border text-xs font-mono ${isDarkMode ? 'bg-slate-800 border-slate-600 text-slate-200' : 'bg-white border-indigo-200 text-gray-800'}`}
                  />
                  <button
                    onClick={() => {
                      const url = `${window.location.hostname === 'localhost' ? 'http://localhost:5173' : 'https://survey.pepperwahl.com'}/survey/${selectedSurvey.survey_id}`;
                      navigator.clipboard.writeText(url);
                      setMessage({ type: 'success', text: 'Survey URL copied!' });
                    }}
                    className={`px-2 py-1.5 rounded text-xs ${isDarkMode ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-indigo-500 hover:bg-indigo-600 text-white'}`}
                  >
                    <Copy size={12} className="inline mr-1" />Copy
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Payout: $</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={(selectedSurvey.config as any)?.moustacheleads_payout || 0}
                    onChange={(e) => {
                      const updatedConfig = { ...(selectedSurvey.config || {}), moustacheleads_payout: parseFloat(e.target.value) || 0 };
                      updateSurveyConfig(selectedSurvey.survey_id, updatedConfig);
                    }}
                    className={`w-20 p-1 rounded border text-xs ${isDarkMode ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-indigo-200 text-gray-800'}`}
                  />
                  <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>per completion</span>
                </div>
                <details className="mt-2">
                  <summary className={`text-xs cursor-pointer ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>🧪 Test URL</summary>
                  <div className={`mt-1 p-2 rounded text-xs font-mono break-all ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-gray-100 text-gray-700'}`}>
                    {`${window.location.hostname === 'localhost' ? 'http://localhost:5173' : 'https://survey.pepperwahl.com'}/survey/${selectedSurvey.survey_id}?session_id=TEST_001&postback_url=https://httpbin.org/get&success_url=https://example.com/success&fail_url=https://example.com/fail`}
                  </div>
                  <button
                    onClick={() => window.open(`${window.location.hostname === 'localhost' ? 'http://localhost:5173' : 'https://survey.pepperwahl.com'}/survey/${selectedSurvey.survey_id}?session_id=TEST_001&postback_url=https://httpbin.org/get&success_url=https://example.com/success&fail_url=https://example.com/fail`, '_blank')}
                    className={`mt-1 px-2 py-1 rounded text-xs ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
                  >
                    <ExternalLink size={10} className="inline mr-1" />Open Test
                  </button>
                </details>
              </div>

              {/* ═══ STEP 1: ENABLE PASS/FAIL ═══ */}
              <div className={`p-3 rounded-lg border ${isDarkMode ? 'border-slate-600' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <label className={`font-medium ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
                      ① Enable Eligibility Check
                    </label>
                    <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                      Check answers to determine pass/fail
                    </p>
                  </div>
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
                          ...(selectedSurvey.config || {}),
                          pass_fail_enabled: e.target.checked,
                          fail_page_config: selectedSurvey.config?.fail_page_config || {
                            fail_page_url: '/survey-thankyou',
                            custom_message: 'Thank you for your time!',
                            show_retry_option: false
                          }
                        };
                        updateSurveyConfig(selectedSurvey.survey_id, updatedConfig, 'pass_fail_enabled');
                      }}
                      className="w-5 h-5 rounded"
                    />
                  </div>
                </div>
              </div>

              {/* ═══ STEP 2: SELECT CRITERIA ═══ */}
              {selectedSurvey.config?.pass_fail_enabled && (
                <div className={`p-3 rounded-lg border ${isDarkMode ? 'border-slate-600' : 'border-gray-200'}`}>
                  <label className={`block font-medium mb-1 ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
                    ② Select Eligibility Criteria
                  </label>
                  <p className={`text-xs mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    Which answers must the user give to pass?
                  </p>
                  <div className="flex items-center gap-2">
                    {updatingStates[selectedSurvey.survey_id]?.criteria_set_id && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    )}
                    <select
                      value={selectedSurvey.config?.criteria_set_id || ''}
                      disabled={updatingStates[selectedSurvey.survey_id]?.criteria_set_id}
                      onChange={(e) => {
                        const updatedConfig = {
                          ...(selectedSurvey.config || {}),
                          criteria_set_id: e.target.value || undefined
                        };
                        updateSurveyConfig(selectedSurvey.survey_id, updatedConfig, 'criteria_set_id');
                      }}
                      className={`w-full p-2 rounded border ${isDarkMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-300 text-stone-800'}`}
                    >
                    <option value="">— Select Criteria Set —</option>
                    {criteriaSets.map((criteriaSet) => (
                      <option key={criteriaSet._id} value={criteriaSet._id}>
                        {criteriaSet.name} ({criteriaSet.criteria.length} rules)
                      </option>
                    ))}
                    </select>
                  </div>
                  {criteriaSets.length === 0 && (
                    <p className={`text-xs mt-2 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-700'}`}>
                      ⚠️ No criteria sets yet — create one with the "New Criteria Set" button above.
                    </p>
                  )}
                </div>
              )}
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

      {/* Criteria Form Modal — SIMPLIFIED */}
      {showCriteriaForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`max-w-2xl w-full max-h-[85vh] overflow-y-auto rounded-xl shadow-2xl ${
            isDarkMode ? 'bg-slate-800' : 'bg-white'
          }`}>
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
                  {editingCriteriaSet ? 'Edit' : 'Create'} Eligibility Rules
                </h3>
                <button
                  onClick={() => setShowCriteriaForm(false)}
                  className={`p-2 rounded-lg hover:bg-gray-100 ${isDarkMode ? 'hover:bg-slate-700 text-white' : ''}`}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Rule Set Name */}
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                  Rule Set Name
                </label>
                <input
                  type="text"
                  value={criteriaForm.name}
                  onChange={(e) => setCriteriaForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Age 18+ and US residents"
                  className={`w-full p-3 rounded-lg border ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200 text-stone-800'}`}
                />
              </div>

              {/* Pass Logic */}
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                  To pass, user must match:
                </label>
                <select
                  value={criteriaForm.logic_type}
                  onChange={(e) => setCriteriaForm(prev => ({ ...prev, logic_type: e.target.value }))}
                  className={`w-full p-2 rounded-lg border ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200 text-stone-800'}`}
                >
                  <option value="all_required">ALL rules below (strict)</option>
                  <option value="any_required">ANY one rule below (lenient)</option>
                  <option value="threshold_based">At least {criteriaForm.passing_threshold}% of rules</option>
                </select>
                {criteriaForm.logic_type === 'threshold_based' && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Minimum score:</span>
                    <input
                      type="number"
                      value={criteriaForm.passing_threshold}
                      onChange={(e) => setCriteriaForm(prev => ({ ...prev, passing_threshold: parseFloat(e.target.value) }))}
                      min="0" max="100"
                      className={`w-20 p-1 rounded border text-sm ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                    />
                    <span className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>%</span>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className={`border-t my-4 ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}></div>

              {/* Rules List */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
                    Rules ({criteriaForm.criteria.length})
                  </h4>
                  <button
                    onClick={addCriteria}
                    className="px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white"
                  >
                    <Plus size={14} />
                    Add Rule
                  </button>
                </div>

                {criteriaForm.criteria.length === 0 && (
                  <div className={`text-center py-8 rounded-lg border-2 border-dashed ${isDarkMode ? 'border-slate-600 text-slate-400' : 'border-gray-200 text-gray-400'}`}>
                    <p>No rules yet. Click "Add Rule" to define eligibility criteria.</p>
                    <p className="text-xs mt-1">Example: Question "Are you 18+?" must equal "Yes"</p>
                  </div>
                )}

                <div className="space-y-3">
                  {criteriaForm.criteria.map((criteria, index) => (
                    <div
                      key={criteria.id}
                      className={`p-4 rounded-lg border ${isDarkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-gray-50 border-gray-200'}`}
                    >
                      {/* Question Selection */}
                      <div className="mb-3">
                        <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                          Question
                        </label>
                        <select
                          value={criteria.question_id}
                          onChange={(e) => updateCriteria(index, 'question_id', e.target.value)}
                          className={`w-full p-2 rounded-lg border text-sm ${isDarkMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-300 text-stone-800'}`}
                        >
                          <option value="">— Pick a question —</option>
                          {surveyQuestions.map((question) => (
                            <option key={question.id} value={question.id}>
                              Q{question.question_number}: {question.question_text.substring(0, 80)}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Required Answer */}
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="flex-1">
                          <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                            Required Answer
                          </label>
                          <div className="flex gap-2">
                            <select
                              value={criteria.condition}
                              onChange={(e) => updateCriteria(index, 'condition', e.target.value)}
                              className={`w-28 p-2 rounded-lg border text-sm ${isDarkMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-300 text-stone-800'}`}
                            >
                              <option value="equals">Equals</option>
                              <option value="not_equals">Not equals</option>
                              <option value="contains">Contains</option>
                              <option value="any">Any answer</option>
                            </select>
                            {criteria.condition !== 'any' && (() => {
                              // Find the selected question's options
                              const selectedQ = surveyQuestions.find(q => q.id === criteria.question_id);
                              const hasOptions = selectedQ && selectedQ.options && selectedQ.options.length > 0;
                              
                              if (hasOptions) {
                                return (
                                  <select
                                    value={criteria.expected_value}
                                    onChange={(e) => updateCriteria(index, 'expected_value', e.target.value)}
                                    className={`flex-1 p-2 rounded-lg border text-sm ${isDarkMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-300 text-stone-800'}`}
                                  >
                                    <option value="">— Pick the correct answer —</option>
                                    {selectedQ.options.map((opt: string, i: number) => (
                                      <option key={i} value={opt}>{opt}</option>
                                    ))}
                                  </select>
                                );
                              } else {
                                return (
                                  <input
                                    type="text"
                                    value={criteria.expected_value}
                                    onChange={(e) => updateCriteria(index, 'expected_value', e.target.value)}
                                    placeholder="Type the correct answer"
                                    className={`flex-1 p-2 rounded-lg border text-sm ${isDarkMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-300 text-stone-800'}`}
                                  />
                                );
                              }
                            })()}
                          </div>
                          {criteria.condition === 'any' && (
                            <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                              ✓ Any answer is accepted (just needs to be answered)
                            </p>
                          )}
                        </div>

                        {/* Delete button */}
                        <div className="flex items-end">
                          <button
                            onClick={() => removeCriteria(index)}
                            className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                            title="Remove rule"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Required toggle */}
                      <div className="mt-2">
                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={criteria.required}
                            onChange={(e) => updateCriteria(index, 'required', e.target.checked)}
                            className="rounded"
                          />
                          <span className={isDarkMode ? 'text-slate-300' : 'text-gray-600'}>
                            Must pass (uncheck to make optional/bonus)
                          </span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Save / Cancel */}
              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
                <button
                  onClick={saveCriteriaSet}
                  disabled={loading || !criteriaForm.name || criteriaForm.criteria.length === 0}
                  className={`flex-1 px-4 py-3 rounded-lg flex items-center justify-center gap-2 font-medium ${
                    loading || !criteriaForm.name || criteriaForm.criteria.length === 0
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-red-500 hover:bg-red-600 text-white'
                  }`}
                >
                  <Save size={16} />
                  {loading ? 'Saving...' : (editingCriteriaSet ? 'Update Rules' : 'Save Rules')}
                </button>
                <button
                  onClick={() => setShowCriteriaForm(false)}
                  className={`px-4 py-3 rounded-lg border font-medium ${isDarkMode ? 'border-slate-600 text-white hover:bg-slate-700' : 'border-gray-300 text-stone-800 hover:bg-gray-50'}`}
                >
                  Cancel
                </button>
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
