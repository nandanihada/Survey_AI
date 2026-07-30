/**
 * StartNode - Represents the survey start point
 */

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Play } from 'lucide-react';
import './NodeStyles.css';

const StartNode: React.FC<NodeProps> = ({ data, selected }) => {
  return (
    <div className={`flow-node start-node ${selected ? 'selected' : ''}`}>
      <div className="node-header start">
        <Play size={14} />
        <span>Start</span>
      </div>
      
      <div className="node-content">
        <p className="node-label">{data.label || 'Survey Start'}</p>
      </div>
      
      <Handle type="source" position={Position.Bottom} className="handle-source" />
    </div>
  );
};

export default memo(StartNode);
