import React, { useState } from 'react';
import { Lock, ChevronDown, ChevronUp } from 'lucide-react';

interface PerQuestionResponse {
  question_id: string;
  answer: string;
  time: number | null;
  status: string;
}

interface IndividualResponse {
  response_id: string;
  name: string;
  email: string;
  submitted_at: string;
  ip_address: string;
  user_agent: string;
  device: string;
  location: string;
  total_time: number | null;
  avg_time_per_question: number | null;
  overall_status: string;
  per_question: PerQuestionResponse[];
}

interface Props {
  responses: IndividualResponse[];
  userTier: 'basic' | 'premium' | 'enterprise' | 'admin';
  questionIndex: number;
  loading: boolean;
}

const IndividualResponsesTable: React.FC<Props> = ({ responses, userTier, questionIndex, loading }) => {
  const [isOpen, setIsOpen] = useState(false);

  const isPremium = userTier === 'premium' || userTier === 'enterprise' || userTier === 'admin';
  const isEnterprise = userTier === 'enterprise' || userTier === 'admin';

  if (loading) return null;

  // Get answers for the specific question
  const questionResponses = responses.map(r => ({
    ...r,
    answer: r.per_question[questionIndex]?.answer || '',
    time: r.per_question[questionIndex]?.time || null,
    status: r.per_question[questionIndex]?.status || 'OK'
  }));

  return (
    <div className="mt-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
      >
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        {isOpen ? 'Hide' : 'Show'} Individual Responses ({responses.length})
      </button>

      {isOpen && (
        <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Answer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {isPremium ? 'Time' : (
                    <span className="flex items-center gap-1">
                      Time <Lock className="h-3 w-3 text-gray-400" />
                    </span>
                  )}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {isPremium ? 'Location' : (
                    <span className="flex items-center gap-1">
                      Location <Lock className="h-3 w-3 text-gray-400" />
                    </span>
                  )}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {isPremium ? 'Device' : (
                    <span className="flex items-center gap-1">
                      Device <Lock className="h-3 w-3 text-gray-400" />
                    </span>
                  )}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {isEnterprise ? 'IP' : (
                    <span className="flex items-center gap-1">
                      IP <Lock className="h-3 w-3 text-gray-400" />
                    </span>
                  )}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {questionResponses.map((resp, i) => (
                <tr key={resp.response_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{resp.name || 'Anonymous'}</td>
                  <td className="px-4 py-3 text-gray-700">{resp.answer}</td>
                  
                  {/* Time - locked for free */}
                  <td className="px-4 py-3">
                    {isPremium ? (
                      <span className={`font-medium ${resp.status === 'Rushed' ? 'text-red-500' : 'text-green-600'}`}>
                        {resp.time !== null ? `${resp.time.toFixed(1)}s` : '—'}
                      </span>
                    ) : (
                      <span className="text-gray-300 select-none">•••</span>
                    )}
                  </td>
                  
                  {/* Status */}
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      resp.status === 'Rushed' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {resp.status}
                    </span>
                  </td>
                  
                  {/* Location - locked for free */}
                  <td className="px-4 py-3">
                    {isPremium ? (
                      <span className="text-gray-600">{resp.location || '—'}</span>
                    ) : (
                      <span className="text-gray-300 select-none">•••</span>
                    )}
                  </td>
                  
                  {/* Device - locked for free */}
                  <td className="px-4 py-3">
                    {isPremium ? (
                      <span className="text-gray-600">{resp.device}</span>
                    ) : (
                      <span className="text-gray-300 select-none">•••</span>
                    )}
                  </td>
                  
                  {/* IP - locked for free & premium */}
                  <td className="px-4 py-3">
                    {isEnterprise ? (
                      <span className="text-gray-600 font-mono text-xs">{resp.ip_address || '—'}</span>
                    ) : (
                      <span className="text-gray-300 select-none">•••</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Upgrade hint for locked columns */}
          {!isPremium && (
            <div className="bg-red-50 border-t border-red-200 px-4 py-3 flex items-center gap-2">
              <Lock className="h-4 w-4 text-red-500" />
              <p className="text-sm text-red-700">
                Upgrade to <span className="font-semibold">Premium</span> to unlock Time, Location & Device columns.
              </p>
            </div>
          )}
          {isPremium && !isEnterprise && (
            <div className="bg-purple-50 border-t border-purple-200 px-4 py-3 flex items-center gap-2">
              <Lock className="h-4 w-4 text-purple-500" />
              <p className="text-sm text-purple-700">
                Upgrade to <span className="font-semibold">Enterprise</span> to unlock IP address column.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default IndividualResponsesTable;
