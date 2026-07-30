/**
 * BranchNode - Represents a branching decision point
 * Shows conditions and provides connection handles for each path
 */

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { GitBranch, Zap, ArrowRight, HelpCircle } from 'lucide-react';
import './NodeStyles.css';

const BranchNode: React.FC<NodeProps> = ({ data, selected }) => {
  const conditions = data.conditions || [];
  const isAiBranch = data.triggerType != null || data.triggerQuestion != null;
  
  // Get meaningful labels for conditions
  const getConditionLabel = (cond: any) => {
    if (cond.label) return cond.label;
    if (Array.isArray(cond.answer)) {
      return cond.answer.slice(0, 2).join(', ') + (cond.answer.length > 2 ? '...' : '');
    }
    return cond.answer || 'Condition';
  };

  // Get action description
  const getActionDescription = (cond: any) => {
    const action = cond.action || '';
    if (action === 'path_a' || action === 'path_b') {
      return 'Connect →';
    }
    if (action === 'show_more') return 'More Questions';
    if (action === 'normal') return 'Continue';
    if (action === 'redirect') return 'Redirect';
    if (action === 'end') return 'End Survey';
    return action || 'Connect →';
  };
  
  return (
    <div className={`flow-node branch-node ${selected ? 'selected' : ''} ${isAiBranch ? 'ai-generated' : ''}`}>
      <Handle type="target" position={Position.Top} className="handle-target" />
      
      <div className="node-header branch">
        {isAiBranch ? <Zap size={14} /> : <GitBranch size={14} />}
        <span>{isAiBranch ? 'AI BRANCH' : 'BRANCH'}</span>
      </div>
      
      <div className="node-content">
        <p className="node-label">{data.label || 'Branch Point'}</p>
        
        {/* Instruction hint */}
        {conditions.length > 0 && (
          <div className="branch-hint">
            <HelpCircle size={10} />
            <span>Drag from circles to connect paths</span>
          </div>
        )}
        
        {/* Conditions with individual handles */}
        {conditions.length > 0 && (
          <div className="branch-conditions-list">
            {conditions.map((cond: any, i: number) => (
              <div key={i} className="branch-condition-row">
                <span className="condition-badge" style={{ 
                  background: i === 0 ? '#dcfce7' : i === 1 ? '#fee2e2' : '#e0e7ff',
                  color: i === 0 ? '#166534' : i === 1 ? '#991b1b' : '#3730a3'
                }}>
                  {getConditionLabel(cond)}
                </span>
                <ArrowRight size={12} className="condition-arrow" />
                <span className="condition-destination">
                  {getActionDescription(cond)}
                </span>
                {/* Individual handle for this condition */}
                <Handle 
                  type="source" 
                  position={Position.Right} 
                  id={`cond_${i}`}
                  className="handle-source condition-handle"
                  style={{ top: `${85 + (i * 28)}px` }}
                />
              </div>
            ))}
          </div>
        )}
        
        {/* Default path for unmatched conditions */}
        {conditions.length > 0 && (
          <div className="branch-default-row">
            <span className="condition-badge default">Default</span>
            <ArrowRight size={12} className="condition-arrow" />
            <span className="condition-destination">Continue</span>
          </div>
        )}
      </div>
      
      {/* Default handle at bottom for unmatched/default path */}
      <Handle type="source" position={Position.Bottom} className="handle-source" id="default" />
    </div>
  );
};

export default memo(BranchNode);
