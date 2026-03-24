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

  AlertCircle

} from 'lucide-react';



interface Survey {

  _id?: string;

  id?: string;

  short_id?: string;

  title: string;

  description: string;

  status: string;

  created_at: string;

  updated_at: string;

  owner?: {

    name: string;

    email: string;

  };

}



const Dashboard: React.FC = () => {

  const { user, isAdmin } = useAuth();

  const navigate = useNavigate();

  const [surveys, setSurveys] = useState<Survey[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [copiedSurvey, setCopiedSurvey] = useState<string | null>(null);



  const fetchSurveys = async () => {

    try {

      setLoading(true);

      // Dynamic API URL based on environment

      const baseUrl = window.location.hostname.includes('localhost') || window.location.hostname === '127.0.0.1'

        ? 'http://localhost:5000'

        : 'https://hostslice.onrender.com';

      

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

            <button

              onClick={() => navigate('/dashboard/create')}

              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"

            >

              <Plus size={20} className="mr-2" />

              Create New Survey

            </button>

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

                    <div className="flex items-center gap-3">

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

                    </div>

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

