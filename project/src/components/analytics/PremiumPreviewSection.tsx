import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ChevronRight } from 'lucide-react';

interface Props {
  tier: 'premium' | 'enterprise';
  onUpgrade: () => void;
}

const PremiumPreviewSection: React.FC<Props> = ({ tier, onUpgrade }) => {
  const navigate = useNavigate();

  if (tier === 'premium') {
    return (
      <div
        onClick={() => navigate('/pricing?theme=light')}
        className="mb-6 flex items-center justify-between px-5 py-4 rounded-xl border border-red-200 bg-red-50/50 hover:bg-red-50 cursor-pointer transition-colors"
      >
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-red-400" />
          <span className="text-sm font-semibold text-red-700">Premium</span>
        </div>
        <ChevronRight className="h-4 w-4 text-red-400" />
      </div>
    );
  }

  return (
    <div
      onClick={() => navigate('/pricing?theme=light')}
      className="mb-6 flex items-center justify-between px-5 py-4 rounded-xl border border-purple-200 bg-purple-50/50 hover:bg-purple-50 cursor-pointer transition-colors"
    >
      <div className="flex items-center gap-2">
        <Lock className="h-4 w-4 text-purple-400" />
        <span className="text-sm font-semibold text-purple-700">Enterprise</span>
      </div>
      <ChevronRight className="h-4 w-4 text-purple-400" />
    </div>
  );
};

export default PremiumPreviewSection;
