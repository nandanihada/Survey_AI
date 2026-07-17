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
                {/* Only show extra columns for premium+ */}
                {isPremium && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                )}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                {isPremium && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                )}
                {isPremium && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Device</th>
                )}
                {isEnterprise && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {questionResponses.map((resp, i) => (
                <tr key={resp.response_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{resp.name || 'Anonymous'}</td>
                  <td className="px-4 py-3 text-gray-700">{resp.answer}</td>
                  
                  {isPremium && (
                    <td className="px-4 py-3">
                      <span className={`font-medium ${resp.status === 'Rushed' ? 'text-red-500' : 'text-green-600'}`}>
                        {resp.time !== null ? `${resp.time.toFixed(1)}s` : '—'}
                      </span>
                    </td>
                  )}
                  
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      resp.status === 'Rushed' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {resp.status}
                    </span>
                  </td>
                  
                  {isPremium && (
                    <td className="px-4 py-3 text-gray-600">{resp.location || '—'}</td>
                  )}
                  
                  {isPremium && (
                    <td className="px-4 py-3 text-gray-600">{resp.device}</td>
                  )}
                  
                  {isEnterprise && (
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{resp.ip_address || '—'}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default IndividualResponsesTable;
