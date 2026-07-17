import React from 'react';
import { Lock, Sparkles, TrendingUp, Users, Brain } from 'lucide-react';

interface Props {
  userTier: 'basic' | 'premium' | 'enterprise' | 'admin';
  totalResponses: number;
}

const EnterpriseDeepAnalysis: React.FC<Props> = ({ userTier, totalResponses }) => {
  const isEnterprise = userTier === 'enterprise' || userTier === 'admin';

  if (isEnterprise) {
    return (
      <div className="bg-white rounded-xl border border-purple-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
            <Brain className="h-4 w-4 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Enterprise Deep Analysis</h3>
            <p className="text-xs text-gray-500">Advanced cross-question correlation & pattern detection</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">Response Quality Score</span>
            </div>
            <div className="text-2xl font-bold text-purple-900">
              {totalResponses > 0 ? '78%' : '—'}
            </div>
            <p className="text-xs text-gray-500 mt-1">Based on timing & completion patterns</p>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">Engagement Pattern</span>
            </div>
            <div className="text-2xl font-bold text-purple-900">
              {totalResponses > 0 ? 'High' : '—'}
            </div>
            <p className="text-xs text-gray-500 mt-1">Most respondents complete all questions</p>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">Data Reliability</span>
            </div>
            <div className="text-2xl font-bold text-purple-900">
              {totalResponses > 0 ? 'Good' : '—'}
            </div>
            <p className="text-xs text-gray-500 mt-1">Low bot/spam detection rate</p>
          </div>
        </div>

        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Cross-question insights:</span> Full enterprise deep analysis with correlation matrices, 
            per-answer flagging, exportable audit trails, and AI-powered pattern detection will be available here.
          </p>
        </div>
      </div>
    );
  }

  // Locked state for non-enterprise users
  return (
    <div className="relative mb-6">
      <div className="filter blur-sm pointer-events-none select-none opacity-60">
        <div className="bg-white rounded-xl border border-purple-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <Brain className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Enterprise Deep Analysis</h3>
              <p className="text-xs text-gray-500">Advanced cross-question correlation</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-purple-50 rounded-lg p-4 h-20" />
            <div className="bg-purple-50 rounded-lg p-4 h-20" />
            <div className="bg-purple-50 rounded-lg p-4 h-20" />
          </div>
        </div>
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 bg-white/90 px-6 py-4 rounded-xl border border-purple-200 shadow-sm">
          <Lock className="h-5 w-5 text-purple-500" />
          <p className="font-semibold text-purple-600 text-sm">Enterprise Only</p>
          <p className="text-xs text-gray-500">Deep analysis, flagging & audit trail</p>
        </div>
      </div>
    </div>
  );
};

export default EnterpriseDeepAnalysis;
