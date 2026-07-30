/**
 * ModeSelector - Switch between flow modes
 */

import React from 'react';
import { Zap, ArrowLeftRight, Settings2 } from 'lucide-react';
import './PanelStyles.css';

type FlowMode = 'standard' | 'mid_redirect' | 'custom';

interface Props {
  mode: FlowMode;
  onModeChange: (mode: FlowMode) => void;
  disabled?: boolean;
}

const ModeSelector: React.FC<Props> = ({ mode, onModeChange, disabled }) => {
  const modes: { value: FlowMode; label: string; icon: React.ReactNode; desc: string }[] = [
    { 
      value: 'standard', 
      label: 'Standard', 
      icon: <Zap size={14} />,
      desc: 'AI-powered branching based on answers'
    },
    { 
      value: 'mid_redirect', 
      label: 'Mid-Redirect', 
      icon: <ArrowLeftRight size={14} />,
      desc: 'Redirect users mid-survey and resume'
    },
    { 
      value: 'custom', 
      label: 'Custom', 
      icon: <Settings2 size={14} />,
      desc: 'Full control over flow paths'
    },
  ];

  return (
    <div className="mode-selector">
      {modes.map((m) => (
        <button
          key={m.value}
          className={`mode-btn ${mode === m.value ? 'active' : ''}`}
          onClick={() => onModeChange(m.value)}
          disabled={disabled}
          title={m.desc}
        >
          {m.icon}
          <span>{m.label}</span>
        </button>
      ))}
    </div>
  );
};

export default ModeSelector;
