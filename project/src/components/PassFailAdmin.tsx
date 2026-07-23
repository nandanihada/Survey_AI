import React, { useState, useEffect } from 'react';
import { 
  Settings, Plus, Edit, Trash2, Save, X, CheckCircle, AlertCircle, 
  Copy, ExternalLink, Info, Search, ArrowLeft, ToggleLeft, ToggleRight,
  ListFilter, ChevronRight, Zap, Link2, Layers, FileText
} from 'lucide-react';
import RedirectRulesBuilder from './RedirectRulesBuilder';

// ═══════════════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════
//  COMPONENT
// ═══════════════════════════════════════════════════════

const PassFailAdmin: React.FC<PassFailAdminProps> = ({ isDarkMode }) => {
  // Data
  const [surveys, setSurveys] = useState<SurveyConfig[]>([]);
  const [criteriaSets, setCriteriaSets] = useState<CriteriaSet[]>([]);
  const [surveyCriteriaSets, setSurveyCriteriaSets] = useState<CriteriaSet[]>([]);
  const [offers, setOffers] = useState<OfferSummary[]>([]);
  
  // UI State
  const [selectedSurvey, setSelectedSurvey] = useState<SurveyConfig | null>(null);
  const [surveyQuestions, setSurveyQuestions] = useState<Question[]>([]);
  const [activeConfigTab, setActiveConfigTab] = useState<'eligibility' | 'redirects'>('eligibility');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Criteria Form
  const [showCriteriaForm, setShowCriteriaForm] = useState(false);
  const [editingCriteriaSet, setEditingCriteriaSet] = useState<CriteriaSet | null>(null);
  const [criteriaFormSurveyId, setCriteriaFormSurveyId] = useState<string>('');
  const [criteriaFormQuestions, setCriteriaFormQuestions] = useState<Question[]>([]);
  const [criteriaForm, setCriteriaForm] = useState({
    name: '',
    description: '',
    logic_type: 'all_required',
    passing_threshold: 50.0,
    criteria: [] as Criteria[]
  });

  // Offer Form
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [savingOffer, setSavingOffer] = useState(false);
  const [offerForm, setOfferForm] = useState<{ _id?: string; offer_name: string; base_url: string; is_active: boolean }>({
    offer_name: '', base_url: '', is_active: true
  });

  // Loading states for individual updates
  const [updatingStates, setUpdatingStates] = useState<{
    [surveyId: string]: {
      pass_fail_enabled?: boolean;
      criteria_set_id?: boolean;
    } | undefined;
  }>({});

  const API_BASE = window.location.hostname.includes('localhost') || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:5000'
    : 'https://hostslice.onrender.com';

  // ═══════════════════════════════════════════════════════
  //  DATA LOADING
  // ═══════════════════════════════════════════════════════

  useEffect(() => {
    loadSurveysWithConfig();
    loadCriteriaSets();
    loadOffers();
  }, []);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const loadSurveysWithConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/admin/surveys-with-config`);
      const data = await response.json();
      if (response.ok) {
        setSurveys(data.surveys || []);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to load surveys' });
        setSurveys([]);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load surveys' });
      setSurveys([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCriteriaSets = async () => {
    try {
      const response = await fetch(`${API_BASE}/admin/criteria`);
      const data = await response.json();
      if (response.ok) setCriteriaSets(data.criteria_sets || []);
      else setCriteriaSets([]);
    } catch { setCriteriaSets([]); }
  };

  const loadSurveyCriteriaSets = async (surveyId: string) => {
    try {
      const response = await fetch(`${API_BASE}/admin/criteria/by-survey/${surveyId}`);
      const data = await response.json();
      if (response.ok) setSurveyCriteriaSets(data.criteria_sets || []);
      else setSurveyCriteriaSets([]);
    } catch { setSurveyCriteriaSets([]); }
  };

  const loadSurveyQuestions = async (surveyId: string) => {
    try {
      const response = await fetch(`${API_BASE}/admin/survey/${surveyId}/questions`);
      const data = await response.json();
      if (response.ok) setSurveyQuestions(data.questions || []);
      else setSurveyQuestions([]);
    } catch { setSurveyQuestions([]); }
  };

  const loadCriteriaFormQuestions = async (surveyId: string) => {
    if (!surveyId) { setCriteriaFormQuestions([]); return; }
    try {
      const response = await fetch(`${API_BASE}/admin/survey/${surveyId}/questions`);
      const data = await response.json();
      if (response.ok) setCriteriaFormQuestions(data.questions || []);
      else setCriteriaFormQuestions([]);
    } catch { setCriteriaFormQuestions([]); }
  };

  const loadOffers = async () => {
    try {
      const response = await fetch(`${API_BASE}/admin/pepperads/offers`);
      const data = await response.json();
      if (response.ok) setOffers(data.offers || []);
      else setOffers([]);
    } catch { setOffers([]); }
  };

  // ═══════════════════════════════════════════════════════
  //  ACTIONS
  // ═══════════════════════════════════════════════════════

  const handleSurveySelect = (survey: SurveyConfig) => {
    setSelectedSurvey(survey);
    setActiveConfigTab('eligibility');
    loadSurveyQuestions(survey.survey_id);
    loadSurveyCriteriaSets(survey.survey_id);
  };

  const handleBackToList = () => {
    setSelectedSurvey(null);
    setSurveyQuestions([]);
  };

  const updateSurveyConfig = async (surveyId: string, updatedConfig: any, field?: string) => {
    if (field) {
      setUpdatingStates(prev => ({
        ...prev,
        [surveyId]: { ...prev[surveyId], [field]: true }
      }));
    }
    try {
      const response = await fetch(`${API_BASE}/admin/survey/${surveyId}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: updatedConfig })
      });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Configuration saved' });
        // Update local state
        setSurveys(prev => prev.map(s => 
          s.survey_id === surveyId ? { ...s, config: updatedConfig } : s
        ));
        if (selectedSurvey?.survey_id === surveyId) {
          setSelectedSurvey(prev => prev ? { ...prev, config: updatedConfig } : prev);
        }
      } else {
        setMessage({ type: 'error', text: 'Failed to save configuration' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error saving config' });
    } finally {
      if (field) {
        setUpdatingStates(prev => ({
          ...prev,
          [surveyId]: { ...prev[surveyId], [field]: false }
        }));
      }
    }
  };

  const saveCriteriaSet = async () => {
    if (!criteriaForm.name || criteriaForm.criteria.length === 0) return;
    setLoading(true);
    try {
      const url = editingCriteriaSet 
        ? `${API_BASE}/admin/criteria/${editingCriteriaSet._id}`
        : `${API_BASE}/admin/criteria`;
      const method = editingCriteriaSet ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...criteriaForm, survey_id: criteriaFormSurveyId })
      });
      if (response.ok) {
        setMessage({ type: 'success', text: editingCriteriaSet ? 'Criteria updated' : 'Criteria created' });
        setShowCriteriaForm(false);
        loadCriteriaSets();
        if (criteriaFormSurveyId) loadSurveyCriteriaSets(criteriaFormSurveyId);
        resetCriteriaForm();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || 'Failed to save' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  const deleteCriteriaSet = async (id: string) => {
    if (!confirm('Delete this criteria set?')) return;
    try {
      const response = await fetch(`${API_BASE}/admin/criteria/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Deleted' });
        loadCriteriaSets();
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to delete' });
    }
  };

  const saveOffer = async () => {
    if (!offerForm.base_url || !/^https?:\/\//i.test(offerForm.base_url)) {
      setMessage({ type: 'error', text: 'Please enter a valid URL' });
      return;
    }
    setSavingOffer(true);
    try {
      const url = offerForm._id ? `${API_BASE}/admin/pepperads/offers/${offerForm._id}` : `${API_BASE}/admin/pepperads/offers`;
      const method = offerForm._id ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(offerForm)
      });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Offer saved' });
        setShowOfferForm(false);
        loadOffers();
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to save' });
    } finally {
      setSavingOffer(false);
    }
  };

  const resetCriteriaForm = () => {
    setCriteriaForm({ name: '', description: '', logic_type: 'all_required', passing_threshold: 50.0, criteria: [] });
    setEditingCriteriaSet(null);
  };

  const addCriteria = () => {
    setCriteriaForm(prev => ({
      ...prev,
      criteria: [...prev.criteria, {
        id: `c_${Date.now()}`,
        question_id: '',
        condition: 'equals',
        expected_value: '',
        required: true,
        weight: 1.0,
        description: ''
      }]
    }));
  };

  const updateCriteria = (index: number, field: string, value: any) => {
    setCriteriaForm(prev => ({
      ...prev,
      criteria: prev.criteria.map((c, i) => i === index ? { ...c, [field]: value } : c)
    }));
  };

  const removeCriteria = (index: number) => {
    setCriteriaForm(prev => ({
      ...prev,
      criteria: prev.criteria.filter((_, i) => i !== index)
    }));
  };

  // ═══════════════════════════════════════════════════════
  //  FILTERED SURVEYS
  // ═══════════════════════════════════════════════════════

  const filteredSurveys = surveys.filter(s => 
    s.survey_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.survey_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ═══════════════════════════════════════════════════════
  //  RENDER: SURVEY LIST VIEW
  // ═══════════════════════════════════════════════════════

  const renderSurveyList = () => (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Survey Configuration
          </h2>
          <p className={`text-sm mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
            Select a survey to configure eligibility rules and redirect routing
          </p>
        </div>
        <button
          onClick={() => { 
            setShowCriteriaForm(true); 
            resetCriteriaForm();
            // If a survey is selected, pre-load its questions
            if (selectedSurvey) {
              setCriteriaFormSurveyId(selectedSurvey.survey_id);
              loadCriteriaFormQuestions(selectedSurvey.survey_id);
            } else {
              setCriteriaFormSurveyId('');
              setCriteriaFormQuestions([]);
            }
          }}
          className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-sm font-medium flex items-center gap-2 shadow-sm"
        >
          <Plus size={16} /> New Criteria Set
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search size={18} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search surveys by name or ID..."
          className={`w-full pl-11 pr-4 py-3 rounded-xl border text-sm ${
            isDarkMode 
              ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' 
              : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
          } focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400`}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className={`px-4 py-3 rounded-xl ${isDarkMode ? 'bg-slate-800/80 border border-slate-700' : 'bg-gray-50 border border-gray-100'}`}>
          <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{surveys.length}</div>
          <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Total Surveys</div>
        </div>
        <div className={`px-4 py-3 rounded-xl ${isDarkMode ? 'bg-slate-800/80 border border-slate-700' : 'bg-gray-50 border border-gray-100'}`}>
          <div className={`text-2xl font-bold text-green-500`}>{surveys.filter(s => s.config?.pass_fail_enabled).length}</div>
          <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Enabled</div>
        </div>
        <div className={`px-4 py-3 rounded-xl ${isDarkMode ? 'bg-slate-800/80 border border-slate-700' : 'bg-gray-50 border border-gray-100'}`}>
          <div className={`text-2xl font-bold text-blue-500`}>{criteriaSets.length}</div>
          <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Criteria Sets</div>
        </div>
      </div>

      {/* Survey Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
          <span className={`ml-3 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>Loading surveys...</span>
        </div>
      ) : filteredSurveys.length === 0 ? (
        <div className={`text-center py-16 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
          <FileText size={40} className="mx-auto mb-3 opacity-30" />
          <p>{searchQuery ? 'No surveys match your search' : 'No surveys found'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredSurveys.map((survey) => (
            <div
              key={survey.survey_id}
              onClick={() => handleSurveySelect(survey)}
              className={`group flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all duration-150 ${
                isDarkMode
                  ? 'bg-slate-800/60 border-slate-700 hover:bg-slate-700/80 hover:border-slate-600'
                  : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              {/* Status Indicator */}
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                survey.config?.pass_fail_enabled ? 'bg-green-500' : 'bg-gray-300'
              }`} />
              
              {/* Survey Info */}
              <div className="flex-1 min-w-0">
                <div className={`font-medium text-sm truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {survey.survey_name?.length > 70 ? survey.survey_name.slice(0, 70) + '...' : survey.survey_name}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`text-xs font-mono ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                    {survey.survey_id?.slice(0, 8)}
                  </span>
                  {survey.criteria_set && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-50 text-blue-600'}`}>
                      {survey.criteria_set.name}
                    </span>
                  )}
                </div>
              </div>

              {/* Status Badges */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {survey.config?.pass_fail_enabled && (
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${isDarkMode ? 'bg-green-900/40 text-green-300' : 'bg-green-50 text-green-700'}`}>
                    Active
                  </span>
                )}
                <ChevronRight size={16} className={`${isDarkMode ? 'text-slate-500' : 'text-gray-400'} group-hover:translate-x-0.5 transition-transform`} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Criteria Sets Section */}
      {criteriaSets.length > 0 && (
        <div className={`mt-8 pt-6 border-t ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
          <h3 className={`text-sm font-semibold uppercase tracking-wider mb-4 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
            Criteria Sets
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {criteriaSets.map((cs) => (
              <div key={cs._id} className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-gray-200'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{cs.name}</h4>
                    <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                      {cs.criteria.length} rules • {cs.logic_type.replace('_', ' ')}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { 
                      setEditingCriteriaSet(cs); 
                      setCriteriaForm({ name: cs.name, description: cs.description, logic_type: cs.logic_type, passing_threshold: cs.passing_threshold, criteria: cs.criteria }); 
                      setShowCriteriaForm(true);
                      // Try to load questions from currently selected survey, or prompt user
                      if (selectedSurvey) {
                        setCriteriaFormSurveyId(selectedSurvey.survey_id);
                        loadCriteriaFormQuestions(selectedSurvey.survey_id);
                      } else {
                        setCriteriaFormSurveyId('');
                        setCriteriaFormQuestions([]);
                      }
                    }}
                      className={`p-1.5 rounded-lg ${isDarkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-400'}`}>
                      <Edit size={13} />
                    </button>
                    <button onClick={() => deleteCriteriaSet(cs._id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════
  //  RENDER: SURVEY CONFIG VIEW (after selecting a survey)
  // ═══════════════════════════════════════════════════════

  const renderSurveyConfig = () => {
    if (!selectedSurvey) return null;
    
    return (
      <div className="space-y-5">
        {/* Back Button + Survey Name */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleBackToList}
            className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-gray-100 text-gray-600'}`}
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className={`text-lg font-bold truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {selectedSurvey.survey_name?.length > 60 ? selectedSurvey.survey_name.slice(0, 60) + '...' : selectedSurvey.survey_name}
            </h2>
            <div className="flex items-center gap-3 mt-0.5">
              <span className={`text-xs font-mono ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                ID: {selectedSurvey.survey_id}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                selectedSurvey.config?.pass_fail_enabled 
                  ? isDarkMode ? 'bg-green-900/40 text-green-300' : 'bg-green-50 text-green-700'
                  : isDarkMode ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500'
              }`}>
                {selectedSurvey.config?.pass_fail_enabled ? '● Active' : '○ Inactive'}
              </span>
            </div>
          </div>
          {/* Copy survey URL */}
          <button
            onClick={() => {
              const url = `${window.location.hostname === 'localhost' ? 'http://localhost:5173' : 'https://survey.pepperwahl.com'}/survey/${selectedSurvey.survey_id}`;
              navigator.clipboard.writeText(url);
              setMessage({ type: 'success', text: 'Survey URL copied!' });
            }}
            className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
          >
            <Copy size={13} /> Copy URL
          </button>
        </div>

        {/* Tab Navigation */}
        <div className={`flex rounded-xl p-1 ${isDarkMode ? 'bg-slate-800' : 'bg-gray-100'}`}>
          <button
            onClick={() => setActiveConfigTab('eligibility')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeConfigTab === 'eligibility'
                ? isDarkMode ? 'bg-slate-700 text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm'
                : isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <ListFilter size={15} />
            Criteria & Questions
          </button>
          <button
            onClick={() => setActiveConfigTab('redirects')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeConfigTab === 'redirects'
                ? isDarkMode ? 'bg-slate-700 text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm'
                : isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Link2 size={15} />
            Redirect Rules & S2S
          </button>
        </div>

        {/* Tab Content */}
        {activeConfigTab === 'eligibility' && renderEligibilityTab()}
        {activeConfigTab === 'redirects' && renderRedirectsTab()}
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════
  //  TAB 1: CRITERIA & QUESTIONS
  // ═══════════════════════════════════════════════════════

  const renderEligibilityTab = () => {
    if (!selectedSurvey) return null;

    return (
      <div className="space-y-4">
        {/* Info Banner */}
        <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-blue-900/20 border-blue-800/40' : 'bg-blue-50 border-blue-100'}`}>
          <p className={`text-xs ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
            <strong>How it works:</strong> Create criteria sets here (groups of answer rules), then in the "Redirect Rules" tab, map each criteria set or individual question to a redirect URL.
          </p>
        </div>

        {/* Enable/Disable Toggle */}
        <div className={`p-5 rounded-xl border ${isDarkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`font-semibold text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Enable Pass/Fail Evaluation
              </h3>
              <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                When enabled, survey responses are evaluated against criteria sets to determine eligibility
              </p>
            </div>
            <div className="flex items-center gap-3">
              {updatingStates[selectedSurvey.survey_id]?.pass_fail_enabled && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
              )}
              <button
                disabled={updatingStates[selectedSurvey.survey_id]?.pass_fail_enabled}
                onClick={() => {
                  const newVal = !selectedSurvey.config?.pass_fail_enabled;
                  const updatedConfig = {
                    ...(selectedSurvey.config || {}),
                    pass_fail_enabled: newVal,
                    fail_page_config: selectedSurvey.config?.fail_page_config || {
                      fail_page_url: '/survey-thankyou',
                      custom_message: 'Thank you for your time!',
                      show_retry_option: false
                    }
                  };
                  updateSurveyConfig(selectedSurvey.survey_id, updatedConfig, 'pass_fail_enabled');
                }}
                className={`relative w-12 h-7 rounded-full transition-colors ${
                  selectedSurvey.config?.pass_fail_enabled ? 'bg-green-500' : isDarkMode ? 'bg-slate-600' : 'bg-gray-300'
                }`}
              >
                <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  selectedSurvey.config?.pass_fail_enabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>
        </div>

        {/* Criteria Sets for THIS survey */}
        <div className={`p-5 rounded-xl border ${isDarkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className={`font-semibold text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Criteria Sets
              </h3>
              <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                Groups of answer rules that evaluate pass/fail together
              </p>
            </div>
            <button
              onClick={() => { 
                setShowCriteriaForm(true); 
                resetCriteriaForm();
                setCriteriaFormSurveyId(selectedSurvey.survey_id);
                loadCriteriaFormQuestions(selectedSurvey.survey_id);
              }}
              className="px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-sm"
            >
              <Plus size={13} /> Create Criteria Set
            </button>
          </div>

          {surveyCriteriaSets.length === 0 ? (
            <div className={`py-8 text-center rounded-xl border-2 border-dashed ${isDarkMode ? 'border-slate-600' : 'border-gray-200'}`}>
              <ListFilter size={28} className={`mx-auto mb-2 ${isDarkMode ? 'text-slate-600' : 'text-gray-300'}`} />
              <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>No criteria sets yet</p>
              <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                Create one to group multiple answer checks together
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {surveyCriteriaSets.map((cs) => (
                <div key={cs._id} className={`p-4 rounded-xl border flex items-center justify-between ${isDarkMode ? 'bg-slate-700/40 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
                  <div>
                    <h4 className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{cs.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                        {cs.criteria.length} rules
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-slate-600 text-slate-300' : 'bg-gray-200 text-gray-600'}`}>
                        {cs.logic_type.replace('_', ' ')}
                      </span>
                      {cs.criteria.slice(0, 2).map((c, i) => (
                        <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded ${isDarkMode ? 'bg-slate-600 text-slate-300' : 'bg-blue-50 text-blue-600'}`}>
                          {c.question_id} {c.condition} "{String(c.expected_value).slice(0, 10)}"
                        </span>
                      ))}
                      {cs.criteria.length > 2 && (
                        <span className={`text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>+{cs.criteria.length - 2} more</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { 
                      setEditingCriteriaSet(cs); 
                      setCriteriaForm({ name: cs.name, description: cs.description, logic_type: cs.logic_type, passing_threshold: cs.passing_threshold, criteria: cs.criteria }); 
                      setShowCriteriaForm(true);
                      setCriteriaFormSurveyId(selectedSurvey.survey_id);
                      loadCriteriaFormQuestions(selectedSurvey.survey_id);
                    }}
                      className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-slate-600 text-slate-400' : 'hover:bg-gray-200 text-gray-400'}`}>
                      <Edit size={14} />
                    </button>
                    <button onClick={() => deleteCriteriaSet(cs._id)}
                      className="p-2 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Survey Questions Preview */}
        {surveyQuestions.length > 0 && (
          <div className={`p-5 rounded-xl border ${isDarkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-gray-200'}`}>
            <h3 className={`font-semibold text-sm mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Survey Questions ({surveyQuestions.length})
            </h3>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {surveyQuestions.map((q) => (
                <div key={q.id} className={`flex items-start gap-2 p-2.5 rounded-lg text-xs ${isDarkMode ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                  <span className={`font-mono font-bold flex-shrink-0 w-7 text-center ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>
                    {q.id}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className={isDarkMode ? 'text-slate-200' : 'text-gray-700'}>
                      {q.question_text?.length > 80 ? q.question_text.slice(0, 80) + '...' : q.question_text}
                    </span>
                    {q.options && q.options.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {q.options.slice(0, 4).map((opt, i) => (
                          <span key={i} className={`px-1.5 py-0.5 rounded text-[10px] ${isDarkMode ? 'bg-slate-600 text-slate-300' : 'bg-gray-200 text-gray-600'}`}>
                            {opt.length > 20 ? opt.slice(0, 20) + '..' : opt}
                          </span>
                        ))}
                        {q.options.length > 4 && (
                          <span className={`px-1.5 py-0.5 text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>+{q.options.length - 4} more</span>
                        )}
                      </div>
                    )}
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${isDarkMode ? 'bg-slate-600 text-slate-300' : 'bg-gray-200 text-gray-500'}`}>
                    {q.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════
  //  TAB 2: REDIRECT RULES & S2S
  // ═══════════════════════════════════════════════════════

  const renderRedirectsTab = () => {
    if (!selectedSurvey) return null;

    return (
      <RedirectRulesBuilder
        surveyId={selectedSurvey.survey_id}
        questions={surveyQuestions.map(q => ({ id: q.id, question: q.question_text, type: q.type, options: q.options }))}
        isDarkMode={isDarkMode}
        criteriaSets={surveyCriteriaSets}
      />
    );
  };

  // ═══════════════════════════════════════════════════════
  //  MAIN RENDER
  // ═══════════════════════════════════════════════════════

  return (
    <div className={`p-4 sm:p-6 rounded-xl ${isDarkMode ? 'bg-slate-900/50' : 'bg-gray-50/50'}`}>
      {/* Global Message */}
      {message && (
        <div className={`mb-5 p-3.5 rounded-xl flex items-center gap-2.5 text-sm font-medium shadow-sm ${
          message.type === 'success'
            ? isDarkMode ? 'bg-green-900/40 text-green-300 border border-green-700/50' : 'bg-green-50 text-green-700 border border-green-200'
            : isDarkMode ? 'bg-red-900/40 text-red-300 border border-red-700/50' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-auto opacity-60 hover:opacity-100"><X size={14} /></button>
        </div>
      )}

      {/* Two views: list or config */}
      {selectedSurvey ? renderSurveyConfig() : renderSurveyList()}
      {showCriteriaForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`max-w-2xl w-full max-h-[85vh] overflow-y-auto rounded-2xl shadow-2xl ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {editingCriteriaSet ? 'Edit' : 'Create'} Criteria Set
                </h3>
                <button onClick={() => setShowCriteriaForm(false)} className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-gray-100 text-gray-500'}`}>
                  <X size={20} />
                </button>
              </div>

              {/* Survey Selector — picks which survey's questions to use */}
              <div className="mb-4">
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  Survey (load questions from)
                </label>
                <select
                  value={criteriaFormSurveyId}
                  onChange={(e) => {
                    setCriteriaFormSurveyId(e.target.value);
                    loadCriteriaFormQuestions(e.target.value);
                  }}
                  className={`w-full p-3 rounded-lg border text-sm ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                >
                  <option value="">— Select a survey to load questions —</option>
                  {surveys.map((s) => (
                    <option key={s.survey_id} value={s.survey_id}>
                      {s.survey_name?.slice(0, 60)} ({s.survey_id?.slice(0, 8)})
                    </option>
                  ))}
                </select>
                {criteriaFormSurveyId && criteriaFormQuestions.length > 0 && (
                  <p className={`text-xs mt-1.5 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                    ✓ {criteriaFormQuestions.length} questions loaded
                  </p>
                )}
                {criteriaFormSurveyId && criteriaFormQuestions.length === 0 && (
                  <p className={`text-xs mt-1.5 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                    ⚠ No questions found for this survey
                  </p>
                )}
              </div>

              {/* Name */}
              <div className="mb-4">
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Name</label>
                <input
                  type="text"
                  value={criteriaForm.name}
                  onChange={(e) => setCriteriaForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Age 18+ US Residents"
                  className={`w-full p-3 rounded-lg border text-sm ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                />
              </div>

              {/* Logic Type */}
              <div className="mb-4">
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Pass Logic</label>
                <select
                  value={criteriaForm.logic_type}
                  onChange={(e) => setCriteriaForm(prev => ({ ...prev, logic_type: e.target.value }))}
                  className={`w-full p-3 rounded-lg border text-sm ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                >
                  <option value="all_required">ALL rules must pass (strict)</option>
                  <option value="any_required">ANY one rule passes (lenient)</option>
                  <option value="threshold_based">Score threshold based</option>
                </select>
                {criteriaForm.logic_type === 'threshold_based' && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Min score:</span>
                    <input type="number" value={criteriaForm.passing_threshold} min="0" max="100"
                      onChange={(e) => setCriteriaForm(prev => ({ ...prev, passing_threshold: parseFloat(e.target.value) }))}
                      className={`w-20 p-2 rounded border text-sm ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`} />
                    <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>%</span>
                  </div>
                )}
              </div>

              <div className={`border-t my-5 ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}></div>

              {/* Rules */}
              <div className="flex items-center justify-between mb-3">
                <h4 className={`font-semibold text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Rules ({criteriaForm.criteria.length})
                </h4>
                <button onClick={addCriteria} className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white">
                  <Plus size={13} /> Add Rule
                </button>
              </div>

              {criteriaForm.criteria.length === 0 ? (
                <div className={`py-10 text-center rounded-xl border-2 border-dashed ${isDarkMode ? 'border-slate-600 text-slate-400' : 'border-gray-200 text-gray-400'}`}>
                  <p className="text-sm">No rules yet</p>
                  <p className="text-xs mt-1">Click "Add Rule" to define eligibility criteria</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {criteriaForm.criteria.map((criteria, index) => (
                    <div key={criteria.id} className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-700/40 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex items-start gap-3">
                        <span className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${isDarkMode ? 'bg-slate-600 text-slate-200' : 'bg-gray-200 text-gray-600'}`}>
                          {index + 1}
                        </span>
                        <div className="flex-1 space-y-2">
                          {/* Question */}
                          <select
                            value={criteria.question_id}
                            onChange={(e) => updateCriteria(index, 'question_id', e.target.value)}
                            className={`w-full p-2.5 rounded-lg border text-sm ${isDarkMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                          >
                            <option value="">— Select Question —</option>
                            {criteriaFormQuestions.map((q) => (
                              <option key={q.id} value={q.id}>
                                {q.id}: {q.question_text?.substring(0, 60)}
                              </option>
                            ))}
                          </select>
                          {/* Condition + Value */}
                          <div className="flex gap-2">
                            <select
                              value={criteria.condition}
                              onChange={(e) => updateCriteria(index, 'condition', e.target.value)}
                              className={`w-32 p-2.5 rounded-lg border text-sm ${isDarkMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                            >
                              <option value="equals">Equals</option>
                              <option value="not_equals">Not Equals</option>
                              <option value="contains">Contains</option>
                              <option value="greater_than">Greater Than</option>
                              <option value="less_than">Less Than</option>
                            </select>
                            {(() => {
                              const selectedQ = criteriaFormQuestions.find(q => q.id === criteria.question_id);
                              if (selectedQ?.options?.length) {
                                return (
                                  <select value={criteria.expected_value as string} onChange={(e) => updateCriteria(index, 'expected_value', e.target.value)}
                                    className={`flex-1 p-2.5 rounded-lg border text-sm ${isDarkMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-300 text-gray-900'}`}>
                                    <option value="">— Select Answer —</option>
                                    {selectedQ.options.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                                  </select>
                                );
                              }
                              return (
                                <input type="text" value={criteria.expected_value as string}
                                  onChange={(e) => updateCriteria(index, 'expected_value', e.target.value)}
                                  placeholder="Expected value"
                                  className={`flex-1 p-2.5 rounded-lg border text-sm ${isDarkMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-300 text-gray-900'}`} />
                              );
                            })()}
                          </div>
                          {/* Required toggle */}
                          <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <input type="checkbox" checked={criteria.required} onChange={(e) => updateCriteria(index, 'required', e.target.checked)} className="rounded" />
                            <span className={isDarkMode ? 'text-slate-300' : 'text-gray-600'}>Required (must pass)</span>
                          </label>
                        </div>
                        <button onClick={() => removeCriteria(index)} className="p-2 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Save/Cancel */}
              <div className="flex gap-3 mt-6 pt-5 border-t border-gray-200 dark:border-slate-700">
                <button
                  onClick={saveCriteriaSet}
                  disabled={loading || !criteriaForm.name || criteriaForm.criteria.length === 0}
                  className={`flex-1 px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2 ${
                    loading || !criteriaForm.name || criteriaForm.criteria.length === 0
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-red-500 hover:bg-red-600 text-white'
                  }`}
                >
                  <Save size={16} />
                  {loading ? 'Saving...' : editingCriteriaSet ? 'Update' : 'Create'}
                </button>
                <button onClick={() => setShowCriteriaForm(false)}
                  className={`px-4 py-3 rounded-xl border font-medium ${isDarkMode ? 'border-slate-600 text-white hover:bg-slate-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PassFailAdmin;
