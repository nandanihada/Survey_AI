import React from 'react';
import { Lock, Sparkles, TrendingUp, Zap, Brain, Shield } from 'lucide-react';

interface Props {
  tier: 'premium' | 'enterprise';
  onUpgrade: () => void;
}

const PremiumPreviewSection: React.FC<Props> = ({ tier, onUpgrade }) => {
  if (tier === 'premium') {
    return <PremiumPreview onUpgrade={onUpgrade} />;
  }
  return <EnterprisePreview onUpgrade={onUpgrade} />;
};

const PremiumPreview: React.FC<{ onUpgrade: () => void }> = ({ onUpgrade }) => (
  <div className="relative mb-10">
    {/* Section header */}
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
        <Zap className="h-4 w-4 text-red-500" />
      </div>
      <div>
        <h3 className="font-semibold text-gray-900">Premium Analytics</h3>
        <p className="text-xs text-gray-500">Time tracking, rush detection & AI insights per response</p>
      </div>
    </div>

    {/* Blurred preview content with demo data */}
    <div className="relative rounded-2xl overflow-hidden border border-red-200">
      <div className="opacity-75 pointer-events-none select-none p-6 bg-white">
        {/* Demo time stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">4.4s</div>
            <div className="text-xs text-gray-500">Avg Time</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">4.0s</div>
            <div className="text-xs text-gray-500">Median</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-700">19</div>
            <div className="text-xs text-gray-500">Careful</div>
          </div>
          <div className="bg-red-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-600">15</div>
            <div className="text-xs text-gray-500">Rushed</div>
          </div>
        </div>

        {/* Demo time distribution chart */}
        <div className="mb-6">
          <p className="text-xs text-gray-500 font-medium mb-2">Time Distribution · Min 0.9s — Max 10.1s</p>
          <div className="flex items-end gap-0.5 h-12">
            {[2.1, 1.4, 1.8, 0.9, 1.2, 4.5, 5.2, 6.1, 4.8, 7.2, 8.1, 5.9, 9.2, 6.4, 10.1, 3.8, 4.2, 7.8, 6.5, 8.4].map((t, i) => (
              <div
                key={i}
                className={`flex-1 rounded-t-sm ${t < 3 ? 'bg-red-400' : 'bg-green-400'}`}
                style={{ height: `${(t / 10.1) * 100}%`, minHeight: '4px' }}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>0s</span>
            <span>← rushed | careful →</span>
            <span>10s</span>
          </div>
        </div>

        {/* Demo careful vs rushed breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-xs font-bold text-green-700 uppercase mb-2">Careful Answers (19)</p>
            <div className="space-y-1">
              <div className="flex justify-between text-sm"><span>Romance</span><span className="font-medium">28%</span></div>
              <div className="flex justify-between text-sm"><span>Drama</span><span className="font-medium">22%</span></div>
              <div className="flex justify-between text-sm"><span>Action</span><span className="font-medium">18%</span></div>
              <div className="flex justify-between text-sm"><span>Musical</span><span className="font-medium">16%</span></div>
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-xs font-bold text-red-600 uppercase mb-2">Rushed Answers (15)</p>
            <div className="space-y-1">
              <div className="flex justify-between text-sm"><span>Action</span><span className="font-medium">35%</span></div>
              <div className="flex justify-between text-sm"><span>Comedy</span><span className="font-medium">30%</span></div>
              <div className="flex justify-between text-sm"><span>Drama</span><span className="font-medium">20%</span></div>
              <div className="flex justify-between text-sm"><span>Thriller</span><span className="font-medium">15%</span></div>
            </div>
          </div>
        </div>

        {/* Demo AI insights */}
        <div className="space-y-3">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-xs font-bold text-green-700 uppercase mb-1">AI Insight — Careful Respondents</p>
            <p className="text-sm text-gray-700">Among careful respondents, Romance and Drama dominate — suggesting genuine emotional connection drives preference.</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-xs font-bold text-red-600 uppercase mb-1">AI Insight — Rushed Respondents</p>
            <p className="text-sm text-gray-700">Rushed respondents heavily skew toward Action and Comedy — likely defaulting to familiar, top-of-mind options.</p>
          </div>
        </div>
      </div>

      {/* Upgrade overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-white/40 via-white/70 to-white/90">
        <div className="text-center px-6 py-8 max-w-md">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <Lock className="h-6 w-6 text-red-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Unlock Premium Analytics</h3>
          <p className="text-sm text-gray-600 mb-5">
            See exactly how long respondents spend on each question. Detect rushed vs. careful answers. Get AI insights that separate quality data from noise.
          </p>
          <ul className="text-left text-sm text-gray-700 space-y-2 mb-6 max-w-xs mx-auto">
            <li className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-red-500 flex-shrink-0" />
              Millisecond-precision time tracking
            </li>
            <li className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-red-500 flex-shrink-0" />
              Rushed vs. careful response breakdown
            </li>
            <li className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-red-500 flex-shrink-0" />
              Dual AI insights (careful + rushed)
            </li>
          </ul>
          <button
            onClick={onUpgrade}
            className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-red-200"
          >
            Upgrade to Premium →
          </button>
        </div>
      </div>
    </div>
  </div>
);

const EnterprisePreview: React.FC<{ onUpgrade: () => void }> = ({ onUpgrade }) => (
  <div className="relative mb-10">
    {/* Section header */}
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
        <Shield className="h-4 w-4 text-purple-600" />
      </div>
      <div>
        <h3 className="font-semibold text-gray-900">Enterprise Deep Analysis</h3>
        <p className="text-xs text-gray-500">Cross-question correlation, flagging, full audit trail & IP tracking</p>
      </div>
    </div>

    {/* Blurred preview with demo data */}
    <div className="relative rounded-2xl overflow-hidden border border-purple-200">
      <div className="opacity-75 pointer-events-none select-none p-6 bg-white">
        {/* Demo enterprise cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">Response Quality</span>
            </div>
            <div className="text-2xl font-bold text-purple-900">78%</div>
            <p className="text-xs text-gray-500 mt-1">Based on timing patterns</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">Bot Detection</span>
            </div>
            <div className="text-2xl font-bold text-purple-900">2 flagged</div>
            <p className="text-xs text-gray-500 mt-1">Suspicious response patterns</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">Cross-Q Correlation</span>
            </div>
            <div className="text-2xl font-bold text-purple-900">Strong</div>
            <p className="text-xs text-gray-500 mt-1">Q1↔Q3 answer correlation</p>
          </div>
        </div>

        {/* Demo individual response table with all columns */}
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">#</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Name</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Answer</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Time</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Location</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Device</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">IP</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Flag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                { name: 'Arjun M.', answer: 'Action', time: '1.1s', status: 'Rushed', location: 'Mumbai', device: 'Mobile', ip: '103.21.x.x' },
                { name: 'Priya S.', answer: 'Thriller', time: '1.6s', status: 'Rushed', location: 'Delhi', device: 'Desktop', ip: '49.36.x.x' },
                { name: 'Sneha D.', answer: 'Romance', time: '4.0s', status: 'OK', location: 'Bangalore', device: 'Mobile', ip: '106.51.x.x' },
                { name: 'Vikram R.', answer: 'Thriller', time: '9.9s', status: 'OK', location: 'Chennai', device: 'Desktop', ip: '59.92.x.x' },
                { name: 'Ananya P.', answer: 'Comedy', time: '7.0s', status: 'OK', location: 'Pune', device: 'Tablet', ip: '117.96.x.x' },
              ].map((row, i) => (
                <tr key={i}>
                  <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                  <td className="px-3 py-2 font-medium">{row.name}</td>
                  <td className="px-3 py-2">{row.answer}</td>
                  <td className={`px-3 py-2 font-medium ${row.status === 'Rushed' ? 'text-red-500' : 'text-green-600'}`}>{row.time}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${row.status === 'Rushed' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{row.status}</span>
                  </td>
                  <td className="px-3 py-2 text-gray-600">{row.location}</td>
                  <td className="px-3 py-2 text-gray-600">{row.device}</td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-500">{row.ip}</td>
                  <td className="px-3 py-2"><button className="text-xs text-gray-400 border border-gray-200 px-2 py-0.5 rounded">Flag</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upgrade overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-white/40 via-white/70 to-white/90">
        <div className="text-center px-6 py-8 max-w-md">
          <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
            <Lock className="h-6 w-6 text-purple-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Enterprise Deep Analysis</h3>
          <p className="text-sm text-gray-600 mb-5">
            Full respondent-level tracking with IP addresses, device fingerprinting, bot detection, and cross-question pattern analysis.
          </p>
          <ul className="text-left text-sm text-gray-700 space-y-2 mb-6 max-w-xs mx-auto">
            <li className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-purple-600 flex-shrink-0" />
              Full IP & device tracking
            </li>
            <li className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-600 flex-shrink-0" />
              Cross-question correlation AI
            </li>
            <li className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600 flex-shrink-0" />
              Bot detection & per-answer flagging
            </li>
          </ul>
          <button
            onClick={onUpgrade}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-purple-200"
          >
            Contact Sales — Enterprise →
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default PremiumPreviewSection;
