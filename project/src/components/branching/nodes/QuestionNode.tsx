/**
 * QuestionNode - Represents a survey question in the decision tree
 * Color-coded by depth level, clearly shows if it's a branch point
 */

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { HelpCircle, ListChecks, ToggleLeft, Star, Hash, GitBranch, ExternalLink, RotateCcw } from 'lucide-react';
import './NodeStyles.css';

const getQuestionIcon = (type: string) => {
  switch (type) {
    case 'multiple_choice':
    case 'checkbox':
      return <ListChecks size={13} />;
    case 'yes_no':
      return <ToggleLeft size={13} />;
    case 'rating':
      return <Star size={13} />;
    case 'range':
    case 'scale':
      return <Hash size={13} />;
    default:
      return <HelpCircle size={13} />;
  }
};

// Depth-level colors matching the decision tree image style
const DEPTH_COLORS = [
  { bg: '#6366f1', light: '#eef2ff', border: '#6366f1' }, // root: indigo
  { bg: '#3b82f6', light: '#eff6ff', border: '#3b82f6' }, // level 1: blue
  { bg: '#10b981', light: '#ecfdf5', border: '#10b981' }, // level 2: green
  { bg: '#f59e0b', light: '#fffbeb', border: '#f59e0b' }, // level 3: amber
  { bg: '#8b5cf6', light: '#f5f3ff', border: '#8b5cf6' }, // level 4: purple
  { bg: '#ec4899', light: '#fdf2f8', border: '#ec4899' }, // level 5: pink
];

const QuestionNode: React.FC<NodeProps> = ({ data, selected }) => {
  const hasCondition = data.show_if != null;
  const hasConditionals = data.hasConditionals === true;
  const depth = (data.depth as number) || 0;
  const colors = DEPTH_COLORS[depth % DEPTH_COLORS.length];
  
  return (
    <div 
      className={`flow-node question-node ${selected ? 'selected' : ''} ${hasCondition ? 'conditional' : ''}`}
      style={{
        borderColor: selected ? '#6366f1' : colors.border,
        borderLeftColor: colors.bg,
        background: selected ? '#f0f0ff' : colors.light,
      }}
    >
      <Handle type="target" position={Position.Top} className="handle-target"
        style={{ background: colors.bg, borderColor: colors.bg }} />
      
      {/* Header bar with depth color */}
      <div className="node-header" style={{ background: colors.bg }}>
        <span className="node-icon">{getQuestionIcon(data.questionType as string)}</span>
        {hasConditionals && <GitBranch size={11} style={{ opacity: 0.9 }} />}
        <span style={{ marginLeft: 'auto', fontSize: '10px', opacity: 0.85 }}>
          Q{(data.questionIndex as number ?? 0) + 1}
        </span>
      </div>
      
      <div className="node-content">
        <p className="node-label" style={{ fontSize: '12px', lineHeight: '1.35' }}>
          {data.label as string}
        </p>
        
        {/* Show answer options as small chips */}
        {(data.options as string[]) && (data.options as string[]).length > 0 && (
          <div className="node-options">
            {(data.options as string[]).slice(0, 4).map((opt, i) => (
              <span 
                key={i} 
                className="option-chip"
                style={{ background: colors.bg + '22', color: colors.bg }}
              >
                {opt}
              </span>
            ))}
            {(data.options as string[]).length > 4 && (
              <span className="option-more">+{(data.options as string[]).length - 4}</span>
            )}
          </div>
        )}
      </div>
      
      {/* Show condition pill */}
      {hasCondition && (
        <div className="node-condition-badge" style={{ background: colors.bg + '22', color: colors.bg, borderTopColor: colors.bg + '44' }}>
          if {data.show_if?.depends_on} = "{data.show_if?.value}"
        </div>
      )}

      {/* Redirect indicator — shows when redirect_config is enabled */}
      {(data.redirectConfig as any)?.enabled && (
        <div
          className="node-redirect-badge"
          style={{ borderTopColor: (data.redirectConfig as any).color || '#f59e0b' }}
        >
          <ExternalLink size={11} style={{ color: (data.redirectConfig as any).color || '#f59e0b' }} />
          <span style={{ color: (data.redirectConfig as any).color || '#f59e0b' }}>
            Redirects
          </span>
          {(data.redirectConfig as any).allow_resume && (
            <RotateCcw size={10} style={{ color: '#10b981', marginLeft: 4 }} title="Resume enabled" />
          )}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="handle-source"
        style={{ background: colors.bg, borderColor: colors.bg }} />
    </div>
  );
};

export default memo(QuestionNode);
