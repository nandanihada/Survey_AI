import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface Stats {
  total_responses: number;
  avg_completion_time: number;
  careful_count: number;
  rushed_count: number;
  rush_rate: number;
}

interface Props {
  title: string;
  description?: string;
  stats: Stats;
  onBack: () => void;
}

const AnalyticsHeroHeader: React.FC<Props> = ({ title, description, stats, onBack }) => {
  return (
    <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-red-950 rounded-2xl p-6 md:p-8 mb-8 text-white">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to surveys
      </button>

      {/* Title */}
      <p className="text-red-400 text-xs font-semibold uppercase tracking-widest mb-2">Survey Analytics</p>
      <h1 className="text-2xl md:text-3xl font-bold mb-1">{title}</h1>
      {description && (
        <p className="text-gray-400 text-sm mt-1">
          {description} · {stats.total_responses} responses · Rush detection · AI insights
        </p>
      )}

      {/* 5 Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-6">
        <StatCard value={stats.total_responses.toString()} label="Total Responses" />
        <StatCard value={`${stats.avg_completion_time}s`} label="Avg Completion" />
        <StatCard value={stats.careful_count.toString()} label="Careful" />
      </div>
    </div>
  );
};

const StatCard: React.FC<{ value: string; label: string; highlight?: boolean }> = ({ value, label, highlight }) => (
  <div className={`rounded-xl px-4 py-3 ${highlight ? 'bg-red-600/30 border border-red-500/40' : 'bg-white/10 border border-white/10'}`}>
    <div className="text-2xl font-bold">{value}</div>
    <div className="text-xs text-gray-300 uppercase tracking-wide mt-0.5">{label}</div>
  </div>
);

export default AnalyticsHeroHeader;
