/**
 * RedirectNode - Represents a mid-survey or end redirect
 */

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { ExternalLink, RotateCcw } from 'lucide-react';
import './NodeStyles.css';

const RedirectNode: React.FC<NodeProps> = ({ data, selected }) => {
  const color = data.color || '#f59e0b';
  const resumeEnabled = data.resumeEnabled !== false;
  
  return (
    <div 
      className={`flow-node redirect-node ${selected ? 'selected' : ''}`}
      style={{ borderColor: color }}
    >
      <Handle type="target" position={Position.Top} className="handle-target" />
      
      <div className="node-header" style={{ background: color }}>
        <ExternalLink size={14} />
        <span>Redirect</span>
      </div>
      
      <div className="node-content">
        <p className="node-label">{data.label || 'Unnamed Redirect'}</p>
        {data.url && (
          <p className="node-url" title={data.url}>
            {data.url.length > 30 ? data.url.substring(0, 30) + '...' : data.url}
          </p>
        )}
        
        {resumeEnabled && (
          <div className="resume-badge">
            <RotateCcw size={12} />
            Resume enabled
          </div>
        )}
      </div>
      
      {resumeEnabled && (
        <Handle type="source" position={Position.Bottom} className="handle-source" id="resume" />
      )}
    </div>
  );
};

export default memo(RedirectNode);
