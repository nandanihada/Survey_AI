import React from 'react';
import { BarChart3, Clock, Users, ChevronRight, TrendingUp, PieChart } from 'lucide-react';

interface SurveyCard {
  id: string;
  title: string;
  status: string;
  created_at: string;
  total_responses: number;
  total_questions: number;
  description: string;
}

interface Props {
  surveys: SurveyCard[];
  onSelectSurvey: (surveyId: string) => void;
  loading: boolean;
}

const SurveyListView: React.FC<Props> = ({ surveys, onSelectSurvey, loading }) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-gray-200 border-t-red-500"></div>
        <p className="text-sm text-gray-500">Loading your surveys...</p>
      </div>
    );
  }

  if (surveys.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
          <PieChart className="h-8 w-8 text-red-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">No surveys yet</h3>
        <p className="text-gray-500 text-sm max-w-sm mx-auto">Create your first survey to start collecting responses and see analytics here.</p>
      </div>
    );
  }

  // Separate surveys with responses from those without
  const withResponses = surveys.filter(s => s.total_responses > 0);
  const withoutResponses = surveys.filter(s => s.total_responses === 0);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-red-500 flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Survey Analytics</h1>
          </div>
        </div>
        <p className="text-sm text-gray-500 ml-12">Click on a survey to view detailed response analytics and insights.</p>
      </div>

      {/* Surveys with responses */}
      {withResponses.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 ml-1">
            Surveys with responses ({withResponses.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {withResponses.map(survey => (
              <SurveyCardItem key={survey.id} survey={survey} />
            ))}
          </div>
        </div>
      )}

      {/* Surveys without responses */}
      {withoutResponses.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 ml-1">
            {withResponses.length > 0 ? 'Awaiting responses' : 'Your surveys'} ({withoutResponses.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {withoutResponses.map(survey => (
              <SurveyCardItem key={survey.id} survey={survey} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const SurveyCardItem: React.FC<{ survey: SurveyCard }> = ({ survey }) => {
  const hasResponses = survey.total_responses > 0;

  return (
    <div
      onClick={() => window.open(`/analytics/${survey.id}`, '_blank')}
      className={`group relative bg-white rounded-xl border p-5 transition-all cursor-pointer hover:shadow-md ${
        hasResponses 
          ? 'border-gray-200 hover:border-red-300' 
          : 'border-gray-100 hover:border-gray-300'
      }`}
    >
      {/* Top row: status + arrow */}
      <div className="flex items-center justify-between mb-3">
        <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded ${
          survey.status === 'active' || !survey.status
            ? 'bg-green-50 text-green-600' 
            : survey.status === 'draft' 
            ? 'bg-amber-50 text-amber-600' 
            : 'bg-gray-50 text-gray-500'
        }`}>
          {survey.status || 'active'}
        </span>
        <div className="w-7 h-7 rounded-full bg-gray-50 group-hover:bg-red-50 flex items-center justify-center transition-colors">
          <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-red-500 transition-colors" />
        </div>
      </div>

      {/* Title */}
      <h3 className="text-[15px] font-semibold text-gray-900 leading-snug mb-4 line-clamp-2 group-hover:text-red-600 transition-colors min-h-[40px]">
        {survey.title}
      </h3>

      {/* Stats */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-gray-400" />
          <span className={`text-sm font-semibold ${hasResponses ? 'text-red-600' : 'text-gray-400'}`}>
            {survey.total_responses}
          </span>
          <span className="text-xs text-gray-400">responses</span>
        </div>
        <div className="flex items-center gap-1.5">
          <BarChart3 className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-sm font-semibold text-gray-600">{survey.total_questions}</span>
          <span className="text-xs text-gray-400">questions</span>
        </div>
      </div>

      {/* Date */}
      <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-gray-50">
        <Clock className="h-3 w-3 text-gray-300" />
        <span className="text-[11px] text-gray-400">
          Created {survey.created_at ? formatDate(survey.created_at) : 'N/A'}
        </span>
      </div>

      {/* Response indicator bar */}
      {hasResponses && (
        <div className="absolute bottom-0 left-4 right-4 h-[3px] rounded-full bg-gradient-to-r from-red-400 to-orange-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </div>
  );
};

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default SurveyListView;
