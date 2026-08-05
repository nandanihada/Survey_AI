/**

 * Modern dashboard page with clean UI inspired by Typeform

 */

import React, { useState, useEffect } from 'react';

import { useAuth } from '../contexts/AuthContext';

import { useNavigate } from 'react-router-dom';

import Header from '../components/Header';

import { generateSurveyLink } from '../utils/surveyLinkUtils';

import { 

  Edit3, 

  BarChart3, 

  Calendar, 

  Users, 

  FileText,

  Plus,

  TrendingUp,

  Eye,

  MoreHorizontal,

  AlertCircle,
  Brain,
  DollarSign,
  ChevronRight
} from 'lucide-react';



interface Survey {

  _id?: string;

  id?: string;

  short_id?: string;

  title: string;

  description: string;

  prompt?: string;

  status: string;

  created_at: string;

  updated_at: string;

  owner?: {

    name: string;

    email: string;

  };

}

interface SurveyEarningInfo {
  survey_id: string;
  earned_cents: number;    // approved
  completions: number;
  payout_per_completion_cents: number;
  share_payout_enabled: boolean;
}



const Dashboard: React.FC = () => {

  const { user, isAdmin } = useAuth();

  const navigate = useNavigate();

  const [surveys, setSurveys] = useState<Survey[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [copiedSurvey, setCopiedSurvey] = useState<string | null>(null);

  const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null);
  const [totalEarningsCents, setTotalEarningsCents] = useState<number | null>(null);
  // Per-survey earnings map: survey_id → earning info
  const [surveyEarningsMap, setSurveyEarningsMap] = useState<Record<string, SurveyEarningInfo>>({});

  // Check for new user welcome message
  useEffect(() => {
    const newUserName = localStorage.getItem('welcome_new_user');
    if (newUserName) {
      setWelcomeMessage(newUserName);
      localStorage.removeItem('welcome_new_user');
      // Auto-dismiss after 6 seconds
      setTimeout(() => setWelcomeMessage(null), 6000);
    }
  }, []);

  // Fetch total earnings (referral + survey sharing) + per-survey breakdown
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    const baseUrl = window.location.hostname.includes('localhost') || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:5000'
      : 'https://surevy-pepperwahl.onrender.com';

    Promise.all([
      fetch(`${baseUrl}/api/partner/summary`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${baseUrl}/api/partner/survey-earnings`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([summary, surveyEarnings]) => {
      let total = 0;
      if (summary) {
        total += (summary.balance_available_cents || 0) + (summary.balance_pending_cents || 0);
      }
      if (surveyEarnings?.totals) {
        total += (surveyEarnings.totals.earned_cents || 0);
      }
      setTotalEarningsCents(total);

      // Build per-survey earnings map from owned_surveys
      if (surveyEarnings?.owned_surveys) {
        const map: Record<string, SurveyEarningInfo> = {};
        // Get share data for completion counts
        const shareMap: Record<string, { earned_cents: number; completions: number }> = {};
        (surveyEarnings.share_rows || []).forEach((r: any) => {
          shareMap[r.survey_id] = { earned_cents: r.earned_cents || 0, completions: r.completions || 0 };
        });
        surveyEarnings.owned_surveys.forEach((row: any) => {
          const shareData = shareMap[row.survey_id] || { earned_cents: 0, completions: 0 };
          map[row.survey_id] = {
            survey_id: row.survey_id,
            earned_cents: shareData.earned_cents,
            completions: shareData.completions,
            payout_per_completion_cents: row.payout_per_completion_cents || 0,
            share_payout_enabled: row.share_payout_enabled || false,
          };
        });
        setSurveyEarningsMap(map);
      }
    });
  }, []);



  const fetchSurveys = async () => {

    try {

      setLoading(true);

      // Dynamic API URL based on environment

      const baseUrl = window.location.hostname.includes('localhost') || window.location.hostname === '127.0.0.1'

        ? 'http://localhost:5000'

        : 'https://surevy-pepperwahl.onrender.com';

      

      // Use admin endpoint if user is admin

      const endpoint = isAdmin ? '/api/surveys/admin/all' : '/api/surveys';

      

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

      

      const response = await fetch(`${baseUrl}${endpoint}`, {

        headers,

      });



      if (!response.ok) {

        throw new Error('Failed to fetch surveys');

      }



      const data = await response.json();

      setSurveys(data.surveys || []);

    } catch (err) {

      setError(err instanceof Error ? err.message : 'Failed to load surveys');

    } finally {

      setLoading(false);

    }

  };



  useEffect(() => {

    fetchSurveys();

  }, [isAdmin]);



  const formatDate = (dateString: string) => {

    return new Date(dateString).toLocaleDateString('en-US', {

      year: 'numeric',

      month: 'short',

      day: 'numeric',

    });

  };



  const getStatusColor = (status: string) => {

    switch (status) {

      case 'published':

        return 'bg-green-100 text-green-800 border-green-200';

      case 'draft':

        return 'bg-yellow-100 text-yellow-800 border-yellow-200';

      default:

        return 'bg-gray-100 text-gray-800 border-gray-200';

    }

  };



  const getStatusIcon = (status: string) => {

    switch (status) {

      case 'published':

        return '🟢';

      case 'draft':

        return '🟡';

      default:

        return '⚪';

    }

  };



  const copyToClipboard = async (text: string) => {

    try {

      await navigator.clipboard.writeText(text);

      setCopiedSurvey(text);

      setTimeout(() => setCopiedSurvey(null), 2000);

    } catch (err) {

      console.error('Failed to copy:', err);

    }

  };



  const getTotalResponses = () => {

    return Math.floor(Math.random() * 1000) + 150;

  };



  const getRecentSurveys = () => {

    return surveys.slice(0, 5);

  };



  if (loading) {

    return (

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">

        <div className="text-center">

          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-slate-300"></div>

          <p className="mt-4 text-slate-600">Loading dashboard...</p>

        </div>

      </div>

    );

  }



  if (error) {

    return (

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">

        <div className="text-center p-8">

          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">

            <div className="text-red-500 mb-4">

              <AlertCircle size={48} className="mx-auto" />

            </div>

            <h3 className="text-lg font-semibold text-slate-900 mb-2">Unable to load surveys</h3>

            <p className="text-slate-600 mb-6">{error}</p>

            <button

              onClick={fetchSurveys}

              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"

            >

              Try Again

            </button>

          </div>

        </div>

      </div>

    );

  }



  return (

    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">

      <Header />

      {/* Welcome Toast for new users */}
      {welcomeMessage && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
          <div className="bg-white border border-green-200 rounded-xl shadow-lg p-4 max-w-sm flex items-start gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-green-600 text-lg">✓</span>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-slate-800">Welcome, {welcomeMessage}!</p>
              <p className="text-sm text-slate-500 mt-0.5">Your account has been created successfully. You're all set to start creating surveys.</p>
            </div>
            <button
              onClick={() => setWelcomeMessage(null)}
              className="text-slate-400 hover:text-slate-600 text-lg leading-none"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header Section */}

        <div className="mb-8">

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

            <div>

              <h1 className="text-3xl font-bold text-slate-900 mb-2">

                {isAdmin ? 'Survey Management' : 'My Surveys'}

              </h1>

              <p className="text-slate-600">

                Manage your surveys and view responses

              </p>

            </div>

            <div className="flex items-center gap-3">

              <button

                onClick={() => navigate('/ml-insights')}

                className="inline-flex items-center px-6 py-3 bg-indigo-100 text-indigo-700 font-bold rounded-xl hover:bg-indigo-200 transition-all duration-200 shadow shadow-indigo-100/50"

              >

                <Brain size={20} className="mr-2" />

                ML Core Insights

              </button>

              {totalEarningsCents !== null && (
                <button
                  onClick={() => navigate('/refer?tab=earnings')}
                  className="inline-flex items-center px-5 py-3 bg-green-50 text-green-700 font-semibold rounded-xl hover:bg-green-100 transition-all duration-200 border border-green-200"
                  title="View My Earnings"
                >
                  <DollarSign size={18} className="mr-1.5 text-green-600" />
                  {totalEarningsCents > 0
                    ? `€${(totalEarningsCents / 100).toFixed(2)} Earned`
                    : 'My Earnings'}
                </button>
              )}

              <button

                onClick={() => navigate('/dashboard/create')}

                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"

              >

                <Plus size={20} className="mr-2" />

                Create New Survey

              </button>

            </div>

          </div>

        </div>



        {/* Stats Cards */}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

          <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200 hover:shadow-md transition-shadow">

            <div className="flex items-center">

              <div className="p-3 bg-blue-100 rounded-xl">

                <FileText className="h-6 w-6 text-blue-600" />

              </div>

              <div className="ml-4">

                <p className="text-sm font-medium text-slate-900">Total Surveys</p>

                <p className="text-2xl font-bold text-slate-900">{surveys.length}</p>

              </div>

            </div>

          </div>

          

          <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200 hover:shadow-md transition-shadow">

            <div className="flex items-center">

              <div className="p-3 bg-green-100 rounded-xl">

                <BarChart3 className="h-6 w-6 text-green-600" />

              </div>

              <div className="ml-4">

                <p className="text-sm font-medium text-slate-900">Total Responses</p>

                <p className="text-2xl font-bold text-slate-900">{getTotalResponses()}</p>

              </div>

            </div>

          </div>

          

          <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200 hover:shadow-md transition-shadow">

            <div className="flex items-center">

              <div className="p-3 bg-purple-100 rounded-xl">

                <TrendingUp className="h-6 w-6 text-purple-600" />

              </div>

              <div className="ml-4">

                <p className="text-sm font-medium text-slate-900">Avg. Responses</p>

                <p className="text-2xl font-bold text-slate-900">

                  {surveys.length > 0 ? Math.round(getTotalResponses() / surveys.length) : 0}

                </p>

              </div>

            </div>

          </div>

          

          <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200 hover:shadow-md transition-shadow">

            <div className="flex items-center">

              <div className="p-3 bg-orange-100 rounded-xl">

                <Calendar className="h-6 w-6 text-orange-600" />

              </div>

              <div className="ml-4">

                <p className="text-sm font-medium text-slate-900">Last 30 Days</p>

                <p className="text-2xl font-bold text-slate-900">

                  {surveys.filter(s => {

                    const createdAt = new Date(s.created_at);

                    const thirtyDaysAgo = new Date();

                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

                    return createdAt >= thirtyDaysAgo;

                  }).length}

                </p>

              </div>

            </div>

          </div>

        </div>



        {/* Recent Surveys Section */}

        <div className="mb-8">

          <div className="flex items-center justify-between mb-6">

            <h2 className="text-2xl font-bold text-slate-900">Recent Surveys</h2>

            <button 

              onClick={() => navigate('/dashboard/create?tab=surveys')}

              className="text-slate-600 hover:text-slate-900 font-medium flex items-center transition-colors"

            >

              View All

              <MoreHorizontal size={16} className="ml-1" />

            </button>

          </div>

          

          {surveys.length === 0 ? (

            <div className="bg-white rounded-2xl shadow-sm p-12 text-center border border-slate-200">

              <FileText className="mx-auto h-16 w-16 text-slate-400 mb-4" />

              <h3 className="text-xl font-semibold text-slate-900 mb-2">No surveys yet</h3>

              <p className="text-slate-600 mb-6">Create your first survey to get started</p>

              <button

                onClick={() => navigate('/dashboard/create')}

                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"

              >

                <Plus size={20} className="mr-2" />

                Create Your First Survey

              </button>

            </div>

          ) : (

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {getRecentSurveys().map((survey) => (

                <div

                  key={survey._id || survey.id || survey.short_id}

                  className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border border-slate-200 hover:border-slate-300"

                >

                  <div className="p-6">

                    {/* Header */}

                    <div className="flex items-start justify-between mb-4">

                      <div className="flex-1 min-w-0">

                        <h3 className="text-lg font-semibold text-slate-900 mb-1 truncate">

                          {survey.title.length > 50 ? `${survey.title.substring(0, 47)}...` : survey.title}

                        </h3>

                        <div className="flex items-center gap-2">

                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(survey.status)}`}>

                            {getStatusIcon(survey.status)}

                            <span className="ml-1">{survey.status}</span>

                          </span>

                          <span className="text-xs text-slate-500">

                            {formatDate(survey.created_at)}

                          </span>

                        </div>

                      </div>

                      

                      {/* Actions Dropdown */}

                      <div className="relative">

                        <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">

                          <MoreHorizontal size={16} />

                        </button>

                      </div>

                    </div>

                    

                    {/* Description */}

                    {survey.description && (

                      <p className="text-slate-600 text-sm mb-4 line-clamp-2">

                        {survey.description}

                      </p>

                    )}

                    

                    {/* Action Buttons */}

                    <div className="flex items-center gap-3 flex-wrap">

                      <button

                        onClick={() => navigate(`/dashboard/edit/${survey.short_id || survey.id || survey._id}`)}

                        className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"

                      >

                        <Edit3 size={16} />

                        Edit

                      </button>

                      

                      <button

                        onClick={() => {

                          const liveLink = generateSurveyLink(

                            survey.short_id || survey.id || survey._id,

                            user?.simpleUserId?.toString(),

                            {},

                            user?.name || user?.email?.split('@')[0] || `user_${user?.simpleUserId}`

                          );

                          window.open(liveLink, '_blank');

                        }}

                        className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"

                      >

                        <Eye size={16} />

                        Open

                      </button>

                      

                      <button

                        onClick={() => navigate(`/dashboard/responses/${survey.short_id || survey.id || survey._id}`)}

                        className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"

                      >

                        <BarChart3 size={16} />

                        Responses

                      </button>

                      {survey.prompt && (
                        <button
                          onClick={(e) => {
                            const el = e.currentTarget.parentElement?.parentElement?.querySelector('.prompt-reveal') as HTMLElement;
                            if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
                          }}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-purple-200 text-purple-600 rounded-lg hover:bg-purple-50 transition-colors text-sm font-medium"
                          title="View original prompt"
                        >
                          <FileText size={14} />
                          Prompt
                        </button>
                      )}

                    </div>

                    {/* Per-survey earnings badge — shown if payout is configured */}
                    {(() => {
                      const sid = survey.short_id || survey.id || survey._id || '';
                      const earningInfo = surveyEarningsMap[sid];
                      if (!earningInfo) return null;
                      return (
                        <button
                          onClick={() => navigate('/refer?tab=earnings')}
                          className="mt-3 w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-colors group
                            bg-green-50 border-green-100 hover:bg-green-100 hover:border-green-200"
                        >
                          <div className="flex items-center gap-2">
                            <DollarSign size={14} className="text-green-600" />
                            <span className="text-xs font-semibold text-green-700">
                              {earningInfo.completions > 0
                                ? `${earningInfo.completions} completion${earningInfo.completions > 1 ? 's' : ''} · ${earningInfo.earned_cents > 0 ? `€${(earningInfo.earned_cents / 100).toFixed(2)} earned` : earningInfo.payout_per_completion_cents > 0 ? `€${(earningInfo.payout_per_completion_cents / 100).toFixed(2)}/completion` : 'Earning active'}`
                                : earningInfo.share_payout_enabled && earningInfo.payout_per_completion_cents > 0
                                  ? `Earning active · €${(earningInfo.payout_per_completion_cents / 100).toFixed(2)} per completion`
                                  : null}
                            </span>
                          </div>
                          <ChevronRight size={14} className="text-green-400 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      );
                    })()}

                    {/* Prompt reveal */}
                    {survey.prompt && (
                      <div className="prompt-reveal mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 leading-relaxed" style={{ display: 'none' }}>
                        <span className="font-semibold text-slate-500 text-[10px] uppercase tracking-wider block mb-1">Original Prompt</span>
                        {survey.prompt}
                      </div>
                    )}

                  </div>

                </div>

              ))}

            </div>

          )}

        </div>

      </div>

    </div>

  );

};



export default Dashboard;

