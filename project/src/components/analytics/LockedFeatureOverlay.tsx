import React from 'react';
import { Lock } from 'lucide-react';

interface Props {
  requiredTier: 'premium' | 'enterprise';
  children: React.ReactNode;
  blurAmount?: string;
}

const LockedFeatureOverlay: React.FC<Props> = ({ requiredTier, children, blurAmount = '4px' }) => {
  const tierLabel = requiredTier === 'premium' ? 'Premium' : 'Enterprise';
  const tierColor = requiredTier === 'premium' ? 'text-red-600' : 'text-purple-600';
  const tierBgColor = requiredTier === 'premium' ? 'bg-red-50 border-red-200' : 'bg-purple-50 border-purple-200';

  return (
    <div className="relative">
      {/* Blurred content preview */}
      <div style={{ filter: `blur(${blurAmount})` }} className="pointer-events-none select-none">
        {children}
      </div>

      {/* Lock overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-xl">
        <div className={`flex flex-col items-center gap-3 px-6 py-4 rounded-xl border ${tierBgColor}`}>
          <Lock className={`h-6 w-6 ${tierColor}`} />
          <div className="text-center">
            <p className={`font-semibold ${tierColor}`}>
              Switch to {tierLabel}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Upgrade to see these metrics
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LockedFeatureOverlay;
