import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Sparkles, TrendingUp, Brain, Users, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react';
import { Pie, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
} from 'chart.js';
import { getApiBaseUrl } from '../../utils/deploymentFix';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

interface AnswerItem {
  answer: string;
  count: number;
  percentage: number;
}

interface TimingStats {
  avg_time: number;
  median_time: number;
  min_time: number;
  max_time: number;
  careful_count: number;
  rushed_count: number;
  timings: number[];
}

interface QuestionData {
  question_id: string;
  question_text: string;
  question_type: string;
  options: string[];
  total_responses: number;
  answer_distribution: AnswerItem[];
  timing_stats: TimingStats;
  careful_answers: Record<string, number>;
  rushed_answers: Record<string, number>;
}

interface Props {
  question: QuestionData;
  index: number;
  userTier: 'basic' | 'premium' | 'enterprise' | 'admin';
  surveyId: string;
}

const CHART_COLORS = [
  '#6366f1', '#06b6d4', '#10b981', '#f59e0b',
  '#ec4899', '#8b5cf6', '#14b8a6', '#f43f5e'
];

// Different color palettes per question for variety
const COLOR_PALETTES = [
  ['#6366f1', '#a78bfa', '#c4b5fd', '#818cf8', '#4f46e5', '#7c3aed', '#5b21b6', '#ddd6fe'], // Purple/Indigo
  ['#06b6d4', '#22d3ee', '#67e8f9', '#0ea5e9', '#0284c7', '#38bdf8', '#7dd3fc', '#bae6fd'], // Cyan/Blue
  ['#10b981', '#34d399', '#6ee7b7', '#059669', '#047857', '#a7f3d0', '#14b8a6', '#2dd4bf'], // Green/Teal
  ['#f59e0b', '#fbbf24', '#fcd34d', '#d97706', '#b45309', '#fde68a', '#f97316', '#fb923c'], // Amber/Orange
  ['#ec4899', '#f472b6', '#f9a8d4', '#db2777', '#be185d', '#fbcfe8', '#e879f9', '#d946ef'], // Pink/Fuchsia
  ['#3b82f6', '#60a5fa', '#93c5fd', '#2563eb', '#1d4ed8', '#bfdbfe', '#6366f1', '#818cf8'], // Blue/Indigo
];

const QuestionBreakdownCard: React.FC<Props> = ({ question, index, userTier, surveyId }) => {
  const navigate = useNavigate();
  const [aiSummary, setAiSummary] = useState<string>('');
  const [carefulInsight, setCarefulInsight] = useState<string>('');
  const [rushedInsight, setRushedInsight] = useState<string>('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [premiumOpen, setPremiumOpen] = useState(false);

  const baseUrl = getApiBaseUrl();
  const isPremium = userTier === 'premium' || userTier === 'enterprise' || userTier === 'admin';
  const isFirstQuestion = index === 0;
  const showLockedPremiumDropdown = !isPremium;

  useEffect(() => {
    generateAISummary();
  }, [question]);

  const generateAISummary = async () => {
    if (question.answer_distribution.length === 0) return;
    setLoadingSummary(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${baseUrl}/api/analytics/survey/${surveyId}/ai-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          question_text: question.question_text,
          answer_distribution: question.answer_distribution,
          careful_answers: question.careful_answers,
          rushed_answers: question.rushed_answers,
          tier: userTier === 'admin' ? 'enterprise' : userTier
        })
      });
      if (response.ok) {
        const data = await response.json();
        setAiSummary(data.summary || '');
        if (data.careful_insight) setCarefulInsight(data.careful_insight);
        if (data.rushed_insight) setRushedInsight(data.rushed_insight);
      }
    } catch (err) {
      if (question.answer_distribution.length > 0) {
        const top = question.answer_distribution[0];
        setAiSummary(`${top.answer} leads at ${top.percentage}% of responses.`);
      }
    }
    setLoadingSummary(false);
  };

  // Determine if this is a text-type question (no predefined options)
  const isTextQuestion = question.question_type === 'text' || 
    question.question_type === 'short_answer' || 
    question.question_type === 'open_text' ||
    (question.options.length === 0 && question.question_type !== 'range' && question.question_type !== 'rating' && question.question_type !== 'scale' && question.question_type !== 'opinion_scale');
  // 0=pie, 1=doughnut, 2=horizontal bar(chartjs), 3=vertical bar(chartjs), 4=progress bars with badges
  const chartVariants = [0, 4, 1, 2, 4, 3, 0, 4, 1, 2]; // more variety with badge bars
  const chartType = chartVariants[index % chartVariants.length];
  
  // Pick unique color palette per question
  const palette = COLOR_PALETTES[index % COLOR_PALETTES.length];

  const chartData = {
    labels: question.answer_distribution.map(item => item.answer),
    datasets: [{
      data: question.answer_distribution.map(item => item.count),
      backgroundColor: question.answer_distribution.map((_, i) => palette[i % palette.length]),
      borderColor: '#ffffff',
      borderWidth: 2,
      borderRadius: (chartType === 2 || chartType === 3) ? 6 : 0,
    }]
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const item = question.answer_distribution[ctx.dataIndex];
            return item ? `${item.answer}: ${item.percentage}% (${item.count})` : '';
          }
        }
      }
    }
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: true,
    indexAxis: 'y' as const,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const item = question.answer_distribution[ctx.dataIndex];
            return item ? `${item.percentage}% (${item.count} responses)` : '';
          }
        }
      }
    },
    scales: {
      x: { display: false, grid: { display: false } },
      y: {
        grid: { display: false },
        ticks: { font: { size: 11 }, color: '#6b7280' }
      }
    }
  };

  const verticalBarOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const item = question.answer_distribution[ctx.dataIndex];
            return item ? `${item.percentage}% (${item.count} responses)` : '';
          }
        }
      }
    },
    scales: {
      y: { display: false, grid: { display: false } },
      x: {
        grid: { display: false },
        ticks: { font: { size: 10 }, color: '#6b7280', maxRotation: 45 }
      }
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
      {/* Question Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-500 text-white text-sm font-bold">
            Q{index + 1}
          </span>
          <span className="text-xs text-gray-500 font-medium px-2 py-0.5 bg-gray-100 rounded">
            {(question.question_type === 'radio' || question.question_type === 'multiple_choice' || question.question_type === 'yes_no') ? 'Single choice' :
             (question.question_type === 'range' || question.question_type === 'rating' || question.question_type === 'scale' || question.question_type === 'opinion_scale') ? 'Scale' : 'Open text'}
          </span>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-gray-900">{question.total_responses}</span>
          <p className="text-xs text-gray-500 uppercase">Responses</p>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-5">{question.question_text}</h3>

      {/* Chart + Legend OR Text Responses */}
      {question.answer_distribution.length > 0 && (
        isTextQuestion ? (
          /* Text question — show answers as colorful chips */
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              {question.answer_distribution.map((item, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-white"
                  style={{ backgroundColor: palette[i % palette.length] }}
                >
                  {item.answer}
                  {item.count > 1 && (
                    <span className="bg-white/30 text-xs px-1.5 py-0.5 rounded-full">×{item.count}</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        ) : (
          /* Multiple choice / Scale — show chart */
          <div className={`mb-6 ${(chartType === 2 || chartType === 3) ? '' : chartType === 4 ? '' : 'flex flex-col md:flex-row items-center gap-6'}`}>
            {/* Chart */}
            {chartType === 4 ? (
              /* Progress bars with numbered badges */
              <div className="w-full space-y-3">
                {question.answer_distribution.map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: palette[i % palette.length] }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-sm text-gray-700 w-36 truncate flex-shrink-0" title={item.answer}>{item.answer}</span>
                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${item.percentage}%`, backgroundColor: palette[i % palette.length] }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-800 w-12 text-right">{item.percentage}%</span>
                    <span className="text-xs text-gray-400 w-8">({item.count})</span>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className={(chartType === 2 || chartType === 3) ? 'w-full max-w-lg' : 'w-44 h-44 flex-shrink-0'}>
                  {chartType === 0 && <Pie data={chartData} options={pieOptions} />}
                  {chartType === 1 && <Doughnut data={chartData} options={pieOptions} />}
                  {chartType === 2 && <Bar data={chartData} options={barOptions} />}
                  {chartType === 3 && <Bar data={chartData} options={verticalBarOptions} />}
                </div>
                
                {/* Legend (for pie/doughnut only) */}
                {(chartType === 0 || chartType === 1) && (
                  <div className="flex-1 space-y-2 mt-4 md:mt-0">
                    {question.answer_distribution.map((item, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: palette[i % palette.length] }}
                        />
                        <span className="text-sm text-gray-700 flex-1 truncate" title={item.answer}>{item.answer}</span>
                        <span className="text-sm font-semibold text-gray-900">{item.percentage}%</span>
                        <span className="text-xs text-gray-400">({item.count})</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )
      )}

      {/* AI Summary */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
        <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">AI Summary</p>
        {loadingSummary ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="animate-spin h-3 w-3 border-2 border-green-500 border-t-transparent rounded-full" />
            Generating insight...
          </div>
        ) : (
          <p className="text-sm text-gray-700 leading-relaxed">{aiSummary || 'No data available for analysis.'}</p>
        )}
      </div>

      {/* ═══════ PREMIUM SECTION ═══════ */}
      {showLockedPremiumDropdown && (
        <div className="mt-4">
          {/* Direct redirect to pricing — no dropdown */}
          <button
            onClick={() => navigate('/pricing?theme=light')}
            className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-red-200 bg-red-50/50 hover:bg-red-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-red-400" />
              <span className="text-sm font-medium text-red-700">Premium</span>
            </div>
            <ChevronRight className="h-4 w-4 text-red-400" />
          </button>
        </div>
      )}

      {/* ═══════ ACTUAL Premium Content (for premium+ users) ═══════ */}
      {isPremium && question.timing_stats && (
        <div className="mt-6 pt-4 border-t border-gray-100">
          {/* Time stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-gray-900">{question.timing_stats.avg_time}s</div>
              <div className="text-xs text-gray-500">Avg Time</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-gray-900">{question.timing_stats.median_time}s</div>
              <div className="text-xs text-gray-500">Median</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-green-700">{question.timing_stats.careful_count}</div>
              <div className="text-xs text-gray-500">Careful</div>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-red-600">{question.timing_stats.rushed_count}</div>
              <div className="text-xs text-gray-500">Rushed</div>
            </div>
          </div>

          {/* Time Distribution Chart */}
          {question.timing_stats.timings.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-500 font-medium mb-2">
                Time Distribution · Min {question.timing_stats.min_time}s — Max {question.timing_stats.max_time}s
              </p>
              <div className="flex items-end gap-0.5 h-10">
                {[...question.timing_stats.timings]
                  .sort((a, b) => a - b)
                  .map((t, i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-t-sm ${t < 3 ? 'bg-red-400' : 'bg-green-400'}`}
                      style={{ height: `${Math.min((t / Math.max(...question.timing_stats.timings)) * 100, 100)}%`, minHeight: '4px' }}
                    />
                  ))
                }
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>0s</span>
                <span className="text-gray-500">← rushed | careful →</span>
                <span>{question.timing_stats.max_time}s</span>
              </div>
            </div>
          )}

          {/* Careful vs Rushed Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-xs font-bold text-green-700 uppercase mb-2">
                Careful Answers ({question.timing_stats.careful_count})
              </p>
              {Object.entries(question.careful_answers).slice(0, 4).map(([ans, count]) => (
                <div key={ans} className="flex justify-between text-sm py-1">
                  <span className="text-gray-700">{ans}</span>
                  <span className="font-medium text-gray-900">
                    {question.timing_stats.careful_count > 0
                      ? Math.round((count / question.timing_stats.careful_count) * 100) : 0}%
                  </span>
                </div>
              ))}
              {Object.keys(question.careful_answers).length === 0 && (
                <p className="text-xs text-gray-400">No data yet</p>
              )}
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-xs font-bold text-red-600 uppercase mb-2">
                Rushed Answers ({question.timing_stats.rushed_count})
              </p>
              {Object.entries(question.rushed_answers).slice(0, 4).map(([ans, count]) => (
                <div key={ans} className="flex justify-between text-sm py-1">
                  <span className="text-gray-700">{ans}</span>
                  <span className="font-medium text-gray-900">
                    {question.timing_stats.rushed_count > 0
                      ? Math.round((count / question.timing_stats.rushed_count) * 100) : 0}%
                  </span>
                </div>
              ))}
              {Object.keys(question.rushed_answers).length === 0 && (
                <p className="text-xs text-gray-400">No data yet</p>
              )}
            </div>
          </div>

          {/* AI Insights */}
          {carefulInsight && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-3">
              <p className="text-xs font-bold text-green-700 uppercase mb-1">AI Insight — Careful Respondents</p>
              <p className="text-sm text-gray-700">{carefulInsight}</p>
            </div>
          )}
          {rushedInsight && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-xs font-bold text-red-600 uppercase mb-1">AI Insight — Rushed Respondents</p>
              <p className="text-sm text-gray-700">{rushedInsight}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QuestionBreakdownCard;
