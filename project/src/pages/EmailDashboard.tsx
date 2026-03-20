import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Mail, FileText, Settings, BarChart3 } from 'lucide-react';
import EmailTemplateManager from './EmailTemplateManager';
import EmailTriggerManager from './EmailTriggerManager';

interface Question {
  id: string;
  question: string;
  type: string;
  options?: string[];
}

interface EmailDashboardProps {
  surveyId?: string;
  questions?: Question[];
}

const EmailDashboard: React.FC<EmailDashboardProps> = ({ 
  surveyId: propSurveyId, 
  questions: propQuestions = [] 
}) => {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'templates' | 'triggers' | 'logs'>('templates');
  const [surveyId, setSurveyId] = useState<string | undefined>(propSurveyId);
  const [questions, setQuestions] = useState<Question[]>(propQuestions);
  const [loadingSurvey, setLoadingSurvey] = useState(false);

  useEffect(() => {
    const urlSurveyId = searchParams.get('survey_id');
    console.log('URL survey_id:', urlSurveyId);
    console.log('Prop surveyId:', propSurveyId);
    if (urlSurveyId && urlSurveyId !== propSurveyId) {
      setSurveyId(urlSurveyId);
      fetchSurveyDetails(urlSurveyId);
    }
  }, [searchParams, propSurveyId]);

  const fetchSurveyDetails = async (id: string) => {
    try {
      setLoadingSurvey(true);
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
      
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const apiBaseUrl = isLocalhost ? 'http://localhost:5000' : 'https://hostslice.onrender.com';
      
      const response = await fetch(`${apiBaseUrl}/api/surveys/${id}`, {
        headers
      });

      console.log('Survey details response:', response.status);
      
      if (response.ok) {
        const survey = await response.json();
        console.log('Survey data:', survey);
        setQuestions(survey.questions || []);
      } else {
        console.error('Failed to fetch survey details:', response.status);
      }
    } catch (error) {
      console.error('Error fetching survey details:', error);
    } finally {
      setLoadingSurvey(false);
    }
  };

  const tabs = [
    { 
      id: 'templates' as const, 
      label: 'Email Templates', 
      icon: FileText,
      description: 'Create and manage email templates'
    },
    { 
      id: 'triggers' as const, 
      label: 'Email Triggers', 
      icon: Settings,
      description: surveyId ? 'Configure triggers for this survey' : 'Select a survey to configure triggers',
      disabled: !surveyId
    },
    { 
      id: 'logs' as const, 
      label: 'Email Logs', 
      icon: BarChart3,
      description: 'View email sending history and analytics',
      disabled: true // TODO: Implement logs component
    }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'templates':
        return <EmailTemplateManager />;
      case 'triggers':
        return <EmailTriggerManager />;
      case 'logs':
        return (
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Email Logs</h3>
            <p className="text-gray-500">Email logs and analytics coming soon...</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Mail className="w-8 h-8 text-blue-600" />
            Email System
          </h1>
          <p className="text-gray-600 mt-2">
            {surveyId 
              ? `Managing email system for survey: ${surveyId}` 
              : 'Manage email templates and triggers for your surveys'
            }
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="border-b">
            <nav className="flex -mb-px">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const isDisabled = tab.disabled;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => !isDisabled && setActiveTab(tab.id)}
                    disabled={isDisabled}
                    className={`
                      flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm transition-colors
                      ${isActive 
                        ? 'border-blue-500 text-blue-600 bg-blue-50' 
                        : isDisabled
                        ? 'border-transparent text-gray-400 cursor-not-allowed'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
          
          {/* Tab Description */}
          <div className="px-6 py-3 bg-gray-50 border-b">
            <p className="text-sm text-gray-600">
              {tabs.find(tab => tab.id === activeTab)?.description}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          {renderContent()}
        </div>

        {/* Quick Actions */}
        {!surveyId && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-blue-900 font-medium mb-2">Quick Tip</h3>
            <p className="text-blue-700 text-sm">
              To configure email triggers for a specific survey, go to the survey builder and open the Email Triggers section.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailDashboard;
